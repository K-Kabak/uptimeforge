"use client";
import { createContext, useContext, useState } from "react";
const ToastContext = createContext<(message: string) => void>(() => {});
export const useToast = () => useContext(ToastContext);
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState("");
  return (
    <ToastContext.Provider value={setMessage}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 max-w-sm"
      >
        {message && (
          <div className="flex items-center gap-4 rounded-xl border bg-[var(--background)] p-4 shadow-xl">
            <span>{message}</span>
            <button
              onClick={() => setMessage("")}
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
