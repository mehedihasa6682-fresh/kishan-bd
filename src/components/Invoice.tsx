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
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#050E21]/90 backdrop-blur-md print:p-0 print:bg-white"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden print:shadow-none print:rounded-none"
      >
        {/* Header */}
        <div className="bg-[#0A1F44] p-8 text-white flex justify-between items-center print:bg-white print:text-slate-900 print:border-b print:pb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shadow-lg border border-white/5 overflow-hidden">
                {appSettings.logo ? (
                    <img src={appSettings.logo} className="w-full h-full object-contain" alt="Logo" />
                ) : (
                    <ShoppingBag size={24} className="text-primary" />
                )}
            </div>
            <div>
              <h2 className="font-display font-black text-xl leading-none mb-1 tracking-tight">{appSettings.appName || 'SupermarketBD'}</h2>
              <p className="text-[8px] font-black text-primary uppercase tracking-[0.3em] print:text-slate-400">Order Manifest</p>
            </div>
          </div>
          <div className="text-right flex flex-col items-end gap-3">
            <div className="no-print mb-2">
              <button 
                onClick={handlePrint}
                className="bg-white/10 hover:bg-primary hover:text-[#050E21] p-2.5 rounded-xl transition-all shadow-lg"
                title="Print Invoice"
              >
                <Printer size={18} />
              </button>
            </div>
            <div>
              <h3 className="font-bold text-sm mb-1 uppercase tracking-[0.2em] text-primary">#{order.id.slice(-8)}</h3>
              <p className="text-xs text-white/50 font-medium print:text-slate-400">{format(order.createdAt?.toDate ? order.createdAt.toDate() : new Date(), 'dd MMM yyyy, hh:mm a')}</p>
            </div>
          </div>
        </div>

        <div className="p-8 bg-white">
          {/* Info Blocks */}
          <div className="grid grid-cols-2 gap-8 mb-10">
            <div>
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-3">Customer Details</p>
              <h4 className="font-bold text-lg text-[#0A1F44] leading-tight mb-1">{order.customerName}</h4>
              <p className="text-sm text-slate-500 font-bold">Phone: {order.phone}</p>
              <p className="text-sm text-slate-400 font-medium mt-2 leading-relaxed">{typeof order.address === 'string' ? order.address : (order.address?.address || 'No Address')}</p>
            </div>
            <div className="text-right">
              <div className="flex flex-col items-end gap-6">
                <div>
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2">Order Status</p>
                    <div className="bg-primary/10 text-primary px-4 py-1.5 rounded-full flex items-center gap-2 border border-primary/20 shadow-sm">
                        <CheckCircle2 size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest leading-none">{order.status}</span>
                    </div>
                </div>
                <div>
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2">Payment Info</p>
                    <div className="text-right space-y-1">
                        <div className="bg-[#0A1F44]/5 text-[#0A1F44] px-3 py-1.5 rounded-lg inline-flex items-center gap-2 mb-1 border border-[#0A1F44]/10 shadow-sm">
                            <span className="text-[9px] font-black uppercase tracking-widest">{order.paymentMethod === 'cod' ? 'Cash on Delivery' : order.paymentMethod.toUpperCase()}</span>
                        </div>
                        <p className="text-sm font-black text-[#0A1F44] uppercase tracking-tight">৳{order.total}</p>
                        {order.paymentNumber && (
                            <p className="text-[10px] text-slate-500 font-bold">Via: {order.paymentNumber}</p>
                        )}
                        {order.transactionId && (
                            <p className="text-[9px] text-slate-400 font-mono italic">TrxID: {order.transactionId}</p>
                        )}
                        <p className="text-[10px] font-black text-primary uppercase tracking-tighter mt-1">{order.paymentStatus === 'verified' ? 'Payment Verified' : 'Awaiting verification'}</p>
                    </div>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="mb-10 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b-2 border-slate-50">
                  <th className="pb-3 text-[9px] font-black text-slate-300 uppercase tracking-widest">Item Description</th>
                  <th className="pb-3 text-[9px] font-black text-slate-300 uppercase tracking-widest text-center">Qty</th>
                  <th className="pb-3 text-[9px] font-black text-slate-300 uppercase tracking-widest text-right">Price</th>
                  <th className="pb-3 text-[9px] font-black text-slate-300 uppercase tracking-widest text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {order.items?.map((item: any, idx: number) => (
                  <tr key={idx} className="group">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-50 rounded-xl overflow-hidden border border-slate-100 p-0.5 print:hidden">
                          <img src={item.image} className="w-full h-full object-cover rounded-lg" alt={item.name} />
                        </div>
                        <div>
                          <h5 className="font-bold text-xs text-[#0A1F44]">
                            {item.nameEn || item.name}
                            {item.selectedWeight && (
                              <span className="text-slate-400 ml-1.5 font-medium">
                                ({item.selectedWeight >= 1000 ? `${item.selectedWeight / 1000}KG` : `${item.selectedWeight}g`})
                              </span>
                            )}
                          </h5>
                          <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mt-0.5">{item.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 text-center text-xs font-black text-slate-600">{item.quantity}</td>
                    <td className="py-4 text-right text-xs font-bold text-slate-400">৳{item.price}</td>
                    <td className="py-4 text-right text-xs font-black text-[#0A1F44]">৳{item.price * item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="bg-[#0A1F44]/5 p-6 rounded-3xl space-y-3 border border-[#0A1F44]/5">
            <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-widest text-slate-400">
              <span>Subtotal</span>
              <span className="text-[#0A1F44]">৳{order.total + (order.discount || 0) - order.deliveryFee}</span>
            </div>
            <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-widest text-slate-400">
              <span>Delivery Fee</span>
              <span className="text-[#0A1F44]">৳{order.deliveryFee}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between items-center text-[11px] font-black text-red-500 uppercase tracking-widest">
                <span>Discount Applied</span>
                <span>-৳{order.discount}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-5 mt-2 border-t border-[#0A1F44]/10">
              <span className="font-display font-black text-[10px] uppercase tracking-[0.3em] text-[#050E21]">Total Amount Payable</span>
              <span className="font-display font-black text-2xl text-primary drop-shadow-sm">৳{order.total}</span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="mt-12 flex gap-4 print:hidden">
            <button 
              onClick={handlePrint}
              className="flex-1 py-5 bg-[#0A1F44] text-white rounded-2xl flex items-center justify-center gap-3 font-black text-[11px] uppercase tracking-widest shadow-2xl hover:bg-[#050E21] hover:scale-[1.02] transition-all active:scale-95"
            >
              <Printer size={18} /> Print / Save PDF
            </button>
            <button 
              onClick={onClose}
              className="px-8 py-5 bg-slate-50 text-slate-500 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-100"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
