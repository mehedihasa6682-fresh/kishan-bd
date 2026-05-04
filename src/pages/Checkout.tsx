import { motion, AnimatePresence } from 'motion/react';
import { MapPin, CreditCard, Apple, CheckCircle, ArrowLeft, Send, Map as MapIcon, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useState, useContext, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { AuthContext } from '../App';
import { orderService } from '../services/orderService';
import { NotificationService } from '../services/notificationService';
import ImageUpload from '../components/ImageUpload';
import AddressPicker from '../components/AddressPicker';

import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { formatCurrency } from '../lib/utils';

export default function Checkout() {
  const navigate = useNavigate();
  const { items, total, subtotal, deliveryFee, setDeliveryFee, discount, clearCart } = useCart();
  const { t } = useLanguage();
  const { user } = useContext(AuthContext);
  
  const [step, setStep] = useState<1 | 2>(1);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'bkash' | 'nagad' | 'rocket'>('cod');
  const [paymentNumber, setPaymentNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [paymentScreenshot, setPaymentScreenshot] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
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

  useState(() => {
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
        });
    }
  });

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
            await updateDoc(doc(db, 'users', user.uid), {
                addresses: arrayUnion(fullAddressData),
                phoneNumber: phone
            });
        }

        // Prepare items by removing large image data to prevent exceeding Firestore document size limit
        const cleanedItems = items.map(item => {
            const { image, ...rest } = item;
            return rest;
        });

        await orderService.placeOrder({
            userId: user.uid,
            customerName: customerName || user.displayName || 'Guest User',
            items: cleanedItems,
            total: total,
            subtotal: subtotal,
            deliveryFee: deliveryFee,
            discount: discount,
            paymentMethod,
            transactionId,
            paymentNumber,
            paymentScreenshot,
            address: typeof fullAddressData === 'string' ? fullAddressData : fullAddressData.address,
            phone,
            sellerIds,
            paymentStatus: paymentMethod === 'cod' ? 'pending' : 'pending',
            status: 'pending',
            location: location || { lat: 23.8103, lng: 90.4125 },
            addressData: fullAddressData
        } as any);

        // Send a notification to the user
        await NotificationService.sendNotification({
          userId: user.uid,
          title: "Order Placed Successfully",
          message: `Your order for ৳${formatCurrency(total)} has been received. Status: Pending.`,
          type: 'order'
        });

        setSuccess(true);
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
          <div className="max-w-md mx-auto px-5 pt-20 text-center">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-24 h-24 bg-primary rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-primary/30"
              >
                  <CheckCircle size={48} className="text-white" />
              </motion.div>
              <h2 className="text-2xl font-display font-bold mb-2">{t('checkout.success')}</h2>
              <p className="text-slate-400 text-sm mb-10 leading-relaxed">
                  Your order has been received. {paymentMethod !== 'cod' ? "Our admin will verify your payment and update you shortly." : "We will deliver your fresh goodies soon!"}
              </p>
              <Link to="/orders" className="btn-primary">{t('profile.orders')}</Link>
          </div>
      )
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-md mx-auto px-5 pb-10"
    >
      <div className="flex items-center gap-4 mb-8 pt-4">
        <button onClick={() => step === 2 ? setStep(1) : navigate(-1)} className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-600">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-display font-bold text-2xl">
            {step === 1 ? "Checkout Details" : "Payment Options"}
        </h1>
      </div>

      <div className="space-y-6">
        {step === 1 && (
            <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="space-y-6">
                {/* Delivery Address */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Contact & Delivery</h3>
                        {savedAddresses.length > 0 && !isEditingAddress && (
                            <button 
                                onClick={() => setIsEditingAddress(true)}
                                className="text-[10px] font-bold text-primary underline"
                            >
                                Change / Edit
                            </button>
                        )}
                    </div>
                    
                    <div className="glass-card p-5 border-slate-100 bg-white space-y-4">
                        {isEditingAddress ? (
                            <div className="space-y-4">
                                {savedAddresses.length > 0 && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Saved Address</label>
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
                                                    className="text-left p-3 rounded-xl border border-slate-100 bg-slate-50 text-[11px] font-medium text-slate-600 hover:border-primary transition-all"
                                                >
                                                    {typeof addr === 'string' ? addr : (addr?.address || 'Saved Location')}
                                                </button>
                                            ))}
                                            <button 
                                                onClick={() => {
                                                    setSelectedAddressIndex('new');
                                                    setAddress('');
                                                }}
                                                className="text-center p-3 rounded-xl border border-dashed border-slate-200 text-[10px] font-bold text-primary"
                                            >
                                                + Use Different Address
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-4 pt-2 border-t border-slate-50">
                                    <button 
                                        type="button"
                                        onClick={() => setShowAddressPicker(true)}
                                        className="w-full flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:border-primary transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-[#FFD700] flex items-center justify-center text-slate-800 shadow-sm group-hover:scale-110 transition-transform">
                                                <MapIcon size={20} />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight">Pin Location on Map</p>
                                                <p className="text-[9px] text-slate-400 font-medium italic">Better for accurate delivery</p>
                                            </div>
                                        </div>
                                        <div className="w-6 h-6 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-300">
                                            <ChevronRight size={14} />
                                        </div>
                                    </button>
                                    
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none block mb-1">Select Area (For Delivery Charge)</label>
                                        <select 
                                            className="input-field py-3 font-bold"
                                            value={selectedAreaId}
                                            onChange={e => {
                                                const area = deliveryAreas.find(a => a.id === e.target.value);
                                                setSelectedAreaId(e.target.value);
                                                if (area) setDeliveryFee(area.fee);
                                            }}
                                        >
                                            <option value="">Choose your location</option>
                                            {deliveryAreas.map(area => (
                                                <option key={area.id} value={area.id}>{area.name} (৳{formatCurrency(area.fee)})</option>
                                            ))}
                                        </select>
                                        <p className="text-[9px] text-slate-400 font-medium italic mt-1 ml-1">Delivery charge varies based on your location.</p>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full Name</label>
                                        <input 
                                            placeholder="Your Name"
                                            className="input-field"
                                            value={customerName}
                                            onChange={e => setCustomerName(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone Number</label>
                                        <input 
                                            type="tel"
                                            placeholder="017xxxxxxxx"
                                            className="input-field"
                                            value={phone}
                                            onChange={e => setPhone(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Delivery Address</label>
                                        <textarea 
                                            placeholder="Sector, Road, House No..."
                                            className="input-field h-24 resize-none"
                                            value={address}
                                            onChange={e => setAddress(e.target.value)}
                                        />
                                    </div>
                                    {selectedAddressIndex !== 'new' && (
                                        <button 
                                            onClick={() => setIsEditingAddress(false)}
                                            className="w-full py-3 bg-slate-100 rounded-xl text-[10px] font-bold text-slate-500"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {addressDetails && (
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                                            addressDetails.type === 'Home' ? 'bg-primary/10 text-primary' :
                                            addressDetails.type === 'Office' ? 'bg-blue-50 text-blue-500' : 'bg-orange-50 text-orange-500'
                                        }`}>
                                            {addressDetails.type || 'Home'}
                                        </span>
                                        {addressDetails.floorNo && (
                                            <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg text-[8px] font-bold uppercase tracking-widest">
                                                Floor: {addressDetails.floorNo}
                                            </span>
                                        )}
                                        {addressDetails.apartment && (
                                            <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg text-[8px] font-bold uppercase tracking-widest">
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
                                        <p className="text-xs font-bold text-slate-800">{customerName}</p>
                                        <p className="text-[10px] text-slate-500 font-medium">{phone}</p>
                                    </div>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                    <p className="text-[11px] text-slate-600 font-medium leading-relaxed">{address}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <button 
                    disabled={!phone || !address || !customerName}
                    onClick={() => setStep(2)}
                    className="btn-primary w-full py-5 rounded-[2rem] disabled:opacity-50"
                >
                    Proceed to Payment
                </button>
            </motion.div>
        )}

        {step === 2 && (
            <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="space-y-6">
                {/* Payment Method */}
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Select Payment Method</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                        { id: 'cod', label: 'Cash on Delivery', icon: CreditCard },
                        { id: 'bkash', label: 'bKash', img: 'https://raw.githubusercontent.com/Shadman-Zamee/payment-logos-bd/main/bkash-logo.png' },
                        { id: 'nagad', label: 'Nagad', img: 'https://raw.githubusercontent.com/Shadman-Zamee/payment-logos-bd/main/nagad-logo.png' },
                        { id: 'rocket', label: 'Rocket', img: 'https://raw.githubusercontent.com/Shadman-Zamee/payment-logos-bd/main/rocket-logo.png' },
                        ].map((method) => (
                        <button 
                            key={method.id}
                            onClick={() => setPaymentMethod(method.id as any)}
                            className={`p-4 rounded-3xl border text-center transition-all flex flex-col items-center justify-center gap-2 group ${
                                paymentMethod === method.id 
                                ? 'border-primary bg-primary/[0.03] ring-1 ring-primary' 
                                : 'border-slate-100 bg-white hover:border-slate-200 shadow-sm'
                            }`}
                        >
                            {method.img ? (
                                <img src={method.img} className="h-8 object-contain transition-all" alt={method.label} />
                            ) : (
                                <method.icon className={`h-8 w-8 ${paymentMethod === method.id ? 'text-primary' : 'text-slate-400'}`} />
                            )}
                            <span className={`text-[10px] font-bold ${paymentMethod === method.id ? 'text-slate-900' : 'text-slate-500'}`}>{method.label}</span>
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
                                <div className="bg-slate-900 text-white p-6 rounded-3xl space-y-4 shadow-xl">
                                    <div className="flex justify-between items-center bg-white/10 p-3 rounded-2xl border border-white/5">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold uppercase opacity-60">Send Money to Personal</span>
                                            <span className="text-sm font-black tracking-widest text-secondary">01700-000000</span>
                                        </div>
                                        <div className="px-2 py-1 bg-secondary/20 rounded-lg">
                                            <span className="text-[10px] font-bold text-secondary">PERSONAL</span>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Payment Phone Number (Sender)</label>
                                            <input 
                                                required
                                                placeholder="e.g. 017XXXXXXXX"
                                                className="w-full bg-white/5 border border-white/10 px-4 py-4 rounded-2xl text-xs outline-none focus:border-primary transition-all text-white font-sans"
                                                value={paymentNumber}
                                                onChange={e => setPaymentNumber(e.target.value)}
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Transaction ID</label>
                                            <input 
                                                placeholder="Enter TrxID after payment"
                                                className="w-full bg-white/5 border border-white/10 px-4 py-4 rounded-2xl text-xs outline-none focus:border-primary transition-all text-white font-mono"
                                                value={transactionId}
                                                onChange={e => setTransactionId(e.target.value)}
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Or Upload Payment Screenshot</label>
                                            <ImageUpload 
                                                currentImage={paymentScreenshot}
                                                onUpload={(base64) => setPaymentScreenshot(base64)}
                                                className="bg-white/5 border-white/10 rounded-2xl"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Order Summary */}
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Order Summary</h3>
                    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                        <div className="flex justify-between text-xs font-bold">
                            <span className="text-slate-400">{t('cart.subtotal')}</span>
                            <span className="text-slate-800">৳{formatCurrency(subtotal || 0)}</span>
                        </div>
                        {(discount || 0) > 0 && (
                            <div className="flex justify-between text-xs font-bold text-secondary">
                                <span>Discount</span>
                                <span>-৳{formatCurrency(discount)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-xs font-bold">
                            <span className="text-slate-400">{t('cart.delivery')}</span>
                            <span className="text-slate-800">৳{formatCurrency(deliveryFee || 0)}</span>
                        </div>
                        <div className="border-t border-slate-50 pt-4 flex justify-between items-center">
                            <span className="font-display font-bold text-slate-900">{t('cart.total')}</span>
                            <span className="text-2xl font-display font-bold text-primary">৳{formatCurrency(total || 0)}</span>
                        </div>
                    </div>
                </div>

                <button 
                    disabled={loading}
                    onClick={handlePlaceOrder}
                    className="btn-primary w-full py-5 rounded-[2rem] shadow-2xl shadow-primary/30 mt-4 text-lg disabled:opacity-50"
                >
                    {loading ? 'Confirming Order...' : "Complete Order"}
                </button>
            </motion.div>
        )}

        <p className="text-[10px] text-slate-400 text-center font-medium mt-2">
            Securely processed via Kishan Cloud. Verified for 100% freshness.
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
