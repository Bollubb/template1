
import React, { createContext, useContext, useState } from "react";

type ToastType = "info" | "success" | "error";

type Toast = { id: number; message: string; type: ToastType };

type ToastContextType = {
  show: (message: string) => void;
  push: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextType>({
  show: () => {},
  push: () => {}
});

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = (message: string, type: ToastType = "info") => {
    const id = Date.now();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 3000);
  };

  const show = (message: string) => push(message, "info");

  const getColor = (type: ToastType) => {
    if (type === "success") return "#16a34a";
    if (type === "error") return "#dc2626";
    return "#111";
  };

  return (
    <ToastContext.Provider value={{ show, push }}>
      {children}
      <div style={{
        position: "fixed",
        bottom: 20,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999
      }}>
        {toasts.map((t) => (
          <div key={t.id} style={{
            background: getColor(t.type),
            color: "white",
            padding: "10px 16px",
            borderRadius: 10,
            marginTop: 8,
            fontWeight: 600
          }}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
