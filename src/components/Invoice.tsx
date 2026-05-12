import { motion } from 'motion/react';
import { Download, Printer, CheckCircle2, ShoppingBag } from 'lucide-react';
import { format } from 'date-fns';
import { useSettings } from '../context/SettingsContext';

interface InvoiceProps {
  order: any;
  onClose: () => void;
}

export default function Invoice({ order, onClose }: InvoiceProps) {
  const { settings: appSettings } = useSettings();
  const handlePrint = () => {
    window.print();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#F5F5F7]/95 backdrop-blur-xl print:p-0 print:bg-white print:static print:inset-auto"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden print:shadow-none print:rounded-none print:w-full print:max-w-none"
      >
        {/* Header - Print Optimized */}
        <div className="bg-[#0A1F44] p-6 text-white flex justify-between items-center print:bg-white print:text-[#111111] print:border-b-2 print:border-[#ECECEC] print:pb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shadow-lg border border-white/5 overflow-hidden print:bg-slate-100 print:border-slate-200">
                {appSettings.logo ? (
                    <img src={appSettings.logo} className="w-full h-full object-contain p-1" alt="Logo" />
                ) : (
                    <ShoppingBag size={24} className="text-primary print:text-[#111111]" />
                )}
            </div>
            <div>
              <h1 className="font-display font-black text-xl leading-none mb-0.5 tracking-tight">{appSettings.appName || 'সদাই ভাই'}</h1>
              <div className="flex items-center gap-2">
                <span className="text-[8px] font-black text-primary uppercase tracking-[0.3em] print:text-[#6B7280]">
                  {order.paymentStatus === 'verified' ? 'OFFICIAL RECEIPT' : 'INVOICE / BILL'}
                </span>
                <span className="text-[8px] font-bold text-white/30 print:text-slate-300">|</span>
                <span className="text-[8px] font-bold text-white/50 print:text-[#6B7280]">মেমো</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="no-print mb-2 flex justify-end gap-2">
              <button 
                onClick={handlePrint}
                className="bg-white/10 hover:bg-primary hover:text-[#F5F5F7] p-2.5 rounded-xl transition-all shadow-lg backdrop-blur-md"
                title="Print or Save PDF"
              >
                <Printer size={16} />
              </button>
            </div>
            <div className="space-y-0.5">
              <h3 className="font-mono font-black text-base uppercase tracking-tighter text-primary print:text-[#111111]">#{order.id.slice(-8)}</h3>
              <p className="text-[9px] text-white/40 font-black uppercase tracking-widest print:text-[#6B7280]">
                {format(order.createdAt?.toDate ? order.createdAt.toDate() : new Date(), 'dd MMM yyyy')}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white print:p-8">
          {/* Status Banner - Verification Focused */}
          <div className={`mb-6 p-3 rounded-2xl flex items-center justify-between border ${
            order.paymentStatus === 'verified' 
              ? 'bg-green-50 border-green-100 text-green-700' 
              : 'bg-amber-50 border-amber-100 text-amber-700'
          } print:bg-white print:border-slate-200 print:text-[#111111]`}>
            <div className="flex items-center gap-2.5">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                order.paymentStatus === 'verified' ? 'bg-green-600 text-white' : 'bg-amber-500 text-white'
              }`}>
                {order.paymentStatus === 'verified' ? <CheckCircle2 size={14} /> : <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />}
              </div>
              <div>
                <p className="text-[8px] font-black uppercase tracking-widest leading-none mb-0.5">Payment Status</p>
                <p className="text-xs font-bold truncate">
                  {order.paymentStatus === 'verified' ? 'পেমেন্ট যাচাই করা হয়েছে' : 'পেমেন্ট যাচাইয়ের অপেক্ষায় আছে'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[8px] font-black uppercase tracking-widest leading-none mb-0.5">Order Status</p>
              <p className="text-xs font-bold uppercase">{order.status}</p>
            </div>
          </div>

          {/* Info Blocks */}
          <div className="grid grid-cols-2 gap-8 mb-6">
            <div>
              <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-2">Customer Details / গ্রাহক</p>
              <h4 className="font-bold text-base text-[#0A1F44] leading-tight mb-0.5">{order.customerName}</h4>
              <p className="text-xs text-[#6B7280] font-bold mb-1">{order.phone}</p>
              <p className="text-[10px] text-[#6B7280] font-medium leading-relaxed bg-[#F5F5F7] p-2.5 rounded-xl border border-[#ECECEC]">
                {typeof order.address === 'string' ? order.address : (order.address?.address || 'No Address')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-2">Payment Info / পেমেন্ট</p>
              <div className="space-y-2">
                <div>
                  <p className="text-[10px] font-black text-[#0A1F44] uppercase tracking-widest bg-[#F5F5F7] px-2.5 py-1.5 rounded-lg inline-block border border-[#ECECEC]">
                    {order.paymentMethod === 'cod' ? 'Cash on Delivery' : `${order.paymentMethod.toUpperCase()} Mobile Banking`}
                  </p>
                </div>
                {order.paymentMethod !== 'cod' && (
                  <div className="bg-[#F5F5F7] p-3 rounded-xl border border-slate-200 inline-block text-left min-w-[120px]">
                    {order.paymentNumber && (
                        <div className="flex justify-between items-center mb-0.5 gap-4">
                          <span className="text-[8px] text-[#6B7280] uppercase font-black">Account:</span>
                          <span className="text-[10px] font-bold text-[#0A1F44]">{order.paymentNumber}</span>
                        </div>
                    )}
                    {order.transactionId && (
                        <div className="flex justify-between items-center gap-4">
                          <span className="text-[8px] text-[#6B7280] uppercase font-black">TrxID:</span>
                          <span className="text-[9px] font-mono font-bold text-primary">{order.transactionId}</span>
                        </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="mb-6">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#ECECEC]">
                  <th className="pb-2 text-[8px] font-black text-[#6B7280] uppercase tracking-widest">Items</th>
                  <th className="pb-2 text-[8px] font-black text-[#6B7280] uppercase tracking-widest text-center">Qty</th>
                  <th className="pb-2 text-[8px] font-black text-[#6B7280] uppercase tracking-widest text-right">Price</th>
                  <th className="pb-2 text-[8px] font-black text-[#6B7280] uppercase tracking-widest text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {order.items?.map((item: any, idx: number) => (
                  <tr key={idx} className="group">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#F5F5F7] rounded-lg overflow-hidden border border-[#ECECEC] p-0.5 shrink-0 print:hidden">
                          <img src={item.image} className="w-full h-full object-cover rounded-md" alt={item.name} />
                        </div>
                        <div>
                          <h5 className="font-bold text-xs text-[#0A1F44] line-clamp-1">
                            {item.nameEn || item.name}
                          </h5>
                          {item.selectedWeight && (
                            <p className="text-[9px] text-[#6B7280] font-bold mt-0.5">
                              {item.selectedWeight >= 1000 ? `${item.selectedWeight / 1000}KG` : `${item.selectedWeight}g`}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-center text-xs font-black text-[#6B7280]">{item.quantity}</td>
                    <td className="py-3 text-right text-xs font-bold text-[#6B7280]">৳{item.price}</td>
                    <td className="py-3 text-right text-xs font-black text-[#0A1F44]">৳{item.price * item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom Section */}
          <div className="grid grid-cols-2 gap-8 items-end">
            <div className="bg-[#F5F5F7] p-4 rounded-[1.5rem] border border-[#ECECEC] print:border-slate-200">
              <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] mb-2">Notice</p>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="w-1 h-1 bg-primary rounded-full mt-1 shrink-0" />
                  <p className="text-[9px] text-[#6B7280] font-bold leading-tight">
                    এটি একটি কম্পিউটার জেনারেটেড মেমো। আমাদের সিস্টেম অটোমেটিকলি পেমেন্ট যাচাই করার পর চূড়ান্ত মেমো ইস্যু করে।
                  </p>
                </div>
                <div className="flex gap-2">
                  <div className="w-1 h-1 bg-primary rounded-full mt-1 shrink-0" />
                  <p className="text-[9px] text-[#6B7280] font-bold leading-tight">
                    যেকোনো পেমেন্ট সংক্রান্ত সমস্যার জন্য আমাদের কাস্টমার সার্ভিসের সাথে যোগাযোগ করুন।
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-[#0A1F44] p-5 rounded-[2rem] shadow-xl space-y-2.5 print:bg-white print:text-[#111111] print:shadow-none print:border print:border-[#ECECEC]">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-white/40 print:text-[#6B7280]">
                <span>Subtotal</span>
                <span className="text-white print:text-[#111111] text-xs">৳{order.total + (order.discount || 0) - order.deliveryFee}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-white/40 print:text-[#6B7280]">
                <span>Delivery</span>
                <span className="text-white print:text-[#111111] text-xs">৳{order.deliveryFee}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between items-center text-[10px] font-black text-red-400 uppercase tracking-widest">
                  <span>Discount</span>
                  <span className="text-xs">-৳{order.discount}</span>
                </div>
              )}
              <div className="flex flex-col items-end pt-3 mt-1 border-t border-white/5 print:border-[#ECECEC]">
                <span className="font-display font-black text-[8px] uppercase tracking-[0.3em] text-white/30 mb-1 print:text-slate-300">TOTAL PAYABLE</span>
                <span className="font-display font-black text-2xl text-primary drop-shadow-lg print:text-[#111111] print:drop-shadow-none">৳{order.total}</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-50 text-center print:mt-6">
            <p className="text-[10px] font-black text-[#0A1F44] uppercase tracking-widest mb-1 shadow-sm inline-block px-3 py-1 bg-[#F5F5F7] rounded-full border border-[#ECECEC]">Thank you for shopping!</p>
            <p className="text-[8px] text-slate-300 font-black uppercase tracking-[0.2em]">www.shoppers.com.bd</p>
          </div>

          {/* Footer Actions */}
          <div className="mt-8 flex gap-3 print:hidden">
            <button 
              onClick={handlePrint}
              className="flex-1 py-4 bg-primary text-[#F5F5F7] rounded-2xl flex items-center justify-center gap-2.5 font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-all active:scale-95 group"
            >
              <Printer size={16} />
              Print / Save Invoice
            </button>
            <button 
              onClick={onClose}
              className="px-6 py-4 bg-[#F5F5F7] text-[#6B7280] rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-200"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
