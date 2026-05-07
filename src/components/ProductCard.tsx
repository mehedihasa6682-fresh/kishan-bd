import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { formatCurrency } from '../lib/utils';
import { AddToCart } from './AddToCart';

interface ProductCardProps {
  product: any;
  variant?: 'grid' | 'horizontal';
  [key: string]: any;
}

export default function ProductCard({ product, variant = 'grid' }: ProductCardProps) {
    const { addToCart, updateQuantity, getItemQuantity } = useCart();
    const { dData } = useLanguage();
    const navigate = useNavigate();
    const quantity = getItemQuantity(product.id);

    if (variant === 'horizontal') {
        return (
            <motion.div 
                whileHover={{ y: -5 }}
                className="flex-shrink-0 w-48 glass-card p-3 relative group"
            >
                <div 
                    className="aspect-square rounded-2xl overflow-hidden mb-3 cursor-pointer bg-white/5"
                    onClick={() => navigate(`/product/${product.id}`)}
                >
                    <img src={product.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={product.name} />
                </div>
                
                <h3 className="font-bold text-[14px] text-white truncate mb-1 leading-tight">{dData(product.name, product.nameEn)}</h3>
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-baseline gap-1">
                        <span className="text-base font-black text-primary">৳{formatCurrency(product.discountPrice || product.price)}</span>
                        <span className="text-[9px] text-white/40 font-bold uppercase tracking-tighter">/{product.unit}</span>
                    </div>
                </div>

                <div className="relative mt-auto">
                    <AddToCart 
                      initialQuantity={quantity}
                      onUpdate={(qty) => {
                        if (qty === 0) {
                          updateQuantity(product.id, 0);
                        } else if (qty === 1 && quantity === 0) {
                          addToCart(product);
                        } else {
                          updateQuantity(product.id, qty);
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
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-2 relative group flex flex-col h-full hover:shadow-primary/5 transition-all border-white/20"
        >
            <div 
                className="relative aspect-square rounded-xl overflow-hidden mb-2 cursor-pointer bg-white/5"
                onClick={() => navigate(`/product/${product.id}`)}
            >
                <img src={product.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={product.name} />
                
                {product.discountPrice && (
                    <div className="absolute top-1.5 left-0 bg-[#D4AF37] text-[#050E21] text-[8px] font-black px-1.5 py-0.5 rounded-r-md shadow-lg">
                        ৳{product.price - product.discountPrice} OFF
                    </div>
                )}
            </div>
            
            <div className="flex flex-col flex-1">
                <span className="text-[8px] text-white/40 font-bold uppercase tracking-tight mb-0.5 mt-auto">Per {product.unit || 'Piece'}</span>
                <h3 className="font-bold text-[11px] text-white truncate mb-1.5 leading-tight group-hover:text-[#D4AF37] transition-colors">{dData(product.name, product.nameEn)}</h3>
                
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-[13px] font-black text-[#D4AF37]">৳{formatCurrency(product.discountPrice || product.price)}</span>
                        {product.discountPrice && (
                            <span className="text-[9px] text-white/30 font-bold line-through">৳{formatCurrency(product.price)}</span>
                        )}
                    </div>
                </div>

                <div className="mt-2 text-[10px]">
                    <AddToCart 
                      initialQuantity={quantity}
                      onUpdate={(qty) => {
                        if (qty === 0) {
                          updateQuantity(product.id, 0);
                        } else if (qty === 1 && quantity === 0) {
                          addToCart(product);
                        } else {
                          updateQuantity(product.id, qty);
                        }
                      }}
                    />
                </div>
            </div>
        </motion.div>
    );
}
