import { useEffect, useState } from "react";
import { EnemySprite } from "../components/map/EnemySprite";
import { ElectricTowerSprite } from "../components/map/tower/ElectricTowerSprite";
import { TalettSprite } from "../components/map/tower/TalettSprite";
import { FirewallSprite } from "../components/map/tower/FirewallSprite";
import type { Enemy } from "../types/game";

export function BattlePage() {
  const [wobble, setWobble] = useState(0);
  const [aimingAngleRad, setAimingAngleRad] = useState(0);
  const [firing, setFiring] = useState(false);

  useEffect(() => {
    let t = 0;
    const interval = setInterval(() => {
      t += 0.1;
      setWobble(Math.sin(t * 10) * 5); // Wobble animation
      setAimingAngleRad(t);
      if (Math.random() < 0.1) {
        setFiring(true);
        setTimeout(() => setFiring(false), 200);
      }
    }, 50);

    return () => clearInterval(interval);
  }, []);

  const dummyEnemies: Enemy[] = [
    { id: "D", state: "moving", hp: 10, maxHp: 10, lat: 0, lng: 0, speed: 1 }, // Triangle
    { id: "A", state: "moving", hp: 10, maxHp: 10, lat: 0, lng: 0, speed: 1 }, // Circle
    { id: "B", state: "moving", hp: 10, maxHp: 10, lat: 0, lng: 0, speed: 1 }, // House
    { id: "C", state: "moving", hp: 10, maxHp: 10, lat: 0, lng: 0, speed: 1 }, // Worm
  ];

  const previewStyle = {
    display: "flex",
    gap: "30px",
    flexWrap: "wrap",
    padding: "20px",
    background: "#222",
    borderRadius: "8px",
    marginBottom: "20px",
    minHeight: "120px",
    alignItems: "center",
  } as const;

  const itemStyle = {
    position: "relative",
    width: 64,
    height: 72,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    border: "1px dashed #555",
  } as const;

  return (
    <section className="content-panel stack-layout" style={{ overflowY: 'auto' }}>
      <div className="panel-header">
        <div>
          <p className="eyebrow">Debug mode</p>
          <h2>Sprites Preview</h2>
          <p className="muted">
            Preview of all towers and enemies, firing and wobbling.
          </p>
        </div>
      </div>

      <h3>Towers</h3>
      <div style={previewStyle}>
        <div style={itemStyle}>
          <ElectricTowerSprite aimingAngleRad={aimingAngleRad} firing={firing} wobble={wobble} />
        </div>
        <div style={itemStyle}>
          <TalettSprite aimingAngleRad={aimingAngleRad} firing={firing} wobble={wobble} />
        </div>
        <div style={itemStyle}>
          <FirewallSprite aimingAngleRad={aimingAngleRad} firing={firing} wobble={wobble} />
        </div>
      </div>

      <h3>Enemies (Triangle, Circle, House, Worm)</h3>
      <div style={previewStyle}>
        {dummyEnemies.map(enemy => (
          <div key={enemy.id} style={itemStyle}>
            <EnemySprite enemy={enemy} />
          </div>
        ))}
      </div>
    </section>
  );
}
