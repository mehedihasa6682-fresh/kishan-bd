import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, ArrowLeft, Star, Clock, MapPin, Plus, Minus, ShieldCheck, Store, Send, User as UserIcon, Heart, Phone, MessageCircle, ChevronDown } from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import React, { useState, useEffect, useContext } from 'react';
import { doc, getDoc, collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { usePromotions } from '../context/PromotionContext';
import { AuthContext } from '../App';
import { socialService } from '../services/socialService';
import { Helmet } from 'react-helmet-async';

import { formatCurrency } from '../lib/utils';
import ProductCard from '../components/ProductCard';
import { useSettings } from '../context/SettingsContext';
import { Zap } from 'lucide-react';
import FlashTimer from '../components/FlashTimer';

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { addToCart, getItemQuantity, updateQuantity } = useCart();
  const { dData, t } = useLanguage();
  const { settings: appSettings } = useSettings();
  const { getEffectivePrice } = usePromotions();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Price parsing helpers
  const parsePrice = (val: any) => {
    if (typeof val === 'number') return val;
    return parseFloat(String(val).replace(/[^\d.-]/g, '')) || 0;
  };
  
  // Weight system states
  const [selectedWeight, setSelectedWeight] = useState<number>(0);
  const isWeightBased = product?.pricingType === 'weight';

  const effective = product ? getEffectivePrice(product) : { price: 0, discountPrice: null, promotion: null };
  const productPrice = parsePrice(effective.price);
  const productDiscountPrice = effective.discountPrice ? parsePrice(effective.discountPrice) : null;
  const unitBasePrice = productDiscountPrice || productPrice;
  
  const allowedWeights = React.useMemo(() => {
    if (!product?.allowedWeights) return [];
    if (Array.isArray(product.allowedWeights)) return product.allowedWeights;
    return product.allowedWeights.split(',').map((s: string) => s.trim());
  }, [product?.allowedWeights]);

  const qtyInCart = getItemQuantity(id || '', isWeightBased ? selectedWeight : undefined);

  const [reviews, setReviews] = useState<any[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    async function fetchProduct() {
      if (!id) return;
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, 'products', id));
        if (snap.exists()) {
          const data = snap.data();
          const productData = { id: snap.id, ...data } as any;
          setProduct(productData);
          
          // Initialize weight if weight based
          if (productData.pricingType === 'weight') {
              const weightVal = parseFloat(productData.defaultWeight) || parseFloat(productData.allowedWeights?.[0]) || 250;
              setSelectedWeight(weightVal);
          }
          
          // Fetch related
          const q = query(collection(db, 'products'), where('category', '==', productData.category), limit(4));
          const relSnap = await getDocs(q);
          setRelatedProducts(relSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.id !== id));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();

    if (id) {
        const unsubRev = socialService.getReviews(id, setReviews);
        return () => unsubRev();
    }
  }, [id]);

  useEffect(() => {
    if (user && id) {
        const unsub = socialService.getWishlist(user.uid, (items) => {
            setIsWishlisted(items.some(i => i.productId === id));
        });
        return () => unsub();
    }
  }, [user, id]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id || !newReview.comment) return;
    setSubmittingReview(true);
    try {
      await socialService.addReview({
        productId: id,
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        userPhoto: user.photoURL || '',
        rating: newReview.rating,
        comment: newReview.comment
      });
      setNewReview({ rating: 5, comment: '' });
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingReview(false);
    }
  };

  const toggleWishlist = async () => {
    if (!user) {
        navigate('/profile');
        return;
    }
    if (id) {
        await socialService.toggleWishlist(user.uid, id);
    }
  };

  const formatWeight = (w: any) => {
    const val = parseFloat(w);
    if (isNaN(val)) return w;
    return val >= 1000 ? `${val / 1000}KG` : `${val}g`;
  };

  if (loading) return (
    <div className="max-w-md mx-auto min-h-screen animate-pulse bg-white">
        <div className="h-[480px] bg-gray-100 rounded-b-[4rem]" />
        <div className="px-6 -mt-20">
            <div className="bg-white p-8 h-96 rounded-[2.5rem] shadow-lg border border-gray-100" />
        </div>
    </div>
  );

  if (!product) return (
    <div className="text-center py-24 px-10 bg-white min-h-screen">
        <h2 className="font-display font-black text-2xl text-[#111111] tracking-tight">Product not found</h2>
        <Link to="/products" className="mt-6 text-primary font-black uppercase tracking-widest bg-primary/10 px-8 py-3 rounded-full border border-primary/20 inline-block">Return to shop</Link>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-md mx-auto min-h-screen bg-white"
    >
      <Helmet>
        <title>{dData(product.name, product.nameEn)} - Shwapno</title>
        <meta name="description" content={product.seoDescription || dData(product.description, product.descriptionEn) || `Fresh ${dData(product.name, product.nameEn)} delivered to your door.`} />
      </Helmet>

      <div className="relative h-[480px]">
        <img 
          src={product.image || appSettings.logo} 
          referrerPolicy="no-referrer"
          loading="eager"
          className="w-full h-full object-cover rounded-b-[4rem] shadow-2xl" 
          alt={dData(product.name, product.nameEn)} 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-white/60 via-transparent to-black/30 rounded-b-[4rem]" />
        
        <button onClick={() => navigate(-1)} className="absolute top-8 left-6 w-12 h-12 glass-card rounded-full flex items-center justify-center text-[#111111] hover:bg-primary hover:text-white transition-all border-[#ECECEC]">
          <ArrowLeft size={24} />
        </button>
        <button 
          onClick={toggleWishlist}
          className={`absolute top-8 right-6 w-12 h-12 glass-card rounded-full flex items-center justify-center transition-all ${
            isWishlisted ? 'bg-red-500 text-white border-red-400' : 'text-[#111111] hover:bg-white hover:text-red-500 border-[#ECECEC]'
          }`}
        >
          <Heart size={24} fill={isWishlisted ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="px-6 -mt-20 relative z-10 pb-32">
        <div className="glass-card p-8 shadow-xl border-[#ECECEC]">
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1 mr-4">
              <span className="text-primary font-black text-[10px] uppercase tracking-[0.3em] mb-3 block flex items-center gap-2">
                <div className="w-4 h-[1px] bg-primary"></div>
                {product.category}
              </span>
              <h1 className="font-display font-black text-3xl text-[#111111] leading-tight tracking-tight">{dData(product.name, product.nameEn)}</h1>
              {effective.promotion && (
                  <div className="mt-3 flex flex-col gap-2">
                    <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-full w-fit flex items-center gap-1.5 border border-primary/20 backdrop-blur-md animate-pulse">
                        <Zap size={12} fill="currentColor" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Active Flash Sale: {effective.promotion.title}</span>
                    </div>
                    <div className="w-fit">
                        <FlashTimer endTime={effective.promotion.endTime} />
                    </div>
                  </div>
              )}
              {product.isPreOrder && (
                  <div className="mt-3 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full w-fit flex items-center gap-1.5 border border-blue-200">
                      <Clock size={12} />
                      <span className="text-[9px] font-black uppercase tracking-widest">Pre-order Specialist</span>
                  </div>
              )}
            </div>
            <div className="glass-card bg-[#F9FAFB] px-4 py-2 flex items-center gap-2 border-[#ECECEC] rounded-2xl">
              <Star size={18} className="text-primary fill-[#E21E26]" />
              <span className="text-sm font-black text-[#111111]">
                {reviews.length > 0 
                  ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
                  : (product.rating || '4.5')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6 mb-6 text-[#6B7280]">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest">Premium quality</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest">{product.location || 'Dhaka Mall'}</span>
            </div>
          </div>

          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              {product.tags.map((tag: string) => (
                <span key={tag} className="text-[9px] font-black uppercase tracking-[0.2em] text-[#6B7280] bg-[#F9FAFB] border border-[#ECECEC] px-3 py-1 rounded-lg">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <p className="text-[#6B7280] text-sm leading-relaxed mb-10 font-medium">
            {dData(product.description, product.descriptionEn) || `Experience the finest ${dData(product.name, product.nameEn)} sourced directly from our verified premium merchants.`}
          </p>

          <div className="flex flex-col gap-8 mb-10">
            {/* Price section */}
            <div className="flex flex-col">
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-display font-black text-primary leading-none tracking-tight">
                   ৳{formatCurrency(isWeightBased 
                      ? (unitBasePrice / 1000) * selectedWeight 
                      : unitBasePrice)}
                </span>
                {productDiscountPrice && (
                    <span className="text-xl font-bold text-[#6B7280] line-through">
                       ৳{formatCurrency(isWeightBased 
                          ? (productPrice / 1000) * selectedWeight 
                          : productPrice)}
                    </span>
                )}
                <span className="text-xs font-black text-[#6B7280] uppercase tracking-widest">
                   / {isWeightBased ? formatWeight(selectedWeight) : (product.unit || 'pkt')}
                </span>
              </div>
              
              {qtyInCart > 0 && (
                <div className="mt-2 text-[10px] font-bold text-[#6B7280] uppercase tracking-widest flex items-center gap-2">
                   <div className="w-1 h-1 bg-primary rounded-full animate-pulse"></div>
                   Cart Total: ৳{formatCurrency((isWeightBased 
                      ? (unitBasePrice / 1000) * selectedWeight 
                      : unitBasePrice) * qtyInCart)}
                </div>
              )}

              <div className="text-[9px] text-[#6B7280] mt-3 font-black uppercase tracking-widest bg-[#F9FAFB] self-start px-4 py-1.5 rounded-full border border-[#ECECEC]">
                {isWeightBased ? (
                    <>BASE PRICE: ৳{formatCurrency(unitBasePrice)} / KG</>
                ) : (
                    <>Targeting: ৳{formatCurrency(unitBasePrice)} PER {product.unit || 'UNIT'}</>
                )}
              </div>
            </div>

            {/* Weight Selection Chips */}
            {isWeightBased && (
                <div className="space-y-4">
                    <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em] flex items-center gap-3">
                        <div className="w-10 h-[1px] bg-[#ECECEC]"></div>
                        Select Option
                    </label>
                    <div className="flex flex-wrap gap-3">
                        {allowedWeights.map((w: any) => (
                            <button
                                key={w}
                                onClick={() => setSelectedWeight(parseFloat(w))}
                                className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                                    selectedWeight === parseFloat(w)
                                        ? 'bg-[#121212] text-white border-[#121212] shadow-lg scale-105'
                                        : 'bg-white text-[#6B7280] border-[#ECECEC] hover:border-primary/40'
                                }`}
                            >
                                {formatWeight(w)}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Quantity Selector / Add Flow */}
            <div className="space-y-4">
              <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em] flex items-center gap-3">
                <div className="w-10 h-[1px] bg-[#ECECEC]"></div>
                {qtyInCart > 0 ? 'Managing Selection' : 'Quantity Selection'}
              </label>
              
              <AnimatePresence mode="wait">
                {qtyInCart === 0 ? (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onClick={() => addToCart(product, isWeightBased ? selectedWeight : undefined)}
                    className="w-full bg-[#121212] text-white font-black uppercase tracking-[0.2em] text-xs py-6 rounded-[2rem] shadow-xl transition-all flex items-center justify-center gap-3 h-20 active:scale-95 hover:bg-black"
                  >
                    <ShoppingCart size={24} />
                    Add to Cart Corner
                  </motion.button>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-8 bg-[#F9FAFB] p-3 rounded-[2.5rem] border border-[#ECECEC] w-full shadow-sm"
                  >
                    <motion.button 
                      whileTap={{ scale: 0.9 }}
                      onClick={() => updateQuantity(product.id, qtyInCart - 1, isWeightBased ? selectedWeight : undefined)}
                      className="w-16 h-16 bg-white rounded-3xl shadow-sm flex items-center justify-center text-[#111111] hover:bg-gray-50 transition-all border border-[#ECECEC]"
                    >
                      <Minus size={28} strokeWidth={3} />
                    </motion.button>
                    
                    <div className="flex-1 flex flex-col items-center">
                      <span className="font-black text-3xl font-display text-[#111111] tracking-tighter">
                        {qtyInCart} <span className="text-primary text-sm uppercase tracking-widest ml-1">{isWeightBased ? formatWeight(selectedWeight) : (product.unit || 'pcs')}</span>
                      </span>
                      <span className="text-[8px] font-black text-[#6B7280] uppercase tracking-[0.2em] mt-1">Adjust Quantity</span>
                    </div>

                    <motion.button 
                       whileTap={{ scale: 0.9 }}
                       onClick={() => updateQuantity(product.id, qtyInCart + 1, isWeightBased ? selectedWeight : undefined)}
                       className="w-16 h-16 bg-[#121212] rounded-3xl shadow-xl flex items-center justify-center text-white transition-all hover:bg-black"
                    >
                      <Plus size={28} strokeWidth={3} />
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex flex-col gap-4 mb-8">
            <div className="grid grid-cols-2 gap-4">
              <motion.button 
                whileTap={{ scale: 0.95 }}
                disabled={qtyInCart === 0}
                onClick={() => {
                    navigate('/checkout');
                }}
                className={`text-white font-black uppercase tracking-[0.2em] text-xs py-5 rounded-[1.5rem] border border-[#ECECEC] transition-all flex items-center justify-center shadow-lg h-16 ${qtyInCart > 0 ? 'bg-primary hover:bg-[#B71C1C]' : 'bg-[#F9FAFB] text-[#6B7280] opacity-50 cursor-not-allowed'}`}
              >
                Proceed to Checkout
              </motion.button>
              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/')}
                className="bg-white hover:bg-gray-50 text-[#111111] font-black uppercase tracking-[0.2em] text-xs py-5 rounded-[1.5rem] border border-[#ECECEC] transition-all flex items-center justify-center h-16 shadow-sm"
              >
                Continue Shopping
              </motion.button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={async () => {
                   const snap = await getDoc(doc(db, 'settings', 'app'));
                   const appWhatsapp = snap.exists() ? snap.data().whatsappNumber : null;
                   const targetNum = (product.whatsappNumber || appWhatsapp || '').replace(/\D/g, '');
                   if (targetNum) {
                      const msg = `Hi, I'm interested in: ${dData(product.name, product.nameEn)}\nLink: ${window.location.href}`;
                      window.open(`https://wa.me/${targetNum}?text=${encodeURIComponent(msg)}`, '_blank');
                   } else {
                      alert('Service not available.');
                   }
                }}
                className="py-4 bg-[#25D366] text-white rounded-[1.5rem] flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-green-900/20"
              >
                <MessageCircle size={20} fill="currentColor" />
                Live Chat (WA)
              </motion.button>
              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                   const targetNum = (appSettings.hotlineNumber || '01700000000').replace(/\D/g, '');
                   if (targetNum) {
                      window.location.href = `tel:${targetNum}`;
                   } else {
                      alert('Service not available.');
                   }
                }}
                className="py-4 bg-[#F9FAFB] text-[#6B7280] rounded-[1.5rem] flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest border border-[#ECECEC] shadow-sm hover:text-[#111111] transition-all"
              >
                <Phone size={20} fill="currentColor" />
                Hotline Call
              </motion.button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="p-6">

        {/* Reviews Section */}
        <div className="space-y-8 mb-16">
            <div className="flex justify-between items-end px-2">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-2">Customer Experience</span>
                  <h3 className="font-display font-black text-2xl text-[#111111]">Reviews ({reviews.length})</h3>
                </div>
                {user && (
                    <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full border border-primary/20 text-primary font-black text-[9px] uppercase tracking-widest">
                        <Star size={12} fill="currentColor" />
                        <span>Add Review</span>
                    </div>
                )}
            </div>

            {user && (
                <form onSubmit={handleReviewSubmit} className="glass-card p-6 border-[#ECECEC]">
                    <div className="flex gap-3 mb-6">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => setNewReview({ ...newReview, rating: star })}
                                className="transition-transform hover:scale-110 active:scale-90"
                            >
                                <Star 
                                    size={32} 
                                    className={`${newReview.rating >= star ? 'text-primary fill-[#E21E26]' : 'text-gray-200'}`} 
                                />
                            </button>
                        ))}
                    </div>
                    <div className="relative">
                        <textarea
                            required
                            placeholder="Share your thoughts about this product..."
                            className="w-full bg-[#F9FAFB] border border-[#ECECEC] rounded-2xl p-5 text-sm min-h-[120px] outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-[#111111] placeholder:text-[#6B7280]"
                            value={newReview.comment}
                            onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                        />
                        <button 
                            type="submit"
                            disabled={submittingReview}
                            className="absolute bottom-4 right-4 w-12 h-12 bg-[#121212] text-white rounded-xl shadow-xl hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center"
                        >
                            {submittingReview ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={20} />}
                        </button>
                    </div>
                </form>
            )}

            <div className="grid grid-cols-1 gap-6">
                {reviews.length === 0 ? (
                    <div className="text-center py-16 glass-card border-[#ECECEC]">
                        <p className="text-[#6B7280] text-xs font-bold uppercase tracking-widest">No reviews yet. Be the first to rate!</p>
                    </div>
                ) : (
                    reviews.map((review) => (
                        <div key={review.id} className="glass-card p-6 border-[#ECECEC] shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                            <div className="absolute top-0 right-0 p-4 opacity-[0.03] -rotate-12">
                              <Star size={60} className="#111111" />
                            </div>
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 glass-card rounded-2xl overflow-hidden flex items-center justify-center border-[#ECECEC] bg-[#F9FAFB] shrink-0">
                                        {review.userPhoto ? (
                                            <img src={review.userPhoto} alt={review.userName} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                              <UserIcon size={24} />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-[#111111] mb-1">{review.userName}</h4>
                                        <div className="flex items-center gap-1">
                                            {[...Array(5)].map((_, i) => (
                                                <Star 
                                                    key={i} 
                                                    size={10} 
                                                    className={`${i < review.rating ? 'text-primary fill-[#E21E26]' : 'text-gray-200'}`} 
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <span className="text-[9px] text-[#6B7280] font-black uppercase tracking-widest">
                                    {review.createdAt?.toDate().toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) || 'JUST NOW'}
                                </span>
                            </div>
                            <p className="text-sm text-[#4B5563] leading-relaxed font-medium relative z-10 bg-[#F9FAFB] p-4 rounded-xl border border-[#ECECEC] italic">
                                "{review.comment}"
                            </p>
                        </div>
                    ))
                )}
            </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
            <div className="mt-16 mb-24">
                <div className="flex items-center justify-between mb-8 px-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-2">Curated Selection</span>
                    <h3 className="font-display font-black text-2xl text-[#111111]">Recommended</h3>
                  </div>
                  <Link to="/products" className="text-primary text-[10px] font-black uppercase tracking-widest bg-primary/10 px-4 py-2 rounded-full border border-primary/20">All Deals</Link>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    {relatedProducts.map((p) => (
                        <ProductCard key={p.id} product={p} />
                    ))}
                </div>
            </div>
        )}
      </div>
    </motion.div>
  );
}

