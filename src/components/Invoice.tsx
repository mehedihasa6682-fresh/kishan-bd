import { motion } from 'motion/react';
import { Download, Printer, CheckCircle2, ShoppingBag } from 'lucide-react';
import { format } from 'date-fns';

interface InvoiceProps {
  order: any;
  onClose: () => void;
}

export default function Invoice({ order, onClose }: InvoiceProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm print:p-0 print:bg-white"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden print:shadow-none print:rounded-none"
      >
        {/* Header */}
        <div className="bg-slate-900 p-8 text-white flex justify-between items-center print:bg-white print:text-slate-900 print:border-b print:pb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg print:border print:border-slate-100">
              <ShoppingBag size={24} className="text-white print:text-primary" />
            </div>
            <div>
              <h2 className="font-display font-bold text-xl leading-none mb-1">KishanBD</h2>
              <p className="text-[8px] font-black text-primary uppercase tracking-[0.2em] print:text-slate-400">Order Invoice</p>
            </div>
          </div>
          <div className="text-right flex flex-col items-end gap-3">
            <div className="no-print mb-2">
              <button 
                onClick={handlePrint}
                className="bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-colors"
                title="Print Invoice"
              >
                <Printer size={18} />
              </button>
            </div>
            <div>
              <h3 className="font-bold text-sm mb-1 uppercase tracking-widest">#{order.id.slice(-8)}</h3>
              <p className="text-xs text-white/60 font-medium print:text-slate-400">{format(order.createdAt?.toDate ? order.createdAt.toDate() : new Date(), 'dd MMM yyyy, hh:mm a')}</p>
            </div>
          </div>
        </div>

        <div className="p-8">
          {/* Info Blocks */}
          <div className="grid grid-cols-2 gap-8 mb-10">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Customer Details</p>
              <h4 className="font-bold text-lg text-slate-800 leading-tight mb-1">{order.customerName}</h4>
              <p className="text-sm text-slate-500 font-medium">Phone: {order.phone}</p>
              <p className="text-sm text-slate-500 font-medium mt-2">{typeof order.address === 'string' ? order.address : (order.address?.address || 'No Address')}</p>
            </div>
            <div className="text-right">
              <div className="flex flex-col items-end gap-6">
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Order Status</p>
                    <div className="bg-slate-100 text-slate-600 px-4 py-1.5 rounded-full flex items-center gap-2">
                        <CheckCircle2 size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{order.status}</span>
                    </div>
                </div>
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Payment Info</p>
                    <div className="text-right space-y-1">
                        <div className="bg-primary/10 text-primary px-2 py-1 rounded-lg inline-flex items-center gap-2 mb-1">
                            <span className="text-[9px] font-black uppercase tracking-widest">{order.paymentMethod === 'cod' ? 'Cash on Delivery' : order.paymentMethod.toUpperCase()}</span>
                        </div>
                        <p className="text-xs font-bold text-slate-800 uppercase">৳{order.total}</p>
                        {order.paymentNumber && (
                            <p className="text-[9px] text-slate-500 font-bold">Via: {order.paymentNumber}</p>
                        )}
                        {order.transactionId && (
                            <p className="text-[8px] text-slate-400 font-mono italic">TrxID: {order.transactionId}</p>
                        )}
                        <p className="text-[8px] font-black text-primary uppercase tracking-tighter">{order.paymentStatus === 'verified' ? 'Payment Verified' : 'Awaiting verification'}</p>
                    </div>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="space-y-4 mb-10 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-2 text-[8px] font-black text-slate-400 uppercase tracking-widest">Item Description</th>
                  <th className="pb-2 text-[8px] font-black text-slate-400 uppercase tracking-widest text-center">Qty</th>
                  <th className="pb-2 text-[8px] font-black text-slate-400 uppercase tracking-widest text-right">Price</th>
                  <th className="pb-2 text-[8px] font-black text-slate-400 uppercase tracking-widest text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {order.items?.map((item: any, idx: number) => (
                  <tr key={idx} className="group">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-slate-50 rounded-lg overflow-hidden border border-slate-100 p-0.5 print:hidden">
                          <img src={item.image} className="w-full h-full object-cover rounded-md" alt={item.name} />
                        </div>
                        <div>
                          <h5 className="font-bold text-xs text-slate-800">{item.name}</h5>
                          <p className="text-[8px] font-bold text-slate-400 italic">{item.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-center text-[10px] font-bold text-slate-600">{item.quantity}</td>
                    <td className="py-3 text-right text-[10px] font-medium text-slate-500">৳{item.price}</td>
                    <td className="py-3 text-right text-[10px] font-black text-slate-900">৳{item.price * item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="border-t pt-6 space-y-2">
            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <span>Subtotal</span>
              <span className="text-slate-800">৳{order.total + (order.discount || 0) - order.deliveryFee}</span>
            </div>
            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <span>Delivery Fee</span>
              <span className="text-slate-800">৳{order.deliveryFee}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between items-center text-[10px] font-black text-secondary uppercase tracking-widest">
                <span>Discount Applied</span>
                <span>-৳{order.discount}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-4 border-t-2 border-slate-100">
              <span className="font-display font-black text-xs uppercase tracking-[0.2em] text-slate-900">Total Amount Payable</span>
              <span className="font-display font-bold text-xl text-primary">৳{order.total}</span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="mt-12 flex gap-4 print:hidden">
            <button 
              onClick={handlePrint}
              className="flex-1 py-4 bg-slate-900 text-white rounded-2xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all active:scale-95"
            >
              <Printer size={16} /> Print / Save PDF
            </button>
            <button 
              onClick={onClose}
              className="px-8 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
