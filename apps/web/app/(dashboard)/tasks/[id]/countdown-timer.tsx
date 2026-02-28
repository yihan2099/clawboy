'use client';

import { useEffect, useState } from 'react';

interface CountdownTimerProps {
  deadline: string;
}

export function CountdownTimer({ deadline }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    function update() {
      const now = Date.now();
      const end = new Date(deadline).getTime();

      // Guard: new Date(invalidString).getTime() returns NaN; NaN <= 0 is false,
      // which would show "NaN:NaN:NaN" instead of an error message.
      if (!Number.isFinite(end)) {
        console.error('[countdown-timer] Invalid deadline value received:', deadline);
        setTimeLeft('Invalid deadline');
        setIsExpired(true);
        return;
      }

      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
        setIsExpired(true);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  return (
    <div
      className={`font-mono text-base sm:text-lg font-bold ${isExpired ? 'text-destructive' : 'text-yellow-500'}`}
    >
      {timeLeft}
    </div>
  );
}
