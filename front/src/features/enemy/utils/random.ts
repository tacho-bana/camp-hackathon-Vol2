export function seededNoise(seed: number, t: number): number {
  const value = Math.sin(seed * 12.9898 + t * 78.233) * 43758.5453;
  return value - Math.floor(value);
}
