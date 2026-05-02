import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, Package, Clock, Wallet, 
  Plus, Search, Edit2, Trash2, CheckCircle2, 
  X, Image as ImageIcon, MapPin, Store, Truck, 
  CheckCircle, AlertCircle, ShoppingBag, ArrowLeft
} from 'lucide-react';
import { useState, useEffect, useContext, FormEvent } from 'react';
import { AuthContext } from '../App';
import { sellerService } from '../services/sellerService';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase';

import ImageUpload from '../components/ImageUpload';

export default function SellerDashboard() {
  const { user, role } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'analytics'>('orders');
  const [isAdding, setIsAdding] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [shopName, setShopName] = useState('');
  
  // Data States
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isVerified, setIsVerified] = useState(false);
  const [isPending, setIsPending] = useState(false);

  // Form State
  const [newProduct, setNewProduct] = useState({
      name: '',
      nameEn: '',
      price: '',
      unit: 'kg',
      category: '',
      subCategory: '',
      image: '',
      stock: 'In Stock',
      description: '',
      descriptionEn: ''
  });

  useEffect(() => {
    if (!user) return;

    // Check verification status
    const unsubUser = onSnapshot(doc(db, 'users', user.uid), (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            setIsVerified(data.isVerified || false);
            setIsPending(data.roleRequest === 'seller' || (data.role === 'customer' && data.isVerified === false && data.shopName));
        }
    });

    const unsubProducts = sellerService.getMyProducts(user.uid, setProducts);
    const unsubOrders = sellerService.getMyOrders(user.uid, setOrders);
    
    // Get categories for selection
    const unsubCats = onSnapshot(collection(db, 'categories'), (snap) => {
        setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
        unsubUser();
        unsubProducts.then(u => u());
        unsubOrders.then(u => u());
        unsubCats();
    };
  }, [user]);

  const handleAddProduct = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    await sellerService.addProduct({
        ...newProduct,
        price: Number(newProduct.price),
        sellerId: user.uid,
        farmer: user.displayName || 'Farmer',
        location: 'Local Farm' // Should be from seller profile
    });

    setIsAdding(false);
    setNewProduct({ name: '', nameEn: '', price: '', unit: 'kg', category: '', subCategory: '', image: '', stock: 'In Stock', description: '', descriptionEn: '' });
  };

  const handleApply = async (e: FormEvent) => {
     e.preventDefault();
     if (!user) return;
     setIsApplying(true);
     try {
       await sellerService.applyForSeller(user.uid, shopName);
     } catch (err) {
       console.error(err);
     } finally {
       setIsApplying(false);
     }
  };

  if (role === 'customer' && !isPending) {
    return (
      <div className="max-w-md mx-auto px-8 pt-20">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-primary/10 rounded-[2rem] flex items-center justify-center text-primary mx-auto mb-6">
            <Store size={40} />
          </div>
          <h2 className="text-2xl font-display font-bold text-slate-900 mb-2">Sell on Kishan</h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            Reach thousands of customers directly. Join our community of verified farmers and sellers.
          </p>
        </div>

        <form onSubmit={handleApply} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Store / Farm Name</label>
            <input 
              required
              placeholder="e.g. Green Valley Farm"
              className="w-full px-5 py-4 bg-white border border-slate-100 rounded-[1.5rem] shadow-sm text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              value={shopName}
              onChange={e => setShopName(e.target.value)}
            />
          </div>
          
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4 mb-6">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                <CheckCircle2 size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Direct Sales</h4>
                <p className="text-[10px] text-slate-400">Set your prices and manage inventory.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                <CheckCircle2 size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Verified Badge</h4>
                <p className="text-[10px] text-slate-400">Build trust with verified merchant status.</p>
              </div>
            </div>
          </div>

          <button 
            type="submit"
            disabled={isApplying}
            className="w-full btn-primary py-5 rounded-[2rem] shadow-2xl shadow-primary/20 text-lg flex items-center justify-center gap-2"
          >
            {isApplying ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Apply to be a Seller'}
          </button>

          <Link to="/" className="block text-center text-slate-400 text-xs font-bold hover:text-primary transition-colors">
            Maybe Later
          </Link>
        </form>
      </div>
    );
  }

  if (!isVerified || isPending) {
      return (
          <div className="max-w-md mx-auto px-10 pt-20 text-center">
              <div className="w-20 h-20 bg-orange-50 rounded-[2rem] flex items-center justify-center text-orange-500 mx-auto mb-6">
                  <AlertCircle size={40} />
              </div>
              <h2 className="text-2xl font-display font-bold text-slate-900 mb-2">Pending Verification</h2>
              <p className="text-slate-500 text-sm leading-relaxed mb-10">
                  Awesome! You've registered as a seller. Our admin team will verify your store details shortly. You'll get access to the dashboard once verified.
              </p>
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-left space-y-3">
                  <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                      <span className="text-xs font-bold text-slate-600">Store Profile Created</span>
                  </div>
                  <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-slate-200 rounded-full" />
                      <span className="text-xs font-bold text-slate-400">Admin Review (In Progress)</span>
                  </div>
                  <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-slate-200 rounded-full" />
                      <span className="text-xs font-bold text-slate-400">Merchant Activation</span>
                  </div>
              </div>
          </div>
      )
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-slate-50/50"
    >
      <div className="max-w-4xl mx-auto px-5 pb-12">
        <div className="flex items-center justify-between mt-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-xl">
              <Store size={28} />
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl mb-1">Seller Console</h1>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] leading-none flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Verified Merchant
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link 
              to="/" 
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:text-primary transition-colors shadow-sm"
            >
              <ArrowLeft size={14} />
              Back to Shop
            </Link>
            <button 
                onClick={() => setIsAdding(true)}
                className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

      <AnimatePresence>
          {isAdding && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed inset-0 z-50 flex items-center justify-center px-5 bg-slate-900/40 backdrop-blur-sm"
              >
                  <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden p-6">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="font-display font-bold text-xl">New Product</h3>
                        <button onClick={() => setIsAdding(false)} className="text-slate-400"><X /></button>
                      </div>
                      <form onSubmit={handleAddProduct} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
                        <input required placeholder="Product Name (Bangla)" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                        <input placeholder="Product Name (English)" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs" value={newProduct.nameEn} onChange={e => setNewProduct({...newProduct, nameEn: e.target.value})} />
                        
                        <textarea placeholder="Description (Bangla)" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs h-20 resize-none" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} />
                        <textarea placeholder="Description (English)" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs h-20 resize-none" value={newProduct.descriptionEn} onChange={e => setNewProduct({...newProduct, descriptionEn: e.target.value})} />
                        
                        <div className="grid grid-cols-2 gap-3">
                            <input required type="number" placeholder="Price (৳)" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
                            <select className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs" value={newProduct.unit} onChange={e => setNewProduct({...newProduct, unit: e.target.value})}>
                                <option value="kg">Per kg</option>
                                <option value="pcs">Per pcs</option>
                                <option value="litre">Per litre</option>
                            </select>
                        </div>
                        <select required className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value, subCategory: ''})}>
                            <option value="">Select Category</option>
                            {categories.map(c => <option key={c.id} value={c.title}>{c.title}</option>)}
                        </select>
                        {newProduct.category && (
                            <select required className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs" value={newProduct.subCategory} onChange={e => setNewProduct({...newProduct, subCategory: e.target.value})}>
                                <option value="">Select Sub-Category</option>
                                {categories.find(c => c.title === newProduct.category)?.subCategories?.map((sub: string) => (
                                    <option key={sub} value={sub}>{sub}</option>
                                ))}
                            </select>
                        )}
                        <ImageUpload 
                            label="Product Image"
                            currentImage={newProduct.image}
                            onUpload={(base64) => setNewProduct({...newProduct, image: base64})}
                        />
                        <button type="submit" className="w-full btn-primary py-4 rounded-3xl font-bold shadow-xl shadow-primary/20">Submit for Approval</button>
                      </form>
                  </div>
              </motion.div>
          )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100/50 p-1 rounded-2xl mb-8">
        {(['orders', 'products', 'analytics'] as const).map(tab => (
            <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'
                }`}
            >
                {tab}
            </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'orders' && (
          <motion.div key="orders" className="space-y-6">
            <div className="flex items-center justify-between mb-2">
                <h2 className="font-display font-bold text-lg">Sales Orders ({orders.length})</h2>
                {orders.some(o => o.status === 'verified') && <div className="w-2 h-2 bg-primary rounded-full animate-ping" />}
            </div>

            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="bg-white p-5 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">#{order.id.slice(-6)}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">{order.customerName}</p>
                    </div>
                    <div className="text-right">
                        <span className="text-lg font-display font-bold text-slate-900 leading-none">৳{order.total}</span>
                        <p className="text-[9px] font-black text-primary uppercase mt-1">{order.status}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-6">
                      {order.items.filter((i: any) => i.sellerId === user?.uid).map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center text-[11px] font-bold text-slate-600">
                              <span>{item.quantity}x {item.name}</span>
                              <span className="text-slate-400">৳{item.price * item.quantity}</span>
                          </div>
                      ))}
                  </div>
                  
                  <div className="flex gap-2">
                    {order.status === 'verified' && (
                        <button 
                            onClick={() => sellerService.updateOrderStatus(order.id, 'confirmed')}
                            className="flex-1 py-3 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20"
                        >
                            Accept Order
                        </button>
                    )}
                    {order.status === 'confirmed' && (
                        <button 
                            onClick={() => sellerService.updateOrderStatus(order.id, 'shipped')}
                            className="flex-1 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest"
                        >
                            Mark Shipped
                        </button>
                    )}
                    <button className="px-4 py-3 bg-slate-50 text-slate-400 rounded-2xl">
                        <Truck size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {orders.length === 0 && (
                <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-slate-200">
                    <Clock className="mx-auto text-slate-200 mb-4" size={40} />
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">No orders in queue</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'products' && (
            <motion.div key="products" className="space-y-4">
                <h2 className="font-display font-bold text-lg px-1">My Catalogue</h2>
                <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden divide-y divide-slate-50">
                    {products.map((prod) => (
                        <div key={prod.id} className="p-5 flex items-center gap-4 group">
                            <div className="w-14 h-14 bg-slate-50 rounded-2xl overflow-hidden flex-shrink-0">
                                <img src={prod.image} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-sm text-slate-800 truncate">{prod.name}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] font-bold text-primary">৳{prod.price}/{prod.unit}</span>
                                    <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${
                                        prod.status === 'approved' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'
                                    }`}>
                                        {prod.status}
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <button className="p-2 text-slate-300 hover:text-red-500 transition-colors" onClick={() => sellerService.deleteProduct(prod.id)}>
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                    {products.length === 0 && (
                        <div className="text-center py-20">
                            <ShoppingBag className="mx-auto text-slate-100 mb-4" size={48} />
                            <p className="text-slate-300 text-xs font-bold">No products listed</p>
                        </div>
                    )}
                </div>
            </motion.div>
        )}
      </AnimatePresence>
      </div>
    </motion.div>
  );
}

