import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, ArrowLeft, Star, Clock, MapPin, Plus, Minus, ShieldCheck, Store, Send, User as UserIcon, Heart, Phone, MessageCircle, ChevronDown } from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import React, { useState, useEffect, useContext } from 'react';
import { doc, getDoc, collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { AuthContext } from '../App';
import { socialService } from '../services/socialService';
import { Helmet } from 'react-helmet-async';

import { formatCurrency } from '../lib/utils';

import { useSettings } from '../context/SettingsContext';

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { addToCart, getItemQuantity, updateQuantity } = useCart();
  const { dData, t } = useLanguage();
  const { settings: appSettings } = useSettings();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Weight system states
  const [selectedWeight, setSelectedWeight] = useState<number>(0);
  const isWeightBased = product?.pricingType === 'weight';
  
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
    <div className="max-w-md mx-auto min-h-screen animate-pulse">
        <div className="h-[480px] bg-white/5 rounded-b-[4rem]" />
        <div className="px-6 -mt-20">
            <div className="glass-card p-8 h-96 bg-white/5" />
        </div>
    </div>
  );

  if (!product) return (
    <div className="text-center py-24 px-10">
        <h2 className="font-display font-black text-2xl text-white tracking-tight">Product not found</h2>
        <Link to="/products" className="mt-6 text-primary font-black uppercase tracking-widest bg-primary/10 px-8 py-3 rounded-full border border-primary/20 inline-block">Return to shop</Link>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-md mx-auto min-h-screen"
    >
      <Helmet>
        <title>{dData(product.name, product.nameEn)} - Premium Mall</title>
        <meta name="description" content={product.seoDescription || dData(product.description, product.descriptionEn) || `Fresh ${dData(product.name, product.nameEn)} delivered to your door.`} />
      </Helmet>

      <div className="relative h-[480px]">
        <img 
          src={product.image || "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&h=1000&fit=crop"} 
          referrerPolicy="no-referrer"
          loading="eager"
          className="w-full h-full object-cover rounded-b-[4rem] shadow-2xl" 
          alt={dData(product.name, product.nameEn)} 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050E21]/60 via-transparent to-black/30 rounded-b-[4rem]" />
        
        <button onClick={() => navigate(-1)} className="absolute top-8 left-6 w-12 h-12 glass-card rounded-full flex items-center justify-center text-white hover:bg-primary hover:text-black transition-all border-white/20">
          <ArrowLeft size={24} />
        </button>
        <button 
          onClick={toggleWishlist}
          className={`absolute top-8 right-6 w-12 h-12 glass-card rounded-full flex items-center justify-center transition-all ${
            isWishlisted ? 'bg-red-500 text-white border-red-400' : 'text-white hover:bg-white hover:text-red-500 border-white/20'
          }`}
        >
          <Heart size={24} fill={isWishlisted ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="px-6 -mt-20 relative z-10 pb-32">
        <div className="glass-card p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-white/20">
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1 mr-4">
              <span className="text-primary font-black text-[10px] uppercase tracking-[0.3em] mb-3 block flex items-center gap-2">
                <div className="w-4 h-[1px] bg-primary"></div>
                {product.category}
              </span>
              <h1 className="font-display font-black text-3xl text-white leading-tight tracking-tight">{dData(product.name, product.nameEn)}</h1>
              {product.isPreOrder && (
                  <div className="mt-3 bg-blue-500/20 text-blue-300 px-3 py-1.5 rounded-full w-fit flex items-center gap-1.5 border border-blue-500/30 backdrop-blur-md">
                      <Clock size={12} />
                      <span className="text-[9px] font-black uppercase tracking-widest">Pre-order Specialist</span>
                  </div>
              )}
            </div>
            <div className="glass-card bg-white/10 px-4 py-2 flex items-center gap-2 border-white/10 rounded-2xl">
              <Star size={18} className="text-primary fill-primary" />
              <span className="text-sm font-black text-white">
                {reviews.length > 0 
                  ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
                  : (product.rating || '4.5')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6 mb-6 text-white/40">
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
                <span key={tag} className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 bg-white/5 border border-white/10 px-3 py-1 rounded-lg">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <p className="text-white/60 text-sm leading-relaxed mb-10 font-medium">
            {dData(product.description, product.descriptionEn) || `Experience the finest ${dData(product.name, product.nameEn)} sourced directly from our verified premium merchants.`}
          </p>

          <div className="flex flex-col gap-8 mb-10">
            {/* Price section */}
            <div className="flex flex-col">
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-display font-black text-primary leading-none tracking-tight drop-shadow-md">
                   ৳{formatCurrency((isWeightBased 
                      ? ((product.discountPrice || product.price || 0) / 1000) * selectedWeight 
                      : (product.discountPrice || product.price || 0)) * (qtyInCart || 1))}
                </span>
                {product.discountPrice && (
                    <span className="text-xl font-bold text-white/20 line-through">
                       ৳{formatCurrency((isWeightBased 
                          ? (product.price / 1000) * selectedWeight 
                          : product.price) * (qtyInCart || 1))}
                    </span>
                )}
                <span className="text-xs font-black text-white/30 uppercase tracking-widest">
                  / {(qtyInCart || 1)}{isWeightBased ? formatWeight(selectedWeight) : (product.unit || 'pkt')}
                </span>
              </div>
              <div className="text-[9px] text-white/40 mt-3 font-black uppercase tracking-widest bg-white/5 self-start px-4 py-1.5 rounded-full border border-white/5">
                {isWeightBased ? (
                    <>BASE PRICE: ৳{formatCurrency(product.discountPrice || product.price || 0)} / KG</>
                ) : (
                    <>Targeting: ৳{formatCurrency(product.discountPrice || product.price || 0)} PER {product.unit || 'UNIT'}</>
                )}
              </div>
            </div>

            {/* Weight Selection Chips */}
            {isWeightBased && (
                <div className="space-y-4">
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] flex items-center gap-3">
                        <div className="w-10 h-[1px] bg-white/10"></div>
                        Select Option
                    </label>
                    <div className="flex flex-wrap gap-3">
                        {allowedWeights.map((w: any) => (
                            <button
                                key={w}
                                onClick={() => setSelectedWeight(parseFloat(w))}
                                className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                                    selectedWeight === parseFloat(w)
                                        ? 'bg-primary text-black border-primary shadow-[0_10px_20px_rgba(212,175,55,0.2)] scale-105'
                                        : 'bg-white/5 text-white/40 border-white/10 hover:border-white/20'
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
              <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] flex items-center gap-3">
                <div className="w-10 h-[1px] bg-white/10"></div>
                {qtyInCart > 0 ? 'Managing Selection' : 'Quantity Selection'}
              </label>
              
              <AnimatePresence mode="wait">
                {qtyInCart === 0 ? (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onClick={() => addToCart(product, isWeightBased ? selectedWeight : undefined)}
                    className="w-full bg-primary text-black font-black uppercase tracking-[0.2em] text-xs py-6 rounded-[2rem] shadow-[0_15px_35px_rgba(212,175,55,0.2)] transition-all flex items-center justify-center gap-3 h-20"
                  >
                    <ShoppingCart size={24} />
                    Add to Cart Corner
                  </motion.button>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-8 bg-white/5 p-3 rounded-[2.5rem] border border-white/10 w-full backdrop-blur-md"
                  >
                    <motion.button 
                      whileTap={{ scale: 0.9 }}
                      onClick={() => updateQuantity(product.id, qtyInCart - 1, isWeightBased ? selectedWeight : undefined)}
                      className="w-16 h-16 bg-white/10 rounded-3xl shadow-xl flex items-center justify-center text-white hover:bg-white/20 transition-all border border-white/10"
                    >
                      <Minus size={28} strokeWidth={3} />
                    </motion.button>
                    
                    <div className="flex-1 flex flex-col items-center">
                      <span className="font-black text-3xl font-display text-white tracking-tighter">
                        {qtyInCart} <span className="text-primary text-sm uppercase tracking-widest ml-1">{isWeightBased ? formatWeight(selectedWeight) : (product.unit || 'pcs')}</span>
                      </span>
                      <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] mt-1">Adjust Quantity</span>
                    </div>

                    <motion.button 
                       whileTap={{ scale: 0.9 }}
                       onClick={() => updateQuantity(product.id, qtyInCart + 1, isWeightBased ? selectedWeight : undefined)}
                       className="w-16 h-16 bg-primary rounded-3xl shadow-[0_10px_25px_rgba(212,175,55,0.3)] flex items-center justify-center text-black transition-all hover:bg-white"
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
                className={`text-white font-black uppercase tracking-[0.2em] text-xs py-5 rounded-[1.5rem] border border-white/20 transition-all flex items-center justify-center shadow-2xl h-16 ${qtyInCart > 0 ? 'bg-primary/20 hover:bg-primary/30 border-primary/30' : 'bg-white/5 opacity-50 cursor-not-allowed'}`}
              >
                Proceed to Checkout
              </motion.button>
              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/')}
                className="bg-white/5 hover:bg-white/10 text-white/60 font-black uppercase tracking-[0.2em] text-xs py-5 rounded-[1.5rem] border border-white/10 transition-all flex items-center justify-center h-16"
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
                className="py-4 bg-white/5 text-white/60 rounded-[1.5rem] flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest border border-white/5 shadow-inner"
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
                  <h3 className="font-display font-black text-2xl text-white">Reviews ({reviews.length})</h3>
                </div>
                {user && (
                    <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full border border-primary/20 text-primary font-black text-[9px] uppercase tracking-widest">
                        <Star size={12} fill="currentColor" />
                        <span>Add Review</span>
                    </div>
                )}
            </div>

            {user && (
                <form onSubmit={handleReviewSubmit} className="glass-card p-6 border-white/10">
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
                                    className={`${newReview.rating >= star ? 'text-primary fill-primary drop-shadow-[0_0_8px_rgba(212,175,55,0.5)]' : 'text-white/10'}`} 
                                />
                            </button>
                        ))}
                    </div>
                    <div className="relative">
                        <textarea
                            required
                            placeholder="Share your thoughts about this product..."
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm min-h-[120px] outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-white placeholder:text-white/20 backdrop-blur-sm"
                            value={newReview.comment}
                            onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                        />
                        <button 
                            type="submit"
                            disabled={submittingReview}
                            className="absolute bottom-4 right-4 w-12 h-12 bg-primary text-black rounded-xl shadow-xl hover:bg-white transition-all disabled:opacity-50 flex items-center justify-center"
                        >
                            {submittingReview ? <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <Send size={20} />}
                        </button>
                    </div>
                </form>
            )}

            <div className="grid grid-cols-1 gap-6">
                {reviews.length === 0 ? (
                    <div className="text-center py-16 glass-card border-white/5">
                        <p className="text-white/30 text-xs font-bold uppercase tracking-widest">No reviews yet. Be the first to rate!</p>
                    </div>
                ) : (
                    reviews.map((review) => (
                        <div key={review.id} className="glass-card p-6 border-white/10 shadow-lg relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-[0.03] -rotate-12">
                              <Star size={60} className="text-white" />
                            </div>
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 glass-card rounded-2xl overflow-hidden flex items-center justify-center border-white/10 bg-white/5 shrink-0">
                                        {review.userPhoto ? (
                                            <img src={review.userPhoto} alt={review.userName} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-white/20">
                                              <UserIcon size={24} />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-white mb-1">{review.userName}</h4>
                                        <div className="flex items-center gap-1">
                                            {[...Array(5)].map((_, i) => (
                                                <Star 
                                                    key={i} 
                                                    size={10} 
                                                    className={`${i < review.rating ? 'text-primary fill-primary' : 'text-white/10'}`} 
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <span className="text-[9px] text-white/30 font-black uppercase tracking-widest">
                                    {review.createdAt?.toDate().toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) || 'JUST NOW'}
                                </span>
                            </div>
                            <p className="text-sm text-white/70 leading-relaxed font-medium relative z-10 bg-white/5 p-4 rounded-xl border border-white/5 italic">
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
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-2">curated Selection</span>
                    <h3 className="font-display font-black text-2xl text-white">Recommended</h3>
                  </div>
                  <Link to="/products" className="text-primary text-[10px] font-black uppercase tracking-widest bg-primary/10 px-4 py-2 rounded-full border border-primary/20">All Deals</Link>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    {relatedProducts.map((p) => (
                        <div 
                            key={p.id}
                            onClick={() => {
                                navigate(`/product/${p.id}`);
                                window.scrollTo(0, 0);
                            }}
                            className="glass-card p-3 group cursor-pointer border-white/10"
                        >
                            <div className="aspect-square rounded-2xl overflow-hidden mb-3 bg-white/5 border border-white/5 relative">
                                <img 
                                    src={p.image} 
                                    alt={p.name} 
                                    loading="lazy"
                                    className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700" 
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#050E21]/40 to-transparent" />
                            </div>
                            <h4 className="font-bold text-xs text-white truncate mb-1 px-1">{dData(p.name, p.nameEn)}</h4>
                            <div className="flex items-center justify-between px-1">
                                <span className="text-sm font-black text-primary">৳{formatCurrency(p.price || 0)}</span>
                                <div className="flex items-center gap-1">
                                    <Star size={10} className="text-primary fill-primary" />
                                    <span className="text-[10px] font-black text-white/40">{p.rating || '5.0'}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </div>
    </motion.div>
  );
}

