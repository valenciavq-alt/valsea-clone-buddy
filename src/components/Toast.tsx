import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CheckCircle, X } from "lucide-react";

interface Toast {
  id: number;
  message: string;
  type: "error" | "warning" | "info" | "success";
}

interface ToastContextType {
  showToast: (message: string, type?: Toast["type"]) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: Toast["type"] = "error") => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg backdrop-blur-xl"
              style={{
                background: t.type === "error" ? "rgba(239,68,68,0.12)" : t.type === "warning" ? "rgba(245,158,11,0.12)" : t.type === "success" ? "rgba(34,197,94,0.12)" : "rgba(6,182,212,0.12)",
                borderColor: t.type === "error" ? "rgba(239,68,68,0.3)" : t.type === "warning" ? "rgba(245,158,11,0.3)" : t.type === "success" ? "rgba(34,197,94,0.3)" : "rgba(6,182,212,0.3)",
                color: "var(--foreground)",
              }}
            >
              <AlertTriangle
                className="w-4 h-4 mt-0.5 flex-shrink-0"
                style={{ color: t.type === "error" ? "var(--danger)" : t.type === "warning" ? "var(--warning)" : "var(--cyan)" }}
              />
              <span className="text-xs leading-relaxed flex-1">{t.message}</span>
              <button onClick={() => dismiss(t.id)} className="flex-shrink-0 mt-0.5 opacity-50 hover:opacity-100">
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
