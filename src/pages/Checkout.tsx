import { motion, AnimatePresence } from 'motion/react';
import { MapPin, CreditCard, Apple, CheckCircle, ArrowLeft, Send, Map as MapIcon, ChevronRight, Phone, MessageCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useState, useContext, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { AuthContext } from '../App';
import { orderService } from '../services/orderService';
import { NotificationService } from '../services/notificationService';
import ImageUpload from '../components/ImageUpload';
import AddressPicker from '../components/AddressPicker';

import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { auth, db, OperationType, handleFirestoreError } from '../firebase';
import { formatCurrency } from '../lib/utils';

export default function Checkout() {
  const navigate = useNavigate();
  const { items, total, subtotal, deliveryFee, setDeliveryFee, discount, clearCart } = useCart();
  const { t, language } = useLanguage();
  const { settings: appSettings } = useSettings();
  const { user } = useContext(AuthContext);
  
  const [step, setStep] = useState<1 | 2>(1);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'bkash' | 'nagad' | 'rocket'>('cod');
  const [paymentNumber, setPaymentNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [paymentScreenshot, setPaymentScreenshot] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [orderId, setOrderId] = useState('');
  
  const [customerName, setCustomerName] = useState(user?.displayName || '');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [addressDetails, setAddressDetails] = useState<any>(null);
  const [selectedAreaId, setSelectedAreaId] = useState<string>('');
  const [deliveryAreas, setDeliveryAreas] = useState<any[]>([]);
  
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressIndex, setSelectedAddressIndex] = useState<number | 'new'>('new');
  const [isEditingAddress, setIsEditingAddress] = useState(true);
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const { setDiscount } = useCart();
  const { showToast } = useToast();

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setCouponLoading(true);
    setCouponError('');
    try {
      const response = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponCode,
          orderValue: subtotal,
          userId: user?.uid
        })
      });
      const resData = await response.json();
      if (resData.success) {
        setDiscount(resData.discount);
        setCouponError('');
        alert(`Coupon Applied! You saved ৳${resData.discount}`);
      } else {
        setCouponError(resData.error || 'Failed to apply coupon');
      }
    } catch (e) {
      setCouponError('Network error. Try again.');
    } finally {
      setCouponLoading(false);
    }
  };

  useEffect(() => {
    async function fetchAreas() {
        const { getDocs, collection } = await import('firebase/firestore');
        const snap = await getDocs(collection(db, 'delivery_areas'));
        const areas = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
        setDeliveryAreas(areas);
        
        // Default to first area if available
        if (areas.length > 0) {
            const mun = areas.find(a => String(a.name || '').includes('Gaibandha Municipality')) || areas[0];
            setSelectedAreaId(mun.id);
            setDeliveryFee(mun.fee);
        }
    }
    fetchAreas();
  }, [setDeliveryFee]);

  useEffect(() => {
    if (user) {
        getDoc(doc(db, 'users', user.uid)).then(snap => {
            if (snap.exists()) {
                const addrs = snap.data().addresses || [];
                setSavedAddresses(addrs);
                if (addrs.length > 0) {
                    const first = addrs[0];
                    if (typeof first === 'object') {
                        setAddress(first.address);
                        setLocation({ lat: first.lat, lng: first.lng });
                        setAddressDetails(first);
                    } else {
                        setAddress(first);
                    }
                    setSelectedAddressIndex(0);
                    setIsEditingAddress(false);
                }
                setPhone(snap.data().phoneNumber || user.phoneNumber || '');
                setCustomerName(snap.data().displayName || user.displayName || '');
            }
        }).catch(err => {
            handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
        });
    }
  }, [user]);

  const handlePlaceOrder = async () => {
    if (!user) {
        alert("Please login to place order");
        navigate('/profile');
        return;
    }

    if (paymentMethod !== 'cod' && !transactionId && !paymentScreenshot) {
        alert("Please enter Transaction ID or upload a payment screenshot");
        return;
    }

    setLoading(true);
    try {
        const sellerIds: string[] = Array.from(new Set(items.map(item => String(item.sellerId || 'default-seller'))));
        
        const fullAddressData = addressDetails || { 
            address, 
            lat: location?.lat || 23.8103, 
            lng: location?.lng || 90.4125 
        };

        // Save address to profile if it's new
        if (selectedAddressIndex === 'new' && user) {
            try {
                await updateDoc(doc(db, 'users', user.uid), {
                    addresses: arrayUnion(fullAddressData),
                    phoneNumber: phone
                });
            } catch (err) {
                handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
            }
        }

        // Prepare items by removing large image data and undefined values to prevent exceeding Firestore document size limit or errors
        const cleanedItems = items.map(item => {
            const { image, ...rest } = item;
            // Remove any undefined properties from the items
            const filteredItem: any = {};
            Object.keys(rest).forEach(key => {
                if ((rest as any)[key] !== undefined) {
                    filteredItem[key] = (rest as any)[key];
                }
            });
            return filteredItem;
        });

        const orderId = await orderService.placeOrder({
            userId: user.uid,
            customerName: customerName || user.displayName || 'Guest User',
            items: cleanedItems,
            total: total,
            subtotal: subtotal,
            deliveryFee: deliveryFee,
            discount: discount || 0,
            paymentMethod,
            transactionId: transactionId || '',
            paymentNumber: paymentNumber || '',
            paymentScreenshot: paymentScreenshot || '',
            address: typeof fullAddressData === 'string' ? fullAddressData : (fullAddressData?.address || ''),
            phone: phone || '',
            sellerIds,
            paymentStatus: 'pending',
            status: 'pending',
            location: location || { lat: 23.8103, lng: 90.4125 },
            addressData: fullAddressData || null
        } as any);

        // Send a notification to the user
        await NotificationService.sendNotification({
          userId: user.uid,
          title: "Order Placed Successfully",
          message: `Your order for ৳${formatCurrency(total)} has been received. Status: Pending.`,
          type: 'order'
        });

        showToast("New Order Placed Successfully!", 'order', 2000);

        setSuccess(true);
        setOrderId(orderId);
        clearCart();
        
        setTimeout(() => {
            navigate('/orders');
        }, 3000);
    } catch (e) {
        console.error(e);
        alert("Failed to place order. Please try again.");
    } finally {
        setLoading(false);
    }
  };

  if (success) {
      return (
          <div className="max-w-md mx-auto px-5 pt-4 text-center pb-20 min-h-screen bg-white">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-24 h-24 bg-primary rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl relative overflow-hidden group"
              >
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent animate-pulse" />
                  <CheckCircle size={48} className="text-white relative z-10" />
              </motion.div>
              
              <h2 className="text-3xl font-display font-black mb-3 text-[#111111] uppercase tracking-tighter">Order Placed!</h2>
              <div className="bg-primary/5 border border-primary/10 p-5 rounded-[2rem] mb-10 overflow-hidden relative group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                  <p className="text-[#6B7280] text-[11px] font-bold leading-relaxed relative z-10 text-center">
                      অর্ডারটি সফলভাবে সম্পন্ন হয়েছে। আমাদের এডমিন আপনার পেমেন্ট যাচাই (Verify) করার পর অফিসিয়াল মেমো দিয়ে দিবে। দয়া করে অপেক্ষা করুন।
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-3 relative z-10">
                    <div className="flex gap-1">
                        {[1,2,3].map(i => (
                            <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
                        ))}
                    </div>
                    <span className="text-[9px] font-black text-primary uppercase tracking-widest">Verifying Payment...</span>
                  </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <Link 
                        to="/orders" 
                        className="py-5 bg-[#F9FAFB] border border-[#ECECEC] rounded-[1.5rem] text-[10px] font-black text-[#6B7280] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#F3F4F6] transition-all font-mono"
                    >
                        [ VIEW_ORDERS ]
                    </Link>
                    <Link 
                        to="/" 
                        className="py-5 bg-[#F9FAFB] border border-[#ECECEC] rounded-[1.5rem] text-[10px] font-black text-[#6B7280] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#F3F4F6] transition-all font-mono"
                    >
                        [ BACK_HOME ]
                    </Link>
                </div>
              </div>

              <div className="mt-12 p-6 bg-[#F9FAFB] border border-[#ECECEC] rounded-3xl shadow-sm">
                 <p className="text-[10px] font-black text-[#6B7280] uppercase tracking-widest leading-relaxed">
                    Order ID: <span className="text-primary font-mono">{orderId?.slice(-12).toUpperCase()}</span>
                 </p>
                 <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-2">Status: Pending Verification</p>
              </div>
          </div>
      )
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-md mx-auto px-5 pb-10 min-h-screen bg-white"
    >
      <div className="flex items-center gap-4 mb-8 pt-4">
        <button onClick={() => step === 2 ? setStep(1) : navigate(-1)} className="w-10 h-10 bg-[#F9FAFB] border border-[#ECECEC] rounded-xl flex items-center justify-center text-[#111111]">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-display font-bold text-2xl text-[#111111]">
            {step === 1 ? "Checkout Details" : "Payment Options"}
        </h1>
      </div>

      <div className="space-y-6">
        {step === 1 && (
            <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="space-y-6">
                {/* Delivery Address */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.2em]">Contact & Delivery</h3>
                        {savedAddresses.length > 0 && !isEditingAddress && (
                            <button 
                                onClick={() => setIsEditingAddress(true)}
                                className="text-[10px] font-bold text-primary underline"
                            >
                                Change / Edit
                            </button>
                        )}
                    </div>
                    
                    <div className="glass-card p-5 border border-[#ECECEC] bg-white space-y-4 shadow-sm rounded-2xl">
                        {isEditingAddress ? (
                            <div className="space-y-4">
                                {savedAddresses.length > 0 && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest">Select Saved Address</label>
                                        <div className="grid grid-cols-1 gap-2">
                                            {savedAddresses.map((addr, idx) => (
                                                <button 
                                                    key={idx}
                                                    onClick={() => {
                                                        if (typeof addr === 'object') {
                                                            setAddress(addr.address);
                                                            setLocation({ lat: addr.lat, lng: addr.lng });
                                                            setAddressDetails(addr);
                                                            setCustomerName(`${addr.firstName || ''} ${addr.lastName || ''}`.trim() || customerName);
                                                            setPhone(addr.phone || phone);
                                                        } else {
                                                            setAddress(addr);
                                                        }
                                                        setSelectedAddressIndex(idx);
                                                        setIsEditingAddress(false);
                                                    }}
                                                    className="text-left p-3 rounded-xl border border-[#ECECEC] bg-[#F9FAFB] text-[11px] font-medium text-[#111111] hover:border-primary transition-all"
                                                >
                                                    {typeof addr === 'string' ? addr : (addr?.address || 'Saved Location')}
                                                </button>
                                            ))}
                                            <button 
                                                onClick={() => {
                                                    setSelectedAddressIndex('new');
                                                    setAddress('');
                                                }}
                                                className="text-center p-3 rounded-xl border border-dashed border-primary/40 text-[10px] font-bold text-primary"
                                            >
                                                + Use Different Address
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-4 pt-2 border-t border-[#ECECEC]">
                                    <button 
                                        type="button"
                                        onClick={() => setShowAddressPicker(true)}
                                        className="w-full flex items-center justify-between p-4 bg-[#F9FAFB] border border-[#ECECEC] rounded-2xl hover:border-primary transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform">
                                                <MapIcon size={20} />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-[11px] font-black text-[#111111] uppercase tracking-tight">Pin Location on Map</p>
                                                <p className="text-[9px] text-[#6B7280] font-medium italic">Better for accurate delivery</p>
                                            </div>
                                        </div>
                                        <div className="w-6 h-6 rounded-full bg-white border border-[#ECECEC] flex items-center justify-center text-gray-300">
                                            <ChevronRight size={14} />
                                        </div>
                                    </button>
                                    
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest leading-none block mb-1 ml-1">Select Area (For Delivery Charge)</label>
                                        <select 
                                            className="w-full bg-[#F9FAFB] border border-[#ECECEC] rounded-2xl px-4 py-3.5 text-xs font-bold text-[#111111] focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                            value={selectedAreaId}
                                            onChange={e => {
                                                const area = deliveryAreas.find(a => a.id === e.target.value);
                                                setSelectedAreaId(e.target.value);
                                                if (area) setDeliveryFee(area.fee);
                                            }}
                                        >
                                            <option value="" className="bg-white text-[#111111]">Choose your location</option>
                                            {deliveryAreas.map(area => (
                                                <option key={area.id} value={area.id} className="bg-white text-[#111111]">{area.name} (৳{formatCurrency(area.fee)})</option>
                                            ))}
                                        </select>
                                        <p className="text-[9px] text-[#6B7280] font-medium italic mt-1 ml-2">Delivery charge varies based on your location.</p>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest ml-1">Full Name</label>
                                        <input 
                                            placeholder="Your Name"
                                            className="w-full bg-[#F9FAFB] border border-[#ECECEC] rounded-2xl px-4 py-3.5 text-xs font-bold text-[#111111] focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                            value={customerName}
                                            onChange={e => setCustomerName(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest ml-1">Phone Number</label>
                                        <input 
                                            type="tel"
                                            placeholder="017xxxxxxxx"
                                            className="w-full bg-[#F9FAFB] border border-[#ECECEC] rounded-2xl px-4 py-3.5 text-xs font-bold text-[#111111] focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                            value={phone}
                                            onChange={e => setPhone(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest ml-1">Delivery Address</label>
                                        <textarea 
                                            placeholder="Sector, Road, House No..."
                                            className="w-full bg-[#F9FAFB] border border-[#ECECEC] rounded-2xl px-4 py-3.5 text-xs font-bold text-[#111111] focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all h-24 resize-none"
                                            value={address}
                                            onChange={e => setAddress(e.target.value)}
                                        />
                                    </div>
                                    {selectedAddressIndex !== 'new' && (
                                        <button 
                                            onClick={() => setIsEditingAddress(false)}
                                            className="w-full py-3 bg-[#F9FAFB] rounded-xl text-[10px] font-bold text-[#6B7280]"
                                        >
                                            Cancel
                                        </button>
                                    )}

                                    <div className="pt-2 border-t border-[#ECECEC]">
                                        <button 
                                            onClick={() => {
                                                const formatW = (w: any) => w >= 1000 ? `${w / 1000}KG` : `${w}g`;
                                                const text = language === 'bn' 
                                                    ? `হ্যালো, আমি নিচের পণ্যগুলো অর্ডার করতে চাই:\n${items.map(i => `- ${i.name} ${i.selectedWeight ? `(${formatW(i.selectedWeight)})` : ''} (x${i.quantity})`).join('\n')}\nমোট: ৳${total}`
                                                    : `Hello, I want to order the following items:\n${items.map(i => `- ${i.name} ${i.selectedWeight ? `(${formatW(i.selectedWeight)})` : ''} (x${i.quantity})`).join('\n')}\nTotal: ৳${total}`;
                                                window.open(`https://wa.me/${appSettings.whatsappNumber?.replace(/\+/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
                                            }}
                                            className="w-full py-4 bg-green-50 border border-green-200 rounded-2xl flex items-center justify-center gap-3 text-green-600 hover:bg-green-100 transition-all group"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center text-white shadow-lg shadow-green-500/20 group-hover:scale-110 transition-transform">
                                                <Phone size={16} />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-[11px] font-black uppercase tracking-tight">Order via WhatsApp</p>
                                                <p className="text-[9px] font-medium opacity-60 italic">Fastest way to order</p>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {addressDetails && (
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                                            addressDetails.type === 'Home' ? 'bg-primary/10 text-primary' :
                                            addressDetails.type === 'Office' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'
                                        }`}>
                                            {addressDetails.type || 'Home'}
                                        </span>
                                        {addressDetails.floorNo && (
                                            <span className="bg-[#F9FAFB] text-[#6B7280] px-2 py-0.5 rounded-lg text-[8px] font-bold uppercase tracking-widest border border-[#ECECEC]">
                                                Floor: {addressDetails.floorNo}
                                            </span>
                                        )}
                                        {addressDetails.apartment && (
                                            <span className="bg-[#F9FAFB] text-[#6B7280] px-2 py-0.5 rounded-lg text-[8px] font-bold uppercase tracking-widest border border-[#ECECEC]">
                                                Apt: {addressDetails.apartment}
                                            </span>
                                        )}
                                    </div>
                                )}
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                        <MapPin size={16} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs font-bold text-[#111111]">{customerName}</p>
                                        <p className="text-[10px] text-[#6B7280] font-medium">{phone}</p>
                                    </div>
                                </div>
                                <div className="p-4 bg-[#F9FAFB] rounded-3xl border border-[#ECECEC]">
                                    <p className="text-[11px] text-[#111111] font-medium leading-[1.6]">{address}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="pt-4">
                    <button 
                        disabled={!phone || !address || !customerName}
                        onClick={() => setStep(2)}
                        className={`w-full py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl ${
                            (!phone || !address || !customerName) 
                            ? 'bg-gray-100 text-gray-400 border border-gray-200' 
                            : 'bg-[#121212] text-white active:scale-95'
                        }`}
                    >
                        <span>Next Step</span>
                        <ChevronRight size={18} />
                    </button>
                </div>
            </motion.div>
        )}


        {step === 2 && (
            <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="space-y-6">
                {/* Payment Method */}
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.2em]">Select Payment Method</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                        { id: 'cod', label: 'Cash on Delivery', icon: CreditCard },
                        { id: 'bkash', label: 'bKash', img: 'https://logos-download.com/wp-content/uploads/2022/01/BKash_Logo.png' },
                        { id: 'nagad', label: 'Nagad', img: 'https://logos-download.com/wp-content/uploads/2022/01/Nagad_Logo.png' },
                        { id: 'rocket', label: 'Rocket', img: 'https://logos-download.com/wp-content/uploads/2022/01/Rocket_Logo.png' },
                        ].map((method) => (
                        <button 
                            key={method.id}
                            onClick={() => setPaymentMethod(method.id as any)}
                            className={`p-5 rounded-[2rem] border text-center transition-all flex flex-col items-center justify-center gap-3 group relative overflow-hidden ${
                                paymentMethod === method.id 
                                ? 'border-primary bg-primary/5 shadow-sm scale-[1.02]' 
                                : 'border-[#ECECEC] bg-white hover:border-primary/40'
                            }`}
                        >
                            {paymentMethod === method.id && (
                                <div className="absolute top-0 right-0 w-8 h-8 bg-primary text-white flex items-center justify-center rounded-bl-2xl">
                                    <div className="w-1 h-1 bg-white rounded-full" />
                                </div>
                            )}
                            {method.img ? (
                                <img src={method.img} className={`h-12 object-contain transition-all ${paymentMethod === method.id ? 'scale-110' : 'opacity-60 group-hover:opacity-100'}`} alt={method.label} />
                            ) : (
                                <method.icon className={`h-10 w-10 ${paymentMethod === method.id ? 'text-primary' : 'text-gray-300'}`} />
                            )}
                            <span className={`text-[9px] font-black uppercase tracking-widest ${paymentMethod === method.id ? 'text-[#111111]' : 'text-[#6B7280]'}`}>{method.label}</span>
                        </button>

                        ))}
                    </div>

                    <AnimatePresence>
                        {paymentMethod !== 'cod' && (
                            <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="bg-[#F9FAFB] border border-[#ECECEC] p-6 rounded-3xl space-y-4 shadow-sm">
                                    <div className="flex justify-between items-center bg-white p-3 rounded-2xl border border-[#ECECEC]">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold uppercase text-[#6B7280]">Send Money to Personal</span>
                                            <span className="text-sm font-black tracking-widest text-primary">
                                                {paymentMethod === 'bkash' ? appSettings.bkashNumber || '01700-000000' :
                                                 paymentMethod === 'nagad' ? appSettings.nagadNumber || '01700-000000' :
                                                 paymentMethod === 'rocket' ? appSettings.rocketNumber || '01700-000000' : '01700-000000'}
                                            </span>
                                        </div>
                                        <div className="px-2 py-1 bg-primary/10 rounded-lg">
                                            <span className="text-[10px] font-bold text-primary">PERSONAL</span>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest mb-1 block ml-1">Payment Phone Number (Sender)</label>
                                            <input 
                                                required
                                                placeholder="e.g. 017XXXXXXXX"
                                                className="w-full bg-white border border-[#ECECEC] px-4 py-4 rounded-2xl text-xs outline-none focus:border-primary transition-all text-[#111111] font-sans"
                                                value={paymentNumber}
                                                onChange={e => setPaymentNumber(e.target.value)}
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest mb-1 block ml-1">
                                                Transaction ID {paymentScreenshot ? <span className="text-gray-400 italic">(Optional)</span> : ''}
                                            </label>
                                            <input 
                                                placeholder={paymentScreenshot ? "Enter TrxID (Optional)" : "Enter TrxID after payment"}
                                                className="w-full bg-white border border-[#ECECEC] px-4 py-4 rounded-2xl text-xs outline-none focus:border-primary transition-all text-[#111111] font-mono"
                                                value={transactionId}
                                                onChange={e => setTransactionId(e.target.value)}
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest mb-1 block ml-1">
                                                Or Upload Payment Screenshot {transactionId ? <span className="text-gray-400 italic">(Optional)</span> : ''}
                                            </label>
                                            <ImageUpload 
                                                currentImage={paymentScreenshot}
                                                onUpload={(base64) => setPaymentScreenshot(base64)}
                                                className="bg-white border-[#ECECEC] rounded-2xl"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Coupon Section */}
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.2em]">Have a Coupon?</h3>
                    <div className="flex gap-2">
                        <input 
                            placeholder="Enter Code (e.g. FRESH10)"
                            className="flex-1 bg-[#F9FAFB] border border-[#ECECEC] px-4 py-3 rounded-2xl text-[11px] font-mono outline-none focus:border-primary text-[#111111]"
                            value={couponCode}
                            onChange={e => setCouponCode(e.target.value.toUpperCase())}
                        />
                        <button 
                            disabled={couponLoading || !couponCode}
                            onClick={handleApplyCoupon}
                            className="px-6 bg-[#121212] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50 hover:bg-black transition-colors"
                        >
                            {couponLoading ? '...' : 'APPLY'}
                        </button>
                    </div>
                    {couponError && <p className="text-[9px] text-primary font-bold ml-2">{couponError}</p>}
                </div>

                {/* Order Summary */}
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.2em]">Order Summary</h3>
                    <div className="bg-white rounded-3xl p-6 border border-[#ECECEC] shadow-sm space-y-4">
                        <div className="flex justify-between text-xs font-bold text-[#111111]">
                            <span className="text-[#6B7280]">{t('cart.subtotal')}</span>
                            <span className="text-[#111111]">৳{formatCurrency(subtotal || 0)}</span>
                        </div>
                        {(discount || 0) > 0 && (
                            <div className="flex justify-between text-xs font-bold text-primary">
                                <span>Discount Applied</span>
                                <span>-৳{formatCurrency(discount)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-xs font-bold text-[#111111]">
                            <span className="text-[#6B7280]">{t('cart.delivery')}</span>
                            <span className="text-[#111111]">৳{formatCurrency(deliveryFee || 0)}</span>
                        </div>
                        <div className="border-t border-[#ECECEC] pt-4 flex justify-between items-center">
                            <span className="font-display font-bold text-[#111111]">{t('cart.total')}</span>
                            <span className="text-2xl font-display font-bold text-primary">৳{formatCurrency(total || 0)}</span>
                        </div>
                    </div>
                </div>

                <button 
                    disabled={loading}
                    onClick={handlePlaceOrder}
                    className="btn-primary w-full py-5 rounded-[2rem] shadow-xl mt-4 text-lg disabled:opacity-50 bg-[#121212] text-white hover:bg-black"
                >
                    {loading ? 'Confirming Order...' : "Complete Order"}
                </button>
            </motion.div>
        )}

        <p className="text-[10px] text-[#6B7280] text-center font-medium mt-2">
            Securely processed via {appSettings.appName || 'সদাই ভাই'} Cloud. Verified for 100% freshness.
        </p>
      </div>

      <AnimatePresence>
        {showAddressPicker && (
            <AddressPicker 
                onClose={() => setShowAddressPicker(false)}
                onSave={(data) => {
                    setAddress(data.address);
                    setLocation({ lat: data.lat, lng: data.lng });
                    setCustomerName(`${data.firstName} ${data.lastName}`.trim());
                    setPhone(data.phone);
                    setAddressDetails(data);
                    setShowAddressPicker(false);
                    setIsEditingAddress(false);
                }}
                initialData={{
                    firstName: customerName.split(' ')[0],
                    lastName: customerName.split(' ').slice(1).join(' '),
                    phone: phone,
                    address: address,
                    lat: location?.lat,
                    lng: location?.lng
                }}
            />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
