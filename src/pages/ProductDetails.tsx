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
    <div className="text-center py-20 px-10">
        <h2 className="font-display font-bold text-2xl text-slate-800">Product not found</h2>
        <Link to="/products" className="mt-4 text-primary font-bold">Return to shop</Link>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-md mx-auto"
    >
      <Helmet>
        <title>{dData(product.name, product.nameEn)} - Buy Fresh at Kishan</title>
        <meta name="description" content={dData(product.description, product.descriptionEn) || `Fresh ${dData(product.name, product.nameEn)} directly from the farm to your door at Kishan Marketplace.`} />
        <meta property="og:title" content={`${dData(product.name, product.nameEn)} - Kishan Marketplace`} />
        <meta property="og:description" content={`Get fresh ${dData(product.name, product.nameEn)} at the best price.`} />
        <meta property="og:image" content={product.image} />
        <meta property="og:type" content="product" />
        
        {/* Structured Data for SEO */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org/",
            "@type": "Product",
            "name": dData(product.name, product.nameEn),
            "image": [product.image],
            "description": dData(product.description, product.descriptionEn),
            "sku": product.id,
            "brand": {
              "@type": "Brand",
              "name": "Kishan"
            },
            "offers": {
              "@type": "Offer",
              "url": window.location.href,
              "priceCurrency": "BDT",
              "price": product.price,
              "availability": "https://schema.org/InStock",
              "itemCondition": "https://schema.org/NewCondition"
            }
          })}
        </script>
      </Helmet>
      <div className="relative h-[400px]">
        <img 
          src={product.image || "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&h=1000&fit=crop"} 
          referrerPolicy="no-referrer"
          loading="eager"
          className="w-full h-full object-cover rounded-b-[3rem]" 
          alt={dData(product.name, product.nameEn)} 
        />
        <button onClick={() => navigate(-1)} className="absolute top-6 left-6 w-12 h-12 bg-white/50 backdrop-blur-md rounded-full flex items-center justify-center text-slate-800 hover:bg-white transition-all">
          <ArrowLeft size={24} />
        </button>
        <button 
          onClick={toggleWishlist}
          className={`absolute top-6 right-6 w-12 h-12 backdrop-blur-md rounded-full flex items-center justify-center transition-all ${
            isWishlisted ? 'bg-red-500 text-white' : 'bg-white/50 text-slate-800 hover:bg-white'
          }`}
        >
          <Heart size={24} fill={isWishlisted ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="px-6 -mt-10 relative z-10 pb-24">
        <div className="bg-white rounded-[3rem] p-8 shadow-2xl shadow-slate-200 border border-slate-50">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="text-primary font-bold text-xs uppercase tracking-widest mb-2 block flex items-center gap-2">
                {product.category}
              </span>
              <h1 className="font-display font-bold text-3xl text-slate-900 leading-tight">{dData(product.name, product.nameEn)}</h1>
              {product.isPreOrder && (
                  <div className="mt-2 bg-blue-50 text-blue-600 px-3 py-1 rounded-full w-fit flex items-center gap-1.5 border border-blue-100">
                      <Clock size={12} />
                      <span className="text-[9px] font-black uppercase tracking-widest">Pre-order Special</span>
                  </div>
              )}
            </div>
            <div className="bg-secondary/10 px-3 py-2 rounded-2xl flex items-center gap-1">
              <Star size={16} className="text-secondary fill-secondary" />
              <span className="text-sm font-bold text-slate-800">
                {reviews.length > 0 
                  ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
                  : (product.rating || '4.5')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6 mb-8 text-slate-500">
            <div className="flex items-center gap-1.5">
              <Clock size={16} className="text-primary" />
              <span className="text-xs font-bold font-sans">Freshly Sourced</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin size={16} className="text-primary" />
              <span className="text-xs font-bold font-sans">{product.location || 'Local BD'}</span>
            </div>
          </div>

          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            {dData(product.description, product.descriptionEn) || `Premium quality ${dData(product.name, product.nameEn)} directly from ${product.farmerName || product.farmer}'s farm. No pesticides or chemicals used.`}
          </p>

          <div className="flex flex-col gap-6 mb-10">
            {/* Price section */}
            <div className="flex flex-col">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-display font-bold text-slate-900 leading-none tracking-tight">৳{Math.round((product.price || 0) * qty)}</span>
                <span className="text-sm font-medium text-slate-400">
                  / {qty}{product.unit || 'unit'}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1 font-medium bg-slate-50 self-start px-2 py-0.5 rounded-full border border-slate-100">
                Unit Price: ৳{product.price || 0} per {product.unit || 'unit'}
              </div>
            </div>

            {/* Standard Quantity Adjuster (+/-) */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <div className="w-1 h-3 bg-slate-300 rounded-full"></div>
                Quantity
              </label>
              <div className="flex items-center gap-6 bg-slate-100/50 p-2 rounded-2xl border border-slate-100 w-fit">
                <button 
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-500 hover:text-primary transition-all active:scale-90 border border-slate-100"
                >
                  <Minus size={20} />
                </button>
                
                <div className="flex flex-col items-center min-w-[80px]">
                  <span className="font-black text-lg font-sans text-slate-900">
                    {qty}{product.unit || 'pcs'}
                  </span>
                </div>

                <button 
                   onClick={() => setQty(qty + 1)}
                   className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-500 hover:text-primary transition-all active:scale-90 border border-slate-100"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 mb-6">
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => {
                    addToCart({ ...product, quantity: qty });
                    // Provide feedback
                    const btn = document.getElementById('add-to-cart-btn');
                    if (btn) {
                      btn.innerText = 'Added!';
                      setTimeout(() => { btn.innerText = product.isPreOrder ? 'Pre-order' : t('cart.tab_title'); }, 2000);
                    }
                }}
                id="add-to-cart-btn"
                className="btn-primary py-4 rounded-3xl h-16 shadow-xl shadow-primary/20 flex items-center justify-center gap-2 text-sm"
              >
                <ShoppingCart size={18} />
                {product.isPreOrder ? 'Pre-order' : t('cart.tab_title')}
              </button>
              <button 
                onClick={() => {
                  addToCart({ ...product, quantity: qty });
                  navigate('/checkout');
                }}
                className="btn-secondary py-4 rounded-3xl h-16 shadow-xl shadow-yellow-200 text-sm"
              >
                Buy Now
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={async () => {
                   const snap = await getDoc(doc(db, 'settings', 'app'));
                   const appWhatsapp = snap.exists() ? snap.data().whatsappNumber : null;
                   const targetNum = (product.whatsappNumber || appWhatsapp || '').replace(/\D/g, '');
                   
                   if (targetNum) {
                      const msg = `আসসালামু আলাইকুম, আমি এই প্রডাক্টটি সম্পর্কে জানতে চাই: ${dData(product.name, product.nameEn)}\nলিঙ্ক: ${window.location.href}`;
                      window.open(`https://wa.me/${targetNum}?text=${encodeURIComponent(msg)}`, '_blank');
                   } else {
                      alert('WhatsApp support not available.');
                   }
                }}
                className="py-4 bg-[#25D366] text-white rounded-3xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-green-100 hover:scale-[1.02] active:scale-95 transition-all"
              >
                <MessageCircle size={18} fill="currentColor" />
                WhatsApp Inquiry
              </button>
              <a 
                href={`tel:${(product.whatsappNumber || '01700000000').replace(/\D/g, '')}`} 
                className="py-4 bg-slate-100 text-slate-600 rounded-3xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all"
              >
                <Phone size={18} fill="currentColor" />
                Order via Phone
              </a>
            </div>
          </div>
        </div>
      </div>
      
      {/* Sticky Bottom Actions - Daraz Style */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-t border-slate-100 p-4 md:hidden flex gap-3 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
        <button 
          onClick={() => {
              addToCart({ ...product, quantity: qty });
          }}
          className="flex-[1] btn-primary py-3 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold"
        >
          <ShoppingCart size={16} />
          {t('cart.tab_title')}
        </button>
        <button 
          onClick={() => {
            addToCart({ ...product, quantity: qty });
            navigate('/checkout');
          }}
          className="flex-[1] btn-secondary py-3 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold"
        >
          Buy Now
        </button>
        <button 
          onClick={async () => {
             const snap = await getDoc(doc(db, 'settings', 'app'));
             const appWhatsapp = snap.exists() ? snap.data().whatsappNumber : null;
             const targetNum = (product.whatsappNumber || appWhatsapp || '').replace(/\D/g, '');
             if (targetNum) {
                window.open(`https://wa.me/${targetNum}?text=${encodeURIComponent('Hi, I need help with: ' + dData(product.name, product.nameEn))}`, '_blank');
             }
          }}
          className="w-12 h-12 bg-green-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-green-100"
        >
          <MessageCircle size={20} fill="currentColor" />
        </button>
      </div>

      <div className="p-6">
        <h3 className="font-display font-bold text-xl mb-6 px-2">Merchant Info</h3>
        <div className="glass-card p-5 flex items-center gap-4 bg-white border-slate-100 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
              <Store size={32} />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-slate-800">{product.farmerName || product.farmer}</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
                <ShieldCheck size={14} className="text-primary" />
                <p className="text-[10px] text-primary font-black uppercase">Verified Seller</p>
            </div>
          </div>
          <button className="text-primary font-bold text-xs px-4 py-2 bg-primary/5 rounded-xl">View Farm</button>
        </div>

        {/* Reviews Section */}
        <div className="space-y-6">
            <div className="flex justify-between items-center px-1">
                <h3 className="font-display font-bold text-xl">Reviews ({reviews.length})</h3>
                {user && (
                    <div className="flex items-center gap-1 bg-yellow-50 px-3 py-1.5 rounded-xl border border-yellow-100 text-yellow-600 font-bold text-xs">
                        <Star size={12} fill="currentColor" />
                        <span>Share your experience</span>
                    </div>
                )}
            </div>

            {user && (
                <form onSubmit={handleReviewSubmit} className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                    <div className="flex gap-2 mb-4">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => setNewReview({ ...newReview, rating: star })}
                            >
                                <Star 
                                    size={24} 
                                    className={`${newReview.rating >= star ? 'text-secondary fill-secondary' : 'text-slate-200'}`} 
                                />
                            </button>
                        ))}
                    </div>
                    <div className="relative">
                        <textarea
                            required
                            placeholder="Tell others about the freshness..."
                            className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-xs min-h-[100px] outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            value={newReview.comment}
                            onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                        />
                        <button 
                            type="submit"
                            disabled={submittingReview}
                            className="absolute bottom-4 right-4 p-3 bg-primary text-white rounded-xl shadow-lg hover:bg-primary-dark transition-all disabled:opacity-50"
                        >
                            {submittingReview ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={16} />}
                        </button>
                    </div>
                </form>
            )}

            <div className="space-y-4">
                {reviews.length === 0 ? (
                    <div className="text-center py-10 bg-white border border-slate-50 rounded-[2rem]">
                        <p className="text-slate-400 text-xs">No reviews yet. Be the first!</p>
                    </div>
                ) : (
                    reviews.map((review) => (
                        <div key={review.id} className="bg-white p-5 rounded-[2rem] border border-slate-50 shadow-sm">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center">
                                        {review.userPhoto ? (
                                            <img src={review.userPhoto} alt={review.userName} className="w-full h-full object-cover" />
                                        ) : (
                                            <UserIcon size={18} className="text-slate-400" />
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-800">{review.userName}</h4>
                                        <div className="flex items-center gap-0.5 mt-0.5">
                                            {[...Array(5)].map((_, i) => (
                                                <Star 
                                                    key={i} 
                                                    size={8} 
                                                    className={`${i < review.rating ? 'text-secondary fill-secondary' : 'text-slate-200'}`} 
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <span className="text-[8px] text-slate-400 font-bold uppercase">
                                    {review.createdAt?.toDate().toLocaleDateString() || 'Recently'}
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-600 leading-relaxed italic">
                                "{review.comment}"
                            </p>
                        </div>
                    ))
                )}
            </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
            <div className="mt-12 mb-12">
                <div className="flex items-center justify-between mb-6 px-1">
                  <h3 className="font-display font-bold text-xl">People Also Viewed</h3>
                  <Link to="/products" className="text-primary text-[10px] font-black uppercase tracking-widest">See All</Link>
                </div>
                <div className="grid grid-cols-2 gap-4 pb-4">
                    {relatedProducts.map((p) => (
                        <div 
                            key={p.id}
                            onClick={() => {
                                navigate(`/product/${p.id}`);
                                window.scrollTo(0, 0);
                            }}
                            className="bg-white rounded-2xl border border-slate-50 shadow-sm p-2 group cursor-pointer"
                        >
                            <div className="aspect-square rounded-xl overflow-hidden mb-2">
                                <img 
                                    src={p.image} 
                                    alt={p.name} 
                                    loading="lazy"
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                                />
                            </div>
                            <h4 className="font-bold text-[10px] text-slate-800 truncate mb-1">{dData(p.name, p.nameEn)}</h4>
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-display font-bold text-primary">৳{p.price || 0}</span>
                                <div className="flex items-center gap-0.5">
                                    <Star size={8} className="text-secondary fill-secondary" />
                                    <span className="text-[8px] font-bold text-slate-400">{p.rating || '5.0'}</span>
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

