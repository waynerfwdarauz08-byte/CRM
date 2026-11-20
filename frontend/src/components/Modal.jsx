import { useEffect, useRef } from "react";
export default function Modal({ title, onClose, children }) {
  const ref = useRef();
  useEffect(() => {
    const node = ref.current;
    const old = document.activeElement;
    node.showModal();
    return () => {
      node.close();
      old?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="dialog-head">
        <h2>{title}</h2>
        <button className="icon-button" aria-label="Cerrar" onClick={onClose}>
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
