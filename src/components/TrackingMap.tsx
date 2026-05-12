import { motion } from 'motion/react';
import { MapPin, Truck, Navigation2, CheckCircle2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { calculateDistance, formatDistance } from '../lib/geoUtils';

interface TrackingMapProps {
  status: string;
  riderLocation?: { lat: number, lng: number };
  destination?: { lat: number, lng: number };
}

export default function TrackingMap({ status, riderLocation, destination }: TrackingMapProps) {
  const [progress, setProgress] = useState(0);
  const [distance, setDistance] = useState<string>('Calculating...');

  useEffect(() => {
    const statusMap: Record<string, number> = {
      pending: 10,
      verified: 25,
      confirmed: 40,
      shipped: 70,
      delivered: 100
    };
    setProgress(statusMap[status] || 0);

    if (riderLocation && destination) {
      const dist = calculateDistance(
        riderLocation.lat, 
        riderLocation.lng, 
        destination.lat, 
        destination.lng
      );
      setDistance(formatDistance(dist));
    }
  }, [status, riderLocation, destination]);

  return (
    <div className="relative h-48 bg-slate-100 rounded-[2rem] overflow-hidden border border-slate-200">
      {/* Grid Pattern Background */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
      
      {/* Route Line */}
      <div className="absolute top-1/2 left-10 right-10 h-0.5 bg-slate-300 -translate-y-1/2">
        <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-primary"
        />
      </div>

      {/* Markers */}
      <div className="absolute inset-0 flex items-center justify-between px-10">
        <div className="relative">
            <div className={`w-4 h-4 rounded-full border-2 border-white shadow-md ${progress >= 40 ? 'bg-primary' : 'bg-slate-300'}`} />
            <span className="absolute top-6 left-1/2 -translate-x-1/2 text-[8px] font-bold text-[#6B7280] whitespace-nowrap">Warehouse</span>
        </div>

        <motion.div 
            animate={{ 
                x: status === 'shipped' ? [0, 5, 0] : 0,
                y: status === 'shipped' ? [-2, 2, -2] : 0
            }}
            className={`relative z-10 ${status === 'shipped' ? 'text-primary' : 'text-slate-300'}`}
        >
            <Truck size={32} className="fill-white" />
            {status === 'shipped' && (
                <motion.div 
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                    className="absolute inset-0 bg-primary/20 rounded-full blur-md" 
                />
            )}
        </motion.div>

        <div className="relative">
            <div className={`w-4 h-4 rounded-full border-2 border-white shadow-md ${progress >= 100 ? 'bg-green-500' : 'bg-slate-300'}`} />
            <span className="absolute top-6 left-1/2 -translate-x-1/2 text-[8px] font-bold text-[#6B7280] whitespace-nowrap">Home</span>
            {progress >= 100 && <CheckCircle2 size={12} className="absolute -top-4 left-1/2 -translate-x-1/2 text-green-500" />}
        </div>
      </div>

      {/* Status Tags */}
      <div className="absolute bottom-4 left-6 right-6 flex justify-between">
          <div className="bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-[#ECECEC] flex items-center gap-2 shadow-sm">
              <Navigation2 size={10} className="text-primary rotate-45" />
              <span className="text-[9px] font-black uppercase text-[#6B7280] tracking-wider">
                  {status === 'shipped' ? `Live: ${distance} away` : `Distance: ${distance}`}
              </span>
          </div>
          <div className="bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-[#ECECEC] flex items-center gap-2 shadow-sm">
              <span className="text-[9px] font-black uppercase text-[#6B7280] tracking-wider">ETA: 12 min</span>
          </div>
      </div>
    </div>
  );
}
