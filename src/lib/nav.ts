import {
  LayoutDashboard,
  Target,
  Users,
  FileText,
  CalendarClock,
  Wallet,
  Calculator,
  Megaphone,
  Calendar,
  ShieldCheck,
  Settings,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

/** Ítems del sidebar — orden y nombres según 00-MASTER-SPEC.md. */
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Prospectos / Ventas", href: "/leads", icon: Target },
  { label: "Clientes y Proyectos", href: "/clientes", icon: Users },
  { label: "Pedidos / Contratos / Facturas", href: "/pedidos", icon: FileText },
  { label: "Cobros y Entregas", href: "/cobros", icon: CalendarClock },
  { label: "Finanzas", href: "/finanzas", icon: Wallet },
  { label: "Cotizador", href: "/cotizador", icon: Calculator },
  { label: "Influencers", href: "/influencers", icon: Megaphone },
  { label: "Equipo / Tareas", href: "/equipo", icon: UsersRound },
  { label: "Calendario", href: "/calendario", icon: Calendar },
  { label: "Historial / Auditoría", href: "/historial", icon: ShieldCheck },
  { label: "Configuración", href: "/configuracion", icon: Settings },
];

/** Marcas multi-marca según master spec. */
export const BRANDS = [
  { id: "all", label: "Todas las marcas" },
  { id: "jm-designs", label: "JM Designs" },
  { id: "kitjoy", label: "KitJoy Studio" },
  { id: "jm-distribution", label: "JM Distribution" },
];
