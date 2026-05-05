import { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Truck, MapPin, CheckCircle2, Navigation, Package, User, LogOut, Phone, CreditCard, Power, Map as MapIcon } from 'lucide-react';
import { AuthContext } from '../App';
import { riderService } from '../services/riderService';
import { useNavigate } from 'react-router-dom';
import { auth, db, OperationType, handleFirestoreError } from '../firebase';
import { signOut } from 'firebase/auth';
import { doc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { formatCurrency } from '../lib/utils';

import { calculateDistance, formatDistance } from '../lib/geoUtils';
import TrackingMap from '../components/TrackingMap';

import { payoutService } from '../services/payoutService';

export default function RiderDashboard() {
  const { user, profile } = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'available' | 'active' | 'account'>('active');
  const [availableOrders, setAvailableOrders] = useState<any[]>([]);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(profile?.status || 'offline');
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [showMap, setShowMap] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    // Get current location
    let watchId: number | null = null;
    if ("geolocation" in navigator) {
        watchId = navigator.geolocation.watchPosition((pos) => {
            const { latitude, longitude } = pos.coords;
            setCurrentLocation({ lat: latitude, lng: longitude });
            if (status === 'online' && user) {
                riderService.updateLocation(user.uid, latitude, longitude);
            }
        });
    }

    const unsubAvailable = riderService.getAvailableOrders(setAvailableOrders);
    const unsubMy = riderService.getMyDeliveries(user.uid, (orders) => {
      setMyOrders(orders);
      setLoading(false);
    });

    return () => {
      unsubAvailable();
      unsubMy();
      if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [user, navigate, status]);

  const toggleStatus = async () => {
    const newStatus = status === 'online' ? 'offline' : 'online';
    setStatus(newStatus);
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), { status: newStatus, lastStatusUpdate: serverTimestamp() });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      }
    }
  };

  const handleArrived = async (id: string) => {
    await riderService.arrivedAtMerchant(id);
  };

  const handlePickUp = async (id: string) => {
    await riderService.pickUpOrder(id);
  };

  const handleAccept = async (id: string) => {
    if (user) await riderService.acceptOrder(id, user.uid);
  };

  const handleDeliver = async (id: string) => {
    await riderService.deliverOrder(id);
  };

  const earnings = myOrders.filter(o => o.status === 'delivered').reduce((acc, o) => acc + (o.deliveryFee || 40), 0);

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
            <div className="flex gap-2">
                <button 
                    onClick={toggleStatus}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${status === 'online' ? 'bg-green-500 text-white border-green-400' : 'bg-white/10 text-white/60 border-white/10'}`}
                >
                    <Power size={20} />
                </button>
                <button 
                    onClick={() => { signOut(auth); navigate('/'); }}
                    className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white/60 hover:bg-white/20 transition-all border border-white/10"
                >
                    <LogOut size={20} />
                </button>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 p-4 rounded-3xl backdrop-blur-sm border border-white/10">
                <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest block mb-1">Delivered</span>
                <p className="text-xl font-display font-bold text-primary">{myOrders.filter(o => o.status === 'delivered').length}</p>
                <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-2/3" />
                </div>
            </div>
            <div className="bg-white/10 p-4 rounded-3xl backdrop-blur-sm border border-white/10">
                <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest block mb-1">Earnings</span>
                <p className="text-xl font-display font-bold text-green-400">৳{formatCurrency(earnings)}</p>
                <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-green-400 w-1/2" />
                </div>
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
                  Tasks
              </button>
              <button 
                onClick={() => setActiveTab('available')}
                className={`flex-1 py-3.5 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'available' ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'text-slate-400'}`}
              >
                  Pool
              </button>
              <button 
                onClick={() => setActiveTab('account')}
                className={`flex-1 py-3.5 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'account' ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'text-slate-400'}`}
              >
                  Wallet
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
                                    <div className="absolute inset-0 bg-green-50/50 backdrop-blur-[1px] flex items-center justify-center p-6 z-10 text-center">
                                        <div className="bg-green-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg mb-2">
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
                                        <p className="font-display font-bold text-primary">৳{formatCurrency(order.total || 0)}</p>
                                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${order.paymentMethod === 'cod' ? 'bg-orange-50 text-orange-500' : 'bg-green-50 text-green-500'}`}>
                                            {order.paymentMethod === 'cod' ? 'Collection' : 'Paid'}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="space-y-3 mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                                            <Package size={16} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Pick up from</p>
                                            <p className="text-xs font-bold text-slate-700">{order.sellerName || 'Local Merchant'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                                            <MapPin size={16} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Deliver to</p>
                                            <div className="flex items-center justify-between">
                                              <p className="text-xs font-bold text-slate-700">{typeof order.address === 'string' ? order.address : (order.address?.address || 'No Address')}</p>
                                              {currentLocation && order.location && (
                                                <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                                                  {formatDistance(calculateDistance(currentLocation.lat, currentLocation.lng, order.location.lat, order.location.lng))}
                                                </span>
                                              )}
                                            </div>
                                            {order.addressData && (
                                                <p className="text-[9px] text-slate-400 mt-0.5">
                                                    {order.addressData.type} • Floor: {order.addressData.floorNo || 'N/A'} • Apt: {order.addressData.apartment || 'N/A'}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => setShowMap(showMap === order.id ? null : order.id)}
                                            className={`flex-1 py-4 ${showMap === order.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'} rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-2 transition-all`}
                                        >
                                            <MapIcon size={16} />
                                            {showMap === order.id ? 'Close Map' : 'View Map'}
                                        </button>
                                        <a 
                                            href={`tel:${order.phone}`}
                                            className="flex-1 py-4 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-2"
                                        >
                                            <Phone size={16} />
                                            Call
                                        </a>
                                    </div>
                                    <AnimatePresence>
                                        {showMap === order.id && (
                                            <motion.div 
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="mt-4"
                                            >
                                                <TrackingMap 
                                                    status={order.status}
                                                    riderLocation={currentLocation || undefined}
                                                    destination={order.location}
                                                />
                                                <div className="mt-2 text-center">
                                                    <a 
                                                        href={`https://www.google.com/maps/dir/?api=1&destination=${order.location?.lat},${order.location?.lng}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-[9px] font-black text-primary uppercase underline"
                                                    >
                                                        Open in Google Maps
                                                    </a>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                    <p className="text-[9px] text-center text-slate-400 mt-2 italic">* Communication is key for fast delivery</p>
                                </div>

                                <div className="flex flex-col gap-2 p-1">
                                  {order.status === 'shipped' && !order.subStatus && (
                                      <button 
                                          onClick={() => handleArrived(order.id)}
                                          className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:bg-orange-600 transition-all active:scale-95"
                                      >
                                          Arrived at Merchant
                                      </button>
                                  )}
                                  {order.status === 'shipped' && order.subStatus === 'arrived_at_pickup' && (
                                      <button 
                                          onClick={() => handlePickUp(order.id)}
                                          className="w-full py-4 bg-primary text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:bg-primary/90 transition-all active:scale-95"
                                      >
                                          Picked Up & On the way
                                      </button>
                                  )}
                                  {order.status === 'shipped' && order.subStatus === 'in_transit' && (
                                      <button 
                                          onClick={() => handleDeliver(order.id)}
                                          className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all active:scale-95"
                                      >
                                          Delivery Done (Notify Customer)
                                      </button>
                                  )}
                                  {order.status === 'delivered' && order.customerConfirmation === 'pending' && (
                                      <div className="w-full py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] text-center border border-emerald-100 italic">
                                          Waiting for customer to confirm...
                                      </div>
                                  )}
                                </div>
                            </div>
                        ))
                    )}
                </motion.div>
            ) : activeTab === 'available' ? (
                <motion.div 
                    key="available"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="space-y-4"
                >
                    {status === 'offline' && (
                        <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100 text-center">
                            <Power size={32} className="mx-auto text-orange-400 mb-3" />
                            <h4 className="font-bold text-orange-900 text-sm mb-1">Status: Offline</h4>
                            <p className="text-[10px] text-orange-600 font-medium mb-4">Go online to see available orders in your area.</p>
                            <button onClick={toggleStatus} className="px-6 py-2 bg-orange-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-200">Go Online</button>
                        </div>
                    )}
                    {status === 'online' && availableOrders.map(order => (
                        <div key={order.id} className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-xl transition-all duration-500">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-primary/5 rounded-[1.5rem] flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                    <Package size={24} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Delivery Pay</span>
                                    <h4 className="font-bold text-sm leading-none mb-1">৳{formatCurrency(order.deliveryFee || 40)}</h4>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                        {(typeof order.address === 'string' ? order.address : (order.address?.address || '')).split(',')[0]}...
                                    </p>
                                    {currentLocation && order.location && (
                                        <p className="text-[8px] font-black text-primary mt-1 flex items-center gap-1">
                                            <Navigation size={8} />
                                            {formatDistance(calculateDistance(currentLocation.lat, currentLocation.lng, order.location.lat, order.location.lng))} away
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button 
                                onClick={() => handleAccept(order.id)}
                                className="px-6 py-3 bg-primary text-white rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                            >
                                Accept
                            </button>
                        </div>
                    ))}
                    {status === 'online' && availableOrders.length === 0 && (
                        <div className="text-center py-20 text-slate-300">
                            <Truck size={48} className="mx-auto mb-4 opacity-20" />
                            <p className="text-xs font-bold uppercase tracking-[0.3em]">No orders around</p>
                        </div>
                    )}
                </motion.div>
            ) : (
                <motion.div 
                    key="account"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="space-y-6"
                >
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/20 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl" />
                        <CreditCard size={32} className="text-primary mb-12" />
                        <p className="text-xs font-medium text-white/40 uppercase tracking-[0.2em] mb-2">Withdrawable Balance</p>
                        <h2 className="text-4xl font-display font-bold mb-8">৳{formatCurrency(earnings)}</h2>
                        
                        <div className="space-y-4">
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                                <span className="text-[9px] font-black text-white/30 uppercase tracking-widest block mb-1">Payout Method</span>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold">{profile?.paymentMethod || 'Not Set'}</span>
                                    <button 
                                        onClick={async () => {
                                            const provider = prompt("Payment Provider (bKash/Nagad/Rocket)?", profile?.paymentMethod || "");
                                            const number = prompt("Mobile Number for Payout?");
                                            if (provider && number && user) {
                                            try {
                                                await updateDoc(doc(db, 'users', user.uid), { paymentMethod: provider, payoutAccount: number });
                                            } catch (err) {
                                                handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
                                            }
                                            }
                                        }}
                                        className="text-[10px] font-black text-primary uppercase underline"
                                    >
                                        Edit
                                    </button>
                                </div>
                            </div>
                            <button 
                               onClick={async () => {
                                 if (earnings < 50) return alert('Minimum withdrawal is ৳50');
                                 if (!profile?.paymentMethod || !profile?.payoutAccount) {
                                   return alert('Please set your Payout Method first');
                                 }
                                 
                                 if (confirm(`Withdraw ৳${earnings} to your ${profile.paymentMethod} account (${profile.payoutAccount})?`)) {
                                   try {
                                     await payoutService.requestPayout(user!.uid, earnings, profile.paymentMethod, profile.payoutAccount, 'rider');
                                     alert('Withdrawal request sent! It will be processed within 24 hours.');
                                   } catch (e) {
                                     alert('Failed to request withdrawal');
                                   }
                                 }
                               }}
                               className="w-full py-4 bg-primary text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all"
                             >
                               Withdraw Now
                             </button>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-slate-100 divide-y divide-slate-50">
                        <div className="py-4 first:pt-0 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                                    <User size={18} />
                                </div>
                                <span className="text-sm font-bold text-slate-700">Account Verified</span>
                            </div>
                            <span className="text-[10px] font-black text-green-500 uppercase">Success</span>
                        </div>
                        <div className="py-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                                    <Truck size={18} />
                                </div>
                                <span className="text-sm font-bold text-slate-700">Vehicle Type</span>
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase underline">Add Details</span>
                        </div>
                    </div>
                </motion.div>
            )}
          </AnimatePresence>
      </div>
    </div>
  );
}
