type ActionItem = {
  label: string;
  onClick?: () => void;
  emphasis?: "primary" | "secondary";
};

export function BottomActionPanel({ actions }: { actions: ActionItem[] }) {
  return (
    <div className="bottom-action-panel">
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          className={
            action.emphasis === "primary"
              ? "action-pill primary"
              : "action-pill"
          }
          onClick={action.onClick}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
