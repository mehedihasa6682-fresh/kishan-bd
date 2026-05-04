import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Users, ShoppingBag, Truck, CreditCard, 
  Settings, BarChart3, ShieldCheck, Search,
  CheckCircle, XCircle, Plus, Trash2, Layout,
  Layers, Camera, ChevronRight, Store, X, Clock, Bell,
  ArrowLeft, User, Box, Gift, Image as ImageIcon,
  MessageSquare, Package, Eye, EyeOff, MapPin
} from 'lucide-react';
import { adminService } from '../services/adminService';
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

  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'approvals' | 'banners' | 'stories' | 'categories' | 'users' | 'orders' | 'bundles' | 'settings' | 'notifications' | 'riders'>('dashboard');
  
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
  const [newStory, setNewStory] = useState({ name: '', role: '', quote: '', image: '', type: 'Farmer' });
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
    };
  }, [role, authLoading, navigate]);

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price || !newProduct.image) return;

    const productData = {
      ...newProduct,
      price: parseFloat(newProduct.price) || 0,
      stockQuantity: parseInt(newProduct.stockQuantity) || 0,
      isOutOfStock: newProduct.isOutOfStock,
      minWeight: parseFloat(newProduct.minWeight) || 1,
      weightIncrements: parseFloat(newProduct.weightIncrements) || 0.1
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
    setIsAdding(false);
    setEditingProductId(null);
  };

  const startEditingProduct = (product: any) => {
    setEditingProductId(product.id);
    setNewProduct({
      name: product.name || '',
      nameEn: product.nameEn || '',
      price: product.price?.toString() || '',
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
      className="min-h-screen bg-slate-50/50"
    >
      <div className="max-w-4xl mx-auto px-5 pb-12">
        <div className="flex items-center justify-between mt-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-xl">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl mb-0.5">Admin Central</h1>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] leading-none">System Management</p>
            </div>
          </div>

          <Link 
            to="/" 
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:text-primary transition-colors shadow-sm"
          >
            <ArrowLeft size={14} />
            Back to Shop
          </Link>
        </div>

      {/* Modern Tab Bar */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide -mx-5 px-5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === tab.id 
                ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' 
                : 'bg-white text-slate-400 border border-slate-100'
            }`}
          >
            <tab.icon size={16} />
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
                { label: 'Total Orders', value: orders.length.toString(), color: 'text-blue-500', bg: 'bg-blue-50' },
                { label: 'Processing', value: orders.filter(o => o.status === 'pending' || o.status === 'verified').length.toString(), color: 'text-orange-500', bg: 'bg-orange-50' },
                { label: 'Net Revenue', value: `৳${(orders.filter(o => o.status !== 'cancelled').reduce((acc, o) => acc + (o.total || 0), 0) || 0).toLocaleString()}`, color: 'text-green-500', bg: 'bg-green-50' },
                { label: 'All Users', value: (sellers.length || 0).toString(), color: 'text-purple-500', bg: 'bg-purple-50' },
                { label: 'Total Sellers', value: (sellers.filter(s => s.role === 'seller').length || 0).toString(), color: 'text-indigo-500', bg: 'bg-indigo-50' },
                { label: 'Total Riders', value: (sellers.filter(s => s.role === 'rider').length || 0).toString(), color: 'text-orange-500', bg: 'bg-orange-50' },
                { label: 'Total Products', value: (products.length || 0).toString(), color: 'text-pink-500', bg: 'bg-pink-50' },
                { label: 'Revenue/User', value: `৳${sellers.length > 0 ? (orders.filter(o => o.status !== 'cancelled').reduce((acc, o) => acc + (o.total || 0), 0) / sellers.length).toFixed(0) : 0}`, color: 'text-slate-600', bg: 'bg-slate-100' },
              ].map((stat) => (
                <div key={stat.label} className={`${stat.bg} p-5 rounded-[2rem] border border-slate-50 shadow-sm`}>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">{stat.label}</p>
                  <h4 className={`text-xl font-display font-bold ${stat.color}`}>{stat.value}</h4>
                </div>
              ))}
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <h3 className="font-display font-bold text-lg mb-6">Recent Order Activity</h3>
                <div className="space-y-4">
                    {orders.slice(0, 5).map(order => (
                        <div key={order.id} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                                    <Truck size={20} />
                                </div>
                                <div>
                                    <h5 className="text-[11px] font-bold text-slate-800">Order #{order.id.slice(-6)}</h5>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase">{order.customerName}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-bold text-slate-800">৳{order.total || 0}</p>
                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                                    order.status === 'delivered' ? 'bg-green-50 text-green-500' :
                                    order.status === 'cancelled' ? 'bg-red-50 text-red-500' :
                                    'bg-orange-50 text-orange-500'
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
              <h3 className="font-display font-bold text-lg px-1 flex items-center gap-2">
                <Store size={20} className="text-secondary" />
                Seller Verification Queue ({pendingSellers.length})
              </h3>
              {pendingSellers.map((seller) => (
                <div key={seller.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300">
                        <User size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-800">{seller.shopName || seller.displayName}</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{seller.email}</p>
                        <p className="text-[10px] text-primary font-black mt-1">Requested Role: SELLER</p>
                      </div>
                    </div>
                    <div className="bg-blue-50 text-blue-500 px-3 py-1 rounded-full text-[8px] font-black uppercase">Review Required</div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => adminService.verifySeller(seller.id)}
                      className="flex-1 py-3 bg-primary text-white rounded-2xl text-xs font-bold shadow-lg shadow-primary/20"
                    >
                      Approve Seller
                    </button>
                  </div>
                </div>
              ))}
              {pendingSellers.length === 0 && (
                <div className="text-center py-10 text-slate-400 text-xs bg-white rounded-[2rem] border border-dashed border-slate-200">
                  No sellers pending verification.
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="font-display font-bold text-lg px-1 flex items-center gap-2">
                <Package size={20} className="text-primary" />
                Product Approval Queue ({pendingProducts.length})
              </h3>
              {pendingProducts.map((prod) => (
              <div key={prod.id} className="bg-white p-5 rounded-3xl border border-slate-50 shadow-sm transition-all hover:shadow-md">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 overflow-hidden">
                      {prod.image ? <img src={prod.image} className="w-full h-full object-cover" /> : <ShoppingBag size={24} />}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">{prod.name}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase trekking-widest">{prod.farmerName || 'Unknown Seller'}</p>
                      <p className="text-xs text-slate-400">Price: ৳{prod.price}</p>
                    </div>
                  </div>
                  <div className="bg-orange-50 text-orange-500 px-3 py-1 rounded-full text-[8px] font-black uppercase">Pending</div>
                </div>
                
                <div className="bg-slate-50 p-4 rounded-2xl mb-4 text-[10px] text-slate-500 italic">
                  "{prod.description || 'No description provided'}"
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => adminService.rejectProduct(prod.id)}
                    className="flex-1 py-3 bg-red-50 text-red-500 rounded-2xl text-xs font-bold hover:bg-red-100 transition-colors"
                  >
                    Reject Product
                  </button>
                  <button 
                    onClick={() => adminService.approveProduct(prod.id)}
                    className="flex-1 py-3 bg-primary text-white rounded-2xl text-xs font-bold shadow-lg shadow-primary/20"
                  >
                    Approve & Live
                  </button>
                </div>
              </div>
            ))}
            {pendingProducts.length === 0 && (
              <div className="text-center py-20 text-slate-400 text-sm bg-white rounded-[2rem] border border-dashed border-slate-200">
                No products pending approval.
              </div>
            )}
          </div>
        </motion.div>
      )}

      {activeTab === 'orders' && (
          <motion.div key="orders" className="space-y-4">
            <h3 className="font-display font-bold text-lg px-1">Recent Transactions</h3>
            {orders.map((order) => (
              <div key={order.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-sm">#{order.id.slice(-8)}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{order.customerName}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{order.phone} • {order.address}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-bold text-primary">৳{order.total || 0}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{order.paymentMethod}</p>
                    {(order.discount || 0) > 0 && <p className="text-[9px] text-secondary font-black truncate">DISCOUNT: -৳{order.discount}</p>}
                    {order.location && (
                      <div className="flex flex-col items-end gap-1 mt-2">
                        <a 
                          href={`https://www.google.com/maps/dir/?api=1&destination=${order.location.lat},${order.location.lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[8px] font-black text-blue-500 uppercase tracking-widest hover:underline"
                        >
                          <Truck size={10} /> Navigate
                        </a>
                        {order.riderId && riderLocations[order.riderId] && (
                          <span className="text-[8px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded-md">
                            Rider: {formatDistance(calculateDistance(riderLocations[order.riderId].lat, riderLocations[order.riderId].lng, order.location.lat, order.location.lng))} away
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50/50 rounded-2xl p-4 space-y-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ordered Items</p>
                    {order.items?.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-[11px]">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-700">{item.quantity || 0}x</span>
                                <span className="text-slate-600">{item.name}</span>
                            </div>
                            <span className="font-medium text-slate-400">৳{(item.price || 0) * (item.quantity || 0)}</span>
                        </div>
                    ))}
                </div>

                {order.paymentMethod !== 'cod' && (
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Transaction ID</p>
                    <p className="text-xs font-mono font-bold text-slate-900">{order.transactionId || 'NOT PROVIDED'}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  {order.paymentStatus === 'pending' && order.paymentMethod !== 'cod' && (
                    <button 
                      onClick={() => adminService.updateOrderStatus(order.id, 'verified', 'verified')}
                      className="flex-1 py-3 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20"
                    >
                      Verify Payment
                    </button>
                  )}
                  {order.status === 'pending' && order.paymentMethod === 'cod' && (
                    <button 
                      onClick={() => adminService.updateOrderStatus(order.id, 'confirmed')}
                      className="flex-1 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest"
                    >
                      Confirm Order
                    </button>
                  )}
                  <button 
                    onClick={() => adminService.updateOrderStatus(order.id, 'cancelled')}
                    className="px-4 py-3 bg-red-50 text-red-500 rounded-2xl text-[10px] font-black uppercase"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => setSelectedOrder(order)}
                    className="px-4 py-3 border border-slate-200 text-slate-500 rounded-2xl text-[10px] font-black uppercase hover:bg-slate-50"
                  >
                    Invoice
                  </button>
                </div>
              </div>
            ))}
            {orders.length === 0 && <p className="text-center py-20 text-slate-400 text-sm">No orders yet.</p>}
          </motion.div>
        )}

        {activeTab === 'products' && (
          <motion.div key="products" className="space-y-4">
            <div className="flex gap-2 mb-4">
                <button 
                  onClick={() => setIsAdding(true)}
                  className="flex-1 btn-primary py-4 rounded-3xl flex items-center justify-center gap-2"
                >
                  <Plus size={20} /> Add Product
                </button>
                {selectedProducts.length > 0 && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleBulkAction('approve')}
                      className="px-4 bg-green-500 text-white rounded-2xl text-[10px] font-black uppercase"
                    >
                      Approve ({selectedProducts.length})
                    </button>
                    <button 
                      onClick={() => handleBulkAction('delete')}
                      className="px-4 bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase"
                    >
                      Delete
                    </button>
                  </div>
                )}
            </div>

            {/* Filters */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="col-span-2 md:col-span-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1 ml-1">Search</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                        <input 
                            placeholder="Find product..." 
                            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none"
                            value={productFilter.search}
                            onChange={e => setProductFilter({...productFilter, search: e.target.value})}
                        />
                    </div>
                </div>
                <div>
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1 ml-1">Category</label>
                    <select 
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none appearance-none"
                        value={productFilter.category}
                        onChange={e => setProductFilter({...productFilter, category: e.target.value})}
                    >
                        <option value="">All Categories</option>
                        {categories.map(c => <option key={c.id} value={c.title}>{c.title}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1 ml-1">Status</label>
                    <select 
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none appearance-none"
                        value={productFilter.status}
                        onChange={e => setProductFilter({...productFilter, status: e.target.value})}
                    >
                        <option value="">All Status</option>
                        <option value="approved">Approved</option>
                        <option value="pending">Pending</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>
                <div>
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1 ml-1">Seller</label>
                    <select 
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none appearance-none font-sans"
                        value={productFilter.seller}
                        onChange={e => setProductFilter({...productFilter, seller: e.target.value})}
                    >
                        <option value="">All Sellers</option>
                        {Array.from(new Set(products.map(p => p.farmer || p.farmerName))).filter(Boolean).map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>
            </div>

            <AnimatePresence>
              {isAdding && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-white p-6 rounded-3xl border-2 border-primary/10 overflow-hidden mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-sm">{editingProductId ? 'Edit Product' : 'Product Details'}</h4>
                    <button onClick={() => {
                        setIsAdding(false);
                        setEditingProductId(null);
                    }}><X size={18} className="text-slate-400" /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input 
                      placeholder="Product Name (Bangla)" 
                      className="col-span-2 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs outline-none"
                      value={newProduct.name}
                      onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                    />
                    <input 
                      placeholder="Product Name (English)" 
                      className="col-span-2 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs outline-none"
                      value={newProduct.nameEn}
                      onChange={e => setNewProduct({...newProduct, nameEn: e.target.value})}
                    />
                    <textarea 
                      placeholder="Description (Bangla)" 
                      className="col-span-2 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs outline-none h-20 resize-none"
                      value={newProduct.description}
                      onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                    />
                    <textarea 
                      placeholder="Description (English)" 
                      className="col-span-2 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs outline-none h-20 resize-none"
                      value={newProduct.descriptionEn}
                      onChange={e => setNewProduct({...newProduct, descriptionEn: e.target.value})}
                    />
                    <div className="relative">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1 ml-1">Base Price (per 1 unit)</label>
                        <input 
                          placeholder="Price (৳) e.g. 100" 
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs outline-none focus:border-primary"
                          value={newProduct.price}
                          onChange={e => setNewProduct({...newProduct, price: e.target.value})}
                        />
                        <p className="text-[8px] text-slate-400 mt-1 ml-1">* If 1kg is ৳100, system will calculate 100gm as ৳10.</p>
                    </div>
                    <div className="relative">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1 ml-1">WhatsApp Hub</label>
                        <input 
                          placeholder="+8801..." 
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs outline-none font-sans"
                          value={newProduct.whatsappNumber}
                          onChange={e => setNewProduct({...newProduct, whatsappNumber: e.target.value})}
                        />
                    </div>
                    <div className="relative">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1 ml-1">Initial Stock</label>
                        <input 
                          type="number"
                          placeholder="Stock Quantity" 
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs outline-none"
                          value={newProduct.stockQuantity}
                          onChange={e => setNewProduct({...newProduct, stockQuantity: e.target.value})}
                        />
                    </div>
                    <div className="relative col-span-2">
                        <label className="flex items-center gap-2 cursor-pointer bg-slate-50 border border-slate-100 p-3 rounded-2xl transition-all hover:bg-slate-100">
                          <input 
                            type="checkbox"
                            className="w-4 h-4 accent-red-500 rounded-lg"
                            checked={newProduct.isOutOfStock || false}
                            onChange={e => setNewProduct({...newProduct, isOutOfStock: e.target.checked})}
                          />
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-700">Mark as Out of Stock</span>
                            <span className="text-[8px] text-slate-400">This will hide the product from the storefront.</span>
                          </div>
                        </label>
                    </div>
                    <div className="relative col-span-2">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1 ml-1">Product Type</label>
                        <select 
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs outline-none appearance-none font-bold"
                          value={newProduct.unit}
                          onChange={e => setNewProduct({...newProduct, unit: e.target.value})}
                        >
                            <option value="pcs">Fixed Product (Piece/Packet)</option>
                            <option value="kg">Weight-based (kg/gm)</option>
                            <option value="litre">Liquid (Litre)</option>
                        </select>
                    </div>

                    <div className="relative col-span-2">
                        <label className="flex items-center gap-2 cursor-pointer bg-slate-50 border border-slate-100 p-3 rounded-2xl transition-all hover:bg-slate-100">
                          <input 
                            type="checkbox"
                            className="w-4 h-4 accent-primary rounded-lg"
                            checked={newProduct.enableWeightSystem || false}
                            onChange={e => setNewProduct({...newProduct, enableWeightSystem: e.target.checked})}
                          />
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-700">Enable Advanced Weight Options</span>
                            <span className="text-[8px] text-slate-400">Allows customer to choose weights like 100g, 250g, 500g etc.</span>
                          </div>
                        </label>
                    </div>

                    {newProduct.enableWeightSystem && (
                        <div className="col-span-2 grid grid-cols-2 gap-3 p-3 bg-primary/5 rounded-2xl border border-dashed border-primary/20 animate-in fade-in slide-in-from-top-2 duration-300">
                             <div className="relative">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1 ml-1">Minimum (e.g. 0.1 for 100g)</label>
                                <input 
                                    placeholder="e.g. 0.1" 
                                    className="w-full px-4 py-3 bg-white border border-slate-100 rounded-xl text-xs outline-none"
                                    value={newProduct.minWeight}
                                    onChange={e => setNewProduct({...newProduct, minWeight: e.target.value})}
                                />
                             </div>
                             <div className="relative">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1 ml-1">Increments (e.g. 0.25)</label>
                                <input 
                                    placeholder="e.g. 0.25" 
                                    className="w-full px-4 py-3 bg-white border border-slate-100 rounded-xl text-xs outline-none"
                                    value={newProduct.weightIncrements}
                                    onChange={e => setNewProduct({...newProduct, weightIncrements: e.target.value})}
                                />
                             </div>
                             <p className="col-span-2 text-[8px] text-slate-400 font-medium italic mt-1">
                                * This will show quick selection buttons (100g, 250g, 500g etc) in UI.
                             </p>
                        </div>
                    )}
                    <div className="col-span-2">
                        <ImageUpload 
                            label="Product Image"
                            currentImage={newProduct.image}
                            onUpload={(base64) => setNewProduct({...newProduct, image: base64})}
                        />
                    </div>
                    <select 
                      className="col-span-2 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs outline-none appearance-none"
                      value={newProduct.category}
                      onChange={e => setNewProduct({...newProduct, category: e.target.value, subCategory: ''})}
                    >
                      <option value="">Select Category</option>
                      {categories.map(cat => <option key={cat.id} value={cat.title}>{cat.title}</option>)}
                    </select>

                    {newProduct.category && (
                      <select 
                        className="col-span-2 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs outline-none appearance-none"
                        value={newProduct.subCategory}
                        onChange={e => setNewProduct({...newProduct, subCategory: e.target.value})}
                      >
                        <option value="">Select Sub-Category</option>
                        {categories.find(c => c.title === newProduct.category)?.subCategories?.map((sub: string) => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                      </select>
                    )}
                    <button onClick={handleAddProduct} className="col-span-2 py-3 bg-slate-900 text-white rounded-2xl text-xs font-bold mt-2">
                        {editingProductId ? 'Update Product' : 'Publish Product'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center justify-between px-1 mt-6">
                <h3 className="font-display font-bold text-lg">Inventory ({filteredProducts.length})</h3>
                <button 
                  onClick={() => {
                    if (selectedProducts.length === filteredProducts.length) setSelectedProducts([]);
                    else setSelectedProducts(filteredProducts.map(p => p.id));
                  }}
                  className="text-[10px] font-black text-primary uppercase tracking-widest"
                >
                  {selectedProducts.length === filteredProducts.length ? 'Deselect All' : 'Select All'}
                </button>
            </div>

            {filteredProducts.map((prod) => (
              <div key={prod.id} className={`bg-white p-4 rounded-2xl border transition-all flex items-center justify-between group ${selectedProducts.includes(prod.id) ? 'border-primary shadow-md' : 'border-slate-50 shadow-sm'}`}>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => {
                      if (selectedProducts.includes(prod.id)) setSelectedProducts(selectedProducts.filter(id => id !== prod.id));
                      else setSelectedProducts([...selectedProducts, prod.id]);
                    }}
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${selectedProducts.includes(prod.id) ? 'bg-primary border-primary text-white' : 'border-slate-200'}`}
                  >
                    {selectedProducts.includes(prod.id) && <CheckCircle size={12} />}
                  </button>
                  <div className="w-12 h-12 bg-slate-50 rounded-xl overflow-hidden shadow-inner">
                    <img src={prod.image} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs">{prod.name}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">৳{prod.price} / {prod.unit} • {prod.farmerName || prod.farmer || 'Admin'}</p>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-1 rounded-md">
                            <span className="text-[8px] font-black text-slate-400 uppercase px-1">Stock:</span>
                            <input 
                                type="number"
                                className="w-10 bg-transparent border-0 text-[10px] font-bold p-0 outline-none text-slate-600 focus:text-primary"
                                value={prod.stockQuantity || 0}
                                onChange={(e) => adminService.updateStockStatus(prod.id, prod.isOutOfStock ? 'Out of Stock' : 'In Stock', Number(e.target.value), prod.isOutOfStock || false)}
                            />
                        </div>
                        <button 
                          onClick={() => adminService.updateStockStatus(prod.id, !prod.isOutOfStock ? 'Out of Stock' : 'In Stock', prod.stockQuantity || 0, !prod.isOutOfStock)}
                          className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md transition-all ${
                            prod.isOutOfStock ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'
                          }`}
                        >
                          {prod.isOutOfStock ? 'Out of Stock' : 'In Stock'}
                        </button>
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${
                            prod.status === 'approved' ? 'bg-blue-50 text-blue-500' : 
                            prod.status === 'pending' ? 'bg-orange-50 text-orange-500' : 
                            prod.status === 'hidden' ? 'bg-slate-100 text-slate-400' : 'bg-red-50 text-red-500'
                        }`}>
                            {prod.status || 'approved'}
                        </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => adminService.updateProduct(prod.id, { status: prod.status === 'hidden' ? 'approved' : 'hidden' })}
                      className={`p-2 rounded-lg transition-all active:scale-90 ${prod.status === 'hidden' ? 'text-slate-300' : 'text-blue-500 hover:bg-blue-50'}`}
                      title={prod.status === 'hidden' ? 'Show Product' : 'Hide Product'}
                    >
                      {prod.status === 'hidden' ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button 
                      onClick={() => startEditingProduct(prod)}
                      className="p-2 text-primary hover:bg-primary/5 rounded-lg transition-all active:scale-90"
                    >
                      <Settings size={16} />
                    </button>
                    {prod.status === 'pending' && (
                        <button 
                            onClick={() => adminService.approveProduct(prod.id)}
                            className="p-2 text-primary hover:bg-primary/5 rounded-lg"
                        >
                            <CheckCircle size={16} />
                        </button>
                    )}
                    <button 
                      onClick={() => adminService.deleteProduct(prod.id)}
                      className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                </div>
              </div>
            ))}
            {filteredProducts.length === 0 && (
              <div className="text-center py-10 text-slate-400 text-xs font-medium bg-white rounded-[2rem] border border-dashed border-slate-200">
                No matching products found
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'banners' && (
          <motion.div key="banners" className="space-y-4">
            <button 
              onClick={() => setIsAdding(true)}
              className="w-full btn-primary py-4 rounded-3xl mb-4 flex items-center justify-center gap-2"
            >
              <Plus size={20} /> Add New Banner
            </button>

            <AnimatePresence>
              {isAdding && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-white p-6 rounded-3xl border-2 border-primary/10 overflow-hidden">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-sm">Banner Details</h4>
                    <button onClick={() => setIsAdding(false)}><X size={18} className="text-slate-400" /></button>
                  </div>
                  <div className="space-y-3">
                    <input 
                      placeholder="Title (Optional)" 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs outline-none"
                      value={newBanner.title}
                      onChange={e => setNewBanner({...newBanner, title: e.target.value})}
                    />
                    <input 
                      placeholder="Subtitle (Optional)" 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs outline-none"
                      value={newBanner.subtitle}
                      onChange={e => setNewBanner({...newBanner, subtitle: e.target.value})}
                    />
                    <ImageUpload 
                        label="Banner Image"
                        currentImage={newBanner.image}
                        onUpload={(base64) => setNewBanner({...newBanner, image: base64})}
                    />
                    <button onClick={handleAddBanner} className="w-full py-3 bg-slate-900 text-white rounded-2xl text-xs font-bold mt-2">Save Banner</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {banners.map((item) => (
              <div key={item.id} className="bg-white p-2 pr-4 rounded-3xl border border-slate-100 flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-12 bg-slate-100 rounded-2xl overflow-hidden">
                    <img src={item.image} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800">{item.title}</h4>
                    <span className="text-[10px] font-bold text-primary uppercase">{item.subtitle || 'Promo'}</span>
                  </div>
                </div>
                <button 
                  onClick={() => adminService.deleteBanner(item.id)}
                  className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === 'stories' && (
            <motion.div key="stories" className="space-y-4">
                <button onClick={() => setIsAdding(true)} className="w-full btn-primary py-4 rounded-3xl mb-4 flex items-center justify-center gap-2">
                    <Plus size={20} /> New Story Post
                </button>

                <AnimatePresence>
                  {isAdding && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-white p-6 rounded-3xl border-2 border-primary/10 overflow-hidden">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-sm">Story Post</h4>
                        <button onClick={() => setIsAdding(false)}><X size={18} className="text-slate-400" /></button>
                      </div>
                      <div className="space-y-3">
                        <input 
                          placeholder="Name (e.g. Kashem Miya)" 
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs outline-none"
                          value={newStory.name}
                          onChange={e => setNewStory({...newStory, name: e.target.value})}
                        />
                        <input 
                          placeholder="Quote (Bengali/English)" 
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs outline-none"
                          value={newStory.quote}
                          onChange={e => setNewStory({...newStory, quote: e.target.value})}
                        />
                        <ImageUpload 
                            label="Story Image"
                            currentImage={newStory.image}
                            onUpload={(base64) => setNewStory({...newStory, image: base64})}
                        />
                        <div className="flex gap-2">
                          {['Farmer', 'Customer', 'Seller'].map(type => (
                            <button 
                              key={type}
                              onClick={() => setNewStory({...newStory, type})}
                              className={`flex-1 py-2 rounded-xl text-[10px] font-bold border transition-all ${newStory.type === type ? 'bg-primary text-white border-primary' : 'bg-slate-50 text-slate-400 border-slate-100'}`}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                        <button onClick={handleAddStory} className="w-full py-3 bg-slate-900 text-white rounded-2xl text-xs font-bold mt-2">Publish Story</button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-2 gap-4">
                    {stories.map((item) => (
                        <div key={item.id} className="aspect-[3/4] bg-white rounded-3xl border border-slate-50 overflow-hidden relative group">
                            <img src={item.image} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                            <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center z-10">
                                <span className="text-[8px] bg-black/50 text-white px-2 py-0.5 rounded-full backdrop-blur-md">{item.type}</span>
                                <button 
                                  onClick={() => adminService.deleteStory(item.id)}
                                  className="p-1.5 bg-white rounded-lg text-red-500 shadow-lg"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>
        )}

        {activeTab === 'categories' && (
            <motion.div key="categories" className="space-y-4">
                <button onClick={() => setIsAdding(true)} className="w-full btn-primary py-4 rounded-3xl mb-4 flex items-center justify-center gap-2">
                    <Plus size={20} /> Create Category
                </button>

                <AnimatePresence>
                  {isAdding && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-white p-6 rounded-3xl border-2 border-primary/10 overflow-hidden">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-sm">New Category</h4>
                        <button onClick={() => setIsAdding(false)}><X size={18} className="text-slate-400" /></button>
                      </div>
                      <div className="space-y-3">
                        <input 
                          placeholder="Category Name (Bangla)" 
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs outline-none"
                          value={newCategory.title}
                          onChange={e => setNewCategory({...newCategory, title: e.target.value})}
                        />
                        <input 
                          placeholder="Category Name (English)" 
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs outline-none"
                          value={newCategory.titleEn}
                          onChange={e => setNewCategory({...newCategory, titleEn: e.target.value})}
                        />
                        <ImageUpload 
                            label="Category Icon/Image"
                            currentImage={newCategory.image}
                            onUpload={(base64) => setNewCategory({...newCategory, image: base64})}
                        />
                        <input 
                          placeholder="Sub-categories (Bangla, comma separated)" 
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs outline-none"
                          value={newCategory.subCategories}
                          onChange={e => setNewCategory({...newCategory, subCategories: e.target.value})}
                        />
                        <input 
                          placeholder="Sub-categories (English, comma separated)" 
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs outline-none"
                          value={newCategory.subCategoriesEn}
                          onChange={e => setNewCategory({...newCategory, subCategoriesEn: e.target.value})}
                        />
                        <button onClick={handleAddCategory} className="w-full py-3 bg-slate-900 text-white rounded-2xl text-xs font-bold mt-2">Add Category</button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="bg-white rounded-3xl border border-slate-50 overflow-hidden divide-y divide-slate-50">
                    {categories.map((cat) => (
                        <div key={cat.id} className="flex flex-col">
                            <div className="p-4 flex items-center justify-between transition-colors hover:bg-slate-50/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-slate-50 rounded-xl overflow-hidden">
                                      <img src={cat.image} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-slate-700">{cat.title}</span>
                                        <p className="text-[9px] text-slate-400 font-medium lowercase">
                                            {cat.subCategories?.length || 0} Sub-categories
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                      onClick={() => setEditingCategory(editingCategory === cat.id ? null : cat.id)}
                                      className={`p-2 rounded-xl transition-all ${editingCategory === cat.id ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-100'}`}
                                    >
                                        <Settings size={18} />
                                    </button>
                                    <button 
                                      onClick={() => adminService.deleteCategory(cat.id)}
                                      className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                            
                            <AnimatePresence>
                                {editingCategory === cat.id && (
                                    <motion.div 
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="px-4 pb-4 bg-slate-50/50"
                                    >
                                        <div className="pt-2 space-y-3">
                                            <div className="flex flex-wrap gap-2">
                                                {cat.subCategories?.map((sub: string) => (
                                                    <div key={sub} className="flex items-center gap-1 bg-white border border-slate-100 px-2 py-1 rounded-lg">
                                                        <span className="text-[10px] font-bold text-slate-600">{sub}</span>
                                                        <button 
                                                            onClick={() => handleRemoveSubCategory(cat.id, cat.subCategories, sub)}
                                                            className="text-slate-300 hover:text-red-500"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                            
                                            <div className="flex gap-2">
                                                <input 
                                                    placeholder="Add sub-category..." 
                                                    className="flex-1 px-3 py-2 bg-white border border-slate-100 rounded-xl text-[10px] outline-none"
                                                    value={newSubCategory}
                                                    onChange={e => setNewSubCategory(e.target.value)}
                                                    onKeyPress={e => e.key === 'Enter' && handleAddSubCategory(cat.id, cat.subCategories)}
                                                />
                                                <button 
                                                    onClick={() => handleAddSubCategory(cat.id, cat.subCategories)}
                                                    className="px-3 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-bold"
                                                >
                                                    Add
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
          <motion.div key="riders" className="space-y-4">
            <h3 className="font-display font-bold text-lg px-1">Delivery Partners</h3>
            <div className="grid gap-4">
              {sellers.filter(u => u.role === 'rider').map((rider) => (
                <div key={rider.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-100 text-orange-500 rounded-2xl flex items-center justify-center">
                      <User size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">{rider.realName || rider.displayName}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{rider.phone || 'No Phone'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${rider.isVerified ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'}`}>
                          {rider.isVerified ? 'Verified' : 'Unverified'}
                        </span>
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${rider.status === 'online' ? 'bg-green-50 text-green-500' : 'bg-slate-50 text-slate-400'}`}>
                          {rider.status || 'offline'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!rider.isVerified && (
                      <button 
                        onClick={() => adminService.updateUserRole(rider.id, 'rider', true)}
                        className="px-4 py-2 bg-primary text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-primary/20"
                      >
                        Verify
                      </button>
                    )}
                    <button 
                      onClick={() => adminService.deleteUser(rider.id)}
                      className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {sellers.filter(u => u.role === 'rider').length === 0 && (
              <p className="text-center py-20 text-slate-400 text-sm bg-white rounded-[2rem] border border-dashed border-slate-200">No riders registered.</p>
            )}
          </motion.div>
        )}

        {activeTab === 'users' && (
            <motion.div key="users" className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <h3 className="font-display font-bold text-lg">User Directory</h3>
                    <div className="flex gap-2">
                        <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-bold">Total: {sellers.length}</span>
                    </div>
                </div>

                {sellers.map((u) => (
                    <div key={u.id} className="bg-white p-5 rounded-[2.5rem] border border-slate-100 shadow-sm transition-all hover:shadow-md group">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${u.role === 'admin' ? 'bg-slate-900 text-white' : u.role === 'seller' ? 'bg-primary/10 text-primary' : u.role === 'rider' ? 'bg-blue-50 text-blue-500' : 'bg-slate-50 text-slate-400'}`}>
                                    {u.role === 'admin' ? <ShieldCheck size={24} /> : u.role === 'seller' ? <Store size={24} /> : u.role === 'rider' ? <Truck size={24} /> : <User size={24} />}
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm text-slate-800">{u.displayName || 'No Name'}</h4>
                                    <div className="flex flex-col gap-0.5 mt-0.5">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{u.role || 'customer'}</span>
                                            {u.isVerified && <CheckCircle size={10} className="text-primary" />}
                                            {u.isBlocked && <span className="bg-red-500 text-white text-[8px] px-1.5 py-0.5 rounded-md font-black">BLOCKED</span>}
                                        </div>
                                        {u.payoutAccount && (
                                            <div className="flex items-center gap-1.5 mt-1">
                                                <span className="text-[8px] font-black bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase tracking-widest">{u.paymentMethod}</span>
                                                <span className="text-[9px] font-bold text-slate-600 font-sans">{u.payoutAccount}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {!u.isVerified && u.roleRequest === 'seller' && (
                                    <button 
                                        onClick={() => adminService.verifySeller(u.id)}
                                        className="px-4 py-2 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20"
                                    >
                                        Verify Seller
                                    </button>
                                )}
                                <button 
                                    onClick={() => adminService.blockUser(u.id, !u.isBlocked)}
                                    className={`p-2 rounded-xl border transition-all ${u.isBlocked ? 'bg-red-50 text-red-500 border-red-100' : 'text-slate-400 border-slate-100 hover:bg-slate-50'}`}
                                >
                                    <XCircle size={18} />
                                </button>
                                {u.email !== 'mehedihasa6682@gmail.com' ? (
                                    <select 
                                        value={u.role || 'customer'}
                                        onChange={(e) => adminService.updateUserRole(u.id, e.target.value)}
                                        className="bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase px-2 py-2 outline-none focus:ring-2 ring-primary/20"
                                    >
                                        <option value="customer">Customer</option>
                                        <option value="seller">Seller</option>
                                        <option value="rider">Rider</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                ) : (
                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest bg-slate-100 px-3 py-2 rounded-xl">Main Admin</span>
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
                                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-50 grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Email Address</p>
                                <p className="text-[11px] font-bold text-slate-600 truncate">{u.email}</p>
                            </div>
                            <div>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Last Activity</p>
                                <p className="text-[11px] font-bold text-slate-600">{u.lastLogin?.toDate ? format(u.lastLogin.toDate(), 'dd MMM HH:mm') : 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </motion.div>
        )}

        {activeTab === 'bundles' && (
            <motion.div key="bundles" className="space-y-4">
                <button onClick={() => setIsAdding(true)} className="w-full btn-primary py-4 rounded-3xl mb-4 flex items-center justify-center gap-2">
                    <Plus size={20} /> Create Bundle Offer
                </button>

                <AnimatePresence>
                  {isAdding && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-white p-6 rounded-3xl border-2 border-primary/10 overflow-hidden">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-sm">Bundle Details</h4>
                        <button onClick={() => setIsAdding(false)}><X size={18} className="text-slate-400" /></button>
                      </div>
                      <div className="space-y-3">
                        <input 
                          placeholder="Bundle Name (Bangla)" 
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs outline-none"
                          value={newBundle.name}
                          onChange={e => setNewBundle({...newBundle, name: e.target.value})}
                        />
                        <input 
                          placeholder="Bundle Name (English)" 
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs outline-none"
                          value={newBundle.nameEn}
                          onChange={e => setNewBundle({...newBundle, nameEn: e.target.value})}
                        />
                        <input 
                          type="number"
                          placeholder="Price (৳)" 
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs outline-none"
                          value={newBundle.price}
                          onChange={e => setNewBundle({...newBundle, price: e.target.value})}
                        />
                        <ImageUpload 
                            label="Bundle Image"
                            currentImage={newBundle.image}
                            onUpload={(base64) => setNewBundle({...newBundle, image: base64})}
                        />
                        <textarea 
                          placeholder="Bundle Description" 
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs h-20 outline-none"
                          value={newBundle.description}
                          onChange={e => setNewBundle({...newBundle, description: e.target.value})}
                        />
                        <button onClick={handleAddBundle} className="w-full py-3 bg-slate-900 text-white rounded-2xl text-xs font-bold mt-2">Publish Bundle</button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-1 gap-4">
                    {bundles.map((bundle) => (
                        <div key={bundle.id} className="bg-white p-4 rounded-3xl border border-slate-100 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-slate-100 rounded-2xl overflow-hidden shadow-inner">
                                    <img src={bundle.image} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm text-slate-800">{bundle.name}</h4>
                                    <p className="text-xs font-bold text-primary">৳{bundle.price}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => adminService.deleteBundle(bundle.id)}
                                className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>
                    ))}
                    {bundles.length === 0 && (
                        <div className="text-center py-20 text-slate-400 text-sm bg-white rounded-[2.5rem] border border-dashed border-slate-200">
                            No active bundles.
                        </div>
                    )}
                </div>
            </motion.div>
        )}

        {activeTab === 'settings' && (
            <motion.div key="settings" className="space-y-6">
                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <h3 className="font-display font-bold text-lg mb-6 flex items-center gap-2">
                        <MessageSquare size={20} className="text-secondary" />
                        Marketing Guide (Spark Plan Free Tools)
                    </h3>
                    <div className="space-y-4 text-xs text-slate-500 leading-relaxed">
                        <div className="p-4 bg-secondary/5 border border-secondary/10 rounded-2xl">
                          <p className="font-bold text-secondary mb-1">How to Send Offers for Free:</p>
                          <ul className="list-disc ml-4 space-y-1">
                            <li><strong>In-App:</strong> Use "Send Targeted Notification" with empty UID to reach all users. This is 100% free.</li>
                            <li><strong>Push:</strong> Your VAPID key is active. Users who allowed notifications will see them on their phone/browser.</li>
                            <li><strong>Email:</strong> Click "Email All Users" to open your mail app with all user addresses hidden in BCC. This bypasses the need for a paid SMTP server.</li>
                            <li><strong>Banner:</strong> Update the Global Promo Banner below to show a message at the top of every page.</li>
                          </ul>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <h3 className="font-display font-bold text-lg mb-6 flex items-center gap-2">
                        <Layout size={20} className="text-primary" />
                        Global Promo Banner
                    </h3>
                    <div className="space-y-4 max-w-sm">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Banner Text (Eid Special etc.)</label>
                          <input 
                              placeholder="Type offer message here..." 
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-primary/20"
                              id="promoText"
                              defaultValue={appSettings.promoBanner || ''}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <button 
                              onClick={async () => {
                                  const text = (document.getElementById('promoText') as HTMLInputElement).value;
                                  const { updateDoc, doc } = await import('firebase/firestore');
                                  const { db } = await import('../firebase');
                                  await updateDoc(doc(db, 'settings', 'app'), { 
                                    promoBanner: text || null,
                                    updatedAt: new Date().toISOString()
                                  });
                                  alert('Promo Banner Updated!');
                              }}
                              className="btn-primary py-4 rounded-2xl font-bold font-display"
                          >
                              Update Banner
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
                                  alert('Banner Removed!');
                              }}
                              className="bg-slate-100 text-slate-400 py-4 rounded-2xl font-bold font-display hover:bg-slate-200"
                          >
                              Clear
                          </button>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <h3 className="font-display font-bold text-lg mb-6 flex items-center gap-2">
                        <Bell size={20} className="text-primary" />
                        Send Targeted Notification
                    </h3>
                    <div className="space-y-4 max-w-sm">
                        <div className="grid grid-cols-2 gap-3">
                          <input 
                              placeholder="User UID (Empty = All Users)" 
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs outline-none"
                              id="targetUserId"
                          />
                          <select 
                            id="notifType"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] outline-none font-bold text-slate-600"
                          >
                            <option value="promo">Offer/Promo</option>
                            <option value="order">Order Update</option>
                            <option value="payment">Payment Info</option>
                            <option value="system">System Message</option>
                          </select>
                        </div>
                        <input 
                            placeholder="Notification Title" 
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs outline-none"
                            id="notifTitle"
                        />
                        <textarea 
                            placeholder="Message Content" 
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs h-24 outline-none"
                            id="notifMessage"
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={async () => {
                                    const uid = (document.getElementById('targetUserId') as HTMLInputElement).value;
                                    const title = (document.getElementById('notifTitle') as HTMLInputElement).value;
                                    const msg = (document.getElementById('notifMessage') as HTMLInputElement).value;
                                    const type = (document.getElementById('notifType') as HTMLSelectElement).value as any;
                                    
                                    if(title && msg) {
                                        const { NotificationService } = await import('../services/notificationService');
                                        const { getDocs, collection } = await import('firebase/firestore');
                                        const { db } = await import('../firebase');
                                        
                                        if (uid) {
                                            await NotificationService.sendNotification({
                                                userId: uid,
                                                title,
                                                message: msg,
                                                type: type
                                            });
                                            alert('Notification Sent to 1 user!');
                                        } else {
                                            if (confirm('Are you sure you want to send this to ALL users?')) {
                                              await NotificationService.sendNotification({
                                                  userId: 'all',
                                                  title,
                                                  message: msg,
                                                  type: type
                                              });
                                              alert(`Notification Sent to ALL users!`);
                                            }
                                        }
                                        
                                        (document.getElementById('targetUserId') as HTMLInputElement).value = '';
                                        (document.getElementById('notifTitle') as HTMLInputElement).value = '';
                                        (document.getElementById('notifMessage') as HTMLInputElement).value = '';
                                    } else {
                                        alert('Please fill at least Title and Message');
                                    }
                                }}
                                className="w-full btn-primary py-4 rounded-2xl font-bold text-xs"
                            >
                                Send Notification
                            </button>
                            <button 
                                onClick={async () => {
                                    const title = (document.getElementById('notifTitle') as HTMLInputElement).value;
                                    const msg = (document.getElementById('notifMessage') as HTMLInputElement).value;
                                    const { getDocs, collection } = await import('firebase/firestore');
                                    const { db } = await import('../firebase');
                                    
                                    if (!title || !msg) {
                                      alert('Please enter Title (Subject) and Message for the email');
                                      return;
                                    }

                                    const usersSnap = await getDocs(collection(db, 'users'));
                                    const emails = usersSnap.docs.map(d => d.data().email).filter(e => e);
                                    
                                    if (emails.length === 0) {
                                      alert('No user emails found');
                                      return;
                                    }

                                    const bcc = emails.join(',');
                                    const mailtoUrl = `mailto:?bcc=${bcc}&subject=${encodeURIComponent(title)}&body=${encodeURIComponent(msg)}`;
                                    window.open(mailtoUrl, '_blank');
                                    alert('Opening mail app with all user emails in BCC...');
                                }}
                                className="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold text-xs hover:bg-slate-200 transition-colors"
                            >
                                Email All Users
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <h3 className="font-display font-bold text-lg mb-6 flex items-center gap-2">
                        <MessageSquare size={20} className="text-primary" />
                        Site Configuration & Support
                    </h3>
                    <div className="space-y-4 max-w-sm">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-1">WhatsApp Support Number</label>
                          <input 
                              placeholder="+8801..." 
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-primary/20"
                              id="whatsappNum"
                              defaultValue={appSettings.whatsappNumber || ''}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Support Email</label>
                          <input 
                              placeholder="info@kishan.com" 
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-primary/20"
                              id="supportEmail"
                              defaultValue={appSettings.supportEmail || ''}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Shop/Office Address</label>
                          <input 
                              placeholder="House 0, Road 0..." 
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-primary/20"
                              id="shopAddress"
                              defaultValue={appSettings.shopAddress || ''}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Promo/Announcement Bar</label>
                          <input 
                              placeholder="Free delivery on orders over 1000tk!" 
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-primary/20"
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
                                alert('App Settings Updated!');
                            }}
                            className="w-full btn-primary py-4 rounded-2xl font-bold font-display"
                        >
                            Save Site Settings
                        </button>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <h3 className="font-display font-bold text-lg mb-6 flex items-center gap-2">
                        <ImageIcon size={20} className="text-primary" />
                        Logo & Branding
                    </h3>
                    <div className="space-y-6">
                        <div className="max-w-xs space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-1">App Name</label>
                          <input 
                              placeholder="e.g. Kishan Marketplace" 
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-primary/20"
                              id="appNameInput"
                              defaultValue={appSettings.appName || ''}
                              onBlur={async (e) => {
                                await adminService.updateAppSetting('appName', e.target.value);
                              }}
                          />
                        </div>
                        
                        <div className="max-w-xs">
                            <ImageUpload 
                                label="App Main Logo"
                                currentImage={appSettings.logo}
                                onUpload={updateLogo}
                            />
                            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed font-black uppercase tracking-widest">
                                Appearing on navbar, notifications and app icon.
                            </p>
                        </div>

                        <div className="border-t border-slate-50 pt-6">
                          <h4 className="font-bold text-sm mb-4">PWA Install Screenshots</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <ImageUpload 
                                label="Mobile Screenshot (9:16)"
                                currentImage={appSettings.screenshotMobile}
                                onUpload={(base64) => adminService.updateAppSetting('screenshotMobile', base64)}
                            />
                            <ImageUpload 
                                label="Desktop Screenshot (16:9)"
                                currentImage={appSettings.screenshotDesktop}
                                onUpload={(base64) => adminService.updateAppSetting('screenshotDesktop', base64)}
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 mt-4 leading-relaxed font-black uppercase tracking-widest">
                              These will appear when a user tries to install the app on their phone or PC.
                          </p>
                        </div>

                        <div className="border-t border-slate-50 pt-6">
                          <h4 className="font-bold text-sm mb-4">Push Notifications (PWA)</h4>
                          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-3">Backend Connectivity</p>
                            <button 
                              onClick={async () => {
                                try {
                                  const { MessagingService } = await import('../services/messagingService');
                                  const res = await MessagingService.testPush();
                                  if (res.success) {
                                    alert("Success! Check your device for notification.");
                                  } else {
                                    alert("Error: " + (res.error || "Unknown error"));
                                  }
                                } catch (e: any) {
                                  alert("Error: " + e.message);
                                }
                              }}
                              className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-lg shadow-slate-900/10 hover:scale-[1.02] transition-transform active:scale-[0.98]"
                            >
                              Send Test Push from Backend
                            </button>
                            <p className="text-[9px] text-slate-400 mt-3 italic">
                              * Node.js (backend) push requires VAPID_PRIVATE_KEY secret.
                            </p>
                          </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <h3 className="font-display font-bold text-lg mb-6 flex items-center gap-2">
                        <Truck size={20} className="text-primary" />
                        Delivery Area Management
                    </h3>
                    
                    <div className="space-y-4 mb-8">
                        {deliveryAreas.map(area => (
                            <div key={area.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div>
                                    <h4 className="font-bold text-sm text-slate-800">{area.name}</h4>
                                    <p className="text-[10px] font-black text-primary uppercase">Fee: ৳{area.fee}</p>
                                </div>
                                <button 
                                    onClick={() => adminService.deleteDeliveryArea(area.id)}
                                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="bg-slate-50 p-5 rounded-3xl space-y-3">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Add New Area</p>
                        <div className="flex gap-3">
                            <input 
                                placeholder="Area Name (e.g. Uttara)" 
                                className="flex-1 px-4 py-3 bg-white border border-slate-100 rounded-2xl text-xs outline-none"
                                value={newArea.name}
                                onChange={e => setNewArea({...newArea, name: e.target.value})}
                            />
                            <input 
                                placeholder="Fee" 
                                type="number"
                                className="w-24 px-4 py-3 bg-white border border-slate-100 rounded-2xl text-xs outline-none"
                                value={isNaN(newArea.fee) ? '' : newArea.fee}
                                onChange={e => {
                                    const val = parseInt(e.target.value);
                                    setNewArea({...newArea, fee: isNaN(val) ? 0 : val});
                                }}
                            />
                        </div>
                        <button 
                            onClick={async () => {
                                await adminService.updateDeliveryArea('new', newArea);
                                setNewArea({ name: '', fee: 50 });
                            }}
                            className="w-full py-3 bg-slate-900 text-white rounded-2xl text-xs font-bold shadow-lg"
                        >
                            Save Delivery Area
                        </button>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
                        <CreditCard size={20} className="text-secondary" />
                        System Config
                    </h3>
                    <p className="text-xs text-slate-400 mb-6 font-medium">Global parameters for maintenance and promo control.</p>
                    <div className="grid grid-cols-2 gap-4">
                        <button className="py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600">Maintenance Mode</button>
                        <button className="py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600">Flash Sale Toggle</button>
                    </div>
                </div>
            </motion.div>
        )}
        {activeTab === 'riders' && (
          <motion.div key="riders" className="space-y-6">
            <h3 className="font-display font-bold text-lg px-1 flex items-center gap-2">
                <Truck size={20} className="text-primary" />
                Active Riders ({sellers.filter(s => s.role === 'rider').length})
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sellers.filter(s => s.role === 'rider').map(rider => {
                    const activeDeliveries = orders.filter(o => o.riderId === rider.id && o.status !== 'delivered' && o.status !== 'cancelled');
                    return (
                        <div key={rider.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center relative shadow-lg">
                                        <User size={24} />
                                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${rider.status === 'online' ? 'bg-green-500' : 'bg-slate-300'}`} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm text-slate-800">{rider.displayName || 'Unnamed Rider'}</h4>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{rider.phone || 'No Phone'}</p>
                                    </div>
                                </div>
                                <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg ${rider.status === 'online' ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-400'}`}>
                                    {rider.status || 'Offline'}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-slate-50 p-3 rounded-2xl">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Active tasks</span>
                                    <p className="font-display font-bold text-slate-800">{activeDeliveries.length}</p>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-2xl">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Last Update</span>
                                    <p className="text-[10px] font-bold text-slate-600">
                                        {rider.lastLocationUpdate ? format(rider.lastLocationUpdate.toDate ? rider.lastLocationUpdate.toDate() : new Date(rider.lastLocationUpdate), 'h:mm a') : 'N/A'}
                                    </p>
                                </div>
                            </div>

                            {rider.location && (
                                <a 
                                    href={`https://www.google.com/maps?q=${rider.location.lat},${rider.location.lng}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-full py-3 bg-blue-50 text-blue-500 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                                >
                                    <MapPin size={14} /> View Position on Map
                                </a>
                            )}
                        </div>
                    );
                })}
            </div>
            {sellers.filter(s => s.role === 'rider').length === 0 && (
                <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-slate-200">
                    <Truck size={48} className="mx-auto text-slate-100 mb-4" />
                    <p className="text-xs font-bold text-slate-300 uppercase tracking-[0.2em]">No riders registered</p>
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
            className="space-y-6"
          >
                <h3 className="font-display font-bold text-lg mb-6 flex items-center gap-2">
                    <Bell size={20} className="text-primary" />
                    Compose & Send Notification
                </h3>
                <div className="bg-slate-50 p-6 rounded-3xl space-y-4 border border-slate-100">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Audience</label>
                      <select id="notifTarget" className="w-full px-4 py-3 bg-white border border-slate-100 rounded-2xl text-xs outline-none">
                        <option value="all">All Users</option>
                        <option value="riders">Only Riders</option>
                        <option value="sellers">Only Sellers</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type</label>
                      <select id="notifType" className="w-full px-4 py-3 bg-white border border-slate-100 rounded-2xl text-xs outline-none">
                        <option value="info">System Info</option>
                        <option value="promo">Promotion</option>
                        <option value="alert">Alert</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Message Title</label>
                    <input id="notifTitle" placeholder="e.g. Weekend Rush Sale!" className="w-full px-4 py-3 bg-white border border-slate-100 rounded-2xl text-xs outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Detailed Message</label>
                    <textarea id="notifMessage" placeholder="Type your message here..." className="w-full px-4 py-3 bg-white border border-slate-100 rounded-2xl text-xs outline-none h-24 resize-none" />
                  </div>
                  <button 
                    onClick={async () => {
                      const title = (document.getElementById('notifTitle') as HTMLInputElement).value;
                      const message = (document.getElementById('notifMessage') as HTMLTextAreaElement).value;
                      const target = (document.getElementById('notifTarget') as HTMLSelectElement).value;
                      const type = (document.getElementById('notifType') as HTMLSelectElement).value;

                      if (!title || !message) return alert('Fill title and message');

                      try {
                        const { NotificationService } = await import('../services/notificationService');
                        if (target === 'all') {
                          await NotificationService.sendNotification({
                            userId: 'all',
                            title,
                            message,
                            type: type as any
                          });
                        } else {
                          // Filter users by role and send one by one for demo
                          const roleToTarget = target === 'riders' ? 'rider' : 'seller';
                          const targets = sellers.filter(s => s.role === roleToTarget);
                          for (const t of targets) {
                            await NotificationService.sendNotification({
                              userId: t.id,
                              title,
                              message,
                              type: type as any
                            });
                          }
                        }
                        alert('Notifications dispatched!');
                        (document.getElementById('notifTitle') as HTMLInputElement).value = '';
                        (document.getElementById('notifMessage') as HTMLTextAreaElement).value = '';
                      } catch (e) {
                          alert('Error sending notification');
                      }
                    }}
                    className="w-full py-4 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-xl shadow-primary/20"
                  >
                    Dispatch Now
                  </button>
                </div>

            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <h3 className="font-display font-bold text-lg mb-6 flex items-center gap-2">
                    <Bell size={20} className="text-primary" />
                    Sent Notifications History
                </h3>
                <div className="space-y-4">
                    {notifications.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-slate-400 text-sm">No notifications found.</p>
                        </div>
                    ) : (
                        notifications.map(notif => (
                            <div key={notif.id} className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex flex-col gap-2">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase text-white ${
                                            notif.type === 'promo' ? 'bg-secondary' :
                                            notif.type === 'order' ? 'bg-blue-500' :
                                            'bg-slate-400'
                                        }`}>
                                            {notif.type || 'system'}
                                        </span>
                                        <p className="text-[10px] text-slate-400 font-bold">
                                            To: {notif.userId === 'all' ? 'ALL USERS' : `User ${notif.userId?.slice(-6) || 'N/A'}`}
                                        </p>
                                    </div>
                                    <p className="text-[9px] text-slate-400 font-medium">
                                        {notif.createdAt?.toDate ? format(notif.createdAt.toDate(), 'MMM d, h:mm a') : 'Just now'}
                                    </p>
                                </div>
                                <div className="mt-1">
                                    <h5 className="text-xs font-bold text-slate-800 mb-0.5 tracking-tight">{notif.title}</h5>
                                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{notif.message}</p>
                                </div>
                            </div>
                        ))
                    )}
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
