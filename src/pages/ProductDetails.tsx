import { motion } from 'motion/react';
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

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { addToCart } = useCart();
  const { dData, t } = useLanguage();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  
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

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
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
                <span className="text-4xl font-display font-black text-primary leading-none tracking-tight drop-shadow-md">৳{formatCurrency((product.discountPrice || product.price || 0) * qty)}</span>
                {product.discountPrice && (
                    <span className="text-xl font-bold text-white/20 line-through">৳{formatCurrency((product.price || 0) * qty)}</span>
                )}
                <span className="text-xs font-black text-white/30 uppercase tracking-widest">
                  / {qty}{product.unit || 'pkt'}
                </span>
              </div>
              <div className="text-[9px] text-white/40 mt-3 font-black uppercase tracking-widest bg-white/5 self-start px-4 py-1.5 rounded-full border border-white/5">
                Targeting: ৳{formatCurrency(product.discountPrice || product.price || 0)} PER {product.unit || 'UNIT'}
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="space-y-4">
              <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] flex items-center gap-3">
                <div className="w-10 h-[1px] bg-white/10"></div>
                Quantity Selection
              </label>
              <div className="flex items-center gap-8 bg-white/5 p-2 rounded-3xl border border-white/5 w-fit backdrop-blur-md">
                <motion.button 
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="w-14 h-14 bg-white/10 rounded-2xl shadow-xl flex items-center justify-center text-white hover:bg-white/20 transition-all border border-white/10"
                >
                  <Minus size={24} strokeWidth={3} />
                </motion.button>
                
                <div className="flex flex-col items-center min-w-[100px]">
                  <span className="font-black text-2xl font-display text-white tracking-tighter">
                    {qty} <span className="text-primary text-sm uppercase tracking-widest ml-1">{product.unit || 'pcs'}</span>
                  </span>
                </div>

                <motion.button 
                   whileTap={{ scale: 0.9 }}
                   onClick={() => setQty(qty + 1)}
                   className="w-14 h-14 bg-primary rounded-2xl shadow-[0_10px_25px_rgba(212,175,55,0.3)] flex items-center justify-center text-black transition-all hover:bg-white"
                >
                  <Plus size={24} strokeWidth={3} />
                </motion.button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 mb-8">
            <div className="grid grid-cols-2 gap-4">
              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                    addToCart({ ...product, quantity: qty });
                    const btn = document.getElementById('add-to-cart-btn-main');
                    if (btn) {
                      btn.innerText = 'Added!';
                      setTimeout(() => { btn.innerText = product.isPreOrder ? 'Pre-order' : t('cart.tab_title'); }, 2000);
                    }
                }}
                id="add-to-cart-btn-main"
                className="bg-primary hover:bg-white text-black font-black uppercase tracking-[0.2em] text-xs py-5 rounded-[1.5rem] shadow-[0_15px_35px_rgba(212,175,55,0.2)] transition-all flex items-center justify-center gap-3 h-16"
              >
                <ShoppingCart size={20} />
                {product.isPreOrder ? 'Pre-order' : t('cart.tab_title')}
              </motion.button>
              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  addToCart({ ...product, quantity: qty });
                  navigate('/checkout');
                }}
                className="bg-white/10 hover:bg-white/20 text-white font-black uppercase tracking-[0.2em] text-xs py-5 rounded-[1.5rem] border border-white/20 transition-all flex items-center justify-center shadow-2xl h-16"
              >
                Buy Now
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
              <a 
                href={`tel:${(product.whatsappNumber || '01700000000').replace(/\D/g, '')}`} 
                className="py-4 bg-white/5 text-white/60 rounded-[1.5rem] flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest border border-white/5 shadow-inner"
              >
                <Phone size={20} fill="currentColor" />
                Hotline Call
              </a>
            </div>
          </div>
        </div>
      </div>
      
      {/* Sticky Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 z-[60] glass-card rounded-none rounded-t-[2.5rem] border-x-0 border-b-0 p-6 md:hidden flex gap-4 shadow-[0_-20px_50px_rgba(0,0,0,0.6)]">
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => addToCart({ ...product, quantity: qty })}
          className="flex-[2] bg-primary text-black py-4 rounded-2xl flex items-center justify-center gap-3 text-sm font-black uppercase tracking-widest shadow-xl"
        >
          <ShoppingCart size={20} />
          {t('cart.tab_title')}
        </motion.button>
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={async () => {
             const snap = await getDoc(doc(db, 'settings', 'app'));
             const appWhatsapp = snap.exists() ? snap.data().whatsappNumber : null;
             const targetNum = (product.whatsappNumber || appWhatsapp || '').replace(/\D/g, '');
             if (targetNum) window.open(`https://wa.me/${targetNum}`, '_blank');
          }}
          className="w-14 h-14 bg-green-500 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-green-900/30"
        >
          <MessageCircle size={24} fill="currentColor" />
        </motion.button>
      </div>

      <div className="p-6">
        <h3 className="font-display font-black text-xl mb-6 px-2 text-white uppercase tracking-tight">Merchant Information</h3>
        <div className="glass-card p-6 flex items-center gap-5 border-white/10 mb-10 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full translate-x-1/2 -translate-y-1/2 blur-2xl" />
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-white/20 border border-white/10">
              <Store size={32} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-black text-white text-lg truncate leading-none mb-2">{product.farmerName || product.farmer}</h4>
            <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-primary" />
                <p className="text-[10px] text-primary font-black uppercase tracking-widest">Verified Elite Merchant</p>
            </div>
          </div>
          <button className="text-primary font-black text-[10px] uppercase tracking-widest px-5 py-2.5 bg-primary/10 rounded-xl border border-primary/20 whitespace-nowrap">Explore</button>
        </div>

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

