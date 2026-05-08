import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User as UserIcon, MapPin, CreditCard, Share2, 
  Settings, LogOut, ChevronRight, ShieldCheck,
  Gift, Bell, ClipboardList, Package, Heart, X, Trash2,
  Truck
} from 'lucide-react';
import { auth, db, OperationType, handleFirestoreError } from '../firebase';
import { signOut, updateProfile } from 'firebase/auth';
import { doc, updateDoc, onSnapshot, collection, query, where, orderBy } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import Auth from '../components/Auth';
import ImageUpload from '../components/ImageUpload';
import { useLanguage } from '../context/LanguageContext';
import { useSettings } from '../context/SettingsContext';
import { NotificationService, AppNotification } from '../services/notificationService';
import { MessagingService } from '../services/messagingService';
import { format } from 'date-fns';

const MenuItem = ({ icon: Icon, label, subtitle, color = "text-white/60", onClick, to }: any) => {
  const content = (
    <>
      <div className={`w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform ${color}`}>
        <Icon size={22} />
      </div>
      <div className="flex-1">
        <h4 className="font-bold text-sm text-white">{label}</h4>
        {subtitle && <p className="text-[10px] text-white/40 font-medium">{subtitle}</p>}
      </div>
      <ChevronRight size={18} className="text-white/20 group-hover:text-primary transition-colors" />
    </>
  );

  const className = "w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-all rounded-2xl group text-left";

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
  const { settings: appSettings } = useSettings();
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
    } catch (err) { 
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleRemoveAddress = async (index: number) => {
    if (!user) return;
    try {
        const updatedAddresses = addresses.filter((_, i) => i !== index);
        await updateDoc(doc(db, 'users', user.uid), { addresses: updatedAddresses });
        setToast('Address removed');
    } catch (err) { 
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleUpdatePayment = async () => {
    if (!user) return;
    try {
        await updateDoc(doc(db, 'users', user.uid), { paymentMethods: editPayment });
        setToast('Payment details saved!');
        setActiveModal('none');
    } catch (err) { 
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
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
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
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
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
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
          <div className="w-28 h-28 rounded-[2.5rem] p-1 bg-gradient-to-tr from-primary to-accent shadow-2xl shadow-primary/40 overflow-hidden">
             <ImageUpload 
                currentImage={user?.photoURL || ''}
                onUpload={handlePhotoUpload}
                className="w-full h-full"
             />
          </div>
          {role === 'admin' && (
            <div className="absolute -bottom-1 -right-1 bg-primary text-black p-1.5 rounded-xl border-4 border-background">
              <ShieldCheck size={16} />
            </div>
          )}
        </div>
        <h2 className="mt-4 font-display font-bold text-xl leading-none text-white">{user?.displayName || 'Hello, User'}</h2>
        <p className="text-primary text-[10px] font-black uppercase tracking-[0.2em] mt-3">
          {role === 'admin' ? t('profile.role_admin') : role === 'seller' ? t('profile.role_seller') : role === 'rider' ? 'Delivery Rider' : t('profile.role_customer')}
        </p>
      </div>

      <div className="space-y-6">
        {role === 'admin' && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest ml-1 mb-3">{t('profile.management')}</h3>
            <div className="bg-white/5 rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
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
                color="text-primary"
              />
              <MenuItem 
                icon={Truck} 
                label="Rider Dashboard" 
                subtitle="Manage tasks, earnings & status"
                to="/rider"
                color="text-primary"
              />
            </div>
          </div>
        )}

        {role === 'seller' && (
          <div className="space-y-2">
            <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1 mb-3">{t('profile.seller_center')}</h3>
            <div className="bg-white/5 rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
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
            <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1 mb-3">Delivery Partner</h3>
            <div className="bg-white/5 rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
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
            <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1 mb-3">{t('profile.partnerships')}</h3>
            <div className="bg-white/5 rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
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
          <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1 mb-3">{t('profile.orders_activity')}</h3>
          <div className="bg-white/5 rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
            <MenuItem icon={ClipboardList} label={t('profile.orders')} subtitle="Track and view past orders" to="/orders" />
            <MenuItem icon={Heart} label="My Wishlist" subtitle="Favorite products saved for later" to="/wishlist" color="text-red-500" />
            <MenuItem icon={Bell} label="Notifications" subtitle="App updates and order status" onClick={() => setActiveModal('notifications')} />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1 mb-3">{t('profile.settings')}</h3>
          <div className="bg-white/5 rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
            <MenuItem icon={UserIcon} label="Personal Info" subtitle="Edit your profile details" onClick={() => setActiveModal('profile')} />
            <MenuItem icon={MapPin} label="Saved Addresses" subtitle="Manage your delivery locations" onClick={() => setActiveModal('addresses')} />
            <MenuItem icon={CreditCard} label="Payment Methods" subtitle="Manage your cards & wallets" onClick={() => setActiveModal('payments')} />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1 mb-3">Rewards</h3>
          <div className="bg-white/5 rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
            <MenuItem icon={Gift} label="Referral System" subtitle="Invite friends & earn rewards" color="text-yellow-600" onClick={() => setActiveModal('referrals')} />
            <MenuItem icon={Share2} label="Promo Codes" subtitle="Check available discounts" onClick={() => showUnderMaintenance('Promo System')} />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1 mb-3">App</h3>
          <div className="bg-white/5 rounded-3xl border border-white/10 shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-sm">System Notifications</h3>
                <p className="text-[10px] text-white/30 truncate max-w-[200px]">
                  {isPushEnabled ? 'Channel active' : 'Receive alerts on your device'}
                </p>
              </div>
              <button
                onClick={handleEnablePush}
                disabled={isPushEnabled}
                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg transition-all ${isPushEnabled ? 'bg-white/10 text-white/20' : 'bg-primary text-black shadow-primary/20 active:scale-95'}`}
              >
                {isPushEnabled ? 'Enabled' : 'Enable'}
              </button>
            </div>

            {Notification.permission === 'denied' && (
              <p className="text-[9px] text-red-500 font-bold bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                ⚠️ Notifications are blocked. Please reset permissions in your browser settings (click the lock icon in URL bar) and refresh. Open in a new tab for best results.
              </p>
            )}

            <button
              onClick={() => {
                if (user) {
                  NotificationService.sendNotification({
                    userId: user.uid,
                    title: 'চেক নোটিফিকেশন!',
                    message: 'এটি একবারে শো করবে এবং পারমিশন দিলে নোটিফিকেশন বারেও যাবে।',
                    type: 'promo',
                    link: '/profile'
                  });
                }
              }}
              className="w-full py-4 bg-white/5 border border-white/10 text-white rounded-2xl flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-black/20 active:scale-95 transition-all"
            >
              <Bell size={18} className="text-primary" />
              Test New Alert
            </button>
          </div>

          <div className="bg-white/5 rounded-3xl border border-white/10 shadow-2xl overflow-hidden mt-4">
            <MenuItem icon={LogOut} label={t('profile.logout')} subtitle="Clear session and exit" color="text-red-500" onClick={handleLogout} />
          </div>
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
                className="bg-zinc-950 w-full max-w-md rounded-t-[3rem] sm:rounded-[3rem] p-8 max-h-[85vh] overflow-y-auto border border-white/10 shadow-2xl relative"
                onClick={e => e.stopPropagation()}
            >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-white/10 rounded-full mt-3" />
                <div className="flex justify-between items-center mb-10 mt-2">
                    <h3 className="font-display font-black text-2xl capitalize text-white tracking-tight">{activeModal.replace('_', ' ')}</h3>
                    <button onClick={() => setActiveModal('none')} className="p-3 bg-white/5 border border-white/5 rounded-2xl text-white/40 hover:text-white transition-all">
                        <X size={24} />
                    </button>
                </div>

                {activeModal === 'profile' && (
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">Display Name</label>
                            <input className="input-field" value={editName} onChange={e => setEditName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">Phone Number</label>
                            <input className="input-field" value={editPhone} onChange={e => setEditPhone(e.target.value)} />
                        </div>
                        
                        <div className="pt-8 border-t border-white/5 space-y-6">
                          <h4 className="font-display font-black text-sm text-white uppercase tracking-widest pl-1">App Intelligence</h4>
                          <div className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5 shadow-inner">
                             <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${isPushEnabled ? 'bg-primary/20 text-primary border border-primary/20' : 'bg-white/5 text-white/20 border border-white/5'}`}>
                                   <Bell size={24} />
                                </div>
                                <div className="space-y-0.5">
                                   <p className="text-sm font-bold text-white">Neural Status Updates</p>
                                   <p className="text-[10px] text-white/30 font-black uppercase tracking-widest">{isPushEnabled ? 'Channel active' : 'Offline'}</p>
                                </div>
                             </div>
                             <button 
                               onClick={handleEnablePush}
                               disabled={isPushEnabled}
                               className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${isPushEnabled ? 'bg-white/10 text-white/20 border border-white/5' : 'bg-primary text-black shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95'}`}
                             >
                               {isPushEnabled ? 'Active' : 'Enable'}
                             </button>
                          </div>
                        </div>
                        <button onClick={handleUpdateProfile} className="btn-primary w-full py-5 rounded-[2rem] mt-6 text-sm">Save Intelligence Profile</button>
                    </div>
                )}

                {activeModal === 'addresses' && (
                    <div className="space-y-8">
                        <div className="space-y-4">
                            <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">Verified Drop Zones</span>
                            {addresses.map((addr, idx) => (
                                <div key={idx} className="flex items-center gap-4 p-6 bg-white/5 rounded-[2rem] group border border-white/5 hover:border-primary/30 transition-all">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                      <MapPin size={20} />
                                    </div>
                                    <p className="flex-1 text-[13px] text-white/80 font-medium leading-relaxed">
                                        {typeof addr === 'string' ? addr : ((addr as any)?.address || 'Saved Location')}
                                    </p>
                                    <button onClick={() => handleRemoveAddress(idx)} className="p-3 text-white/20 hover:text-red-500 hover:bg-red-500/5 rounded-2xl transition-all border border-transparent hover:border-red-500/20">
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            ))}
                            {addresses.length === 0 && (
                                <div className="text-center py-12 text-white/20 text-[11px] font-black uppercase tracking-[0.3em] border-2 border-dashed border-white/5 rounded-[3rem]">Zero saved locations identified</div>
                            )}
                        </div>
                        <div className="space-y-4 pt-8 border-t border-white/5">
                            <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] block ml-2">Establish New Drop Zone</label>
                            <textarea 
                                placeholder="Sector, Building, Landmark..." 
                                className="input-field h-32 resize-none leading-relaxed"
                                value={newAddress}
                                onChange={e => setNewAddress(e.target.value)}
                            />
                            <button onClick={handleAddAddress} className="btn-primary w-full py-5 rounded-[2rem] text-sm">Update Grid Coordinates</button>
                        </div>
                    </div>
                )}

                {activeModal === 'referrals' && (
                    <div className="space-y-8 text-center pt-4">
                        <div className="w-24 h-24 bg-primary/10 rounded-[2.5rem] flex items-center justify-center mx-auto text-primary border border-primary/20 shadow-2xl relative group">
                            <div className="absolute inset-0 bg-primary/20 rounded-[2.5rem] blur-xl opacity-0 group-hover:opacity-100 transition-all" />
                            <Gift size={48} className="relative z-10" />
                        </div>
                        <div>
                            <h4 className="font-display font-black text-2xl text-white uppercase tracking-tight">Expand the Neural Network</h4>
                            <p className="text-[13px] text-white/40 mt-3 leading-relaxed font-medium">Transmit your access code to peers. Secure ৳50 asset credits for every successful integration.</p>
                        </div>
                        <div className="p-8 bg-black/40 rounded-[3rem] border border-white/10 shadow-inner relative overflow-hidden group">
                           <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-all" />
                            <span className="relative z-10 text-[10px] font-black text-white/20 uppercase tracking-[0.3em] block mb-4">Unique Identity Signature</span>
                            <span className="relative z-10 text-4xl font-display font-black tracking-[0.3em] text-white">{user?.uid.substring(0, 6).toUpperCase()}</span>
                        </div>
                        <button onClick={() => showUnderMaintenance('Share API')} className="btn-primary w-full py-5 rounded-[2rem] text-sm shadow-2xl shadow-primary/20">Initiate Broadcast</button>
                    </div>
                )}

                {activeModal === 'payments' && (
                    <div className="space-y-8">
                        <div className="p-6 bg-white/5 rounded-[2rem] border border-white/5 flex items-center gap-4">
                            <ShieldCheck className="text-primary shrink-0" size={32} />
                            <p className="text-[11px] text-white/40 font-bold leading-relaxed uppercase tracking-wider">Neural encryption active. Financial manifests are localized for maximum security.</p>
                        </div>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">bKash Node</label>
                                <input 
                                    className="input-field py-4" 
                                    placeholder="017xxxxxxxx" 
                                    value={editPayment.bkash} 
                                    onChange={e => setEditPayment({...editPayment, bkash: e.target.value})} 
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">Nagad Node</label>
                                <input 
                                    className="input-field py-4" 
                                    placeholder="017xxxxxxxx" 
                                    value={editPayment.nagad} 
                                    onChange={e => setEditPayment({...editPayment, nagad: e.target.value})} 
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">Rocket Node</label>
                                <input 
                                    className="input-field py-4" 
                                    placeholder="017xxxxxxxx" 
                                    value={editPayment.rocket} 
                                    onChange={e => setEditPayment({...editPayment, rocket: e.target.value})} 
                                />
                            </div>
                            <button onClick={handleUpdatePayment} className="btn-primary w-full py-5 rounded-[2rem] mt-4 text-sm">Save Virtual Assets</button>
                        </div>
                    </div>
                )}
                {activeModal === 'notifications' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center mb-2 px-2">
                             <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Transmission Buffer</span>
                             <button onClick={() => NotificationService.markAllAsRead(notifications)} className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">Flush All</button>
                        </div>
                        <div className="space-y-4">
                            {notifications.map(notif => (
                                <div key={notif.id} className={`p-6 rounded-[2.5rem] border transition-all ${notif.read ? 'bg-black/20 border-white/5 opacity-60' : 'bg-primary/5 border-primary/20'} relative group`}>
                                    <div className="flex gap-4">
                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${notif.type === 'order' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : notif.type === 'promo' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-white/5 text-white/20 border-white/5'}`}>
                                            <Bell size={18} />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <h4 className="font-bold text-sm text-white tracking-tight">{notif.title}</h4>
                                            <p className="text-[12px] text-white/50 leading-relaxed font-medium">{notif.message}</p>
                                            <p className="text-[9px] text-white/20 mt-3 font-mono italic">{format(notif.createdAt?.toDate() || new Date(), 'MMM dd, hh:mm a')}</p>
                                        </div>
                                        {!notif.read && (
                                            <button onClick={() => NotificationService.markAsRead(notif.id)} className="w-2.5 h-2.5 bg-primary rounded-full mt-1.5 shadow-[0_0_10px_rgba(212,175,55,0.8)]" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        {notifications.length === 0 && (
                            <div className="text-center py-20 bg-black/40 rounded-[3rem] border border-dashed border-white/5">
                                <p className="text-white/20 text-[11px] font-black uppercase tracking-[0.4em]">Zero incoming signals identified</p>
                            </div>
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
