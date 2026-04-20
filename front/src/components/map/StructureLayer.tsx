export function StructureLayer({ deployedCount }: { deployedCount: number }) {
  return (
    <div className="layer layer-structure">
      <span>StructureLayer</span>
      <span>deployed structures: {deployedCount}</span>
    </div>
  );
}
