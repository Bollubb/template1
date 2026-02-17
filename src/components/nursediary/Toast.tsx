
import React, { createContext, useContext, useState } from "react";

type Toast = { id: number; message: string };

const ToastContext = createContext({
  show: (message: string) => {}
});

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = (message: string) => {
    const id = Date.now();
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 3000);
  };

  return (
    <ToastContext.Provider value={{ show }}>
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
            background: "#111",
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
