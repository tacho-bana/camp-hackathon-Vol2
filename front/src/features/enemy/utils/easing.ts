export function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export function pingPong(t: number): number {
  const value = t % 2;
  return value <= 1 ? value : 2 - value;
}
