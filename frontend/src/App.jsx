import { BrowserRouter, NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  ChartNoAxesCombined,
  Clock,
  GraduationCap,
  Menu,
  X,
  Megaphone,
  CalendarDays,
  ClipboardList,
  Hourglass,
  UserRoundX,
  Wallet,
  Image,
  Send,
} from "lucide-react";
import { useState } from "react";
import AppRoutes from "./routes/AppRoutes";
import { useResource, Resource } from "./components/Resource";
export default function App() {
  const sedes = useResource("/sedes");
  const stages = useResource("/etapas");
  const [open, o] = useState(false);
  return (
    <BrowserRouter>
      <div className="app-shell">
        <aside className={"sidebar " + (open ? "open" : "")}>
          <a className="brand" href="/">
            <span>
              <GraduationCap size={25} />
            </span>
            <div>
              Admisiones<strong>CRM</strong>
            </div>
          </a>
          <div className="nav-label">ESPACIO DE TRABAJO</div>
          <nav>
            {[
              ["/", "Dashboard", LayoutDashboard],
              ["/prospectos", "Prospectos", Users],
              ["/embudo", "Embudo", ChartNoAxesCombined],
              ["/atencion", "Atención", Clock],
              ["/entrevistas", "Entrevistas", ClipboardList],
              ["/espera", "Lista de espera", Hourglass],
              ["/excluidos", "Excluidos", UserRoundX],
              ["/calendario", "Calendario", CalendarDays],
              ["/campanias", "Campañas", Megaphone],
              ["/finanzas", "Presupuestos y costos", Wallet],
              ["/imagenes", "Imágenes IA", Image],
              ["/publicaciones", "Publicaciones", Send],
            ].map(([url, title, Icon]) => (
              <NavLink
                end={url === "/"}
                key={url}
                to={url}
                onClick={() => o(false)}
              >
                <Icon size={20} />
                {title}
              </NavLink>
            ))}
          </nav>
          <div className="sidebar-note">
            <GraduationCap size={22} />
            <strong>Cada persona tiene un futuro.</strong>
            <p>Acompañemos su próximo paso.</p>
          </div>
          <div className="profile">
            <span className="avatar">AD</span>
            <div>
              <strong>Equipo de admisiones</strong>
              <small>Demostración académica</small>
            </div>
          </div>
        </aside>
        <div className="workspace">
          <header className="topbar">
            <button
              className="mobile-menu icon-button"
              aria-label="Abrir o cerrar navegación"
              onClick={() => o(!open)}
            >
              {open ? <X /> : <Menu />}
            </button>
            <span>Gestión de admisiones</span>
            <span className="demo-badge">
              Entorno de demostración · Datos ficticios
            </span>
          </header>
          <main>
            <Resource resource={sedes}>
              <Resource resource={stages}>
                <AppRoutes
                  sedes={sedes.data || []}
                  stages={stages.data || []}
                />
              </Resource>
            </Resource>
          </main>
          <footer>
            Admisiones CRM · Proyecto académico independiente · Fechas de Costa
            Rica
          </footer>
        </div>
      </div>
    </BrowserRouter>
  );
}
