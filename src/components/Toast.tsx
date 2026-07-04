import { useEffect } from "react";

interface ToastProps {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}

export function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 right-4 left-4 md:left-auto md:right-6 md:w-96 z-50 toast-enter">
      <div
        className={`
          glass px-5 py-4 rounded-2xl flex items-center gap-3 shadow-2xl
          ${type === "success" ? "border-green-500/40" : "border-accent-coral/40"}
        `}
      >
        <span className="text-xl flex-shrink-0">
          {type === "success" ? "\u2714" : "\u2716"}
        </span>
        <p className="text-sm font-medium text-text-primary flex-1">{message}</p>
        <button
          type="button"
          onClick={onClose}
          className="text-text-muted hover:text-text-primary transition-colors text-lg cursor-pointer"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
