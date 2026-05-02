import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, SlidersHorizontal, Star, Plus, Filter, Heart, ArrowUpDown, ChevronDown } from 'lucide-react';
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
          if (found) setSelectedCategory(found);
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
   
  let filteredProducts = (dbProducts.length > 0 ? dbProducts : []).filter(p => 
    (selectedCategory.title === 'All' || p.category === selectedCategory.title) &&
    (selectedSubCategory === 'All' || p.subCategory === selectedSubCategory) &&
    matchProduct(p, searchQuery)
  );

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

  const categoriesFallbacks = [
    { id: 'veg', title: 'Vegetable', titleEn: 'Vegetables', image: 'https://images.unsplash.com/photo-1566385270613-5f10394eb126?w=200&h=200&fit=crop' },
    { id: 'fruits', title: 'Phol', titleEn: 'Fruits', image: 'https://images.unsplash.com/photo-1619566636858-adb3ef26402b?w=200&h=200&fit=crop' },
    { id: 'fish', title: 'Maach', titleEn: 'Fish', image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=200&h=200&fit=crop' },
    { id: 'meat', title: 'Mangsho', titleEn: 'Meat', image: 'https://images.unsplash.com/photo-1551028150-64b9f398f678?w=200&h=200&fit=crop' },
  ];

  const categoriesToShow = dbCategories.length > 0 ? dbCategories : categoriesFallbacks;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-md mx-auto pb-10"
    >
      <Helmet>
        <title>{selectedCategory.title === 'All' ? 'Products' : dData(selectedCategory.title, selectedCategory.titleEn)} - Kishan Marketplace</title>
        <meta name="description" content={`Browse ${selectedCategory.title === 'All' ? 'fresh products' : dData(selectedCategory.title, selectedCategory.titleEn)} at Kishan Marketplace. Directly from farmers.`} />
        <meta property="og:title" content={`${selectedCategory.title === 'All' ? 'Products' : dData(selectedCategory.title, selectedCategory.titleEn)} - Kishan`} />
      </Helmet>
      <div className="px-5 mb-6">
        <h1 className="font-display font-bold text-2xl mb-6">Explore Products</h1>
        
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1 group">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder={t('home.search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm"
            />
          </div>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="appearance-none p-3 pr-8 bg-white border border-slate-100 rounded-2xl shadow-sm text-xs font-bold outline-none focus:ring-2 focus:ring-primary transition-all text-slate-500"
            >
              <option value="default">Default</option>
              <option value="priceLow">Price: Low to High</option>
              <option value="priceHigh">Price: High to Low</option>
              <option value="rating">Top Rated</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
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
              selectedCategory.title === 'All' ? 'opacity-100' : 'opacity-60 grayscale'
            }`}
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
              selectedCategory.title === 'All' ? 'bg-primary text-white shadow-lg' : 'bg-white border border-slate-100'
            }`}>
              <Filter size={20} />
            </div>
            <span className="text-[10px] font-bold">All</span>
          </button>

          {categoriesToShow.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                  setSelectedCategory(cat);
                  setSelectedSubCategory('All');
              }}
              className={`flex flex-col items-center gap-2 group min-w-[70px] transition-all ${
                selectedCategory.title === cat.title ? 'opacity-100' : 'opacity-60 grayscale'
              }`}
            >
              <div className={`w-14 h-14 rounded-2xl overflow-hidden transition-all ${
                selectedCategory.title === cat.title ? 'ring-2 ring-primary ring-offset-2 shadow-lg shadow-primary/20' : 'bg-white border border-slate-100'
              }`}>
                <img 
                  src={cat.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop'} 
                  referrerPolicy="no-referrer" 
                  className="w-full h-full object-cover" 
                  alt={dData(cat.title, cat.titleEn)} 
                />
              </div>
              <span className="text-[10px] font-bold whitespace-nowrap">{dData(cat.title, cat.titleEn)}</span>
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
                        className={`px-4 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-all ${
                            selectedSubCategory === 'All'
                                ? 'bg-slate-900 text-white'
                                : 'bg-white text-slate-500 border border-slate-100'
                        }`}
                    >
                        Everything
                    </button>
                    {subCategories.map((sub: string, index: number) => (
                        <button
                            key={sub}
                            onClick={() => setSelectedSubCategory(sub)}
                            className={`px-4 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-all ${
                                selectedSubCategory === sub
                                    ? 'bg-primary text-white shadow-md'
                                    : 'bg-white text-slate-500 border border-slate-100'
                            }`}
                        >
                            {dData(sub, subCategoriesEn[index])}
                        </button>
                    ))}
                </motion.div>
            )}
        </AnimatePresence>
      </div>

      <div className="px-5 grid grid-cols-2 gap-4">
        {filteredProducts.map((product) => (
          <motion.div
            layout
            key={product.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2rem] overflow-hidden border border-slate-50 shadow-sm hover:shadow-xl transition-all duration-300 group"
          >
            <div className="relative aspect-[4/5] overflow-hidden cursor-pointer" onClick={() => navigate(`/product/${product.id}`)}>
              <img 
                src={product.image} 
                referrerPolicy="no-referrer" 
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                alt={dData(product.name, product.nameEn)} 
              />
              <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                <Star size={10} className="text-secondary fill-secondary" />
                <span className="text-[10px] font-bold text-slate-700">{product.rating || '5.0'}</span>
              </div>
              <button 
                onClick={(e) => {
                    e.stopPropagation();
                    toggleWish(product.id);
                }}
                className={`absolute top-3 right-3 w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                    wishlistIds.includes(product.id) ? 'bg-red-500 text-white shadow-lg' : 'bg-white/80 text-slate-400 hover:text-red-500'
                }`}
              >
                <Heart size={14} fill={wishlistIds.includes(product.id) ? "currentColor" : "none"} />
              </button>
            </div>
            <div className="p-4 flex flex-col h-[180px]">
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">{product.category}</span>
              <h3 className="font-bold text-sm text-slate-800 mb-0.5 truncate cursor-pointer" onClick={() => navigate(`/product/${product.id}`)}>
                {dData(product.name, product.nameEn)}
              </h3>
              <p className="text-[10px] text-slate-400 mb-3 truncate">By {product.farmerName || product.farmer}</p>
              
              <div className="mt-auto space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xl font-display font-bold text-slate-900">৳{product.price}</span>
                    <span className="text-[10px] text-slate-400">/{product.unit}</span>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => addToCart(product)}
                    className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center shadow-sm hover:bg-primary hover:text-white transition-all"
                  >
                    <Plus size={18} />
                  </motion.button>
                </div>
                <button 
                    onClick={() => {
                        addToCart(product);
                        navigate('/checkout');
                    }}
                    className="w-full py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-slate-200 active:scale-95 transition-all"
                >
                    Buy Now
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
