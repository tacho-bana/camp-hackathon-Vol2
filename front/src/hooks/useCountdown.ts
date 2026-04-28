import { useEffect, useState } from "react";

/**
 * @param initialSeconds 初期値
 * @param active         true の間だけカウントダウン（false で一時停止。リセットはしない）
 * @param resetKey       値が変わるたびに initialSeconds にリセット
 */
export function useCountdown(
  initialSeconds: number,
  active: boolean,
  resetKey = 0,
): number {
  const [remaining, setRemaining] = useState(initialSeconds);

  // resetKey が変わったときだけリセット
  useEffect(() => {
    setRemaining(initialSeconds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  // active の間だけカウントダウン（停止してもリセットしない）
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => {
      setRemaining((prev) => (prev <= 0 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [active]);

  return remaining;
}
