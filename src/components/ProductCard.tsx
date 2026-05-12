import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { usePromotions } from '../context/PromotionContext';
import { useSettings } from '../context/SettingsContext';
import { formatCurrency } from '../lib/utils';
import { AddToCart } from './AddToCart';
import { ChevronDown, Weight, Zap } from 'lucide-react';
import FlashTimer from './FlashTimer';

interface ProductCardProps {
  product: any;
  variant?: 'grid' | 'horizontal';
  [key: string]: any;
}

export default function ProductCard({ product, variant = 'grid' }: ProductCardProps) {
    const { addToCart, updateQuantity, getItemQuantity } = useCart();
    const { dData } = useLanguage();
    const { getEffectivePrice } = usePromotions();
    const { settings: appSettings } = useSettings();
    const navigate = useNavigate();

    const effective = getEffectivePrice(product);
    
    // Weight system states
    const isWeightBased = product.pricingType === 'weight';
    
    // Parse allowed weights if it's a string
    const parsedWeights = Array.isArray(product.allowedWeights) 
        ? product.allowedWeights 
        : (typeof product.allowedWeights === 'string' ? product.allowedWeights.split(',').map((s: string) => s.trim()) : []);

    const [selectedWeight, setSelectedWeight] = useState<number>(() => {
        if (!isWeightBased) return 0;
        return parseFloat(product.defaultWeight) || parseFloat(parsedWeights[0]) || 250;
    });

    const quantity = getItemQuantity(product.id, isWeightBased ? selectedWeight : undefined);

    // Robust price parsing function
    const parsePrice = (val: any) => {
        if (typeof val === 'number') return val;
        return parseFloat(String(val).replace(/[^\d.-]/g, '')) || 0;
    };

    const price = parsePrice(effective.price);
    const discountPrice = effective.discountPrice ? parsePrice(effective.discountPrice) : null;
    const basePrice = discountPrice || price;
    
    const [displayPrice, setDisplayPrice] = useState(basePrice);
    const [displayStrikePrice, setDisplayStrikePrice] = useState(price);

    useEffect(() => {
        if (isWeightBased && selectedWeight) {
            const calculatedPrice = (basePrice / 1000) * selectedWeight;
            setDisplayPrice(calculatedPrice);
            
            const calculatedStrike = (price / 1000) * selectedWeight;
            setDisplayStrikePrice(calculatedStrike);
        } else {
            setDisplayPrice(basePrice);
            setDisplayStrikePrice(price);
        }
    }, [selectedWeight, basePrice, price, isWeightBased]);

    const formatWeight = (w: any) => {
        const val = parseFloat(w);
        if (isNaN(val)) return w;
        return val >= 1000 ? `${val / 1000}KG` : `${val}g`;
    };

    if (variant === 'horizontal') {
        return (
            <motion.div 
                whileHover={{ y: -2 }}
                className="flex-shrink-0 w-44 bg-white border border-[#ECECEC] shadow-sm p-3 rounded-2xl relative group flex flex-col h-full"
            >
                <div 
                    className="aspect-square rounded-xl overflow-hidden mb-2 cursor-pointer bg-white relative"
                    onClick={() => navigate(`/product/${product.id}`)}
                >
                    <img src={product.image || appSettings.logo} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={product.name} />
                    {effective.promotion && (
                        <div className="absolute top-1 right-1 flex flex-col items-end gap-1 z-10 scale-75 origin-top-right">
                             <div className="bg-primary text-white rounded-lg px-2 py-1 flex items-center gap-1 animate-pulse shrink-0">
                                <Zap size={8} fill="currentColor" />
                                <span className="text-[6px] font-black uppercase tracking-tight">Flash</span>
                            </div>
                            <FlashTimer endTime={effective.promotion.endTime} />
                        </div>
                    )}
                </div>
                
                <h3 className="font-bold text-[11px] text-[#111111] truncate mb-1 leading-tight">{dData(product.name, product.nameEn)}</h3>
                
                <div className="flex flex-col gap-0.5 mb-2">
                    <div className="flex items-baseline gap-1">
                        <span className="text-[13px] font-black text-primary">৳{formatCurrency(displayPrice)}</span>
                        {discountPrice && (
                            <span className="text-[9px] text-[#6B7280] font-bold line-through opacity-50">৳{formatCurrency(displayStrikePrice)}</span>
                        )}
                        <span className="text-[8px] text-[#6B7280] font-bold uppercase tracking-tighter"> / {isWeightBased ? formatWeight(selectedWeight) : product.unit}</span>
                    </div>
                </div>

                {isWeightBased && (
                    <div className="flex flex-wrap gap-1 mb-2">
                        {parsedWeights.slice(0, 3).map((w: any) => (
                            <button
                                key={w}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedWeight(parseFloat(w));
                                }}
                                className={`px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase transition-all border ${
                                    selectedWeight === parseFloat(w)
                                        ? 'bg-primary text-white border-primary'
                                        : 'bg-[#F9FAFB] text-[#6B7280] border-[#ECECEC] hover:border-primary/20'
                                }`}
                            >
                                {formatWeight(w)}
                            </button>
                        ))}
                    </div>
                )}

                <div className="relative mt-auto pt-1">
                    <AddToCart 
                      initialQuantity={quantity}
                      onUpdate={(qty) => {
                        if (qty === 0) {
                          updateQuantity(product.id, 0, isWeightBased ? selectedWeight : undefined);
                        } else if (qty === 1 && quantity === 0) {
                          addToCart(product, isWeightBased ? selectedWeight : undefined);
                        } else {
                          updateQuantity(product.id, qty, isWeightBased ? selectedWeight : undefined);
                        }
                      }}
                    />
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div 
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-[#ECECEC] shadow-sm p-3 rounded-2xl relative group flex flex-col h-full hover:shadow-lg transition-all"
        >
            <div 
                className="relative aspect-square rounded-xl overflow-hidden mb-2 cursor-pointer bg-white"
                onClick={() => navigate(`/product/${product.id}`)}
            >
                <img src={product.image || appSettings.logo} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={product.name} />
                
                {effective.promotion && (
                    <div className="absolute top-1 right-1 flex flex-col items-end gap-1 z-10 overflow-hidden">
                        <div className="bg-primary text-white rounded-lg px-2 py-1 flex items-center gap-1 shadow-md border border-white/10 animate-pulse shrink-0">
                            <Zap size={9} fill="currentColor" />
                            <span className="text-[8px] font-black uppercase tracking-tight">
                                {(effective.promotion as any)?.type ? 'DEAL' : 'Flash Sale'}
                            </span>
                        </div>
                        <FlashTimer endTime={effective.promotion.endTime} />
                    </div>
                )}

                {discountPrice && (
                    <div className="absolute top-1.5 left-0 bg-primary text-white text-[8px] font-black px-2 py-1 rounded-r-md shadow-lg">
                        SAVE ৳{formatCurrency(isWeightBased ? (displayStrikePrice - displayPrice) : (price - discountPrice))}
                    </div>
                )}
            </div>
            
            <div className="flex flex-col flex-1">
                <div className="flex justify-between items-start mb-0.5">
                    <span className="text-[8px] text-[#6B7280] font-bold uppercase tracking-tight">
                        {isWeightBased ? `Min. ${formatWeight(product.minWeight || parsedWeights[0])}` : `Per ${product.unit || 'Piece'}`}
                    </span>
                </div>
                
                <h3 className="font-bold text-[11px] text-[#111111] truncate mb-1.5 leading-tight group-hover:text-primary transition-colors">{dData(product.name, product.nameEn)}</h3>
                
                <div className="flex flex-col mb-2">
                    <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-[13px] font-black text-primary">৳{formatCurrency(displayPrice)}</span>
                        {discountPrice && (
                            <span className="text-[9px] text-[#6B7280] font-bold line-through opacity-50">৳{formatCurrency(displayStrikePrice)}</span>
                        )}
                        <span className="text-[8px] text-[#6B7280] font-bold uppercase tracking-tighter"> / {isWeightBased ? formatWeight(selectedWeight) : product.unit}</span>
                    </div>
                </div>

                {isWeightBased && (
                    <div className="flex flex-wrap gap-1 mb-2.5 min-h-[18px]">
                        {parsedWeights.map((w: any) => (
                            <button
                                key={w}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedWeight(parseFloat(w));
                                }}
                                className={`px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase transition-all border ${
                                    selectedWeight === parseFloat(w)
                                        ? 'bg-primary text-white border-primary shadow-sm'
                                        : 'bg-[#F9FAFB] text-[#6B7280] border-[#ECECEC] hover:border-primary/20'
                                }`}
                            >
                                {formatWeight(w)}
                            </button>
                        ))}
                    </div>
                )}

                <div className="mt-auto pt-1">
                    <AddToCart 
                      initialQuantity={quantity}
                      onUpdate={(qty) => {
                        if (qty === 0) {
                          updateQuantity(product.id, 0, isWeightBased ? selectedWeight : undefined);
                        } else if (qty === 1 && quantity === 0) {
                          addToCart(product, isWeightBased ? selectedWeight : undefined);
                        } else {
                          updateQuantity(product.id, qty, isWeightBased ? selectedWeight : undefined);
                        }
                      }}
                    />
                </div>
            </div>
        </motion.div>
    );
}
