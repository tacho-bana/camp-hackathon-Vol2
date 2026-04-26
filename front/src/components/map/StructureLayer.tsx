import type { Structure } from "../../types/game";

export function StructureLayer({ structures }: { structures: Structure[] }) {
  return (
    <div className="layer layer-structure">
      <span>施設レイヤー: {structures.length}拠点</span>
      {structures.map((s) => (
        <span key={s.id}>
          {s.kind} HP:{s.hp}/{s.maxHp}
        </span>
      ))}
    </div>
  );
}
