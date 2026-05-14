import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { motion } from 'framer-motion';
import { Clock, ArrowLeft, ShoppingCart, Zap, Timer, Sparkles, ShoppingBag } from 'lucide-react';
import { format } from 'date-fns';
import { Helmet } from 'react-helmet-async';
import ProductCard from '../components/ProductCard';

const DynamicDetails: React.FC<{ typeOverride?: string }> = ({ typeOverride }) => {
    const { type: paramType, id } = useParams<{ type: string; id: string }>();
    const type = typeOverride || paramType;
    const navigate = useNavigate();
    const [data, setData] = useState<any>(null);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!id || !type) return;
            setLoading(true);
            try {
                const collectionName = type === 'deal' ? 'offers' : 'notifications';
                const docRef = doc(db, collectionName, id);
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists()) {
                    const docData: any = { id: docSnap.id, ...docSnap.data() };
                    setData(docData);

                    // If it's a deal, fetch related products
                    if (type === 'deal') {
                        let q;
                        if (docData.targetType === 'category') {
                          q = query(collection(db, 'products'), where('category', '==', docData.categoryId), where('status', '==', 'approved'));
                        } else {
                           q = query(collection(db, 'products'), where('status', '==', 'approved'));
                        }
                        
                        const unsub = onSnapshot(q, (snapshot) => {
                          let filtered = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                          if (docData.targetType === 'products' && docData.productIds) {
                            filtered = filtered.filter(p => docData.productIds.includes(p.id));
                          }
                          setProducts(filtered);
                        });
                        return () => unsub();
                    }
                }
            } catch (error) {
                console.error("Error fetching details:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id, type]);

    useEffect(() => {
        if (!data?.endTime) return;

        const timer = setInterval(() => {
            const end = new Date(data.endTime).getTime();
            const now = new Date().getTime();
            const diff = end - now;

            if (diff <= 0) {
                setTimeLeft('Ended');
                clearInterval(timer);
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeLeft(`${days > 0 ? `${days}d ` : ''}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        }, 1000);

        return () => clearInterval(timer);
    }, [data?.endTime]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#F9FAFB] px-6 text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                    <Zap size={40} className="text-gray-400" />
                </div>
                <h2 className="text-2xl font-black text-[#111111] uppercase tracking-tighter">Transmission Lost</h2>
                <p className="text-gray-500 mt-2 max-w-xs">The details page you are looking for has been decommissioned or moved.</p>
                <button 
                    onClick={() => navigate('/')}
                    className="mt-8 px-8 py-4 bg-[#111111] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                >
                    Back to Home
                </button>
            </div>
        );
    }

    const title = data.detailsTitle || data.title;
    const description = data.detailsDescription || data.message || data.description;
    const banner = data.detailsBanner || data.banner || data.bannerImage;
    const ctaText = data.detailsCTA || 'Shop Now';

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen bg-[#F9FAFB] pb-32"
        >
            <Helmet>
                <title>{title} - Details</title>
            </Helmet>

            {/* Sticky Header */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#ECECEC] px-6 py-4 flex items-center justify-between">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-sm font-black text-[#111111] uppercase tracking-widest truncate max-w-[200px]">{title}</h1>
                <div className="w-10" />
            </div>

            <div className="pt-20 px-6 max-w-5xl mx-auto space-y-8">
                {/* Banner Section */}
                {banner && (
                    <motion.div 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="relative h-64 md:h-96 rounded-[3rem] overflow-hidden shadow-2xl"
                    >
                        <img src={banner} className="w-full h-full object-cover" alt="Banner" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-8 md:p-12">
                            {type === 'deal' && timeLeft && (
                                <div className="inline-flex items-center gap-3 bg-[#E21E26] text-white px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest self-start shadow-lg mb-6">
                                    <Timer size={16} />
                                    <span>ENDS IN: {timeLeft}</span>
                                </div>
                            )}
                            <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter leading-none">{title}</h2>
                        </div>
                    </motion.div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Info */}
                    <div className="lg:col-span-2 space-y-8">
                        <motion.div 
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white p-10 rounded-[3rem] shadow-xl border border-[#ECECEC]"
                        >
                            <div className="flex items-center gap-3 mb-8">
                                <span className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-[9px] font-black uppercase tracking-widest border border-primary/20">
                                    {type === 'deal' ? (data.type || 'Offer') : (data.type || 'Notification')}
                                </span>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    {data.createdAt?.toDate ? format(data.createdAt.toDate(), 'MMM d, p') : 'Just now'}
                                </span>
                            </div>

                            <div className="text-gray-600 font-medium leading-relaxed whitespace-pre-wrap">
                                {description}
                            </div>

                            {/* Meta Info for Deals */}
                            {type === 'deal' && (
                                <div className="grid grid-cols-2 gap-4 mt-10 pt-10 border-t border-gray-50 text-center">
                                    <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100 flex flex-col items-center">
                                        <Zap className="text-[#E21E26] mb-2" size={20} />
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Benefit</span>
                                        <p className="text-2xl font-black text-[#111111]">{data.discountAmount}{data.discountType === 'percentage' ? '%' : '৳'}</p>
                                    </div>
                                    <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100 flex flex-col items-center text-center">
                                        <Clock className="text-blue-500 mb-2" size={20} />
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Target</span>
                                        <p className="text-sm font-black text-[#111111] uppercase tracking-widest">{data.targetType}</p>
                                    </div>
                                </div>
                            )}
                        </motion.div>

                        {/* Product Grid if it's a Deal */}
                        {type === 'deal' && products.length > 0 && (
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="space-y-8"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="h-px flex-1 bg-gray-200" />
                                    <h3 className="text-sm font-black text-[#111111] uppercase tracking-[0.3em]">Featured Inventory</h3>
                                    <div className="h-px flex-1 bg-gray-200" />
                                </div>

                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                                    {products.map(product => (
                                        <ProductCard key={product.id} product={product} />
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {type === 'deal' && products.length === 0 && !loading && (
                             <div className="py-20 text-center bg-white rounded-[3rem] border border-[#ECECEC]">
                                <ShoppingBag size={48} className="mx-auto text-gray-200 mb-4" />
                                <p className="text-gray-400 text-xs font-black uppercase tracking-widest">No assets tagged in this mission</p>
                             </div>
                        )}
                    </div>

                    {/* Right Column: CTA & Sticky Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-24 space-y-6">
                            <motion.div 
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                className="bg-[#111111] p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden"
                            >
                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl" />
                                <Sparkles className="text-primary mb-6" size={32} />
                                <h3 className="text-xl font-black uppercase tracking-widest mb-4">Strategic Deployment Ready</h3>
                                <p className="text-white/40 text-xs font-medium uppercase tracking-widest leading-relaxed mb-8">
                                    Claim your exclusive benefits on selected assets within this portal.
                                </p>
                                <button 
                                    onClick={() => {
                                        if (data.redirectType === 'category') navigate(`/products?category=${data.categoryId}`);
                                        else if (data.redirectType === 'product') navigate(`/product/${data.redirectId}`);
                                        else if (data.link) {
                                            if (data.link.startsWith('http')) window.open(data.link, '_blank');
                                            else navigate(data.link);
                                        }
                                        else navigate('/products');
                                    }}
                                    className="w-full py-5 bg-primary text-black rounded-2xl font-black text-xs uppercase tracking-[0.4em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                                >
                                    <ShoppingCart size={18} />
                                    {ctaText}
                                </button>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default DynamicDetails;

