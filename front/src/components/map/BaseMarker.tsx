export function BaseMarker({
  label,
  active,
}: {
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={active ? "marker marker-base active" : "marker marker-base"}
    >
      <strong>{label}</strong>
      <span>拠点マーカー</span>
    </div>
  );
}
