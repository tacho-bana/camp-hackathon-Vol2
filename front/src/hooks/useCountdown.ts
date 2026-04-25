import { useEffect, useState } from "react";

export function useCountdown(initialSeconds: number, active: boolean): number {
  const [remaining, setRemaining] = useState(initialSeconds);

  useEffect(() => {
    if (!active) {
      setRemaining(initialSeconds);
      return;
    }

    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [active, initialSeconds]);

  return remaining;
}
