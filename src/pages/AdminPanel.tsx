import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Users, ShoppingBag, Truck, CreditCard, 
  Settings, BarChart3, ShieldCheck, Search,
  CheckCircle, XCircle, Plus, Trash2, Layout,
  Layers, Camera, ChevronRight, Store, X, Clock, Bell,
  ArrowLeft, User, Box, Gift, Image as ImageIcon,
  MessageSquare, Package, Eye, EyeOff, MapPin, Phone, Globe,
  TrendingUp, ArrowUpRight
} from 'lucide-react';
import { adminService } from '../services/adminService';
import { formatCurrency } from '../lib/utils';
import { collection, onSnapshot, query, orderBy, where, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { AuthContext } from '../App';
import Invoice from '../components/Invoice';
import ImageUpload from '../components/ImageUpload';
import { format } from 'date-fns';

import { calculateDistance, formatDistance } from '../lib/geoUtils';

export default function AdminPanel() {
  const { user, role, loading: authLoading } = useContext(AuthContext);
  const navigate = useNavigate();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [deliveryAreas, setDeliveryAreas] = useState<any[]>([]);
  const [newArea, setNewArea] = useState({ name: '', fee: 50 });
  const [riderLocations, setRiderLocations] = useState<Record<string, any>>({});
  const [sellers, setSellers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'approvals' | 'banners' | 'stories' | 'categories' | 'users' | 'orders' | 'bundles' | 'settings' | 'notifications' | 'riders' | 'financials'>('dashboard');
  
  // Update rider locations
  useEffect(() => {
    if (activeTab === 'riders' || activeTab === 'orders') {
        const riders = sellers.filter(s => s.role === 'rider');
        const locs: Record<string, any> = {};
        riders.forEach(r => {
            if (r.location) locs[r.id] = r.location;
        });
        setRiderLocations(locs);
    }
  }, [activeTab, sellers]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [newSubCategory, setNewSubCategory] = useState('');
  
  // Data States
  const [banners, setBanners] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [bundles, setBundles] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [appSettings, setAppSettings] = useState<any>({ logo: '' });

  // Filters & Bulk Actions
  const [productFilter, setProductFilter] = useState({ category: '', status: '', seller: '', search: '' });
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  
  const filteredProducts = products.filter(p => {
    const matchesCat = !productFilter.category || p.category === productFilter.category;
    const matchesStatus = !productFilter.status || p.status === productFilter.status;
    const matchesSeller = !productFilter.seller || p.farmer === productFilter.seller || p.farmerName === productFilter.seller;
    const searchLow = productFilter.search.toLowerCase();
    const matchesSearch = !productFilter.search || 
      p.name?.toLowerCase().includes(searchLow) || 
      p.nameEn?.toLowerCase().includes(searchLow) ||
      p.category?.toLowerCase().includes(searchLow) ||
      p.farmer?.toLowerCase().includes(searchLow);
    return matchesCat && matchesStatus && matchesSeller && matchesSearch;
  });

  const handleBulkAction = async (action: 'approve' | 'reject' | 'delete') => {
    if (selectedProducts.length === 0) return;
    if (!confirm(`Are you sure you want to ${action} ${selectedProducts.length} products?`)) return;
    
    for (const id of selectedProducts) {
      if (action === 'approve') await adminService.approveProduct(id);
      if (action === 'reject') await adminService.rejectProduct(id);
      if (action === 'delete') await adminService.deleteProduct(id);
    }
    setSelectedProducts([]);
  };

  const pendingProducts = products.filter(p => p.status === 'pending');
  const approvedProducts = products.filter(p => p.status === 'approved');
  const pendingSellers = sellers.filter(s => s.roleRequest === 'seller' || (s.role === 'customer' && s.shopName && !s.isVerified));

  // Form States
  const [newBanner, setNewBanner] = useState({ title: '', subtitle: '', image: '' });
  const [newStory, setNewStory] = useState({ name: '', role: '', quote: '', image: '', type: 'Member' });
  const [newCategory, setNewCategory] = useState({ title: '', titleEn: '', image: '', subCategories: '', subCategoriesEn: '' });
  const [newProduct, setNewProduct] = useState({ 
    name: '', 
    nameEn: '', 
    price: '', 
    category: '', 
    subCategory: '', 
    image: '', 
    unit: 'kg', 
    minWeight: '0.1',
    weightIncrements: '0.1',
    farmer: '', 
    location: '', 
    description: '', 
    descriptionEn: '', 
    whatsappNumber: '',
    enableWeightSystem: false,
    stockQuantity: '100',
    isOutOfStock: false
  });
  const [newBundle, setNewBundle] = useState({ name: '', nameEn: '', price: '', image: '', description: '', descriptionEn: '' });

  useEffect(() => {
    if (!authLoading && role !== 'admin') {
        navigate('/');
        return;
    }

    if (role !== 'admin') return;

    const unsubBanners = onSnapshot(query(collection(db, 'banners'), orderBy('createdAt', 'desc')), (snap) => {
      setBanners(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Admin Banners:", error));

    const unsubStories = onSnapshot(query(collection(db, 'stories'), orderBy('createdAt', 'desc')), (snap) => {
      setStories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Admin Stories:", error));

    const unsubCategories = onSnapshot(collection(db, 'categories'), (snap) => {
      setCategories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Admin Categories:", error));

    const unsubProducts = onSnapshot(collection(db, 'products'), (snap) => {
      setProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Admin Products:", error));

    const unsubBundles = onSnapshot(query(collection(db, 'products'), where('isBundle', '==', true)), (snap) => {
      setBundles(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Admin Bundles:", error));

    const unsubSettings = onSnapshot(doc(db, 'settings', 'app'), (snap) => {
      if (snap.exists()) setAppSettings(snap.data());
    }, (error) => console.error("Admin Settings:", error));

    const unsubSellers = onSnapshot(collection(db, 'users'), (snap) => {
      const users = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSellers(users);
    }, (error) => console.error("Admin Users:", error));

    const unsubOrders = onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc')), (snap) => {
      setOrders(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Admin Orders:", error));

    const unsubAreas = onSnapshot(collection(db, 'delivery_areas'), (snap) => {
      setDeliveryAreas(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Admin Areas:", error));

    const unsubNotifs = onSnapshot(query(collection(db, 'notifications'), orderBy('createdAt', 'desc')), (snap) => {
      setNotifications(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Admin Notifs:", error));

    const unsubPayouts = onSnapshot(query(collection(db, 'payouts'), orderBy('createdAt', 'desc')), (snap) => {
      setPayouts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Admin Payouts:", error));

    return () => {
      unsubBanners();
      unsubStories();
      unsubCategories();
      unsubProducts();
      unsubBundles();
      unsubSettings();
      unsubSellers();
      unsubOrders();
      unsubAreas();
      unsubNotifs();
      unsubPayouts();
    };
  }, [role, authLoading, navigate]);

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price || !newProduct.image) return;

    // Auto-generate SEO fields if empty
    const finalSeoDescription = newProduct.seoDescription || (newProduct.nameEn + ' - ' + newProduct.descriptionEn).slice(0, 160);
    const finalSeoKeywords = newProduct.seoKeywords || [newProduct.name, newProduct.nameEn, newProduct.category, 'fresh', 'Supermarket'].join(', ');

    const productData = {
      ...newProduct,
      price: parseFloat(newProduct.price) || 0,
      discountPrice: newProduct.discountPrice ? parseFloat(newProduct.discountPrice) : null,
      stockQuantity: parseInt(newProduct.stockQuantity) || 0,
      isOutOfStock: newProduct.isOutOfStock,
      minWeight: parseFloat(newProduct.minWeight) || 1,
      weightIncrements: parseFloat(newProduct.weightIncrements) || 0.1,
      tags: newProduct.tags ? newProduct.tags.split(',').map((t: string) => t.trim()) : [],
      seoDescription: finalSeoDescription,
      seoKeywords: finalSeoKeywords
    };

    if (editingProductId) {
      await adminService.updateProduct(editingProductId, productData);
    } else {
      await adminService.addProduct(productData);
    }

    setNewProduct({ 
      name: '', 
      nameEn: '', 
      price: '', 
      discountPrice: '',
      category: '', 
      subCategory: '', 
      image: '', 
      unit: 'kg', 
      minWeight: '0.1',
      weightIncrements: '0.1',
      farmer: '', 
      location: '', 
      description: '', 
      descriptionEn: '', 
      tags: '',
      seoDescription: '',
      seoKeywords: '',
      whatsappNumber: '',
      enableWeightSystem: false,
      stockQuantity: '100',
      isOutOfStock: false
    });
    setIsAdding(false);
    setEditingProductId(null);
  };

  const startEditingProduct = (product: any) => {
    setEditingProductId(product.id);
    setNewProduct({
      name: product.name || '',
      nameEn: product.nameEn || '',
      price: product.price?.toString() || '',
      discountPrice: product.discountPrice?.toString() || '',
      category: product.category || '',
      subCategory: product.subCategory || '',
      image: product.image || '',
      unit: product.unit || 'kg',
      minWeight: product.minWeight?.toString() || '0.1',
      weightIncrements: product.weightIncrements?.toString() || '0.1',
      farmer: product.farmer || '',
      location: product.location || '',
      description: product.description || '',
      descriptionEn: product.descriptionEn || '',
      tags: product.tags?.join(', ') || '',
      seoDescription: product.seoDescription || '',
      seoKeywords: product.seoKeywords || '',
      whatsappNumber: product.whatsappNumber || '',
      enableWeightSystem: product.enableWeightSystem || false,
      stockQuantity: product.stockQuantity?.toString() || '0',
      isOutOfStock: product.isOutOfStock || false
    });
    setIsAdding(true);
  };

  const handleAddBanner = async () => {
    if (!newBanner.image) {
      alert('Please upload an image first');
      return;
    }
    await adminService.addBanner(newBanner);
    setNewBanner({ title: '', subtitle: '', image: '' });
    setIsAdding(false);
  };

  const handleAddStory = async () => {
    if (!newStory.name || !newStory.image) return;
    await adminService.addStory(newStory);
    setNewStory({ name: '', role: '', quote: '', image: '', type: 'Farmer' });
    setIsAdding(false);
  };

  const handleAddCategory = async () => {
    if (!newCategory.title || !newCategory.image) return;
    const subCats = newCategory.subCategories.split(',').map(s => s.trim()).filter(s => s !== '');
    const subCatsEn = newCategory.subCategoriesEn.split(',').map(s => s.trim()).filter(s => s !== '');
    await adminService.addCategory({ 
      title: newCategory.title, 
      titleEn: newCategory.titleEn,
      image: newCategory.image, 
      subCategories: subCats,
      subCategoriesEn: subCatsEn
    });
    setNewCategory({ title: '', titleEn: '', image: '', subCategories: '', subCategoriesEn: '' });
    setIsAdding(false);
  };

  const handleAddBundle = async () => {
    if (!newBundle.name || !newBundle.price || !newBundle.image) return;
    await adminService.addBundle(newBundle);
    setNewBundle({ name: '', nameEn: '', price: '', image: '', description: '', descriptionEn: '' });
    setIsAdding(false);
  };

  const updateLogo = async (base64: string) => {
    await adminService.updateAppSetting('logo', base64);
  };

  const handleAddSubCategory = async (catId: string, currentSubs: string[]) => {
    if (!newSubCategory.trim()) return;
    const updatedSubs = [...(currentSubs || []), newSubCategory.trim()];
    await adminService.updateCategory(catId, { subCategories: updatedSubs });
    setNewSubCategory('');
  };

  const handleRemoveSubCategory = async (catId: string, currentSubs: string[], subToRemove: string) => {
    const updatedSubs = currentSubs.filter(s => s !== subToRemove);
    await adminService.updateCategory(catId, { subCategories: updatedSubs });
  };

  const tabs = [
    { id: 'dashboard', label: 'Overview', icon: BarChart3 },
    { id: 'approvals', label: 'Approvals', icon: Clock },
    { id: 'orders', label: 'Orders', icon: Truck },
    { id: 'riders', label: 'Riders', icon: Truck },
    { id: 'products', label: 'Products', icon: ShoppingBag },
    { id: 'bundles', label: 'Bundles', icon: Gift },
    { id: 'banners', label: 'Banners', icon: Layout },
    { id: 'stories', label: 'Stories', icon: Camera },
    { id: 'categories', label: 'Categories', icon: Layers },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'notifications', label: 'Mailing', icon: Bell },
    { id: 'settings', label: 'Brand & Site', icon: Settings },
    { id: 'financials', label: 'Financials', icon: CreditCard },
  ];

  if (authLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (role !== 'admin') return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-black text-white"
    >
      <div className="max-w-6xl mx-auto px-5 pb-12">
        <div className="flex items-center justify-between py-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/5 border border-white/10 text-primary rounded-2xl flex items-center justify-center shadow-2xl">
              <ShieldCheck size={32} />
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl mb-0.5 text-white">Admin Central</h1>
              <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] leading-none">System Management</p>
            </div>
          </div>

          <Link 
            to="/" 
            className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-primary transition-all shadow-sm"
          >
            <ArrowLeft size={16} />
            Back to Shop
          </Link>
        </div>

      {/* Modern Tab Bar */}
      <div className="flex gap-3 overflow-x-auto pb-6 mb-8 scrollbar-hide -mx-5 px-5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border shadow-xl ${
              activeTab === tab.id 
                ? 'bg-primary text-black border-primary scale-105 shadow-primary/20' 
                : 'bg-white/5 text-white/40 border-white/5 hover:border-white/20'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { 
                  label: 'Total Orders', 
                  value: orders.length.toLocaleString(), 
                  color: 'text-blue-400', 
                  bg: 'bg-white/5 border-white/5',
                  icon: <Truck size={20} />
                },
                { 
                  label: 'Processing', 
                  value: orders.filter(o => ['pending', 'verified', 'confirmed'].includes(o.status)).length.toLocaleString(), 
                  color: 'text-primary', 
                  bg: 'bg-white/5 border-white/5',
                  icon: <Package size={20} />
                },
                { 
                  label: 'Net Revenue', 
                  value: `৳${formatCurrency(orders.filter(o => o.status !== 'cancelled').reduce((acc, o) => acc + (Number(o.total || 0)), 0))}`, 
                  color: 'text-primary', 
                  bg: 'bg-primary/5 border-primary/20',
                  icon: <ArrowUpRight size={20} />
                },
                { 
                  label: 'All Users', 
                  value: (sellers.length || 0).toLocaleString(), 
                  color: 'text-white/80', 
                  bg: 'bg-white/5 border-white/5',
                  icon: <Users size={20} />
                },
                { 
                  label: 'Total Sellers', 
                  value: (sellers.filter(s => s.role === 'seller').length || 0).toLocaleString(), 
                  color: 'text-blue-400', 
                  bg: 'bg-white/5 border-white/5',
                  icon: <ShoppingBag size={20} />
                },
                { 
                  label: 'Total Riders', 
                  value: (sellers.filter(s => s.role === 'rider').length || 0).toLocaleString(), 
                  color: 'text-primary', 
                  bg: 'bg-white/5 border-white/5',
                  icon: <Truck size={20} />
                },
                { 
                  label: 'Total Products', 
                  value: (products.length || 0).toLocaleString(), 
                  color: 'text-pink-400', 
                  bg: 'bg-white/5 border-white/5',
                  icon: <Plus size={20} />
                },
                { 
                  label: 'Avg Order Val', 
                  value: `৳${formatCurrency(orders.length > 0 ? (orders.reduce((acc, o) => acc + (Number(o.total || 0)), 0) / orders.length) : 0)}`, 
                  color: 'text-white/80', 
                  bg: 'bg-white/5 border-white/5',
                  icon: <TrendingUp size={20} />
                },
              ].map((stat) => (
                <div key={stat.label} className={`${stat.bg} p-6 rounded-[2rem] border backdrop-blur-sm shadow-xl flex flex-col justify-between group hover:border-primary/40 transition-all duration-300`}>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none">{stat.label}</p>
                    <div className={`${stat.color} opacity-40 group-hover:opacity-100 transition-opacity`}>
                        {stat.icon}
                    </div>
                  </div>
                  <h4 className={`text-2xl font-display font-black leading-none ${stat.color}`}>{stat.value}</h4>
                </div>
              ))}
            </div>

            <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
                <h3 className="font-display font-bold text-lg mb-8 text-white">Recent Order Activity</h3>
                <div className="space-y-6">
                    {orders.slice(0, 5).map(order => (
                        <div key={order.id} className="flex items-center justify-between py-4 border-b border-white/5 last:border-0">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white/40">
                                    <Truck size={24} />
                                </div>
                                <div>
                                    <h5 className="text-xs font-bold text-white">Order #{order.id.slice(-6).toUpperCase()}</h5>
                                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">{order.customerName}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-bold text-primary">৳{formatCurrency(order.total || 0)}</p>
                                <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full mt-1 inline-block ${
                                    order.status === 'delivered' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                                    order.status === 'cancelled' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                                    'bg-primary/10 text-primary border border-primary/20'
                                }`}>
                                    {order.status}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'approvals' && (
          <motion.div key="approvals" className="space-y-8">
            <div className="space-y-4">
              <h3 className="font-display font-bold text-lg px-2 flex items-center gap-3 text-white">
                <Store size={24} className="text-primary" />
                Seller Verification Queue ({pendingSellers.length})
              </h3>
              {pendingSellers.map((seller) => (
                <div key={seller.id} className="bg-white/5 p-6 rounded-3xl border border-white/5 shadow-xl">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white/20">
                        <User size={28} />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white">{seller.shopName || seller.displayName}</h4>
                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">{seller.email}</p>
                        <p className="text-[10px] text-primary font-black mt-2 tracking-widest uppercase">Requested Role: SELLER</p>
                      </div>
                    </div>
                    <div className="bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">Review Required</div>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => adminService.verifySeller(seller.id)}
                      className="flex-1 py-4 bg-primary text-black rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all"
                    >
                      Approve Seller
                    </button>
                  </div>
                </div>
              ))}
              {pendingSellers.length === 0 && (
                <div className="text-center py-16 text-white/20 text-xs bg-white/5 rounded-[2.5rem] border border-dashed border-white/10">
                  No sellers pending verification.
                </div>
              )}
            </div>

            <div className="space-y-6">
              <h3 className="font-display font-bold text-lg px-2 flex items-center gap-3 text-white">
                <Package size={24} className="text-primary" />
                Product Approval Queue ({pendingProducts.length})
              </h3>
              {pendingProducts.map((prod) => (
              <div key={prod.id} className="bg-white/5 p-6 rounded-3xl border border-white/5 shadow-xl transition-all hover:border-primary/20">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white/20 overflow-hidden shadow-inner">
                      {prod.image ? <img src={prod.image} className="w-full h-full object-cover" alt="Product" /> : <ShoppingBag size={28} />}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">{prod.name}</h4>
                      <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">{prod.farmerName || 'Unknown Seller'}</p>
                      <p className="text-xs font-bold text-primary mt-2">৳{formatCurrency(prod.price)}</p>
                    </div>
                  </div>
                  <div className="bg-white/5 text-white/40 border border-white/10 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">Pending</div>
                </div>
                
                <div className="bg-white/5 p-4 rounded-2xl mb-6 text-[11px] text-white/60 leading-relaxed italic border border-white/5">
                  "{prod.description || 'No description provided'}"
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => adminService.rejectProduct(prod.id)}
                    className="flex-1 py-4 bg-white/5 text-red-500 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all"
                  >
                    Reject Item
                  </button>
                  <button 
                    onClick={() => adminService.approveProduct(prod.id)}
                    className="flex-1 py-4 bg-primary text-black rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all"
                  >
                    Go Live
                  </button>
                </div>
              </div>
            ))}
            {pendingProducts.length === 0 && (
              <div className="text-center py-20 text-white/20 text-sm bg-white/5 rounded-[2.5rem] border border-dashed border-white/10">
                No products pending approval.
              </div>
            )}
          </div>
        </motion.div>
      )}

      {activeTab === 'orders' && (
          <motion.div key="orders" className="space-y-6">
            <h3 className="font-display font-bold text-lg px-2 text-white">Recent Transactions</h3>
            {orders.map((order) => (
              <div key={order.id} className="bg-white/5 p-6 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-xs text-white">#{order.id.slice(-8).toUpperCase()}</h4>
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">{order.customerName}</p>
                    <div className="flex flex-col gap-1 mt-3">
                      <p className="text-[10px] text-white/60 flex items-center gap-2">
                        <Phone size={10} className="text-primary" /> {order.phone}
                      </p>
                      <p className="text-[10px] text-white/60 flex items-center gap-2">
                        <MapPin size={10} className="text-primary" /> {typeof order.address === 'string' ? order.address : (order.address?.address || 'No Address')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-black text-lg text-primary leading-none">৳{formatCurrency(order.total || 0)}</p>
                    <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mt-2">{order.paymentMethod}</p>
                    {(order.discount || 0) > 0 && <p className="text-[9px] text-secondary font-black tracking-widest mt-1">DISCOUNT: -৳{formatCurrency(order.discount)}</p>}
                    {order.location && (
                      <div className="flex flex-col items-end gap-2 mt-4">
                        <a 
                          href={`https://www.google.com/maps/dir/?api=1&destination=${order.location.lat},${order.location.lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-blue-500/20 transition-all"
                        >
                          <Truck size={12} /> Navigate
                        </a>
                        {order.riderId && riderLocations[order.riderId] && (
                          <span className="text-[9px] font-black text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-lg uppercase tracking-widest">
                            Rider: {formatDistance(calculateDistance(riderLocations[order.riderId].lat, riderLocations[order.riderId].lng, order.location.lat, order.location.lng))} away
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-black/40 rounded-2xl p-5 space-y-3 border border-white/5">
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Itemized Receipt</p>
                    {order.items?.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-[11px] pb-2 border-b border-white/5 last:border-0 last:pb-0">
                            <div className="flex items-center gap-3">
                                <span className="font-black text-primary bg-primary/10 px-2 py-0.5 rounded text-[9px]">{item.quantity || 0}x</span>
                                <span className="text-white/80 font-medium">{item.name}</span>
                            </div>
                            <span className="font-bold text-white/40">৳{formatCurrency((item.price || 0) * (item.quantity || 0))}</span>
                        </div>
                    ))}
                </div>

                {order.paymentMethod !== 'cod' && (
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">Transaction ID</p>
                    <p className="text-xs font-mono font-bold text-primary tracking-wider">{order.transactionId || 'NOT PROVIDED'}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  {order.paymentStatus === 'pending' && order.paymentMethod !== 'cod' && (
                    <button 
                      onClick={() => adminService.updateOrderStatus(order.id, 'verified', 'verified')}
                      className="flex-1 py-4 bg-primary text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all"
                    >
                      Verify Payment
                    </button>
                  )}
                  {order.status === 'pending' && order.paymentMethod === 'cod' && (
                    <button 
                      onClick={() => adminService.updateOrderStatus(order.id, 'confirmed')}
                      className="flex-1 py-4 bg-white/10 text-white border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] hover:bg-white/20 transition-all"
                    >
                      Confirm Order
                    </button>
                  )}
                  <button 
                    onClick={() => adminService.updateOrderStatus(order.id, 'cancelled')}
                    className="px-6 py-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => setSelectedOrder(order)}
                    className="px-6 py-4 bg-white/5 border border-white/10 text-white/40 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:text-white transition-all shadow-xl"
                  >
                    Invoice
                  </button>
                </div>
              </div>
            ))}
            {orders.length === 0 && <p className="text-center py-24 text-white/20 text-sm font-bold tracking-widest uppercase">No transactions found</p>}
          </motion.div>
        )}

        {activeTab === 'products' && (
          <motion.div key="products" className="space-y-8">
            <div className="flex gap-4">
                <button 
                  onClick={() => setIsAdding(true)}
                  className="flex-1 py-5 bg-primary text-black rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl hover:scale-[1.02] transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                  <Plus size={22} /> Add New Product
                </button>
                {selectedProducts.length > 0 && (
                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleBulkAction('approve')}
                      className="px-8 bg-green-500/10 text-green-400 border border-green-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-green-500/20 transition-all"
                    >
                      Approve ({selectedProducts.length})
                    </button>
                    <button 
                      onClick={() => handleBulkAction('delete')}
                      className="px-8 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all"
                    >
                      Delete
                    </button>
                  </div>
                )}
            </div>

            {/* Premium Filters */}
            <div className="bg-white/5 p-10 rounded-[3rem] border border-white/5 shadow-2xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.25em] block mb-3 ml-2">Search Catalog</label>
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors" size={18} />
                        <input 
                            placeholder="Find items..." 
                            className="w-full pl-12 pr-4 py-4 bg-black/40 border border-white/10 rounded-2xl text-sm outline-none focus:border-primary/40 text-white transition-all shadow-inner"
                            value={productFilter.search}
                            onChange={e => setProductFilter({...productFilter, search: e.target.value})}
                        />
                    </div>
                </div>
                <div>
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.25em] block mb-3 ml-2">Department</label>
                    <div className="relative">
                      <select 
                          className="w-full px-5 py-4 bg-black/40 border border-white/10 rounded-2xl text-sm outline-none appearance-none text-white focus:border-primary/40 transition-all shadow-inner"
                          value={productFilter.category}
                          onChange={e => setProductFilter({...productFilter, category: e.target.value})}
                      >
                          <option value="" className="bg-slate-900">All Collections</option>
                          {categories.map(c => <option key={c.id} value={c.title} className="bg-slate-900">{c.title}</option>)}
                      </select>
                      <Layers className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" size={16} />
                    </div>
                </div>
                <div>
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.25em] block mb-3 ml-2">Status</label>
                    <div className="relative">
                      <select 
                          className="w-full px-5 py-4 bg-black/40 border border-white/10 rounded-2xl text-sm outline-none appearance-none text-white focus:border-primary/40 transition-all shadow-inner"
                          value={productFilter.status}
                          onChange={e => setProductFilter({...productFilter, status: e.target.value})}
                      >
                          <option value="" className="bg-slate-900">All Visibility</option>
                          <option value="approved" className="bg-slate-900">Live (Approved)</option>
                          <option value="pending" className="bg-slate-900">Pending Review</option>
                          <option value="rejected" className="bg-slate-900">Rejected</option>
                      </select>
                      <Clock className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" size={16} />
                    </div>
                </div>
                <div>
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.25em] block mb-3 ml-2">Partner Store</label>
                    <div className="relative">
                      <select 
                          className="w-full px-5 py-4 bg-black/40 border border-white/10 rounded-2xl text-sm outline-none appearance-none text-white focus:border-primary/40 transition-all shadow-inner"
                          value={productFilter.seller}
                          onChange={e => setProductFilter({...productFilter, seller: e.target.value})}
                      >
                          <option value="" className="bg-slate-900">All Partners</option>
                          {Array.from(new Set(products.map(p => p.farmer || p.farmerName))).filter(Boolean).map(s => (
                              <option key={s} value={s} className="bg-slate-900">{s}</option>
                          ))}
                      </select>
                      <Store className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" size={16} />
                    </div>
                </div>
            </div>

            <AnimatePresence>
              {isAdding && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }} 
                  animate={{ height: 'auto', opacity: 1 }} 
                  exit={{ height: 0, opacity: 0 }} 
                  className="bg-white/5 p-10 rounded-[3rem] border border-primary/20 overflow-hidden mb-8 shadow-2xl relative"
                >
                  <div className="flex justify-between items-center mb-10 pb-6 border-b border-white/5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20">
                        {editingProductId ? <Settings size={24} /> : <Plus size={24} />}
                      </div>
                      <h4 className="font-display font-bold text-xl text-white">{editingProductId ? 'Alter Product Record' : 'Curate New Offering'}</h4>
                    </div>
                    <button onClick={() => {
                        setIsAdding(false);
                        setEditingProductId(null);
                    }} className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white/20 hover:text-white hover:border-white/20 border border-transparent transition-all">
                      <X size={24} />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-8">
                    <div className="col-span-2 lg:col-span-1">
                      <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.25em] block mb-3 ml-2">Name (Bangla)</label>
                      <input 
                        placeholder="ভোরের তাজা সবজি" 
                        className="w-full px-6 py-5 bg-black/40 border border-white/5 rounded-[1.5rem] text-sm text-white outline-none focus:border-primary/40 transition-all font-medium"
                        value={newProduct.name}
                        onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                      />
                    </div>
                    <div className="col-span-2 lg:col-span-1">
                      <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.25em] block mb-3 ml-2">Name (English)</label>
                      <input 
                        placeholder="Fresh Garden Produce" 
                        className="w-full px-6 py-5 bg-black/40 border border-white/5 rounded-[1.5rem] text-sm text-white outline-none focus:border-primary/40 transition-all font-medium"
                        value={newProduct.nameEn}
                        onChange={e => setNewProduct({...newProduct, nameEn: e.target.value})}
                      />
                    </div>
                    
                    <div className="col-span-1">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.25em] block mb-3 ml-2">Appraisal Value (৳)</label>
                        <input 
                          type="number"
                          placeholder="Price per unit" 
                          className="w-full px-6 py-5 bg-black/40 border border-white/5 rounded-[1.5rem] text-sm text-white outline-none focus:border-primary/40 transition-all font-mono font-bold"
                          value={newProduct.price}
                          onChange={e => setNewProduct({...newProduct, price: e.target.value})}
                        />
                    </div>
                    <div className="col-span-1">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.25em] block mb-3 ml-2">Privileged Rate (Optional)</label>
                        <input 
                          type="number"
                          placeholder="Discounted Price" 
                          className="w-full px-6 py-5 bg-black/40 border border-white/5 rounded-[1.5rem] text-sm text-white outline-none focus:border-primary/40 transition-all font-mono font-bold"
                          value={newProduct.discountPrice}
                          onChange={e => setNewProduct({...newProduct, discountPrice: e.target.value})}
                        />
                    </div>

                    <div className="col-span-1">
                      <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.25em] block mb-3 ml-2">Collection</label>
                      <div className="relative">
                        <select 
                          className="w-full px-6 py-5 bg-black/40 border border-white/5 rounded-[1.5rem] text-sm text-white outline-none focus:border-primary/40 appearance-none transition-all"
                          value={newProduct.category}
                          onChange={e => setNewProduct({...newProduct, category: e.target.value, subCategory: ''})}
                        >
                          <option value="" className="bg-slate-900">Select Collection</option>
                          {categories.map(c => <option key={c.id} value={c.title} className="bg-slate-900">{c.title}</option>)}
                        </select>
                        <Layers className="absolute right-6 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" size={16} />
                      </div>
                    </div>
                    <div className="col-span-1">
                      <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.25em] block mb-3 ml-2">Niche / Origin</label>
                      <div className="relative">
                        <select 
                          className="w-full px-6 py-5 bg-black/40 border border-white/5 rounded-[1.5rem] text-sm text-white outline-none appearance-none focus:border-primary/40 transition-all"
                          value={newProduct.subCategory}
                          onChange={e => setNewProduct({...newProduct, subCategory: e.target.value})}
                        >
                          <option value="" className="bg-slate-900">Select Sub-Category</option>
                          {categories.find(c => c.title === newProduct.category)?.subCategories?.map((sub: string) => (
                            <option key={sub} value={sub} className="bg-slate-900">{sub}</option>
                          ))}
                        </select>
                        <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" size={16} />
                      </div>
                    </div>

                    <div className="col-span-2">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.25em] block mb-3 ml-2">Visual Heritage (Image Source)</label>
                        <input 
                          placeholder="Public URI for high-res visual..." 
                          className="w-full px-6 py-5 bg-black/40 border border-white/5 rounded-[1.5rem] text-sm text-white outline-none focus:border-primary/40 transition-all font-mono"
                          value={newProduct.image}
                          onChange={e => setNewProduct({...newProduct, image: e.target.value})}
                        />
                    </div>

                    <div className="col-span-2">
                      <ImageUpload 
                        onUpload={url => setNewProduct({...newProduct, image: url})} 
                        label="Source Media Asset" 
                        currentImage={newProduct.image}
                      />
                    </div>

                    <div className="col-span-1">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.25em] block mb-3 ml-2">Direct Hub contact</label>
                        <div className="relative">
                          <MessageSquare className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                          <input 
                            placeholder="+8801..." 
                            className="w-full pl-14 pr-6 py-5 bg-black/40 border border-white/5 rounded-[1.5rem] text-sm text-white outline-none focus:border-primary/40 transition-all"
                            value={newProduct.whatsappNumber}
                            onChange={e => setNewProduct({...newProduct, whatsappNumber: e.target.value})}
                          />
                        </div>
                    </div>
                    <div className="col-span-1">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.25em] block mb-3 ml-2">Registry Supply</label>
                        <div className="relative">
                          <Box className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                          <input 
                            type="number"
                            placeholder="Available Stock" 
                            className="w-full pl-14 pr-6 py-5 bg-black/40 border border-white/5 rounded-[1.5rem] text-sm text-white outline-none focus:border-primary/40 transition-all"
                            value={newProduct.stockQuantity}
                            onChange={e => setNewProduct({...newProduct, stockQuantity: e.target.value})}
                          />
                        </div>
                    </div>

                    <div className="col-span-2 space-y-4 pt-4">
                        <label className="flex items-center gap-5 cursor-pointer bg-white/5 border border-white/5 p-6 rounded-[2rem] transition-all hover:border-red-500/30 group">
                            <input 
                                type="checkbox"
                                className="w-6 h-6 accent-red-500 rounded-lg"
                                checked={newProduct.isOutOfStock}
                                onChange={e => setNewProduct({...newProduct, isOutOfStock: e.target.checked})}
                            />
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-white group-hover:text-red-400 transition-colors">Withdraw from Public Catalog</span>
                                <span className="text-[11px] text-white/30 font-medium tracking-wide">Sets stock status to 'Depleted' and hides from storefront immediately.</span>
                            </div>
                        </label>

                        <label className="flex items-center gap-5 cursor-pointer bg-white/5 border border-white/5 p-6 rounded-[2rem] transition-all hover:border-primary/30 group">
                            <input 
                                type="checkbox"
                                className="w-6 h-6 accent-primary rounded-lg"
                                checked={newProduct.enableWeightSystem}
                                onChange={e => setNewProduct({...newProduct, enableWeightSystem: e.target.checked})}
                            />
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-white group-hover:text-primary transition-colors">Granular Precision Weighting</span>
                                <span className="text-[11px] text-white/30 font-medium tracking-wide">Enable selection of micro-weights (e.g. 100g, 250g) for gourmet goods.</span>
                            </div>
                        </label>
                    </div>

                    <div className="col-span-2 pt-6 border-t border-white/5 mt-4">
                        <h5 className="text-[11px] font-black text-white/30 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                            <Globe size={18} className="text-blue-400" /> Digital Discoverability (SEO)
                        </h5>
                        <div className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.25em] block mb-3 ml-2">Market Meta Description</label>
                                <textarea 
                                    placeholder="Craft a narrative for search engine crawlers..." 
                                    className="w-full px-6 py-5 bg-black/40 border border-white/5 rounded-[1.5rem] text-sm text-white outline-none h-28 resize-none focus:border-primary/40 transition-all font-medium"
                                    value={newProduct.seoDescription || ''}
                                    onChange={e => setNewProduct({...newProduct, seoDescription: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.25em] block mb-3 ml-2">Strategic Keywords</label>
                                <input 
                                    placeholder="e.g. Heirloom, Gaibandha Gold, Pure Harvest" 
                                    className="w-full px-6 py-5 bg-black/40 border border-white/5 rounded-[1.5rem] text-sm text-white outline-none focus:border-primary/40 transition-all lowercase"
                                    value={newProduct.seoKeywords || ''}
                                    onChange={e => setNewProduct({...newProduct, seoKeywords: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>

                    <button 
                      onClick={handleAddProduct}
                      className="col-span-2 py-6 bg-primary text-black rounded-[2.5rem] font-black uppercase tracking-[0.3em] text-[11px] shadow-2xl shadow-primary/40 hover:bg-primary-dark transition-all hover:scale-[1.01] active:scale-95 mt-8 border border-primary/20"
                    >
                      {editingProductId ? 'Push Manifest Updates' : 'Authorize & Launch Offering'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center justify-between px-4 mb-8">
                <h3 className="font-display font-black text-xl text-white tracking-tight">System Inventory <span className="text-white/20 ml-2 font-sans font-medium">({filteredProducts.length})</span></h3>
                <button 
                  onClick={() => {
                    if (selectedProducts.length === filteredProducts.length) setSelectedProducts([]);
                    else setSelectedProducts(filteredProducts.map(p => p.id));
                  }}
                  className="text-[11px] font-black text-primary uppercase tracking-[0.25em] hover:brightness-125 transition-all border-b border-primary/20 pb-0.5"
                >
                  {selectedProducts.length === filteredProducts.length ? 'Discard Selection' : 'Omni-Select'}
                </button>
            </div>

            <div className="bg-white/5 rounded-[3rem] border border-white/5 shadow-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/5">
                                <th className="px-10 py-7 text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Identity</th>
                                <th className="px-10 py-7 text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Guardian</th>
                                <th className="px-10 py-7 text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Supply</th>
                                <th className="px-10 py-7 text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Audit Status</th>
                                <th className="px-10 py-7 text-center text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredProducts.map((p) => (
                                <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-10 py-7">
                                        <div className="flex items-center gap-6">
                                            <div className="relative">
                                                <input 
                                                    type="checkbox" 
                                                    className="absolute -left-12 top-1/2 -translate-y-1/2 w-5 h-5 rounded-lg border-white/10 bg-transparent accent-primary cursor-pointer transition-all"
                                                    checked={selectedProducts.includes(p.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setSelectedProducts([...selectedProducts, p.id]);
                                                        else setSelectedProducts(selectedProducts.filter(id => id !== p.id));
                                                    }}
                                                />
                                                <div className="w-16 h-16 rounded-2xl bg-black border border-white/10 overflow-hidden shadow-2xl group-hover:border-primary/40 transition-all p-0.5">
                                                    <img src={p.image} className="w-full h-full object-cover rounded-[0.9rem]" alt={p.name} />
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-white group-hover:text-primary transition-colors mb-1">{p.nameEn || p.name}</p>
                                                <p className="text-[10px] text-white/30 uppercase font-black tracking-widest">{p.category} <span className="mx-2 opacity-20">|</span> {p.subCategory}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-7">
                                        <p className="text-xs text-white/60 font-bold tracking-wide">{p.farmerName || p.farmer || 'System Admin'}</p>
                                        <p className="text-[9px] text-white/20 font-black uppercase tracking-widest mt-1">Authorized Seller</p>
                                    </td>
                                    <td className="px-10 py-7">
                                      <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-3">
                                          <Box size={14} className="text-white/20" />
                                          <input 
                                              type="number"
                                              className="w-16 bg-white/5 border border-white/10 rounded-lg text-xs font-black p-2 outline-none text-white focus:border-primary/40 transition-all"
                                              value={p.stockQuantity || 0}
                                              onChange={(e) => adminService.updateStockStatus(p.id, p.isOutOfStock ? 'Out of Stock' : 'In Stock', Number(e.target.value), p.isOutOfStock || false)}
                                          />
                                        </div>
                                        <button 
                                          onClick={() => adminService.updateStockStatus(p.id, !p.isOutOfStock ? 'Out of Stock' : 'In Stock', p.stockQuantity || 0, !p.isOutOfStock)}
                                          className={`text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-md transition-all border ${
                                            p.isOutOfStock 
                                              ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                                              : 'bg-green-500/10 text-green-400 border-green-500/20'
                                          }`}
                                        >
                                          {p.isOutOfStock ? 'Depleted' : 'In Supply'}
                                        </button>
                                      </div>
                                    </td>
                                    <td className="px-10 py-7">
                                        <div className="flex flex-col gap-2">
                                          <span className={`text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full text-center border ${
                                              p.status === 'approved' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_15px_-5px_rgba(59,130,246,0.5)]' :
                                              p.status === 'pending' ? 'bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_-5px_rgba(251,191,36,0.5)]' :
                                              'bg-red-500/10 text-red-500 border border-red-500/20'
                                          }`}>
                                              {p.status}
                                          </span>
                                          <p className="text-[10px] font-black text-primary text-center">৳{formatCurrency(p.price)} <span className="text-white/20 font-sans">/ {p.unit}</span></p>
                                        </div>
                                    </td>
                                    <td className="px-10 py-7">
                                        <div className="flex items-center justify-center gap-4">
                                            <button 
                                              onClick={() => adminService.updateProduct(p.id, { status: p.status === 'hidden' ? 'approved' : 'hidden' })}
                                              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all border shadow-xl ${
                                                p.status === 'hidden' ? 'bg-white/5 border-white/10 text-white/20' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                                              }`}
                                              title={p.status === 'hidden' ? 'Release from Archive' : 'Move to Archive'}
                                            >
                                              {p.status === 'hidden' ? <EyeOff size={20} /> : <Eye size={20} />}
                                            </button>
                                            <button 
                                                onClick={() => startEditingProduct(p)}
                                                className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white/40 hover:text-primary hover:border-primary/40 transition-all shadow-xl active:scale-90"
                                            >
                                                <Settings size={20} />
                                            </button>
                                            <button 
                                                onClick={() => adminService.deleteProduct(p.id)}
                                                className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white/40 hover:text-red-500 hover:border-red-500/40 transition-all shadow-xl active:scale-90"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredProducts.length === 0 && (
                    <div className="text-center py-32 bg-white/5">
                        <p className="text-[11px] font-black text-white/10 uppercase tracking-[0.5em]">Inventory Registry Empty</p>
                    </div>
                )}
            </div>
          </motion.div>
        )}

        {activeTab === 'banners' && (
          <motion.div key="banners" className="space-y-6">
            <button 
              onClick={() => setIsAdding(true)}
              className="w-full py-5 bg-primary text-black rounded-[2.5rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl hover:scale-[1.01] transition-all flex items-center justify-center gap-3 active:scale-95"
            >
              <Plus size={22} /> Add New Promotional Banner
            </button>

            <AnimatePresence>
              {isAdding && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-white/5 p-10 rounded-[3rem] border border-primary/20 overflow-hidden mb-8 shadow-2xl">
                  <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/5">
                    <h4 className="font-display font-bold text-lg text-white uppercase tracking-widest">Banner Configuration</h4>
                    <button onClick={() => setIsAdding(false)} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-white/40 hover:text-white transition-colors">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="col-span-2">
                            <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] block mb-2 ml-2">Header Title</label>
                            <input 
                              placeholder="Title (Optional)" 
                              className="w-full px-5 py-4 bg-black/40 border border-white/5 rounded-2xl text-sm text-white outline-none focus:border-primary/40 transition-all shadow-inner"
                              value={newBanner.title}
                              onChange={e => setNewBanner({...newBanner, title: e.target.value})}
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] block mb-2 ml-2">Call to Action Subtitle</label>
                            <input 
                              placeholder="Subtitle (Optional)" 
                              className="w-full px-5 py-4 bg-black/40 border border-white/5 rounded-2xl text-sm text-white outline-none focus:border-primary/40 transition-all shadow-inner"
                              value={newBanner.subtitle}
                              onChange={e => setNewBanner({...newBanner, subtitle: e.target.value})}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] block mb-2 ml-2">Visual Heritage (6:4 Ratio Recommended)</label>
                        <ImageUpload 
                            label="Launch Banner Visual"
                            currentImage={newBanner.image}
                            onUpload={(base64) => setNewBanner({...newBanner, image: base64})}
                        />
                    </div>
                    <button 
                      onClick={handleAddBanner} 
                      className="w-full py-5 bg-primary text-black rounded-[2rem] font-black uppercase tracking-[0.3em] text-[10px] shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all mt-4"
                    >
                      Publish Banner to Live Store
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {banners.map((item) => (
                <div key={item.id} className="bg-white/5 p-4 rounded-[2.5rem] border border-white/5 flex items-center justify-between group hover:border-primary/20 transition-all shadow-2xl">
                  <div className="flex items-center gap-5">
                    <div className="w-24 h-16 bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl group-hover:border-primary/40 transition-all">
                      <img src={item.image} className="w-full h-full object-cover" alt={item.title} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white group-hover:text-primary transition-colors">{item.title || 'Master Visual'}</h4>
                      <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mt-1">{item.subtitle || 'Promotional Event'}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => adminService.deleteBanner(item.id)}
                    className="w-11 h-11 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white/20 hover:text-red-500 hover:border-red-500/40 transition-all active:scale-90"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
            </div>
            {banners.length === 0 && (
              <div className="text-center py-20 bg-white/5 rounded-[3rem] border border-dashed border-white/10">
                <p className="text-[11px] font-black text-white/10 uppercase tracking-[0.4em]">No Live Banners</p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'stories' && (
            <motion.div key="stories" className="space-y-6">
                <button 
                  onClick={() => setIsAdding(true)} 
                  className="w-full py-5 bg-primary text-black rounded-[2.5rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl hover:scale-[1.01] transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                    <Plus size={22} /> Share New Brand Story
                </button>

                <AnimatePresence>
                  {isAdding && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-white/5 p-10 rounded-[3rem] border border-primary/20 overflow-hidden mb-8 shadow-2xl">
                      <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/5">
                        <h4 className="font-display font-bold text-lg text-white uppercase tracking-widest">Story Manifest</h4>
                        <button onClick={() => setIsAdding(false)} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-white/40 hover:text-white transition-colors">
                          <X size={20} />
                        </button>
                      </div>
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="col-span-2 lg:col-span-1">
                                <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] block mb-2 ml-2">Author / Protagonist</label>
                                <input 
                                  placeholder="e.g. Kashem Miya" 
                                  className="w-full px-5 py-4 bg-black/40 border border-white/5 rounded-2xl text-sm text-white outline-none focus:border-primary/40 transition-all font-medium"
                                  value={newStory.name}
                                  onChange={e => setNewStory({...newStory, name: e.target.value})}
                                />
                            </div>
                            <div className="col-span-2 lg:col-span-1">
                                <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] block mb-2 ml-2">Classification</label>
                                <div className="flex gap-2">
                                  {['Farmer', 'Customer', 'Seller'].map(type => (
                                    <button 
                                      key={type}
                                      onClick={() => setNewStory({...newStory, type})}
                                      className={`flex-1 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${newStory.type === type ? 'bg-primary text-black border-primary' : 'bg-white/5 text-white/40 border-white/10 hover:border-white/20'}`}
                                    >
                                      {type === 'Farmer' ? 'Merchant' : type}
                                    </button>
                                  ))}
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] block mb-2 ml-2">Authentic Narrative / Quote</label>
                            <textarea 
                              placeholder="Share the heritage or testimonial..." 
                              className="w-full px-5 py-4 bg-black/40 border border-white/5 rounded-2xl text-sm text-white outline-none focus:border-primary/40 h-28 resize-none transition-all font-medium"
                              value={newStory.quote}
                              onChange={e => setNewStory({...newStory, quote: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] block mb-2 ml-2">Portrait Visual</label>
                            <ImageUpload 
                                label="Upload Identity Asset"
                                currentImage={newStory.image}
                                onUpload={(base64) => setNewStory({...newStory, image: base64})}
                            />
                        </div>
                        <button 
                          onClick={handleAddStory} 
                          className="w-full py-5 bg-primary text-black rounded-[2rem] font-black uppercase tracking-[0.3em] text-[10px] shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all mt-4"
                        >
                          Publish Story to Community
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {stories.map((item) => (
                        <div key={item.id} className="aspect-[3/4.5] bg-black rounded-[2.5rem] border border-white/5 overflow-hidden relative group shadow-2xl">
                            <img src={item.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={item.name} />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80" />
                            <div className="absolute inset-x-0 bottom-0 p-5 z-10">
                                <span className="text-[8px] font-black tracking-widest bg-primary text-black px-3 py-1 rounded-full uppercase mb-2 inline-block shadow-lg">
                                    {item.type}
                                </span>
                                <h4 className="text-sm font-black text-white tracking-wide truncate">{item.name}</h4>
                                <p className="text-[9px] text-white/40 line-clamp-2 mt-1 font-medium">{item.quote}</p>
                            </div>
                            <button 
                              onClick={() => adminService.deleteStory(item.id)}
                              className="absolute top-4 right-4 w-10 h-10 bg-black/40 backdrop-blur-md rounded-2xl text-white/40 hover:text-red-500 flex items-center justify-center transition-all border border-white/5 active:scale-90"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                </div>
                {stories.length === 0 && (
                    <div className="text-center py-20 bg-white/5 rounded-[3rem] border border-dashed border-white/10">
                        <p className="text-[11px] font-black text-white/10 uppercase tracking-[0.4em]">No Stories in Registry</p>
                    </div>
                )}
            </motion.div>
        )}

        {activeTab === 'categories' && (
            <motion.div key="categories" className="space-y-6">
                <button 
                  onClick={() => setIsAdding(true)} 
                  className="w-full py-5 bg-primary text-black rounded-[2.5rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl hover:scale-[1.01] transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                    <Plus size={22} /> Define New Department
                </button>

                <AnimatePresence>
                  {isAdding && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-white/5 p-10 rounded-[3rem] border border-primary/20 overflow-hidden mb-8 shadow-2xl">
                      <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/5">
                        <h4 className="font-display font-bold text-lg text-white uppercase tracking-widest">Department Registry</h4>
                        <button onClick={() => setIsAdding(false)} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-white/40 hover:text-white transition-colors">
                          <X size={20} />
                        </button>
                      </div>
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="col-span-2 lg:col-span-1">
                                <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] block mb-2 ml-2">Display Title (Bangla)</label>
                                <input 
                                  placeholder="e.g. সবজি বাগান" 
                                  className="w-full px-5 py-4 bg-black/40 border border-white/5 rounded-2xl text-sm text-white outline-none focus:border-primary/40 transition-all font-medium"
                                  value={newCategory.title}
                                  onChange={e => setNewCategory({...newCategory, title: e.target.value})}
                                />
                            </div>
                            <div className="col-span-2 lg:col-span-1">
                                <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] block mb-2 ml-2">Display Title (English)</label>
                                <input 
                                  placeholder="e.g. Fresh Vegetables" 
                                  className="w-full px-5 py-4 bg-black/40 border border-white/5 rounded-2xl text-sm text-white outline-none focus:border-primary/40 transition-all font-medium"
                                  value={newCategory.titleEn}
                                  onChange={e => setNewCategory({...newCategory, titleEn: e.target.value})}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] block mb-2 ml-2">Iconography Visual</label>
                            <ImageUpload 
                                label="Upload Category Emblem"
                                currentImage={newCategory.image}
                                onUpload={(base64) => setNewCategory({...newCategory, image: base64})}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="col-span-2">
                                <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] block mb-2 ml-2">Niche Collections (Bangla, comma separated)</label>
                                <input 
                                  placeholder="e.g. আলু, বেগুন, মরিচ" 
                                  className="w-full px-5 py-4 bg-black/40 border border-white/5 rounded-2xl text-[13px] text-white outline-none focus:border-primary/40 transition-all"
                                  value={newCategory.subCategories}
                                  onChange={e => setNewCategory({...newCategory, subCategories: e.target.value})}
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] block mb-2 ml-2">Niche Collections (English, comma separated)</label>
                                <input 
                                  placeholder="e.g. Potato, Brinjal, Chilli" 
                                  className="w-full px-5 py-4 bg-black/40 border border-white/5 rounded-2xl text-[13px] text-white outline-none focus:border-primary/40 transition-all"
                                  value={newCategory.subCategoriesEn}
                                  onChange={e => setNewCategory({...newCategory, subCategoriesEn: e.target.value})}
                                />
                            </div>
                        </div>
                        <button 
                          onClick={handleAddCategory} 
                          className="w-full py-5 bg-primary text-black rounded-[2rem] font-black uppercase tracking-[0.3em] text-[10px] shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all mt-4"
                        >
                          Register Department
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="bg-white/5 rounded-[3rem] border border-white/5 shadow-2xl overflow-hidden divide-y divide-white/5">
                    {categories.map((cat) => (
                        <div key={cat.id} className="flex flex-col">
                            <div className="p-8 flex items-center justify-between transition-colors hover:bg-white/5">
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 bg-black border border-white/10 rounded-[1.5rem] overflow-hidden shadow-2xl p-0.5">
                                      <img src={cat.image} className="w-full h-full object-cover rounded-[1.3rem]" alt={cat.title} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-base font-black text-white group-hover:text-primary transition-colors tracking-tight">{cat.title}</span>
                                        <div className="flex items-center gap-2 mt-1">
                                          <p className="text-[10px] text-white/30 font-black uppercase tracking-widest">
                                              {cat.subCategories?.length || 0} Niche Collections
                                          </p>
                                          <span className="w-1 h-1 bg-white/10 rounded-full" />
                                          <p className="text-[10px] text-primary/60 font-medium italic">{(cat as any).titleEn}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button 
                                      onClick={() => setEditingCategory(editingCategory === cat.id ? null : cat.id)}
                                      className={`w-12 h-12 rounded-2xl transition-all flex items-center justify-center border ${editingCategory === cat.id ? 'bg-primary border-primary text-black' : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:border-white/20'}`}
                                    >
                                        <Settings size={22} />
                                    </button>
                                    <button 
                                      onClick={() => adminService.deleteCategory(cat.id)}
                                      className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white/20 hover:text-red-500 hover:border-red-500/40 transition-all active:scale-90"
                                    >
                                        <Trash2 size={22} />
                                    </button>
                                </div>
                            </div>
                            
                            <AnimatePresence>
                                {editingCategory === cat.id && (
                                    <motion.div 
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="px-10 pb-10 bg-black/20"
                                    >
                                        <div className="pt-6 space-y-6">
                                            <div className="flex flex-wrap gap-3">
                                                {cat.subCategories?.map((sub: string) => (
                                                    <div key={sub} className="group flex items-center gap-2 bg-white/5 border border-white/5 px-4 py-2 rounded-xl transition-all hover:border-primary/30">
                                                        <span className="text-[11px] font-black text-white/60 tracking-wide">{sub}</span>
                                                        <button 
                                                            onClick={() => handleRemoveSubCategory(cat.id, cat.subCategories, sub)}
                                                            className="text-white/20 hover:text-red-400 transition-colors"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                            
                                            <div className="flex gap-4">
                                                <input 
                                                    placeholder="Inject new sub-collection..." 
                                                    className="flex-1 px-6 py-4 bg-black/40 border border-white/10 rounded-2xl text-xs text-white outline-none focus:border-primary/40 transition-all"
                                                    value={newSubCategory}
                                                    onChange={e => setNewSubCategory(e.target.value)}
                                                    onKeyPress={e => e.key === 'Enter' && handleAddSubCategory(cat.id, cat.subCategories)}
                                                />
                                                <button 
                                                    onClick={() => handleAddSubCategory(cat.id, cat.subCategories)}
                                                    className="px-8 bg-primary text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all"
                                                >
                                                    Authorize
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>
            </motion.div>
        )}

        {activeTab === 'riders' && (
          <motion.div key="riders" className="space-y-8">
            <div className="flex items-center justify-between px-2">
                <h3 className="font-display font-black text-2xl text-white tracking-tight">Delivery Elite Force</h3>
                <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] bg-white/5 px-4 py-1.5 rounded-full border border-white/5">
                  Registry: {sellers.filter(u => u.role === 'rider').length} Active
                </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sellers.filter(u => u.role === 'rider').map((rider) => (
                <div key={rider.id} className="bg-white/5 p-8 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group hover:border-primary/20 transition-all">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-primary/10 transition-all" />
                  
                  <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="w-24 h-24 bg-black rounded-[2.5rem] border border-white/5 flex items-center justify-center text-primary shadow-2xl mb-6 group-hover:border-primary/40 transition-all p-1">
                      {rider.photoURL ? (
                        <img src={rider.photoURL} className="w-full h-full object-cover rounded-[2.2rem]" alt="" />
                      ) : (
                        <div className="w-full h-full bg-white/5 rounded-[2.2rem] flex items-center justify-center">
                          <User size={32} />
                        </div>
                      )}
                    </div>
                    
                    <h4 className="font-display font-bold text-lg text-white mb-1 group-hover:text-primary transition-colors">{rider.realName || rider.displayName}</h4>
                    <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.25em] mb-4">{rider.phone || 'Registry Unverified'}</p>
                    
                    <div className="flex items-center gap-3 mb-8">
                      <span className={`text-[8px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border ${
                        rider.isVerified 
                          ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                          : 'bg-red-500/10 text-red-500 border-red-500/20'
                      }`}>
                        {rider.isVerified ? 'Elite Verified' : 'Audit Pending'}
                      </span>
                      <span className={`text-[8px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border ${
                        rider.status === 'online' 
                          ? 'bg-primary/10 text-primary border-primary/20' 
                          : 'bg-white/5 text-white/20 border-white/10'
                      }`}>
                        {rider.status || 'Offline'}
                      </span>
                    </div>

                    <div className="flex flex-col w-full gap-3">
                        {!rider.isVerified && (
                          <button 
                            onClick={() => adminService.updateUserRole(rider.id, 'rider', true)}
                            className="w-full py-5 bg-primary text-black rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.3em] shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95"
                          >
                            Authorize & Verify
                          </button>
                        )}
                        <button 
                          onClick={() => adminService.deleteUser(rider.id)}
                          className="w-full py-4 bg-white/5 border border-white/5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-red-500 hover:border-red-500/40 transition-all flex items-center justify-center gap-2"
                        >
                          <Trash2 size={16} /> Decommission Partner
                        </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {sellers.filter(u => u.role === 'rider').length === 0 && (
                <div className="text-center py-32 bg-white/5 rounded-[3rem] border border-dashed border-white/10">
                    <p className="text-[11px] font-black text-white/10 uppercase tracking-[0.5em]">No Delivery Partners Found</p>
                </div>
            )}
          </motion.div>
        )}

        {activeTab === 'users' && (
            <motion.div key="users" className="space-y-8">
                <div className="flex items-center justify-between px-2">
                    <h2 className="font-display font-black text-3xl text-white tracking-tight">Citizen Directory</h2>
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] bg-white/5 px-6 py-2 rounded-full border border-white/5">
                      Unified Registry: {sellers.length} Total
                    </span>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {sellers.map((u) => (
                        <div key={u.id} className="bg-white/5 p-8 rounded-[3rem] border border-white/5 transition-all hover:bg-white/[0.07] hover:border-primary/20 group relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl opacity-0 group-hover:opacity-100 transition-all duration-700" />
                            
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 relative z-10">
                                <div className="flex items-center gap-8">
                                    <div className={`w-20 h-20 rounded-[2rem] border shadow-2xl flex items-center justify-center transition-all group-hover:scale-105 ${
                                        u.role === 'admin' ? 'bg-primary border-primary text-black' : 
                                        u.role === 'seller' ? 'bg-white/10 border-white/20 text-primary' : 
                                        u.role === 'rider' ? 'bg-white/10 border-white/20 text-blue-400' : 
                                        'bg-white/5 border-white/10 text-white/20'
                                    }`}>
                                        {u.role === 'admin' ? <ShieldCheck size={32} /> : 
                                         u.role === 'seller' ? <Store size={32} /> : 
                                         u.role === 'rider' ? <Truck size={32} /> : 
                                         <User size={32} />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h4 className="font-display font-bold text-xl text-white tracking-wide">{u.displayName || 'Anonymous Citizen'}</h4>
                                            {u.isVerified && <CheckCircle size={18} className="text-primary" />}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-4 mt-2">
                                            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{u.role || 'customer'}</span>
                                            <span className="w-1 h-1 bg-white/10 rounded-full" />
                                            <span className="text-[10px] font-bold text-white/40 tracking-wider font-mono">{u.email}</span>
                                            {u.isBlocked && (
                                                <span className="bg-red-500/20 text-red-500 text-[8px] px-3 py-1 rounded-full font-black uppercase tracking-widest border border-red-500/20">Access Restricted</span>
                                            )}
                                        </div>
                                        {u.payoutAccount && (
                                            <div className="flex items-center gap-3 mt-4 bg-black/40 px-4 py-2 rounded-xl border border-white/5 w-fit">
                                                <span className="text-[8px] font-black text-primary uppercase tracking-widest leading-none">{u.paymentMethod}</span>
                                                <span className="text-[10px] font-mono text-white/60 tracking-wider">{u.payoutAccount}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                                    {!u.isVerified && (u.roleRequest === 'seller' || u.roleRequest === 'rider') && (
                                        <button 
                                            onClick={() => u.roleRequest === 'seller' ? adminService.verifySeller(u.id) : adminService.updateUserRole(u.id, 'rider', true)}
                                            className="px-8 py-4 bg-primary text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-105 transition-all"
                                        >
                                            Authorize Role
                                        </button>
                                    )}
                                    
                                    <div className="flex items-center gap-2 bg-black/40 p-2 rounded-2xl border border-white/5">
                                        <button 
                                            onClick={() => adminService.blockUser(u.id, !u.isBlocked)}
                                            className={`w-11 h-11 flex items-center justify-center rounded-xl border transition-all ${u.isBlocked ? 'bg-red-500 border-red-500 text-white' : 'bg-white/5 border-white/5 text-white/20 hover:text-red-500 hover:border-red-500/40'}`}
                                            title={u.isBlocked ? "Unblock User" : "Block User"}
                                        >
                                            <XCircle size={20} />
                                        </button>
                                        
                                        {u.email !== 'mehedihasa6682@gmail.com' ? (
                                            <select 
                                                value={u.role || 'customer'}
                                                onChange={(e) => adminService.updateUserRole(u.id, e.target.value)}
                                                className="bg-transparent text-white text-[10px] font-black uppercase tracking-widest px-4 py-2.5 outline-none cursor-pointer"
                                            >
                                                <option className="bg-zinc-900" value="customer">Customer</option>
                                                <option className="bg-zinc-900" value="seller">Seller</option>
                                                <option className="bg-zinc-900" value="rider">Rider</option>
                                                <option className="bg-zinc-900" value="admin">Admin</option>
                                            </select>
                                        ) : (
                                            <span className="text-[10px] font-black text-primary/40 uppercase tracking-[0.2em] px-4 py-2.5">Founder</span>
                                        )}
                                        
                                        <button 
                                            onClick={() => {
                                                if (u.email === 'mehedihasa6682@gmail.com') {
                                                    alert("Cannot remove primary admin.");
                                                    return;
                                                }
                                                if(confirm("Are you sure you want to delete this user?")) {
                                                    adminService.deleteSeller(u.id);
                                                }
                                            }}
                                            className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 text-white/20 hover:text-red-500 hover:border-red-500/40 transition-all active:scale-90"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-8 pt-8 border-t border-white/5 flex justify-between items-center px-2">
                                <div className="flex gap-12">
                                    <div className="flex flex-col gap-1.5">
                                        <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em]">Last Pulse Detected</p>
                                        <p className="text-[11px] font-black text-white/60 tracking-wider font-mono italic">
                                            {u.lastLogin?.toDate ? format(u.lastLogin.toDate(), 'dd MMM yyyy - HH:mm:ss') : 'Pulse Silent'}
                                        </p>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em]">Citizen ID</p>
                                        <p className="text-[10px] font-mono text-white/30 tracking-tight">{u.id}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${u.status === 'online' ? 'bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]' : 'bg-white/10'}`} />
                                    <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">{u.status || 'offline'}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>
        )}

        {activeTab === 'bundles' && (
            <motion.div key="bundles" className="space-y-8">
                <button 
                    onClick={() => setIsAdding(true)} 
                    className="w-full py-5 bg-primary text-black rounded-[2.5rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl hover:scale-[1.01] transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                    <Plus size={22} /> Orchestrate New Bundle Offer
                </button>

                <AnimatePresence>
                  {isAdding && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-white/5 p-10 rounded-[3rem] border border-primary/20 overflow-hidden mb-8 shadow-2xl">
                      <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/5">
                        <h4 className="font-display font-bold text-lg text-white uppercase tracking-widest">Bundle Manifest</h4>
                        <button onClick={() => setIsAdding(false)} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-white/40 hover:text-white transition-colors">
                          <X size={20} />
                        </button>
                      </div>
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="col-span-2 lg:col-span-1">
                                <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] block mb-2 ml-2">Bundle Designation (Bangla)</label>
                                <input 
                                  placeholder="e.g. রমজান স্পেশাল" 
                                  className="w-full px-5 py-4 bg-black/40 border border-white/5 rounded-2xl text-sm text-white outline-none focus:border-primary/40 transition-all"
                                  value={newBundle.name}
                                  onChange={e => setNewBundle({...newBundle, name: e.target.value})}
                                />
                            </div>
                            <div className="col-span-2 lg:col-span-1">
                                <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] block mb-2 ml-2">Bundle Designation (English)</label>
                                <input 
                                  placeholder="e.g. Ramadan Feast" 
                                  className="w-full px-5 py-4 bg-black/40 border border-white/5 rounded-2xl text-sm text-white outline-none focus:border-primary/40 transition-all font-medium"
                                  value={newBundle.nameEn}
                                  onChange={e => setNewBundle({...newBundle, nameEn: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="col-span-2 lg:col-span-1">
                                <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] block mb-2 ml-2">Appraised Value (৳)</label>
                                <input 
                                  type="number"
                                  placeholder="e.g. 1500" 
                                  className="w-full px-5 py-4 bg-black/40 border border-white/5 rounded-2xl text-sm text-white outline-none focus:border-primary/40 transition-all font-mono"
                                  value={newBundle.price}
                                  onChange={e => setNewBundle({...newBundle, price: e.target.value})}
                                />
                            </div>
                            <div className="col-span-2 lg:col-span-1">
                                <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] block mb-2 ml-2">Collection Visual</label>
                                <ImageUpload 
                                    label="Upload Bundle Identity Asset"
                                    currentImage={newBundle.image}
                                    onUpload={(base64) => setNewBundle({...newBundle, image: base64})}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] block mb-2 ml-2">Curation Narrative</label>
                            <textarea 
                              placeholder="Describe the items in this exclusive collection..." 
                              className="w-full px-5 py-4 bg-black/40 border border-white/5 rounded-2xl text-sm text-white outline-none focus:border-primary/40 h-28 resize-none transition-all"
                              value={newBundle.description}
                              onChange={e => setNewBundle({...newBundle, description: e.target.value})}
                            />
                        </div>
                        <button 
                            onClick={handleAddBundle} 
                            className="w-full py-5 bg-primary text-black rounded-[2rem] font-black uppercase tracking-[0.3em] text-[10px] shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all mt-4"
                        >
                            Authorize Collection Placement
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {bundles.map((bundle) => (
                        <div key={bundle.id} className="bg-white/5 p-6 rounded-[2.5rem] border border-white/5 flex items-center justify-between shadow-2xl hover:border-primary/20 group transition-all">
                            <div className="flex items-center gap-6">
                                <div className="w-24 h-24 bg-black rounded-3xl overflow-hidden border border-white/5 shadow-2xl p-0.5">
                                    <img src={bundle.image} className="w-full h-full object-cover rounded-[1.4rem]" alt={bundle.name} />
                                </div>
                                <div>
                                    <h4 className="font-display font-bold text-lg text-white group-hover:text-primary transition-all">{bundle.name}</h4>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-[10px] font-black text-primary tracking-widest uppercase">৳{formatCurrency(bundle.price)}</span>
                                        <span className="w-1 h-1 bg-white/10 rounded-full" />
                                        <p className="text-[10px] font-medium text-white/30 italic">{(bundle as any).nameEn}</p>
                                    </div>
                                    <p className="text-[9px] text-white/20 mt-2 line-clamp-1 max-w-[200px]">{bundle.description}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => adminService.deleteBundle(bundle.id)}
                                className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white/20 hover:text-red-500 hover:border-red-500/40 transition-all active:scale-90"
                            >
                                <Trash2 size={22} />
                            </button>
                        </div>
                    ))}
                </div>
                {bundles.length === 0 && (
                    <div className="text-center py-32 bg-white/5 rounded-[3rem] border border-dashed border-white/10">
                        <p className="text-[11px] font-black text-white/10 uppercase tracking-[0.5em]">No Bundle Assets in Inventory</p>
                    </div>
                )}
            </motion.div>
        )}

        {activeTab === 'settings' && (
            <motion.div key="settings" className="space-y-10">
                <div className="bg-white/5 p-10 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-secondary/10 rounded-full -ml-16 -mt-16 blur-2xl group-hover:bg-secondary/20 transition-all duration-700" />
                    <h3 className="font-display font-black text-xl mb-8 flex items-center gap-4 text-white uppercase tracking-widest relative z-10">
                        <MessageSquare size={24} className="text-secondary" />
                        Marketing Ecosystem
                    </h3>
                    <div className="space-y-6 text-[11px] text-white/40 leading-relaxed relative z-10">
                        <div className="p-8 bg-black/40 border border-secondary/20 rounded-[2rem] shadow-inner mb-2">
                          <p className="font-black text-secondary uppercase tracking-[0.2em] mb-4 text-xs">Propaganda Strategy (Free Tier):</p>
                          <ul className="space-y-4 font-medium">
                            <li className="flex items-start gap-3">
                                <span className="w-1.5 h-1.5 bg-secondary rounded-full mt-1.5 shadow-[0_0_8px_rgba(var(--secondary-rgb),0.5)]" />
                                <span><strong>In-App Pulse:</strong> Use "Targeted Notification" with empty UID to reach the entire population. Zero cost.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="w-1.5 h-1.5 bg-secondary rounded-full mt-1.5 shadow-[0_0_8px_rgba(var(--secondary-rgb),0.5)]" />
                                <span><strong>Push Transmission:</strong> VAPID keys are authorized. Subscribed citizens will receive alerts on all devices.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="w-1.5 h-1.5 bg-secondary rounded-full mt-1.5 shadow-[0_0_8px_rgba(var(--secondary-rgb),0.5)]" />
                                <span><strong>Broadcast Email:</strong> Use "Email All Users" to trigger a secure BCC broadcast from your terminal.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="w-1.5 h-1.5 bg-secondary rounded-full mt-1.5 shadow-[0_0_8px_rgba(var(--secondary-rgb),0.5)]" />
                                <span><strong>Global Alert:</strong> Deploy the Promo Banner below for universal visibility.</span>
                            </li>
                          </ul>
                        </div>
                    </div>
                </div>

                <div className="bg-white/5 p-10 rounded-[3rem] border border-white/5 shadow-2xl overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-primary/20 transition-all duration-700" />
                    <h3 className="font-display font-black text-xl mb-8 flex items-center gap-4 text-white uppercase tracking-widest relative z-10">
                        <Layout size={24} className="text-primary" />
                        Promotional Broadcast
                    </h3>
                    <div className="space-y-6 max-w-lg relative z-10">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] ml-2">Broadcast Script (e.g. Eid Al-Adha Collection)</label>
                          <input 
                              placeholder="Enter the message of the day..." 
                              className="w-full px-6 py-5 bg-black/40 border border-white/5 rounded-2xl text-sm text-white outline-none focus:border-primary/40 transition-all shadow-inner font-medium"
                              id="promoText"
                              defaultValue={appSettings.promoBanner || ''}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <button 
                              onClick={async () => {
                                  const text = (document.getElementById('promoText') as HTMLInputElement).value;
                                  const { updateDoc, doc } = await import('firebase/firestore');
                                  const { db } = await import('../firebase');
                                  await updateDoc(doc(db, 'settings', 'app'), { 
                                    promoBanner: text || null,
                                    updatedAt: new Date().toISOString()
                                  });
                                  alert('Broadcast Updated!');
                              }}
                              className="py-5 bg-primary text-black rounded-2xl font-black text-[11px] uppercase tracking-[0.25em] shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95"
                          >
                              Authorize Broadcast
                          </button>
                          <button 
                              onClick={async () => {
                                  const { updateDoc, doc } = await import('firebase/firestore');
                                  const { db } = await import('../firebase');
                                  await updateDoc(doc(db, 'settings', 'app'), { 
                                    promoBanner: null,
                                    updatedAt: new Date().toISOString()
                                  });
                                  (document.getElementById('promoText') as HTMLInputElement).value = '';
                                  alert('Broadcast Silenced!');
                              }}
                              className="py-5 bg-white/5 text-white/40 rounded-2xl font-black text-[11px] uppercase tracking-[0.25em] border border-white/5 hover:bg-white/10 transition-all active:scale-95"
                          >
                              Deactivate
                          </button>
                        </div>
                    </div>
                </div>

                <div className="bg-white/5 p-10 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/5 rounded-full -ml-16 -mb-16 blur-2xl group-hover:bg-primary/10 transition-all duration-700" />
                    <h3 className="font-display font-black text-xl mb-8 flex items-center gap-4 text-white uppercase tracking-widest relative z-10">
                        <Bell size={24} className="text-primary" />
                        Targeted Frequency
                    </h3>
                    <div className="space-y-6 max-w-lg relative z-10">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                             <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">UID (Clear for All)</label>
                             <input 
                                 placeholder="Identity ID" 
                                 className="w-full px-6 py-4 bg-black/40 border border-white/5 rounded-2xl text-[13px] text-white outline-none focus:border-primary/40 font-mono"
                                 id="targetUserId"
                             />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">Frequency Type</label>
                             <select 
                               id="notifType"
                               className="w-full px-6 py-4 bg-black/40 border border-white/5 rounded-2xl text-[10px] outline-none font-black text-white/60 uppercase tracking-widest cursor-pointer"
                             >
                               <option className="bg-zinc-900" value="promo">Exclusive Offer</option>
                               <option className="bg-zinc-900" value="order">Logistics Update</option>
                               <option className="bg-zinc-900" value="payment">Financial Intel</option>
                               <option className="bg-zinc-900" value="system">System Nexus</option>
                             </select>
                          </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">Transmission Header</label>
                            <input 
                                placeholder="Core notification title..." 
                                className="w-full px-6 py-4 bg-black/40 border border-white/5 rounded-2xl text-sm text-white outline-none focus:border-primary/40 font-bold tracking-wide"
                                id="notifTitle"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">Detailed Narrative</label>
                            <textarea 
                                placeholder="Message encryption body..." 
                                className="w-full px-6 py-4 bg-black/40 border border-white/5 rounded-2xl text-sm text-white h-32 outline-none focus:border-primary/40 resize-none font-medium leading-relaxed"
                                id="notifMessage"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <button 
                                onClick={async () => {
                                    const uid = (document.getElementById('targetUserId') as HTMLInputElement).value;
                                    const title = (document.getElementById('notifTitle') as HTMLInputElement).value;
                                    const msg = (document.getElementById('notifMessage') as HTMLInputElement).value;
                                    const type = (document.getElementById('notifType') as HTMLSelectElement).value as any;
                                    
                                    if(title && msg) {
                                        const { NotificationService } = await import('../services/notificationService');
                                        
                                        if (uid) {
                                            await NotificationService.sendNotification({
                                                userId: uid,
                                                title,
                                                message: msg,
                                                type: type
                                            });
                                            alert('Pulse Sent to Target Citizen!');
                                        } else {
                                            if (confirm('Authorize Global Broadcast to ALL citizens?')) {
                                              await NotificationService.sendNotification({
                                                  userId: 'all',
                                                  title,
                                                  message: msg,
                                                  type: type
                                              });
                                              alert(`Universal Pulse Transmitted!`);
                                            }
                                        }
                                        
                                        (document.getElementById('targetUserId') as HTMLInputElement).value = '';
                                        (document.getElementById('notifTitle') as HTMLInputElement).value = '';
                                        (document.getElementById('notifMessage') as HTMLInputElement).value = '';
                                    } else {
                                        alert('Validation Error: Header and Narrative Required');
                                    }
                                }}
                                className="w-full py-5 bg-primary text-black rounded-2xl font-black text-[11px] uppercase tracking-[0.25em] shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95"
                            >
                                Initiate Transmission
                            </button>
                            <button 
                                onClick={async () => {
                                    const title = (document.getElementById('notifTitle') as HTMLInputElement).value;
                                    const msg = (document.getElementById('notifMessage') as HTMLInputElement).value;
                                    const { getDocs, collection } = await import('firebase/firestore');
                                    const { db } = await import('../firebase');
                                    
                                    if (!title || !msg) {
                                      alert('Validation Error: Header and Body Required for Email Broadcast');
                                      return;
                                    }

                                    const usersSnap = await getDocs(collection(db, 'users'));
                                    const emails = usersSnap.docs.map(d => d.data().email).filter(e => e);
                                    
                                    if (emails.length === 0) {
                                      alert('Directory Error: No citizen emails identified');
                                      return;
                                    }

                                    const bcc = emails.join(',');
                                    const mailtoUrl = `mailto:?bcc=${bcc}&subject=${encodeURIComponent(title)}&body=${encodeURIComponent(msg)}`;
                                    window.open(mailtoUrl, '_blank');
                                }}
                                className="w-full bg-white/5 text-white/40 py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.25em] border border-white/5 hover:bg-white/10 transition-all active:scale-95"
                            >
                                Broadcast Email
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-white/5 p-10 rounded-[3rem] border border-white/5 shadow-2xl relative group overflow-hidden">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-primary/5 rounded-full -ml-16 -mt-16 blur-2xl group-hover:bg-primary/10 transition-all duration-700" />
                    <h3 className="font-display font-black text-xl mb-8 flex items-center gap-4 text-white uppercase tracking-widest relative z-10">
                        <MessageSquare size={24} className="text-primary" />
                        Infrastructure & Support
                    </h3>
                    <div className="space-y-6 max-w-sm relative z-10">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] ml-2">Secure WhatsApp Link</label>
                          <input 
                              placeholder="+8801..." 
                              className="w-full px-6 py-4 bg-black/40 border border-white/5 rounded-2xl text-[13px] text-white outline-none focus:border-primary/40 font-mono"
                              id="whatsappNum"
                              defaultValue={appSettings.whatsappNumber || ''}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] ml-2">Official Support Email</label>
                          <input 
                              placeholder="support@example.com" 
                              className="w-full px-6 py-4 bg-black/40 border border-white/5 rounded-2xl text-[13px] text-white outline-none focus:border-primary/40 font-medium"
                              id="supportEmail"
                              defaultValue={appSettings.supportEmail || ''}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] ml-2">Headquarters Address</label>
                          <input 
                              placeholder="House 0, Road 0..." 
                              className="w-full px-6 py-4 bg-black/40 border border-white/5 rounded-2xl text-[13px] text-white outline-none focus:border-primary/40 font-medium"
                              id="shopAddress"
                              defaultValue={appSettings.shopAddress || ''}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] ml-2">Ticker Announcement Text</label>
                          <input 
                              placeholder="Free delivery on orders over 1000tk!" 
                              className="w-full px-6 py-4 bg-black/40 border border-white/5 rounded-2xl text-[13px] text-white outline-none focus:border-primary/40 font-medium italic"
                              id="announcementBar"
                              defaultValue={appSettings.announcementBar || ''}
                          />
                        </div>
                        <button 
                            onClick={async () => {
                                const whatsapp = (document.getElementById('whatsappNum') as HTMLInputElement).value;
                                const email = (document.getElementById('supportEmail') as HTMLInputElement).value;
                                const address = (document.getElementById('shopAddress') as HTMLInputElement).value;
                                const promo = (document.getElementById('announcementBar') as HTMLInputElement).value;

                                const { updateDoc, doc } = await import('firebase/firestore');
                                const { db } = await import('../firebase');
                                await updateDoc(doc(db, 'settings', 'app'), { 
                                  whatsappNumber: whatsapp || null,
                                  supportEmail: email || null,
                                  shopAddress: address || null,
                                  announcementBar: promo || null,
                                  updatedAt: new Date().toISOString()
                                });
                                alert('Infrastructure Manifest Updated!');
                            }}
                            className="w-full py-5 bg-primary text-black rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95 mt-4"
                        >
                            Authorize Site Configuration
                        </button>
                    </div>
                </div>

                <div className="bg-white/5 p-10 rounded-[3rem] border border-white/5 shadow-2xl relative group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-primary/10 transition-all duration-700" />
                    <h3 className="font-display font-black text-xl mb-8 flex items-center gap-4 text-white uppercase tracking-widest relative z-10">
                        <ImageIcon size={24} className="text-primary" />
                        Aesthetic & Identity
                    </h3>
                    <div className="space-y-10 relative z-10">
                        <div className="max-w-md space-y-3">
                          <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] ml-2">Venture Designation (App Name)</label>
                          <input 
                              placeholder="e.g. Supermarket" 
                              className="w-full px-6 py-4 bg-black/40 border border-white/5 rounded-2xl text-[14px] text-white font-bold outline-none focus:border-primary/40 tracking-wide"
                              id="appNameInput"
                              defaultValue={appSettings.appName || ''}
                              onBlur={async (e) => {
                                await adminService.updateAppSetting('appName', e.target.value);
                              }}
                          />
                        </div>
                        
                        <div className="max-w-md">
                            <ImageUpload 
                                label="Primary Identity Asset (Logo)"
                                currentImage={appSettings.logo}
                                onUpload={updateLogo}
                            />
                            <p className="text-[9px] text-white/20 mt-4 leading-relaxed font-black uppercase tracking-[0.2em] italic">
                                Appears on navbar, secure communications, and app icon.
                            </p>
                        </div>

                        <div className="border-t border-white/5 pt-10">
                          <h4 className="font-display font-bold text-xs uppercase tracking-[0.3em] text-white/40 mb-6 font-mono">PWA Deployment Visuals</h4>
                          <div className="grid grid-cols-2 gap-8">
                            <ImageUpload 
                                label="Mobile Frame (9:16)"
                                currentImage={appSettings.screenshotMobile}
                                onUpload={(base64) => adminService.updateAppSetting('screenshotMobile', base64)}
                            />
                            <ImageUpload 
                                label="Workstation Frame (16:9)"
                                currentImage={appSettings.screenshotDesktop}
                                onUpload={(base64) => adminService.updateAppSetting('screenshotDesktop', base64)}
                            />
                          </div>
                          <p className="text-[9px] text-white/20 mt-6 leading-relaxed font-black uppercase tracking-[0.2em] italic">
                              Interface previews presented during verified application installation sequences.
                          </p>
                        </div>

                        <div className="border-t border-white/5 pt-10">
                          <h4 className="font-display font-bold text-xs uppercase tracking-[0.3em] text-white/40 mb-6 font-mono">Push Frequency Diagnostics</h4>
                          <div className="p-8 bg-black/40 rounded-[2rem] border border-white/10 shadow-inner">
                            <p className="text-[9px] text-white/20 font-black uppercase tracking-[0.3em] mb-4">Neural Backend Connectivity</p>
                            <button 
                              onClick={async () => {
                                try {
                                  const { MessagingService } = await import('../services/messagingService');
                                  const res = await MessagingService.testPush();
                                  if (res.success) {
                                    alert("Success! Transmission received on target device.");
                                  } else {
                                    alert("Error: " + (res.error || "Unknown Neural Failure"));
                                  }
                                } catch (e: any) {
                                  alert("Error: " + e.message);
                                }
                              }}
                              className="w-full py-5 bg-white/5 text-white/60 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] shadow-lg hover:bg-white/10 hover:text-white transition-all active:scale-[0.98]"
                            >
                              Dispatch Signal
                            </button>
                            <p className="text-[8px] text-white/10 mt-4 italic font-medium tracking-wider">
                                * Node.js core push requires VAPID_PRIVATE_KEY secure vault secret.
                            </p>
                          </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white/5 p-10 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-primary/5 rounded-full -ml-16 -mt-16 blur-2xl group-hover:bg-primary/10 transition-all duration-700" />
                    <h3 className="font-display font-black text-xl mb-8 flex items-center gap-4 text-white uppercase tracking-widest relative z-10">
                        <Truck size={24} className="text-primary" />
                        Logistics Jurisdiction
                    </h3>
                    
                    <div className="space-y-4 mb-10 relative z-10">
                        {deliveryAreas.map(area => (
                            <div key={area.id} className="flex items-center justify-between p-8 bg-black/40 rounded-[2rem] border border-white/5 group/area hover:border-primary/20 transition-all">
                                <div className="flex gap-10">
                                    <div className="space-y-1">
                                        <h4 className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em]">Sector Name</h4>
                                        <p className="font-bold text-sm text-white group-hover/area:text-primary transition-colors tracking-wide">{area.name}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em]">Unit Tariff</p>
                                        <p className="text-sm font-black text-primary font-mono">৳{formatCurrency(area.fee)}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => adminService.deleteDeliveryArea(area.id)}
                                    className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white/20 hover:text-red-500 hover:bg-red-500/10 transition-all"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="bg-black/60 p-10 rounded-[2.5rem] border border-white/5 shadow-inner relative z-10">
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.4em] mb-8 text-center">Incorporate New logistics sector</p>
                        <div className="flex flex-wrap gap-4 mb-8 justify-center">
                            <button 
                                onClick={() => setNewArea({ name: 'গাইবান্ধা পৌরসভা (ভিতর)', fee: 40 })}
                                className="text-[9px] font-black uppercase px-5 py-3 bg-white/5 border border-white/5 rounded-xl text-primary hover:bg-white/10 transition-all"
                            >
                                + Municipal Internal (40৳)
                            </button>
                            <button 
                                onClick={() => setNewArea({ name: 'গাইবান্ধা পৌরসভা (বাহির)', fee: 60 })}
                                className="text-[9px] font-black uppercase px-5 py-3 bg-white/5 border border-white/5 rounded-xl text-primary hover:bg-white/10 transition-all"
                            >
                                + Municipal External (60৳)
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-white/20 uppercase tracking-widest ml-1">Sector Designation</label>
                                <input 
                                    placeholder="Sector Name (e.g. Uttara)" 
                                    className="w-full px-6 py-4 bg-black/40 border border-white/5 rounded-2xl text-[13px] text-white outline-none focus:border-primary/40 font-medium"
                                    value={newArea.name}
                                    onChange={e => setNewArea({...newArea, name: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-white/20 uppercase tracking-widest ml-1">Tariff rate</label>
                                <input 
                                    placeholder="Fee" 
                                    type="number"
                                    className="w-full px-6 py-4 bg-black/40 border border-white/5 rounded-2xl text-[13px] text-primary outline-none focus:border-primary/40 font-mono font-bold"
                                    value={isNaN(newArea.fee) ? '' : newArea.fee}
                                    onChange={e => {
                                        const val = parseInt(e.target.value);
                                        setNewArea({...newArea, fee: isNaN(val) ? 0 : val});
                                    }}
                                />
                            </div>
                        </div>
                        <button 
                            onClick={async () => {
                                await adminService.updateDeliveryArea('new', newArea);
                                setNewArea({ name: '', fee: 50 });
                            }}
                            className="w-full py-5 bg-primary text-black rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all"
                        >
                            Authorize Area Protocol
                        </button>
                    </div>
                </div>

                <div className="bg-white/5 p-10 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-secondary/10 transition-all duration-700" />
                    <h3 className="font-display font-black text-xl mb-6 flex items-center gap-4 text-white uppercase tracking-widest relative z-10">
                        <CreditCard size={24} className="text-secondary" />
                        Infrastructure Parameters
                    </h3>
                    <p className="text-[10px] text-white/30 mb-10 font-bold uppercase tracking-[0.2em] relative z-10">Critical global overrides for system maintenance and promo synchronization.</p>
                    <div className="grid grid-cols-2 gap-6 relative z-10">
                        <button className="py-6 bg-black/40 border border-white/5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] text-white/40 hover:bg-white/5 hover:text-white hover:border-white/20 transition-all active:scale-95 shadow-lg">Maintenance Sequence</button>
                        <button className="py-6 bg-black/40 border border-white/5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] text-white/40 hover:bg-white/5 hover:text-white hover:border-white/20 transition-all active:scale-95 shadow-lg">Neural Sale Toggle</button>
                    </div>
                </div>
            </motion.div>
        )}
        {activeTab === 'riders' && (
          <motion.div key="riders" className="space-y-10">
            <h3 className="font-display font-black text-2xl px-2 flex items-center gap-4 text-white uppercase tracking-[0.2em]">
                <Truck size={32} className="text-primary" />
                Live Fleet Tracking ({sellers.filter(s => s.role === 'rider').length})
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {sellers.filter(s => s.role === 'rider').map(rider => {
                    const activeDeliveries = orders.filter(o => o.riderId === rider.id && o.status !== 'delivered' && o.status !== 'cancelled');
                    return (
                        <div key={rider.id} className="bg-white/5 p-8 rounded-[3rem] border border-white/5 shadow-2xl space-y-6 group hover:border-primary/20 transition-all relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-primary/10 transition-all" />
                            <div className="flex justify-between items-start relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-black/60 text-white rounded-[1.5rem] flex items-center justify-center relative shadow-2xl border border-white/5">
                                        <User size={32} className="text-white/40" />
                                        <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-[#0a0a0a] shadow-lg ${rider.status === 'online' ? 'bg-green-500' : 'bg-white/20'}`} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg text-white group-hover:text-primary transition-colors">{rider.displayName || 'Anonymous Operative'}</h4>
                                        <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.2em]">{rider.phone || 'No Contact Data'}</p>
                                    </div>
                                </div>
                                <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-xl border ${rider.status === 'online' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-white/5 text-white/20 border-white/5'}`}>
                                    {rider.status || 'Offline'}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 relative z-10">
                                <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                                    <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] block mb-2">Active Sorties</span>
                                    <p className="font-display font-black text-white text-xl">{activeDeliveries.length}</p>
                                </div>
                                <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                                    <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] block mb-2">Signal Echo</span>
                                    <p className="text-[10px] font-bold text-primary uppercase">
                                        {rider.lastLocationUpdate ? format(rider.lastLocationUpdate.toDate ? rider.lastLocationUpdate.toDate() : new Date(rider.lastLocationUpdate), 'h:mm a') : 'No Link'}
                                    </p>
                                </div>
                            </div>

                            {rider.location && (
                                <a 
                                    href={`https://www.google.com/maps?q=${rider.location.lat},${rider.location.lng}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-full py-4 bg-white/5 text-white/60 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:bg-white/10 hover:text-white transition-all active:scale-[0.98] relative z-10"
                                >
                                    <MapPin size={16} className="text-primary" /> Intercept Position
                                </a>
                            )}
                        </div>
                    );
                })}
            </div>
            {sellers.filter(s => s.role === 'rider').length === 0 && (
                <div className="text-center py-32 bg-white/5 rounded-[4rem] border border-dashed border-white/10">
                    <Truck size={64} className="mx-auto text-white/5 mb-6" />
                    <p className="text-[11px] font-black text-white/20 uppercase tracking-[0.4em]">Fleet currently decommissioned</p>
                </div>
            )}
          </motion.div>
        )}
        {activeTab === 'notifications' && (
          <motion.div
            key="notifications"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-10"
          >
                <h3 className="font-display font-black text-2xl mb-8 flex items-center gap-4 text-white uppercase tracking-[0.2em]">
                    <Bell size={32} className="text-primary" />
                    Neural Broadcast Console
                </h3>
                <div className="bg-white/5 p-12 rounded-[4rem] border border-white/5 shadow-2xl space-y-8 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full -ml-32 -mt-32 blur-[100px]" />
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] ml-2">Target Audience</label>
                      <select id="notifTarget" className="w-full px-6 py-4 bg-black/40 border border-white/5 rounded-2xl text-[13px] text-white outline-none focus:border-primary/40 appearance-none">
                        <option value="all" className="bg-[#111]">Global Citizenry (All)</option>
                        <option value="riders" className="bg-[#111]">Logistics Team (Riders)</option>
                        <option value="sellers" className="bg-[#111]">Venture Partners (Sellers)</option>
                      </select>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] ml-2">Signal Protocol</label>
                      <select id="notifType" className="w-full px-6 py-4 bg-black/40 border border-white/5 rounded-2xl text-[13px] text-white outline-none focus:border-primary/40 appearance-none">
                        <option value="info" className="bg-[#111]">System Information</option>
                        <option value="promo" className="bg-[#111]">Priority Promotion</option>
                        <option value="alert" className="bg-[#111]">Critical Alert</option>
                      </select>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] ml-2">Temporal Window</label>
                      <select id="notifDuration" className="w-full px-6 py-4 bg-black/40 border border-white/5 rounded-2xl text-[13px] text-white outline-none focus:border-primary/40 appearance-none">
                        <option value="5" className="bg-[#111]">5 Pulse Cycle (Short)</option>
                        <option value="10" className="bg-[#111]">10 Pulse Cycle (Standard)</option>
                        <option value="30" className="bg-[#111]">30 Pulse Cycle (Extended)</option>
                        <option value="60" className="bg-[#111]">60 Pulse Cycle (Long)</option>
                        <option value="0" className="bg-[#111]">Stationary (Sticky)</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-3 relative z-10">
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] ml-2">Broadcast Header</label>
                    <input id="notifTitle" placeholder="e.g. Weekend Rush Sale!" className="w-full px-8 py-5 bg-black/40 border border-white/5 rounded-3xl text-[15px] font-bold text-white outline-none focus:border-primary/40 tracking-tight" />
                  </div>
                  <div className="space-y-3 relative z-10">
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] ml-2">Neural Payload (Message Body)</label>
                    <textarea id="notifMessage" placeholder="Inject broadcast content..." className="w-full px-8 py-6 bg-black/40 border border-white/5 rounded-[2.5rem] text-[15px] text-white/80 outline-none focus:border-primary/40 h-32 resize-none leading-relaxed" />
                  </div>
                  <button 
                    onClick={async () => {
                      const title = (document.getElementById('notifTitle') as HTMLInputElement).value;
                      const message = (document.getElementById('notifMessage') as HTMLTextAreaElement).value;
                      const target = (document.getElementById('notifTarget') as HTMLSelectElement).value;
                      const type = (document.getElementById('notifType') as HTMLSelectElement).value;
                      const duration = parseInt((document.getElementById('notifDuration') as HTMLSelectElement).value);

                      if (!title || !message) return alert('Header and Payload required for transmission');

                      try {
                        const { NotificationService } = await import('../services/notificationService');
                        if (target === 'all') {
                          await NotificationService.sendNotification({
                            userId: 'all',
                            title,
                            message,
                            type: type as any,
                            duration: duration > 0 ? duration : undefined
                          });
                        } else {
                          const roleToTarget = target === 'riders' ? 'rider' : 'seller';
                          const targets = sellers.filter(s => s.role === roleToTarget);
                          for (const t of targets) {
                            await NotificationService.sendNotification({
                              userId: t.id,
                              title,
                              message,
                              type: type as any,
                              duration: duration > 0 ? duration : undefined
                            });
                          }
                        }
                        alert('Broadcast Transmission Authorized!');
                        (document.getElementById('notifTitle') as HTMLInputElement).value = '';
                        (document.getElementById('notifMessage') as HTMLTextAreaElement).value = '';
                      } catch (e) {
                          alert('Neural Link Interrupted');
                      }
                    }}
                    className="w-full py-6 bg-primary text-black rounded-[2.5rem] font-black text-xs uppercase tracking-[0.4em] shadow-2xl shadow-primary/30 hover:bg-primary-dark transition-all active:scale-95 relative z-10"
                  >
                    Authorize Dispatch
                  </button>
                </div>

            <div className="bg-white/5 p-12 rounded-[4rem] border border-white/5 shadow-2xl relative">
                <div className="flex items-center justify-between mb-10">
                    <h3 className="font-display font-black text-xl flex items-center gap-4 text-white uppercase tracking-widest">
                        <Bell size={24} className="text-primary" />
                        Transmission Manifest
                    </h3>
                    {notifications.length > 0 && (
                        <button 
                            onClick={async () => {
                                if(confirm('Permanently purge neural history? This action is irreversible.')) {
                                    await adminService.deleteAllNotifications();
                                }
                            }}
                            className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] px-6 py-3 bg-red-500/5 rounded-2xl border border-red-500/20 hover:bg-red-500/10 transition-all"
                        >
                            Purge Archives
                        </button>
                    )}
                </div>
                <div className="space-y-6">
                    {notifications.length === 0 ? (
                        <div className="text-center py-24 bg-black/20 rounded-[3rem] border border-dashed border-white/5">
                            <p className="text-white/20 text-[11px] font-black uppercase tracking-[0.4em]">Archive is currently vacant</p>
                        </div>
                    ) : (
                        notifications.map(notif => (
                            <div key={notif.id} className="p-8 bg-black/40 rounded-[2.5rem] border border-white/5 flex flex-col gap-4 group hover:border-primary/30 transition-all">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-4">
                                        <span className={`px-4 py-1 rounded-xl text-[9px] font-black uppercase border ${
                                            notif.type === 'promo' ? 'bg-secondary/10 text-secondary border-secondary/20' :
                                            notif.type === 'order' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                            'bg-white/5 text-white/40 border-white/10'
                                        }`}>
                                            {notif.type || 'system'}
                                        </span>
                                        <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.2em]">
                                            Echo To: {notif.userId === 'all' ? 'All Citizens' : `Node ${notif.userId?.slice(-8) || 'N/A'}`}
                                        </p>
                                    </div>
                                    <p className="text-[10px] text-white/20 font-mono italic">
                                        {notif.createdAt?.toDate ? format(notif.createdAt.toDate(), 'MMM d, h:mm a') : 'Instant'}
                                    </p>
                                </div>
                                <div className="mt-2">
                                    <h5 className="text-[15px] font-black text-white mb-2 group-hover:text-primary transition-colors tracking-tight">{notif.title}</h5>
                                    <p className="text-[13px] text-white/50 leading-relaxed max-w-4xl">{notif.message}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
          </motion.div>
        )}
        {activeTab === 'financials' && (
          <motion.div key="financials" className="space-y-10">
            <h3 className="font-display font-black text-2xl px-2 flex items-center gap-4 text-white uppercase tracking-[0.2em]">
                <CreditCard size={32} className="text-secondary" />
                Treasury & Settlements
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white/5 p-10 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-primary/5 rounded-full -ml-16 -mt-16 blur-2xl group-hover:bg-primary/10 transition-all duration-700" />
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-4 relative z-10 font-mono">Total Liquidated Payouts</p>
                    <h4 className="text-4xl font-display font-black text-primary relative z-10">৳{formatCurrency(payouts.filter(p => p.status === 'completed').reduce((acc, p) => acc + (p.amount || 0), 0))}</h4>
                </div>
                <div className="bg-white/5 p-10 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-orange-500/5 rounded-full -ml-16 -mt-16 blur-2xl group-hover:bg-orange-500/10 transition-all duration-700" />
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-4 relative z-10 font-mono">Pending Authorizations</p>
                    <h4 className="text-4xl font-display font-black text-orange-500 relative z-10">{payouts.filter(p => p.status === 'pending').length}</h4>
                </div>
                <div className="bg-white/5 p-10 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-16 -mt-16 blur-2xl group-hover:bg-white/10 transition-all duration-700" />
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-4 relative z-10 font-mono">Estimated Liability</p>
                    <h4 className="text-4xl font-display font-black text-white/40 relative z-10">৳{formatCurrency(orders.filter(o => o.status === 'delivered').reduce((acc, o) => acc + (o.total || 0), 0) - payouts.filter(p => p.status === 'completed').reduce((acc, p) => acc + (p.amount || 0), 0))}</h4>
                </div>
            </div>

            <div className="bg-white/5 rounded-[4rem] border border-white/5 shadow-2xl overflow-hidden relative">
                <div className="p-10 border-b border-white/5 flex justify-between items-center bg-black/20">
                    <h4 className="font-display font-black text-lg uppercase tracking-widest text-white">Neural Settlement Log</h4>
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] font-mono">Status: Descending</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-black/40 border-b border-white/5">
                                <th className="px-10 py-6 text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Entity / Identity</th>
                                <th className="px-10 py-6 text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Asset value</th>
                                <th className="px-10 py-6 text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Medium / Destination</th>
                                <th className="px-10 py-6 text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Authorization Status</th>
                                <th className="px-10 py-6 text-[10px] font-black text-white/30 uppercase tracking-[0.3em] text-right">Operations</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {payouts.map((payout) => {
                                const targetUser = sellers.find(s => s.id === payout.userId);
                                return (
                                    <tr key={payout.id} className="hover:bg-white/5 transition-all group">
                                        <td className="px-10 py-8">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-black/60 flex items-center justify-center text-white/20 border border-white/5 shadow-inner">
                                                    <User size={24} />
                                                </div>
                                                <div>
                                                    <p className="text-[14px] font-bold text-white group-hover:text-primary transition-colors">{targetUser?.displayName || 'Unknown Entity'}</p>
                                                    <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mt-1 font-mono">{payout.role}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <p className="text-[15px] font-black text-primary font-mono tracking-tight">৳{formatCurrency(payout.amount)}</p>
                                        </td>
                                        <td className="px-10 py-8">
                                            <p className="text-[13px] font-bold text-white/70">{payout.method}</p>
                                            <p className="text-[11px] text-white/30 font-mono mt-1">{payout.account}</p>
                                        </td>
                                        <td className="px-10 py-8">
                                            <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-xl border ${
                                                payout.status === 'completed' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                                payout.status === 'rejected' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                'bg-orange-500/10 text-orange-500 border-orange-500/20'
                                            }`}>
                                                {payout.status}
                                            </span>
                                        </td>
                                        <td className="px-10 py-8 text-right">
                                            {payout.status === 'pending' && (
                                                <div className="flex justify-end gap-4">
                                                    <button 
                                                        onClick={() => adminService.updatePayoutStatus(payout.id, 'rejected')}
                                                        className="w-10 h-10 bg-red-500/5 rounded-xl flex items-center justify-center text-red-500/40 hover:text-red-500 hover:border-red-500 border border-red-500/10 transition-all"
                                                        title="Reject Request"
                                                    >
                                                        <XCircle size={20} />
                                                    </button>
                                                    <button 
                                                        onClick={() => adminService.updatePayoutStatus(payout.id, 'completed')}
                                                        className="w-10 h-10 bg-green-500/5 rounded-xl flex items-center justify-center text-green-500/40 hover:text-green-500 hover:border-green-500 border border-green-500/10 transition-all"
                                                        title="Authorize Transfer"
                                                    >
                                                        <CheckCircle size={20} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {payouts.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="py-40 text-center">
                                        <p className="text-white/10 text-[11px] font-black uppercase tracking-[0.4em]">No financial records identified</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
      
      {selectedOrder && (
        <Invoice order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}
    </motion.div>
  );
}
