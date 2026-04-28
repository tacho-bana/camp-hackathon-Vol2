import { useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

const slides = [
  {
    image: "/tutorial/explanation1.png",
    title: "ステージを選ぼう",
    description: "ゲームを始めるとステージ選択画面が表示されます。ステージ1を選んでスタートしましょう。",
  },
  {
    image: "/tutorial/explanation2.png",
    title: "防衛施設を設置しよう",
    description: "準備フェーズでは、現在地にタレット（攻撃）や壁（減速）を設置できます。BTCを使って拠点を守る配置を考えよう。",
  },
  {
    image: "/tutorial/explanation3.png",
    title: "敵を撃退しよう",
    description: "ゲームスタートで敵が侵攻してきます。施設が自動で攻撃するので、拠点のHPがなくなる前に全敵を倒せ！",
  },
];

export function TutorialModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState(0);
  const isFirst = current === 0;
  const isLast = current === slides.length - 1;
  const slide = slides[current];

  return (
    <div className="tutorial-overlay" onClick={onClose}>
      <div className="tutorial-card" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="tutorial-close-btn"
          aria-label="閉じる"
          onClick={onClose}
        >
          <X size={18} />
        </button>

        <div className="tutorial-image-wrap">
          <img src={slide.image} alt={slide.title} className="tutorial-image" />
        </div>

        <div className="tutorial-body">
          <div className="tutorial-dots">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`tutorial-dot${i === current ? " tutorial-dot--active" : ""}`}
                onClick={() => setCurrent(i)}
                aria-label={`スライド ${i + 1}`}
              />
            ))}
          </div>

          <h2 className="tutorial-title">{slide.title}</h2>
          <p className="tutorial-desc">{slide.description}</p>

          <div className="tutorial-actions">
            <button
              type="button"
              className="tutorial-nav-btn"
              onClick={() => setCurrent((c) => c - 1)}
              disabled={isFirst}
              aria-label="前へ"
            >
              <ChevronLeft size={20} />
            </button>

            {isLast ? (
              <button
                type="button"
                className="primary-button tutorial-done-btn"
                onClick={onClose}
              >
                はじめる
              </button>
            ) : (
              <button
                type="button"
                className="primary-button tutorial-next-btn"
                onClick={() => setCurrent((c) => c + 1)}
              >
                次へ
              </button>
            )}

            <button
              type="button"
              className="tutorial-nav-btn"
              onClick={() => setCurrent((c) => c + 1)}
              disabled={isLast}
              aria-label="次へ"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
