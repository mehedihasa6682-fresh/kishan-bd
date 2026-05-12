import { motion, AnimatePresence } from 'motion/react';
import { Package, Truck, CheckCircle, Clock, ChevronRight, ShoppingBag, XCircle, ReceiptText } from 'lucide-react';
import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import { orderService, Order } from '../services/orderService';
import { Link } from 'react-router-dom';
import TrackingMap from '../components/TrackingMap';
import Invoice from '../components/Invoice';

const StatusBadge = ({ status }: { status: string }) => {
  const configs: Record<string, { label: string, color: string, icon: any }> = {
    pending: { label: 'Pending Payment', color: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: Clock },
    verified: { label: 'Payment Verified', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: CheckCircle },
    confirmed: { label: 'Seller Confirmed', color: 'bg-primary/5 text-primary border-primary/20', icon: Package },
    shipped: { label: 'On its way', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Truck },
    delivered: { label: 'Handed Over', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle },
    cancelled: { label: 'Cancelled', color: 'bg-red-50 text-red-700 border-red-200', icon: XCircle }
  };

  const config = configs[status] || configs.pending;
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border backdrop-blur-sm ${config.color}`}>
      <Icon size={12} />
      <span className="text-[9px] font-black uppercase tracking-wider">{config.label}</span>
    </div>
  );
};

import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { formatCurrency } from '../lib/utils';
import { riderService } from '../services/riderService';

const OrderTracking = ({ order }: { order: Order }) => {
    const [riderLocation, setRiderLocation] = useState<{lat: number, lng: number} | null>(null);

    useEffect(() => {
        if (order.status === 'shipped' && order.riderId) {
            const unsub = onSnapshot(doc(db, 'users', order.riderId), (snap) => {
                if (snap.exists() && snap.data().location) {
                    setRiderLocation(snap.data().location);
                }
            });
            return () => unsub();
        }
    }, [order.status, order.riderId]);

    return (
        <div className="pt-4 overflow-hidden">
            <TrackingMap 
                status={order.status} 
                riderLocation={riderLocation || undefined} 
                destination={order.location}
            />
        </div>
    );
};

export default function Orders() {
  const { user } = useContext(AuthContext);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);
  const [viewInvoice, setViewInvoice] = useState<Order | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsubscribePromise = orderService.getMyOrders(user.uid, (data) => {
      setOrders(data);
      setLoading(false);
    });
    return () => {
      unsubscribePromise.then(unsub => unsub());
    };
  }, [user]);

    if (!user) {
        return (
            <div className="max-w-md mx-auto pt-4 px-10 text-center">
                <ShoppingBag size={48} className="mx-auto text-gray-200 mb-4" />
                <h2 className="text-xl font-bold mb-4 text-[#111111]">Please login</h2>
                <Link to="/profile" className="btn-primary">Go to Profile</Link>
            </div>
        )
    }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-md mx-auto px-5 pb-24 pt-4 min-h-screen bg-white"
    >
      <h1 className="font-display font-black text-2xl mb-8 text-[#111111] uppercase tracking-tight">My Orders</h1>

      {loading ? (
          <div className="space-y-4">
              {[1,2,3].map(i => <div key={i} className="h-40 bg-[#F9FAFB] border border-[#ECECEC] rounded-3xl animate-pulse shadow-sm" />)}
          </div>
      ) : orders.length === 0 ? (
          <div className="text-center py-20 bg-[#F9FAFB] border border-[#ECECEC] rounded-3xl">
              <Package size={48} className="mx-auto text-gray-200 mb-4" />
              <p className="text-[#6B7280] font-bold text-sm">No orders yet</p>
              <Link to="/products" className="text-primary font-bold text-xs mt-4 inline-block uppercase tracking-widest bg-primary/5 px-6 py-2 rounded-full border border-primary/20">Start Shopping</Link>
          </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div key={order.id} className="bg-white p-5 border border-[#ECECEC] rounded-3xl shadow-sm transition-all hover:bg-[#F9FAFB] group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-5">
                <ShoppingBag size={80} className="text-[#111111]" />
              </div>
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-[#6B7280]/40 uppercase tracking-[0.2em] leading-none mb-2">Order ID: #{order.id?.slice(-8)}</span>
                  <StatusBadge status={order.status} />
                </div>
                <span className="text-2xl font-display font-black text-primary leading-none">৳{formatCurrency(order.total)}</span>
              </div>

              {/* Progress Timeline */}
              <div className="mb-6 px-1 relative z-10">
                  <div className="relative h-1.5 bg-[#F9FAFB] rounded-full overflow-hidden mb-3">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: 
                            (order.status as string) === 'delivered' ? '100%' : 
                            (order.status as string) === 'shipped' ? '75%' : 
                            (order.status as string) === 'ready_for_pickup' ? '50%' : 
                            (order.status as string) === 'confirmed' ? '25%' : '5%' 
                        }}
                        className="absolute inset-y-0 left-0 bg-primary"
                      />
                  </div>
                  <div className="flex justify-between items-center text-[8px] font-black text-[#6B7280]/40 uppercase tracking-[0.15em]">
                      <span className={order.status === 'pending' ? 'text-primary' : ''}>Placed</span>
                      <span className={order.status === 'confirmed' ? 'text-primary' : ''}>Confirmed</span>
                      <span className={order.status === 'shipped' ? 'text-primary' : ''}>Transit</span>
                      <span className={order.status === 'delivered' ? 'text-primary' : ''}>Completed</span>
                  </div>
              </div>
              
              <div className="flex items-center gap-4 py-5 border-y border-[#ECECEC] relative z-10">
                <div className="flex -space-x-3 overflow-hidden">
                  {order.items.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="inline-block h-12 w-12 rounded-2xl ring-2 ring-white overflow-hidden bg-[#F9FAFB]">
                      <img src={item.image} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt="" />
                    </div>
                  ))}
                  {order.items.length > 3 && (
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F9FAFB] ring-2 ring-white text-[11px] font-black text-[#6B7280]">
                      +{order.items.length - 3}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-[#6B7280]/40 font-black uppercase tracking-[0.15em] mb-1">
                    {order.items.length} {order.items.length === 1 ? 'Item' : 'Items'} Ordered
                  </p>
                  <p className="text-[12px] font-bold text-[#111111] truncate">{order.items[0].nameEn || order.items[0].name}</p>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 relative z-10">
                <div className="flex flex-col">
                    <span className="text-[9px] font-black text-[#6B7280]/40 uppercase tracking-[0.2em] mb-1">Delivery Destination</span>
                    <span className="text-[11px] font-bold text-[#6B7280] truncate w-full">{typeof (order as any).address === 'string' ? (order as any).address : ((order as any).address?.address || 'No Address')}</span>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setViewInvoice(order)}
                        className="flex-1 flex items-center justify-center gap-2 bg-[#F9FAFB] hover:bg-[#F3F4F6] rounded-2xl text-[10px] font-black uppercase tracking-widest text-[#6B7280] hover:text-[#111111] transition-all border border-[#ECECEC] py-3 px-4 group"
                    >
                        <ReceiptText size={18} className="group-hover:scale-110 transition-transform" />
                        <span>View Memo</span>
                    </button>
                    {(order.status === 'shipped' || order.status === 'confirmed' || order.status === 'delivered') && (
                        <button 
                            onClick={() => setTrackingOrder(trackingOrder?.id === order.id ? null : order)}
                            className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-2xl transition-all shadow-md ${
                                trackingOrder?.id === order.id ? 'bg-[#111111] text-white' : 'bg-primary text-white hover:bg-[#111111]'
                            }`}
                        >
                            {trackingOrder?.id === order.id ? (
                              <>Close <XCircle size={14} /></>
                            ) : (
                              <>Track <ChevronRight size={14} /></>
                            )}
                        </button>
                    )}
                </div>
              </div>

              <AnimatePresence>
                {trackingOrder?.id === order.id && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                    >
                        <OrderTracking order={order} />
                    </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}

      {viewInvoice && (
          <Invoice order={viewInvoice} onClose={() => setViewInvoice(null)} />
      )}
    </motion.div>
  );
}
