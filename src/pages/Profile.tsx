import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User as UserIcon, MapPin, CreditCard, Share2, 
  Settings, LogOut, ChevronRight, ShieldCheck,
  Gift, Bell, ClipboardList, Package, Heart, X, Trash2,
  Truck
} from 'lucide-react';
import { auth, db } from '../firebase';
import { signOut, updateProfile } from 'firebase/auth';
import { doc, updateDoc, onSnapshot, collection, query, where, orderBy } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import Auth from '../components/Auth';
import ImageUpload from '../components/ImageUpload';
import { useLanguage } from '../context/LanguageContext';
import { NotificationService, AppNotification } from '../services/notificationService';
import { MessagingService } from '../services/messagingService';
import { format } from 'date-fns';

const MenuItem = ({ icon: Icon, label, subtitle, color = "text-slate-600", onClick, to }: any) => {
  const content = (
    <>
      <div className={`w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform ${color}`}>
        <Icon size={22} />
      </div>
      <div className="flex-1">
        <h4 className="font-bold text-sm text-slate-800">{label}</h4>
        {subtitle && <p className="text-[10px] text-slate-400 font-medium">{subtitle}</p>}
      </div>
      <ChevronRight size={18} className="text-slate-300 group-hover:text-primary transition-colors" />
    </>
  );

  const className = "w-full flex items-center gap-4 p-4 hover:bg-slate-50 transition-all rounded-2xl group text-left";

  if (to) {
    return (
      <Link to={to} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={className}>
      {content}
    </button>
  );
};

export default function Profile() {
  const { user, role, loading } = useContext(AuthContext);
  const { t } = useLanguage();
  const [toast, setToast] = useState('');
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeModal, setActiveModal] = useState<'none' | 'profile' | 'addresses' | 'notifications' | 'payments' | 'referrals'>('none');

  useEffect(() => {
    if ('Notification' in window && window.Notification.permission === 'granted') {
      setIsPushEnabled(true);
    }
  }, []);

  const handleEnablePush = async () => {
    const token = await MessagingService.requestPermissionAndGetToken();
    if (token) {
      setIsPushEnabled(true);
      setToast('Push Notifications Enabled! 🔔');
    } else {
      setToast('Please allow notifications in your browser settings.');
    }
  };

  // Form states
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [addresses, setAddresses] = useState<string[]>([]);
  const [newAddress, setNewAddress] = useState('');

  const [editPayment, setEditPayment] = useState<any>({ bkash: '', nagad: '', rocket: '' });

  useEffect(() => {
    if (user) {
      setEditName(user.displayName || '');
      setEditPhone(user.phoneNumber || '');
      
      const unsubUser = onSnapshot(doc(db, 'users', user.uid), (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            setAddresses(data.addresses || []);
            setEditPhone(data.phoneNumber || '');
            setEditPayment(data.paymentMethods || { bkash: '', nagad: '', rocket: '' });
        }
      }, (error) => {
        console.error("Profile User Listener:", error);
      });

      // Fetch notifications in real-time
      const unsubNotif = NotificationService.subscribeToNotifications(user.uid, (data) => {
        setNotifications(data);
      });
      return () => {
        unsubUser();
        unsubNotif();
      };
    }
  }, [user]);

  const handleAddAddress = async () => {
    if (!user || !newAddress.trim()) return;
    try {
        const updatedAddresses = [...addresses, newAddress.trim()];
        await updateDoc(doc(db, 'users', user.uid), { addresses: updatedAddresses });
        setNewAddress('');
        setToast('Address added!');
    } catch (err) { console.error(err); }
  };

  const handleRemoveAddress = async (index: number) => {
    if (!user) return;
    try {
        const updatedAddresses = addresses.filter((_, i) => i !== index);
        await updateDoc(doc(db, 'users', user.uid), { addresses: updatedAddresses });
        setToast('Address removed');
    } catch (err) { console.error(err); }
  };

  const handleUpdatePayment = async () => {
    if (!user) return;
    try {
        await updateDoc(doc(db, 'users', user.uid), { paymentMethods: editPayment });
        setToast('Payment details saved!');
        setActiveModal('none');
    } catch (err) { console.error(err); }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    try {
        await updateProfile(user, { displayName: editName });
        await updateDoc(doc(db, 'users', user.uid), { 
            displayName: editName,
            phoneNumber: editPhone 
        });
        setToast('Profile updated!');
        setActiveModal('none');
        setTimeout(() => setToast(''), 3000);
    } catch (err) {
        console.error(err);
    }
  };

  const handlePhotoUpload = async (base64: string) => {
    if (!user) return;
    try {
        await updateProfile(user, { photoURL: base64 });
        await updateDoc(doc(db, 'users', user.uid), { photoURL: base64 });
        setToast('Profile photo updated!');
        setTimeout(() => setToast(''), 3000);
    } catch (err) {
        console.error(err);
    }
  };

  const showUnderMaintenance = (feature: string) => {
    setToast(`${feature} is coming soon!`);
    setTimeout(() => setToast(''), 3000);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto px-5 pt-10 pb-20 text-center"
      >
        <Auth />
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-md mx-auto px-5 pb-10"
    >
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-900 shadow-2xl text-white px-6 py-3 rounded-full text-xs font-bold z-50 whitespace-nowrap"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col items-center mt-6 mb-10 text-center">
        <div className="relative group cursor-pointer">
          <div className="w-28 h-28 rounded-[2.5rem] p-1 bg-gradient-to-tr from-primary to-secondary shadow-xl shadow-primary/20 overflow-hidden">
             <ImageUpload 
                currentImage={user?.photoURL || ''}
                onUpload={handlePhotoUpload}
                className="w-full h-full"
             />
          </div>
          {role === 'admin' && (
            <div className="absolute -bottom-1 -right-1 bg-primary text-white p-1.5 rounded-xl border-4 border-white">
              <ShieldCheck size={16} />
            </div>
          )}
        </div>
        <h2 className="mt-4 font-display font-bold text-xl leading-none">{user?.displayName || 'Hello, User'}</h2>
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-3">
          {role === 'admin' ? t('profile.role_admin') : role === 'seller' ? t('profile.role_seller') : role === 'rider' ? 'Delivery Rider' : t('profile.role_customer')}
        </p>
      </div>

      <div className="space-y-6">
        {role === 'admin' && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 mb-3">{t('profile.management')}</h3>
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <MenuItem 
                icon={ShieldCheck} 
                label={t('profile.admin_console')} 
                subtitle="Banners, Stories, Categories & Sellers"
                to="/admin"
                color="text-primary"
              />
              <MenuItem 
                icon={Package} 
                label={t('profile.seller_console')} 
                subtitle="Review pending products and inventory"
                to="/seller"
                color="text-secondary"
              />
              <MenuItem 
                icon={Truck} 
                label="Rider Dashboard" 
                subtitle="Manage tasks, earnings & status"
                to="/rider"
                color="text-orange-500"
              />
            </div>
          </div>
        )}

        {role === 'seller' && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 mb-3">{t('profile.seller_center')}</h3>
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <MenuItem 
                icon={Package} 
                label={t('profile.shop_management')} 
                subtitle="Orders, Products & Analytics"
                to="/seller"
                color="text-primary"
              />
            </div>
          </div>
        )}

        {role === 'rider' && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 mb-3">Delivery Partner</h3>
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <MenuItem 
                icon={Truck} 
                label="Rider Dashboard" 
                subtitle="Manage tasks, earnings & status"
                to="/rider"
                color="text-orange-500"
              />
            </div>
          </div>
        )}

        {role === 'customer' && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 mb-3">{t('profile.partnerships')}</h3>
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <MenuItem 
                icon={ShieldCheck} 
                label={t('profile.become_seller')} 
                subtitle="Start selling your farm products"
                to="/seller"
                color="text-primary"
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 mb-3">{t('profile.orders_activity')}</h3>
          <div className="bg-white rounded-3xl border border-slate-50 shadow-sm overflow-hidden">
            <MenuItem icon={ClipboardList} label={t('profile.orders')} subtitle="Track and view past orders" to="/orders" />
            <MenuItem icon={Heart} label="My Wishlist" subtitle="Favorite products saved for later" to="/wishlist" color="text-red-500" />
            <MenuItem icon={Bell} label="Notifications" subtitle="App updates and order status" onClick={() => setActiveModal('notifications')} />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 mb-3">{t('profile.settings')}</h3>
          <div className="bg-white rounded-3xl border border-slate-50 shadow-sm overflow-hidden">
            <MenuItem icon={UserIcon} label="Personal Info" subtitle="Edit your profile details" onClick={() => setActiveModal('profile')} />
            <MenuItem icon={MapPin} label="Saved Addresses" subtitle="Manage your delivery locations" onClick={() => setActiveModal('addresses')} />
            <MenuItem icon={CreditCard} label="Payment Methods" subtitle="Manage your cards & wallets" onClick={() => setActiveModal('payments')} />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 mb-3">Rewards</h3>
          <div className="bg-white rounded-3xl border border-slate-50 shadow-sm overflow-hidden">
            <MenuItem icon={Gift} label="Referral System" subtitle="Invite friends & earn rewards" color="text-yellow-600" onClick={() => setActiveModal('referrals')} />
            <MenuItem icon={Share2} label="Promo Codes" subtitle="Check available discounts" onClick={() => showUnderMaintenance('Promo System')} />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 mb-3">App</h3>
          <div className="bg-white rounded-3xl border border-slate-50 shadow-sm overflow-hidden">
            <MenuItem icon={LogOut} label={t('profile.logout')} subtitle="Clear session and exit" color="text-red-500" onClick={handleLogout} />
          </div>
          <button
             onClick={() => {
               if (user) {
                 NotificationService.sendNotification(user.uid, {
                   title: 'নোটিফিকেশন অ্যালার্ট!',
                   message: 'এটি ফোনের সিস্টেম নোটিফিকেশনের মতো স্ক্রিনের উপরে দেখা যাবে।',
                   type: 'promo',
                   link: '/profile'
                 });
               }
             }}
             className="w-full mt-4 py-4 bg-slate-900 text-white rounded-2xl flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-200 active:scale-95 transition-all outline-none"
           >
             <Bell size={18} />
             Test Heads-up Alert
           </button>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {activeModal !== 'none' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={() => setActiveModal('none')}
          >
            <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 max-h-[80vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-display font-bold text-xl capitalize">{activeModal.replace('_', ' ')}</h3>
                    <button onClick={() => setActiveModal('none')} className="p-2 bg-slate-100 rounded-full">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                {activeModal === 'profile' && (
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase">Display Name</label>
                            <input className="input-field" value={editName} onChange={e => setEditName(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase">Phone Number</label>
                            <input className="input-field" value={editPhone} onChange={e => setEditPhone(e.target.value)} />
                        </div>
                        
                        <div className="pt-4 border-t border-slate-100 space-y-4">
                          <h4 className="font-bold text-sm text-slate-800">App Preferences</h4>
                          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                             <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPushEnabled ? 'bg-primary/20 text-primary' : 'bg-slate-200 text-slate-400'}`}>
                                   <Bell size={20} />
                                </div>
                                <div>
                                   <p className="text-xs font-bold text-slate-800">Push Notifications</p>
                                   <p className="text-[10px] text-slate-500">{isPushEnabled ? 'Enabled' : 'Disabled'}</p>
                                </div>
                             </div>
                             <button 
                               onClick={handleEnablePush}
                               disabled={isPushEnabled}
                               className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${isPushEnabled ? 'bg-slate-200 text-slate-400' : 'bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105'}`}
                             >
                               {isPushEnabled ? 'Enabled' : 'Enable'}
                             </button>
                          </div>
                        </div>
                        <button onClick={handleUpdateProfile} className="btn-primary w-full py-4 rounded-2xl mt-4">Save Changes</button>
                    </div>
                )}

                {activeModal === 'addresses' && (
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">My Saved Addresses</span>
                            {addresses.map((addr, idx) => (
                                <div key={idx} className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl group border border-slate-100">
                                    <MapPin size={16} className="text-primary shrink-0" />
                                    <p className="flex-1 text-xs text-slate-700 font-medium">{addr}</p>
                                    <button onClick={() => handleRemoveAddress(idx)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                            {addresses.length === 0 && (
                                <div className="text-center py-6 text-slate-400 text-xs border-2 border-dashed border-slate-100 rounded-3xl">No addresses saved</div>
                            )}
                        </div>
                        <div className="space-y-2 pt-4 border-t border-slate-100">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Add New Address</label>
                            <textarea 
                                placeholder="House, Road, Area..." 
                                className="input-field h-24 resize-none"
                                value={newAddress}
                                onChange={e => setNewAddress(e.target.value)}
                            />
                            <button onClick={handleAddAddress} className="btn-primary w-full py-4 rounded-2xl">Add Address</button>
                        </div>
                    </div>
                )}

                {activeModal === 'referrals' && (
                    <div className="space-y-6 text-center">
                        <div className="w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center mx-auto text-yellow-500 shadow-inner">
                            <Gift size={40} />
                        </div>
                        <div>
                            <h4 className="font-bold text-lg">Invite & Earn</h4>
                            <p className="text-xs text-slate-500 mt-2 leading-relaxed">Share your code with friends and get ৳50 discount on your next order when they join!</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Your Referral Code</span>
                            <span className="text-2xl font-black tracking-[0.2em] text-slate-900">{user?.uid.substring(0, 6).toUpperCase()}</span>
                        </div>
                        <button onClick={() => showUnderMaintenance('Share API')} className="btn-primary w-full py-4 rounded-2xl">Share My Code</button>
                    </div>
                )}

                {activeModal === 'payments' && (
                    <div className="space-y-6">
                        <div className="p-4 bg-slate-50 rounded-3xl border border-slate-100 flex items-center gap-3">
                            <ShieldCheck className="text-primary" size={24} />
                            <p className="text-[10px] text-slate-500 font-bold leading-tight">Your payment details are saved locally for faster checkout and are never shared with third parties.</p>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase">bKash Number</label>
                                <input 
                                    className="input-field" 
                                    placeholder="017xxxxxxxx" 
                                    value={editPayment.bkash} 
                                    onChange={e => setEditPayment({...editPayment, bkash: e.target.value})} 
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase">Nagad Number</label>
                                <input 
                                    className="input-field" 
                                    placeholder="017xxxxxxxx" 
                                    value={editPayment.nagad} 
                                    onChange={e => setEditPayment({...editPayment, nagad: e.target.value})} 
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase">Rocket Number</label>
                                <input 
                                    className="input-field" 
                                    placeholder="017xxxxxxxx" 
                                    value={editPayment.rocket} 
                                    onChange={e => setEditPayment({...editPayment, rocket: e.target.value})} 
                                />
                            </div>
                            <button onClick={handleUpdatePayment} className="btn-primary w-full py-4 rounded-2xl mt-4">Save Payment Details</button>
                        </div>
                    </div>
                )}
                {activeModal === 'notifications' && (
                    <div className="space-y-3">
                        <div className="flex justify-between items-center mb-2">
                             <span className="text-[10px] font-black text-slate-400 uppercase">Latest Notifications</span>
                             <button onClick={() => NotificationService.markAllAsRead(notifications)} className="text-[10px] font-bold text-primary">Mark all as read</button>
                        </div>
                        {notifications.map(notif => (
                            <div key={notif.id} className={`p-4 rounded-3xl border ${notif.read ? 'bg-white border-slate-100' : 'bg-primary/5 border-primary/20'} relative group`}>
                                <div className="flex gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${notif.type === 'order' ? 'bg-blue-100 text-blue-600' : notif.type === 'promo' ? 'bg-pink-100 text-pink-600' : 'bg-slate-100 text-slate-600'}`}>
                                        <Bell size={14} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-xs text-slate-800">{notif.title}</h4>
                                        <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{notif.message}</p>
                                        <p className="text-[8px] text-slate-400 mt-2 font-bold">{format(notif.createdAt?.toDate() || new Date(), 'MMM dd, hh:mm a')}</p>
                                    </div>
                                    {!notif.read && (
                                        <button onClick={() => NotificationService.markAsRead(notif.id)} className="w-2 h-2 bg-primary rounded-full mt-1" />
                                    )}
                                </div>
                            </div>
                        ))}
                        {notifications.length === 0 && (
                            <div className="text-center py-10 text-slate-400 text-sm">No notifications yet</div>
                        )}
                    </div>
                )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
