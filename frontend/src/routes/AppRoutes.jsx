import { lazy, Suspense } from "react";
import { Routes, Route, Link } from "react-router-dom";
const Dashboard = lazy(() => import("../pages/Dashboard"));
const Prospects = lazy(() => import("../pages/Prospects"));
const Detail = lazy(() => import("../pages/Detail"));
const Funnel = lazy(() => import("../pages/Funnel"));
const Attention = lazy(() => import("../pages/Attention"));
const Campaigns = lazy(() => import("../pages/Campaigns"));
const AdmissionsQueue = lazy(() => import("../pages/AdmissionsQueue"));
const Interviews = lazy(() => import("../pages/Interviews"));
const Calendar = lazy(() => import("../pages/Calendar"));
const Finance = lazy(() => import("../pages/Finance"));
const Images = lazy(() => import("../pages/Images"));
const Publications = lazy(() => import("../pages/Publications"));
export default function AppRoutes(props) {
  return (
    <Suspense
      fallback={
        <div className="state" role="status">
          Cargando pantalla…
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<Dashboard {...props} />} />
        <Route path="/prospectos" element={<Prospects {...props} />} />
        <Route path="/prospectos/:id" element={<Detail {...props} />} />
        <Route path="/embudo" element={<Funnel {...props} />} />
        <Route path="/atencion" element={<Attention {...props} />} />
        <Route path="/campanias" element={<Campaigns {...props} />} />
        <Route path="/entrevistas" element={<Interviews {...props} />} />
        <Route
          path="/espera"
          element={<AdmissionsQueue {...props} mode="espera" />}
        />
        <Route
          path="/excluidos"
          element={<AdmissionsQueue {...props} mode="excluido" />}
        />
        <Route path="/calendario" element={<Calendar {...props} />} />
        <Route path="/finanzas" element={<Finance {...props} />} />
        <Route path="/imagenes" element={<Images {...props} />} />
        <Route path="/publicaciones" element={<Publications {...props} />} />
        <Route
          path="*"
          element={
            <div className="state">
              <h1>Página no encontrada</h1>
              <Link to="/">Ir al Dashboard</Link>
            </div>
          }
        />
      </Routes>
    </Suspense>
  );
}
