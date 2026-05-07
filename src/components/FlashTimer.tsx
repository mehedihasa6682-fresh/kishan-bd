import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

interface FlashTimerProps {
  endTime: Timestamp;
}

export default function FlashTimer({ endTime }: FlashTimerProps) {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 });
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const target = endTime.toDate().getTime();
      const now = new Date().getTime();
      const distance = target - now;

      if (distance < 0) {
        setIsExpired(true);
        clearInterval(timer);
        return;
      }

      const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft({ h, m, s });
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime]);

  if (isExpired) return null;

  return (
    <div className="flex items-center gap-1 bg-red-500/20 backdrop-blur-md rounded-lg px-2 py-1 border border-red-500/30">
      <Clock size={10} className="text-red-400 animate-pulse" />
      <div className="flex items-center gap-0.5 font-mono text-[9px] font-black text-red-400">
        <span>{String(timeLeft.h).padStart(2, '0')}</span>
        <span className="animate-pulse">:</span>
        <span>{String(timeLeft.m).padStart(2, '0')}</span>
        <span className="animate-pulse">:</span>
        <span>{String(timeLeft.s).padStart(2, '0')}</span>
      </div>
    </div>
  );
}
