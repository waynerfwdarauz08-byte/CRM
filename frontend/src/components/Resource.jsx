import { useEffect, useState } from "react";
import { api } from "../services/api";
export function useResource(path, version = 0) {
  const [state, set] = useState({ loading: true, data: null, error: "" });
  const [attempt, retry] = useState(0);
  useEffect(() => {
    let active = true;
    set((x) => ({ ...x, loading: true, error: "" }));
    api(path)
      .then((x) => {
        if (active)
          set({ loading: false, data: x.data, meta: x.meta, error: "" });
      })
      .catch((e) => {
        if (active) set({ loading: false, data: null, error: e.message });
      });
    return () => {
      active = false;
    };
  }, [path, version, attempt]);
  return { ...state, retry: () => retry((x) => x + 1) };
}
export function Resource({ resource, children }) {
  if (resource.loading)
    return (
      <div className="state" role="status">
        <span className="spinner" /> Cargando información…
      </div>
    );
  if (resource.error)
    return (
      <div className="state error" role="alert">
        <h3>No pudimos cargar la información</h3>
        <p>{resource.error}</p>
        <button onClick={resource.retry}>Reintentar</button>
      </div>
    );
  return children;
}
export function Notice({ children }) {
  return children ? (
    <div role="status" className="notice">
      {children}
    </div>
  ) : null;
}
