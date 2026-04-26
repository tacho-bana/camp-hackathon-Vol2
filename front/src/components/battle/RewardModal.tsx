export function RewardModal({
  open,
  title,
  description,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  onClose?: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="reward-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reward-title"
    >
      <div className="reward-card">
        <p className="eyebrow">報酬</p>
        <h2 id="reward-title">{title}</h2>
        <p>{description}</p>
        <button type="button" className="ghost-button" onClick={onClose}>
          閉じる
        </button>
      </div>
    </div>
  );
}
