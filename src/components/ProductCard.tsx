import { motion, AnimatePresence } from 'motion/react';
import { Plus, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { formatCurrency } from '../lib/utils';
import { useState } from 'react';

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
    const [selectedWeight, setSelectedWeight] = useState(product.weight || product.unit);

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

                <div className="relative h-10 overflow-hidden">
                    {quantity === 0 ? (
                        <button
                            onClick={() => addToCart(product)}
                            className="w-full h-full bg-primary text-[#050E21] font-black text-[11px] uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all flex items-center justify-center gap-2"
                        >
                            <Plus size={16} /> Add
                        </button>
                    ) : (
                        <div className="w-full h-full bg-white/10 backdrop-blur-md flex items-center justify-between p-1 rounded-xl border border-white/10">
                             <button 
                                onClick={() => updateQuantity(product.id, quantity - 1)}
                                className="w-8 h-8 flex items-center justify-center text-primary hover:bg-white/10 rounded-lg transition-colors font-bold text-lg"
                            >
                                -
                            </button>
                            <span className="text-white font-black text-sm">{quantity}</span>
                            <button 
                                onClick={() => updateQuantity(product.id, quantity + 1)}
                                className="w-8 h-8 flex items-center justify-center text-primary hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div 
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-4 relative group flex flex-col h-full hover:shadow-primary/5 transition-all border-white/20"
        >
            <div 
                className="relative aspect-square rounded-2xl overflow-hidden mb-4 cursor-pointer bg-white/5"
                onClick={() => navigate(`/product/${product.id}`)}
            >
                <img src={product.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={product.name} />
                
                {product.discountPrice && (
                    <div className="absolute top-2 left-0 bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded-r-lg shadow-lg">
                        ৳{product.price - product.discountPrice} OFF
                    </div>
                )}

                {/* Circular Add Button */}
                <motion.button
                    whileTap={{ scale: 0.8 }}
                    onClick={(e) => {
                        e.stopPropagation();
                        addToCart(product);
                    }}
                    className="absolute bottom-2 right-2 w-10 h-10 bg-white shadow-xl rounded-full flex items-center justify-center text-red-600 hover:bg-slate-50 transition-all border border-slate-100"
                >
                    <Plus size={24} strokeWidth={3} />
                </motion.button>
            </div>
            
            <div className="flex flex-col flex-1">
                <span className="text-[10px] text-white/40 font-bold uppercase tracking-tight mb-0.5 mt-auto">Per {product.unit || 'Piece'}</span>
                <h3 className="font-bold text-[14px] text-white truncate mb-2 leading-tight">{dData(product.name, product.nameEn)}</h3>
                
                <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-white">৳{formatCurrency(product.discountPrice || product.price)}</span>
                    {product.discountPrice && (
                        <span className="text-[11px] text-white/30 font-bold line-through">৳{formatCurrency(product.price)}</span>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
