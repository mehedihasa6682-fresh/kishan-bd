import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Users, ShoppingBag, Truck, CreditCard, 
  Settings, BarChart3, ShieldCheck, Search,
  CheckCircle, XCircle, Plus, Trash2, Layout,
  Layers, Camera, ChevronRight, Store, X, Clock, Bell,
  ArrowLeft, User, Box, Gift, Image as ImageIcon
} from 'lucide-react';
import { adminService } from '../services/adminService';
import { collection, onSnapshot, query, orderBy, where, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { AuthContext } from '../App';
import Invoice from '../components/Invoice';
import ImageUpload from '../components/ImageUpload';
import { format } from 'date-fns';

export default function AdminPanel() {
  const { user, role, loading: authLoading } = useContext(AuthContext);
  const navigate = useNavigate();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [deliveryAreas, setDeliveryAreas] = useState<any[]>([]);
  const [newArea, setNewArea] = useState({ name: '', fee: 50 });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'approvals' | 'banners' | 'stories' | 'categories' | 'users' | 'orders' | 'bundles' | 'settings'>('dashboard');
  const [isAdding, setIsAdding] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [newSubCategory, setNewSubCategory] = useState('');
  
  // Data States
  const [banners, setBanners] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [bundles, setBundles] = useState<any[]>([]);
  const [appSettings, setAppSettings] = useState<any>({ logo: '' });

  const pendingProducts = products.filter(p => p.status === 'pending');
  const approvedProducts = products.filter(p => p.status === 'approved');

  // Form States
  const [newBanner, setNewBanner] = useState({ title: '', subtitle: '', image: '' });
  const [newStory, setNewStory] = useState({ name: '', role: '', quote: '', image: '', type: 'Farmer' });
  const [newCategory, setNewCategory] = useState({ title: '', titleEn: '', image: '', subCategories: '', subCategoriesEn: '' });
  const [newProduct, setNewProduct] = useState({ name: '', nameEn: '', price: '', category: '', subCategory: '', image: '', unit: 'kg', farmer: '', location: '', description: '', descriptionEn: '' });
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

    const unsubBundles = onSnapshot(collection(db, 'bundles'), (snap) => {
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
    };
  }, [role, authLoading, navigate]);

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price || !newProduct.image) return;
    await adminService.addProduct(newProduct);
    setNewProduct({ name: '', nameEn: '', price: '', category: '', subCategory: '', image: '', unit: 'kg', farmer: '', location: '', description: '', descriptionEn: '' });
    setIsAdding(false);
  };

  const handleAddBanner = async () => {
    if (!newBanner.title || !newBanner.image) return;
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
    { id: 'products', label: 'Products', icon: ShoppingBag },
    { id: 'bundles', label: 'Bundles', icon: Gift },
    { id: 'banners', label: 'Banners', icon: Layout },
    { id: 'stories', label: 'Stories', icon: Camera },
    { id: 'categories', label: 'Categories', icon: Layers },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
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
                { label: 'Net Revenue', value: `৳${orders.filter(o => o.status !== 'cancelled').reduce((acc, o) => acc + o.total, 0)}`, color: 'text-green-500', bg: 'bg-green-50' },
                { label: 'Products', value: products.length.toString(), color: 'text-purple-500', bg: 'bg-purple-50' },
              ].map((stat) => (
                <div key={stat.label} className="bg-white p-5 rounded-[2rem] border border-slate-50 shadow-sm">
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
                                <p className="text-xs font-bold text-slate-800">৳{order.total}</p>
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
          <motion.div key="approvals" className="space-y-4">
            <h3 className="font-display font-bold text-lg px-1">Product Approval Queue</h3>
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
                    <p className="font-display font-bold text-primary">৳{order.total}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{order.paymentMethod}</p>
                    {order.discount > 0 && <p className="text-[9px] text-secondary font-black truncate">DISCOUNT: -৳{order.discount}</p>}
                  </div>
                </div>

                <div className="bg-slate-50/50 rounded-2xl p-4 space-y-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ordered Items</p>
                    {order.items?.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-[11px]">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-700">{item.quantity}x</span>
                                <span className="text-slate-600">{item.name}</span>
                            </div>
                            <span className="font-medium text-slate-400">৳{item.price * item.quantity}</span>
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
            <button 
              onClick={() => setIsAdding(true)}
              className="w-full btn-primary py-4 rounded-3xl mb-4 flex items-center justify-center gap-2"
            >
              <Plus size={20} /> Add New Product
            </button>

            <AnimatePresence>
              {isAdding && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-white p-6 rounded-3xl border-2 border-primary/10 overflow-hidden">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-sm">Product Details</h4>
                    <button onClick={() => setIsAdding(false)}><X size={18} className="text-slate-400" /></button>
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
                    <input 
                      placeholder="Price (৳)" 
                      className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs outline-none"
                      value={newProduct.price}
                      onChange={e => setNewProduct({...newProduct, price: e.target.value})}
                    />
                    <input 
                      placeholder="Unit (kg/pcs)" 
                      className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs outline-none"
                      value={newProduct.unit}
                      onChange={e => setNewProduct({...newProduct, unit: e.target.value})}
                    />
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
                    <button onClick={handleAddProduct} className="col-span-2 py-3 bg-slate-900 text-white rounded-2xl text-xs font-bold mt-2">Publish Product</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <h3 className="font-display font-bold text-lg px-1 mt-6">Live Inventory ({approvedProducts.length})</h3>
            {approvedProducts.map((prod) => (
              <div key={prod.id} className="bg-white p-4 rounded-2xl border border-slate-50 shadow-sm flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-slate-50 rounded-xl overflow-hidden">
                    <img src={prod.image} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs">{prod.name}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">৳{prod.price} / {prod.unit}</p>
                    <button 
                      onClick={() => adminService.updateStockStatus(prod.id, prod.stockStatus === 'In Stock' ? 'Out of Stock' : 'In Stock')}
                      className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md mt-1 transition-all ${
                        prod.stockStatus === 'Out of Stock' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'
                      }`}
                    >
                      {prod.stockStatus || 'In Stock'}
                    </button>
                  </div>
                </div>
                <button 
                  onClick={() => adminService.deleteProduct(prod.id)}
                  className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {approvedProducts.length === 0 && (
              <div className="text-center py-10 text-slate-400 text-xs font-medium bg-white rounded-[2rem] border border-dashed border-slate-200">
                No active products
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
                      placeholder="Title (e.g. Fresh Mangoes)" 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs outline-none"
                      value={newBanner.title}
                      onChange={e => setNewBanner({...newBanner, title: e.target.value})}
                    />
                    <input 
                      placeholder="Subtitle (e.g. 20% Off)" 
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
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{u.role || 'customer'}</span>
                                        {u.isVerified && <CheckCircle size={12} className="text-primary" />}
                                        {u.isBlocked && <span className="bg-red-500 text-white text-[8px] px-1.5 py-0.5 rounded-md font-black">BLOCKED</span>}
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
                                <button 
                                    onClick={() => adminService.deleteSeller(u.id)}
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
                        <Bell size={20} className="text-primary" />
                        Send Direct Notification
                    </h3>
                    <div className="space-y-4 max-w-sm">
                        <input 
                            placeholder="User UID (Get from User List)" 
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs outline-none"
                            id="targetUserId"
                        />
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
                        <button 
                            onClick={async () => {
                                const uid = (document.getElementById('targetUserId') as HTMLInputElement).value;
                                const title = (document.getElementById('notifTitle') as HTMLInputElement).value;
                                const msg = (document.getElementById('notifMessage') as HTMLInputElement).value;
                                if(uid && title && msg) {
                                    const { notificationService } = await import('../services/notificationService');
                                    await notificationService.sendNotification(uid, title, msg, 'system');
                                    alert('Notification Sent!');
                                    (document.getElementById('targetUserId') as HTMLInputElement).value = '';
                                    (document.getElementById('notifTitle') as HTMLInputElement).value = '';
                                    (document.getElementById('notifMessage') as HTMLInputElement).value = '';
                                } else {
                                    alert('Please fill all fields');
                                }
                            }}
                            className="w-full btn-primary py-4 rounded-2xl font-bold"
                        >
                            Send Notification
                        </button>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <h3 className="font-display font-bold text-lg mb-6 flex items-center gap-2">
                        <ImageIcon size={20} className="text-primary" />
                        Logo & Branding
                    </h3>
                    <div className="max-w-xs">
                        <ImageUpload 
                            label="App Main Logo"
                            currentImage={appSettings.logo}
                            onUpload={updateLogo}
                        />
                        <p className="text-[10px] text-slate-400 mt-4 leading-relaxed font-black uppercase tracking-widest leading-none">
                            This logo will appear on the navbar across the entire application.
                        </p>
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
      </AnimatePresence>
      </div>
      
      {selectedOrder && (
        <Invoice order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}
    </motion.div>
  );
}
