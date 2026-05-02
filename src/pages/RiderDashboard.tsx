import { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Truck, MapPin, CheckCircle2, Navigation, Package, User, LogOut, Phone } from 'lucide-react';
import { AuthContext } from '../App';
import { riderService } from '../services/riderService';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

export default function RiderDashboard() {
  const { user, role } = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'available' | 'active'>('active');
  const [availableOrders, setAvailableOrders] = useState<any[]>([]);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || (role !== 'rider' && role !== 'admin')) {
      navigate('/');
      return;
    }

    const unsubAvailable = riderService.getAvailableOrders(setAvailableOrders);
    const unsubMy = riderService.getMyDeliveries(user.uid, (orders) => {
      setMyOrders(orders);
      setLoading(false);
    });

    // Simulate location tracking
    const locInterval = setInterval(() => {
        // In a real app, use navigator.geolocation
        const lat = 23.8103 + (Math.random() - 0.5) * 0.01;
        const lng = 90.4125 + (Math.random() - 0.5) * 0.01;
        riderService.updateLocation(user.uid, lat, lng);
    }, 30000);

    return () => {
      unsubAvailable();
      unsubMy();
      clearInterval(locInterval);
    };
  }, [user, role, navigate]);

  const handlePickUp = async (id: string) => {
    if (user) await riderService.pickUpOrder(id, user.uid);
  };

  const handleDeliver = async (id: string) => {
    await riderService.deliverOrder(id);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-slate-900 text-white p-6 pt-12 rounded-b-[3rem] shadow-xl">
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                    <Truck size={24} className="text-white" />
                </div>
                <div>
                    <h1 className="font-display font-bold text-xl leading-tight">Rider Central</h1>
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{user?.displayName}</p>
                </div>
            </div>
            <button 
                onClick={() => { signOut(auth); navigate('/'); }}
                className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white/60 hover:bg-white/20 transition-all border border-white/10"
            >
                <LogOut size={20} />
            </button>
        </div>

        <div className="bg-white/10 p-4 rounded-3xl backdrop-blur-sm border border-white/10">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Active Deliveries</span>
                <span className="text-primary font-black text-sm">{myOrders.filter(o => o.status === 'shipped').length}</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(myOrders.filter(o => o.status === 'shipped').length / 5) * 100}%` }}
                    className="h-full bg-primary"
                />
            </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 -mt-6">
          <div className="bg-white p-1.5 rounded-[2rem] flex shadow-lg border border-slate-100">
              <button 
                onClick={() => setActiveTab('active')}
                className={`flex-1 py-3.5 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'active' ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'text-slate-400'}`}
              >
                  My Tasks
              </button>
              <button 
                onClick={() => setActiveTab('available')}
                className={`flex-1 py-3.5 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'available' ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'text-slate-400'}`}
              >
                  Pool
              </button>
          </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
          <AnimatePresence mode="wait">
            {activeTab === 'active' ? (
                <motion.div 
                    key="active"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="space-y-4"
                >
                    {myOrders.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-slate-200">
                            <Navigation size={48} className="mx-auto text-slate-200 mb-4" />
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No active tasks</p>
                        </div>
                    ) : (
                        myOrders.map(order => (
                            <div key={order.id} className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden group">
                                {order.status === 'delivered' && (
                                    <div className="absolute inset-0 bg-green-50/50 backdrop-blur-[1px] flex items-center justify-center p-6 z-10">
                                        <div className="bg-green-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg scale-110">
                                            <CheckCircle2 size={16} />
                                            <span className="text-[10px] font-black uppercase">Delivered</span>
                                        </div>
                                    </div>
                                )}
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-display font-bold text-lg leading-none mb-1">#{order.id.slice(-6)}</h3>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{order.customerName}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-display font-bold text-primary">৳{order.total}</p>
                                        <span className="text-[9px] font-black text-slate-300 uppercase">{order.paymentMethod}</span>
                                    </div>
                                </div>
                                
                                <div className="space-y-3 mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                                            <MapPin size={16} />
                                        </div>
                                        <p className="text-xs font-medium text-slate-600 truncate">{order.address}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                                            <Phone size={16} />
                                        </div>
                                        <a href={`tel:${order.phone}`} className="text-xs font-bold text-primary">{order.phone}</a>
                                    </div>
                                </div>

                                {order.status === 'shipped' && (
                                    <button 
                                        onClick={() => handleDeliver(order.id)}
                                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all active:scale-95"
                                    >
                                        Complete Delivery
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </motion.div>
            ) : (
                <motion.div 
                    key="available"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="space-y-4"
                >
                    {availableOrders.map(order => (
                        <div key={order.id} className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-xl hover:border-primary/20 transition-all duration-500">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-primary/5 rounded-[1.5rem] flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                    <Package size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm leading-none mb-1">৳{order.total}</h4>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{order.address.split(',')[0]}...</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => handlePickUp(order.id)}
                                className="px-6 py-3 bg-primary text-white rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                            >
                                Accept Pick
                            </button>
                        </div>
                    ))}
                    {availableOrders.length === 0 && (
                        <div className="text-center py-20 text-slate-300">
                            <Truck size={48} className="mx-auto mb-4 opacity-20" />
                            <p className="text-xs font-bold uppercase tracking-[0.3em]">No orders in pool</p>
                        </div>
                    )}
                </motion.div>
            )}
          </AnimatePresence>
      </div>
    </div>
  );
}
