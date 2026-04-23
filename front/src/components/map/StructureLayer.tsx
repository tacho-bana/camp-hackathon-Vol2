export function StructureLayer({ deployedCount }: { deployedCount: number }) {
  return (
    <div className="layer layer-structure">
      <span>施設レイヤー</span>
      <span>配置済み施設: {deployedCount}</span>
    </div>
  );
}
