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
    pending: { label: 'Pending Payment', color: 'bg-yellow-50 text-yellow-600', icon: Clock },
    verified: { label: 'Payment Verified', color: 'bg-blue-50 text-blue-600', icon: CheckCircle },
    confirmed: { label: 'Seller Confirmed', color: 'bg-primary/10 text-primary', icon: Package },
    shipped: { label: 'On its way', color: 'bg-indigo-50 text-indigo-600', icon: Truck },
    delivered: { label: 'Handed Over', color: 'bg-emerald-50 text-emerald-600', icon: CheckCircle },
    cancelled: { label: 'Cancelled', color: 'bg-red-50 text-red-600', icon: XCircle }
  };

  const config = configs[status] || configs.pending;
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${config.color}`}>
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
          <div className="max-w-md mx-auto pt-20 px-10 text-center">
              <ShoppingBag size={48} className="mx-auto text-slate-200 mb-4" />
              <h2 className="text-xl font-bold mb-2">Please login</h2>
              <Link to="/profile" className="btn-primary">Go to Profile</Link>
          </div>
      )
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-md mx-auto px-5 pb-10"
    >
      <h1 className="font-display font-bold text-2xl mb-8 pt-4">My Orders</h1>

      {loading ? (
          <div className="space-y-4">
              {[1,2,3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-3xl animate-pulse" />)}
          </div>
      ) : orders.length === 0 ? (
          <div className="text-center py-20">
              <Package size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-400 font-bold text-sm">No orders yet</p>
              <Link to="/products" className="text-primary font-bold text-xs mt-2 inline-block">Start Shopping</Link>
          </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white p-5 rounded-[2.5rem] border border-slate-100 shadow-sm transition-all hover:shadow-xl group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1">ID: #{order.id?.slice(-8)}</span>
                  <StatusBadge status={order.status} />
                </div>
                <span className="text-lg font-display font-bold text-slate-900 leading-none">৳{formatCurrency(order.total)}</span>
              </div>

              {/* Progress Timeline */}
              <div className="mb-6 px-2">
                  <div className="relative h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: 
                            order.status === 'delivered' ? '100%' : 
                            order.status === 'shipped' ? '75%' : 
                            order.status === 'ready_for_pickup' ? '50%' : 
                            order.status === 'confirmed' ? '25%' : '5%' 
                        }}
                        className="absolute inset-y-0 left-0 bg-primary shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                      />
                  </div>
                  <div className="flex justify-between items-center text-[8px] font-black text-slate-400 uppercase tracking-widest">
                      <span className={order.status === 'pending' ? 'text-primary' : ''}>Order</span>
                      <span className={order.status === 'confirmed' ? 'text-primary' : ''}>Confirm</span>
                      <span className={order.status === 'shipped' ? 'text-primary' : ''}>Shipping</span>
                      <span className={order.status === 'delivered' ? 'text-primary' : ''}>Done</span>
                  </div>
              </div>
              
              <div className="flex items-center gap-3 py-4 border-y border-slate-50">
                <div className="flex -space-x-3 overflow-hidden">
                  {order.items.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="inline-block h-10 w-10 rounded-full ring-2 ring-white overflow-hidden bg-slate-100">
                      <img src={item.image} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt="" />
                    </div>
                  ))}
                  {order.items.length > 3 && (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 ring-2 ring-white text-[10px] font-bold text-slate-400">
                      +{order.items.length - 3}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    {order.items.length} {order.items.length === 1 ? 'Item' : 'Items'}
                  </p>
                  <p className="text-[11px] font-bold text-slate-600 truncate">{order.items[0].name}...</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Delivery To</span>
                    <span className="text-[11px] font-bold text-slate-800 truncate max-w-[150px]">{typeof order.address === 'string' ? order.address : (order.address?.address || 'No Address')}</span>
                </div>
                <div className="flex gap-2">
                    {order.status === 'delivered' && order.customerConfirmation !== 'confirmed' && (
                        <motion.button 
                            whileTap={{ scale: 0.95 }}
                            onClick={async () => {
                                if (confirm('Confirm you have received all items?')) {
                                    await riderService.confirmReceipt(order.id);
                                }
                            }}
                            className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-200"
                        >
                            <CheckCircle size={14} />
                            Received (Done)
                        </motion.button>
                    )}
                    <button 
                        onClick={() => setViewInvoice(order)}
                        className="p-2 text-slate-400 hover:text-primary transition-colors"
                    >
                        <ReceiptText size={20} />
                    </button>
                    {(order.status === 'shipped' || order.status === 'confirmed' || order.status === 'delivered') && (
                        <button 
                            onClick={() => setTrackingOrder(trackingOrder?.id === order.id ? null : order)}
                            className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-2xl transition-all ${
                                trackingOrder?.id === order.id ? 'bg-slate-900 text-white' : 'bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white'
                            }`}
                        >
                            {trackingOrder?.id === order.id ? 'Close Map' : 'Track Order'} <ChevronRight size={14} className={trackingOrder?.id === order.id ? 'rotate-90' : ''} />
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
