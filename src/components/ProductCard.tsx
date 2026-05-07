import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { formatCurrency } from '../lib/utils';
import { AddToCart } from './AddToCart';
import { ChevronDown, Weight } from 'lucide-react';

interface ProductCardProps {
  product: any;
  variant?: 'grid' | 'horizontal';
  [key: string]: any;
}

export default function ProductCard({ product, variant = 'grid' }: ProductCardProps) {
    const { addToCart, updateQuantity, getItemQuantity } = useCart();
    const { dData } = useLanguage();
    const navigate = useNavigate();
    
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

    const basePrice = product.discountPrice || product.price || 0;
    const [displayPrice, setDisplayPrice] = useState(basePrice);

    useEffect(() => {
        if (isWeightBased && selectedWeight) {
            // Price is per KG (1000g)
            const calculatedPrice = (basePrice / 1000) * selectedWeight;
            setDisplayPrice(calculatedPrice);
        } else {
            setDisplayPrice(basePrice);
        }
    }, [selectedWeight, basePrice, isWeightBased]);

    const formatWeight = (w: any) => {
        const val = parseFloat(w);
        if (isNaN(val)) return w;
        return val >= 1000 ? `${val / 1000}KG` : `${val}g`;
    };

    if (variant === 'horizontal') {
        return (
            <motion.div 
                whileHover={{ y: -2 }}
                className="flex-shrink-0 w-44 glass-card p-2 relative group flex flex-col h-full"
            >
                <div 
                    className="aspect-square rounded-xl overflow-hidden mb-2 cursor-pointer bg-white/5 relative"
                    onClick={() => navigate(`/product/${product.id}`)}
                >
                    <img src={product.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={product.name} />
                </div>
                
                <h3 className="font-bold text-[11px] text-white truncate mb-1 leading-tight">{dData(product.name, product.nameEn)}</h3>
                
                <div className="flex flex-col gap-0.5 mb-2">
                    <div className="flex items-baseline gap-1">
                        <span className="text-[13px] font-black text-primary">৳{formatCurrency(displayPrice)}</span>
                        <span className="text-[8px] text-white/40 font-bold uppercase tracking-tighter"> / {isWeightBased ? formatWeight(selectedWeight) : product.unit}</span>
                    </div>
                    {isWeightBased && (
                        <span className="text-[7px] text-white/30 font-bold uppercase">৳{formatCurrency(basePrice)}/KG</span>
                    )}
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
                                        ? 'bg-primary text-black border-primary'
                                        : 'bg-white/5 text-white/40 border-white/10 hover:border-white/20'
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
            className="glass-card p-2 relative group flex flex-col h-full hover:shadow-primary/5 transition-all border-white/20"
        >
            <div 
                className="relative aspect-square rounded-xl overflow-hidden mb-2 cursor-pointer bg-white/5"
                onClick={() => navigate(`/product/${product.id}`)}
            >
                <img src={product.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={product.name} />
                
                {product.discountPrice && (
                    <div className="absolute top-1.5 left-0 bg-primary text-black text-[8px] font-black px-1.5 py-0.5 rounded-r-md shadow-lg">
                        SAVE ৳{product.price - product.discountPrice}
                    </div>
                )}
            </div>
            
            <div className="flex flex-col flex-1">
                <div className="flex justify-between items-start mb-0.5">
                    <span className="text-[8px] text-white/40 font-bold uppercase tracking-tight">
                        {isWeightBased ? `Min. ${formatWeight(product.minWeight || parsedWeights[0])}` : `Per ${product.unit || 'Piece'}`}
                    </span>
                </div>
                
                <h3 className="font-bold text-[11px] text-white truncate mb-1.5 leading-tight group-hover:text-primary transition-colors">{dData(product.name, product.nameEn)}</h3>
                
                <div className="flex flex-col mb-2">
                    <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-[13px] font-black text-primary">৳{formatCurrency(displayPrice)}</span>
                        {product.discountPrice && (
                            <span className="text-[9px] text-white/30 font-bold line-through">৳{formatCurrency(isWeightBased ? (product.price / 1000) * selectedWeight : product.price)}</span>
                        )}
                        <span className="text-[8px] text-white/40 font-bold uppercase tracking-tighter"> / {isWeightBased ? formatWeight(selectedWeight) : product.unit}</span>
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
                                        ? 'bg-primary text-black border-primary shadow-[0_0_10px_rgba(212,175,55,0.3)]'
                                        : 'bg-white/5 text-white/40 border-white/10 hover:border-white/20'
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
