import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { motion } from 'motion/react';
import { ArrowLeft, Clock, ShoppingBag, Percent, Sparkles, ChevronRight } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { useSettings } from '../context/SettingsContext';

export default function DealDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [deal, setDeal] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<any>(null);

  useEffect(() => {
    if (!id) return;

    const fetchDeal = async () => {
      const docRef = doc(db, 'offers', id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        setDeal({ id: snap.id, ...data });
        
        // Fetch related products
        let q;
        if (data.targetType === 'category') {
          q = query(collection(db, 'products'), where('category', '==', data.categoryId), where('status', '==', 'approved'));
        } else if (data.targetType === 'products' && data.productIds?.length > 0) {
          // Firestore 'in' limit is 10-30, so we might need multiple queries or client-side filter
           q = query(collection(db, 'products'), where('status', '==', 'approved'));
        } else {
           q = query(collection(db, 'products'), where('status', '==', 'approved'));
        }
        
        const unsub = onSnapshot(q, (snapshot) => {
          let filtered = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          if (data.targetType === 'products') {
            filtered = filtered.filter(p => data.productIds.includes(p.id));
          }
          setProducts(filtered);
          setLoading(false);
        });
        
        return () => unsub();
      }
    };

    fetchDeal();
  }, [id]);

  useEffect(() => {
    if (!deal?.endTime) return;

    const timer = setInterval(() => {
      const difference = +new Date(deal.endTime) - +new Date();
      if (difference <= 0) {
        setTimeLeft(null);
        clearInterval(timer);
      } else {
        setTimeLeft({
          hours: Math.floor(difference / (1000 * 60 * 60)),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [deal]);

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!deal) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
      <h2 className="text-2xl font-black text-white mb-4">Deal Expired or Not Found</h2>
      <button onClick={() => navigate('/')} className="px-8 py-4 bg-primary text-black rounded-2xl font-black uppercase tracking-widest text-xs">Return Home</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-black pb-24">
      {/* Immersive Header */}
      <div className="relative h-[50vh] md:h-[60vh] overflow-hidden">
        <img src={deal.detailsBanner || deal.bannerImage || settings.logo} className="w-full h-full object-cover" alt="" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        
        <button 
          onClick={() => navigate(-1)}
          className="absolute top-6 left-6 p-4 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl text-white hover:bg-white/10 transition-all z-20"
        >
          <ArrowLeft size={24} />
        </button>

        <div className="absolute bottom-10 left-0 w-full px-6 md:px-12 z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl space-y-6"
          >
            <div className="flex items-center gap-4">
              <span className="px-4 py-1 bg-secondary text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-lg">
                {deal.type} MISSION
              </span>
              {timeLeft && (
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-xl px-4 py-1.5 rounded-full border border-white/20">
                  <Clock size={14} className="text-secondary animate-pulse" />
                  <span className="text-[12px] font-mono font-black text-secondary uppercase tracking-widest">
                    {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
                  </span>
                </div>
              )}
            </div>
            
            <h1 className="text-4xl md:text-6xl font-display font-black text-white uppercase tracking-tight leading-none">
              {deal.detailsTitle || deal.title}
            </h1>
            
            <p className="text-sm md:text-lg text-white/60 font-medium max-w-2xl leading-relaxed">
              {deal.detailsDescription || deal.description || 'Exclusive limited-time offer on selected items. Don\'t miss out on these strategic price drops!'}
            </p>

            <div className="flex items-center gap-6 pt-4">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Benefit Range</span>
                    <span className="text-3xl font-display font-black text-primary">UP TO {deal.discountAmount}{deal.discountType === 'percentage' ? '%' : '৳'} OFF</span>
                </div>
                <div className="w-px h-12 bg-white/10" />
                <div className="flex flex-col">
                    <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Target Sector</span>
                    <span className="text-xl font-display font-black text-white uppercase tracking-widest">{deal.targetType}</span>
                </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Product Grid */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex items-center justify-between mb-12">
            <h2 className="text-2xl font-display font-black text-white uppercase tracking-[0.2em] flex items-center gap-4">
                <Sparkles size={32} className="text-secondary" />
                Featured Assets
            </h2>
            <div className="h-px flex-1 bg-white/5 mx-12 hidden md:block" />
            <div className="text-[10px] font-black text-white/30 uppercase tracking-widest bg-white/5 px-6 py-3 rounded-2xl border border-white/5">
                {products.length} Items Identified
            </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-8">
            {products.map((product) => (
                <ProductCard key={product.id} product={product} />
            ))}
        </div>
        
        {products.length === 0 && (
          <div className="py-32 text-center bg-white/5 border border-dashed border-white/10 rounded-[3rem]">
            <ShoppingBag size={48} className="mx-auto text-white/10 mb-6" />
            <p className="text-white/30 font-black uppercase tracking-[0.4em] text-xs">No assets linked to this mission</p>
          </div>
        )}
      </div>

      {/* CTA Section */}
      <div className="px-6 mb-20">
        <div className="max-w-4xl mx-auto p-12 bg-gradient-to-br from-secondary/20 to-transparent border border-secondary/20 rounded-[4rem] text-center space-y-8 relative overflow-hidden group">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-secondary/10 rounded-full blur-[100px] group-hover:bg-secondary/20 transition-colors duration-1000" />
            <Sparkles size={48} className="mx-auto text-secondary" />
            <div className="space-y-2 relative z-10">
                <h3 className="text-3xl font-display font-black text-white uppercase tracking-widest">Strategic Deployment Ready</h3>
                <p className="text-white/40 text-sm font-medium uppercase tracking-widest">Claim {deal.discountAmount}{deal.discountType === 'percentage' ? '%' : '৳'} benefit on all listed assets above.</p>
            </div>
            <button 
                onClick={() => navigate('/products')}
                className="relative z-10 px-12 py-6 bg-secondary text-black rounded-3xl font-black text-sm uppercase tracking-[0.4em] shadow-2xl shadow-secondary/20 hover:scale-105 active:scale-95 transition-all"
            >
                {deal.detailsCTA || 'Execute Order'}
            </button>
        </div>
      </div>
    </div>
  );
}
