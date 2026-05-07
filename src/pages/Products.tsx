import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, SlidersHorizontal, Star, Plus, Filter, Heart, ArrowUpDown, ChevronDown, ShoppingCart } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useCart } from '../context/CartContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useContext } from 'react';
import { AuthContext } from '../App';
import { socialService } from '../services/socialService';
import { matchProduct } from '../lib/searchUtils';
import { Helmet } from 'react-helmet-async';
import ProductCard from '../components/ProductCard';

export default function Products() {
  const { addToCart } = useCart();
  const { user } = useContext(AuthContext);
  const { dData, t } = useLanguage();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialCategory = searchParams.get('category');
  
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<any>({ id: 'All', title: 'All' });
  const [selectedSubCategory, setSelectedSubCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'priceLow' | 'priceHigh' | 'rating'>('default');
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'products'), where('status', '==', 'approved'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setDbProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubCategories = onSnapshot(collection(db, 'categories'), (snap) => {
      const cats: any[] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDbCategories(cats);
      
      if (initialCategory) {
          const found = cats.find(c => c.title === initialCategory);
          if (found) {
            setSelectedCategory(found);
          } else if (initialCategory === 'Bundles') {
            setSelectedCategory({ id: 'Bundles', title: 'Bundles' });
          }
      }
    });

    if (user) {
        const unsubWish = socialService.getWishlist(user.uid, (items) => {
            setWishlistIds(items.map(i => i.productId));
        });
        return () => {
            unsubscribe();
            unsubCategories();
            unsubWish();
        };
    }

    return () => {
        unsubscribe();
        unsubCategories();
    };
  }, [user, initialCategory]);

  const toggleWish = (productId: string) => {
    if (!user) {
        navigate('/profile');
        return;
    }
    socialService.toggleWishlist(user.uid, productId);
  };
   
  let filteredProducts = (dbProducts.length > 0 ? dbProducts : []).filter(p => {
    if (p.isOutOfStock) return false;
    if (selectedCategory.id === 'Bundles') return p.isBundle;
    return (selectedCategory.title === 'All' || p.category === selectedCategory.title) &&
           (selectedSubCategory === 'All' || p.subCategory === selectedSubCategory) &&
           matchProduct(p, searchQuery) && !p.isBundle; // Don't show bundles in regular categories
  });

  // Sorting logic
  if (sortBy === 'priceLow') filteredProducts.sort((a, b) => a.price - b.price);
  if (sortBy === 'priceHigh') filteredProducts.sort((a, b) => b.price - a.price);
  if (sortBy === 'rating') filteredProducts.sort((a, b) => (b.rating || 0) - (a.rating || 0));

  const selectedCatData = dbCategories.find(c => c.title === selectedCategory.title);
  const subCategories = selectedCategory.title !== 'All' 
    ? selectedCatData?.subCategories || []
    : [];
  
  const subCategoriesEn = selectedCategory.title !== 'All'
    ? selectedCatData?.subCategoriesEn || []
    : [];

  const categoriesToShow = dbCategories;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-7xl mx-auto pb-10 px-2"
    >
      <Helmet>
        <title>{selectedCategory.title === 'All' ? 'Products' : dData(selectedCategory.title, selectedCategory.titleEn)} - {t('app.name') || 'Grocery Store'}</title>
        <meta name="description" content={`Browse ${selectedCategory.title === 'All' ? 'fresh products' : dData(selectedCategory.title, selectedCategory.titleEn)} at our Online Store. Quality guaranteed.`} />
        <meta property="og:title" content={`${selectedCategory.title === 'All' ? 'Products' : dData(selectedCategory.title, selectedCategory.titleEn)} - Store`} />
      </Helmet>
      <div className="px-5 mb-6">
        <h1 className="font-display font-bold text-2xl mb-6 text-white">Explore Products</h1>
        
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1 group">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder={t('home.search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/5 rounded-2xl shadow-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm text-white"
            />
          </div>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="appearance-none p-3 pr-8 bg-white/5 border border-white/5 rounded-2xl shadow-sm text-xs font-bold outline-none focus:ring-2 focus:ring-primary transition-all text-white/60"
            >
              <option value="default" className="bg-black text-white">Default</option>
              <option value="priceLow" className="bg-black text-white">Price: Low to High</option>
              <option value="priceHigh" className="bg-black text-white">Price: High to Low</option>
              <option value="rating" className="bg-black text-white">Top Rated</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
          </div>
        </div>

        {/* Categories Scroller - Modern Home Style */}
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-5 px-5 scrollbar-hide mb-4">
          <button
            onClick={() => {
                setSelectedCategory({ id: 'All', title: 'All' });
                setSelectedSubCategory('All');
            }}
            className={`flex flex-col items-center gap-2 group min-w-[70px] transition-all ${
              selectedCategory.title === 'All' ? 'opacity-100' : 'opacity-40 grayscale'
            }`}
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
              selectedCategory.title === 'All' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'bg-white/5 border border-white/5 text-white/60'
            }`}>
              <Filter size={20} />
            </div>
            <span className="text-[10px] font-bold text-white/80">All</span>
          </button>

          {categoriesToShow.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                  setSelectedCategory(cat);
                  setSelectedSubCategory('All');
              }}
              className={`flex flex-col items-center gap-2 group min-w-[70px] transition-all ${
                selectedCategory.title === cat.title ? 'opacity-100' : 'opacity-40 grayscale'
              }`}
            >
              <div className={`w-14 h-14 rounded-2xl overflow-hidden transition-all ${
                selectedCategory.title === cat.title ? 'ring-2 ring-primary ring-offset-2 ring-offset-black shadow-lg shadow-primary/20' : 'bg-white/5 border border-white/5'
              }`}>
                <img 
                  src={cat.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop'} 
                  referrerPolicy="no-referrer" 
                  className="w-full h-full object-cover" 
                  alt={dData(cat.title, cat.titleEn)} 
                />
              </div>
              <span className="text-[10px] font-bold whitespace-nowrap text-white/80">{dData(cat.title, cat.titleEn)}</span>
            </button>
          ))}
        </div>

        {/* Sub-Categories Pills */}
        <AnimatePresence>
            {subCategories.length > 0 && (
                <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide"
                >
                    <button
                        onClick={() => setSelectedSubCategory('All')}
                        className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border ${
                            selectedSubCategory === 'All'
                                ? 'bg-primary text-black border-primary shadow-lg shadow-primary/20'
                                : 'bg-white/5 text-white/40 border-white/5 hover:border-white/20'
                        }`}
                    >
                        Everything
                    </button>
                    {subCategories.map((sub: string, index: number) => (
                        <button
                            key={sub}
                            onClick={() => setSelectedSubCategory(sub)}
                            className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border ${
                                selectedSubCategory === sub
                                    ? 'bg-primary text-black border-primary shadow-lg shadow-primary/20'
                                    : 'bg-white/5 text-white/40 border-white/5 hover:border-white/20'
                            }`}
                        >
                            {dData(sub, subCategoriesEn[index])}
                        </button>
                    ))}

                </motion.div>
            )}
        </AnimatePresence>
      </div>

      <div className="px-1 grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
        {filteredProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </motion.div>
  );
}
