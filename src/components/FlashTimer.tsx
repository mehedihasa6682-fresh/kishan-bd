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
    <div className="flex items-center gap-[2px] bg-black/90 backdrop-blur-md rounded-md px-1.5 py-1 border border-white/10 shrink-0 whitespace-nowrap min-w-fit">
      <Clock size={8} className="text-primary animate-pulse mr-0.5" />
      <div className="flex items-center gap-[1px] font-mono text-[8px] font-black text-white whitespace-nowrap">
        <span className="w-[12px] text-center">{String(timeLeft.h).padStart(2, '0')}</span>
        <span className="text-primary animate-pulse">:</span>
        <span className="w-[12px] text-center">{String(timeLeft.m).padStart(2, '0')}</span>
        <span className="text-primary animate-pulse">:</span>
        <span className="w-[12px] text-center">{String(timeLeft.s).padStart(2, '0')}</span>
      </div>
    </div>
  );
}
