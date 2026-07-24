import { EMPRESA } from "@/lib/empresa";
import {
  LayoutDashboard,
  Users,
  FileText,
  CalendarClock,
  Wallet,
  Megaphone,
  Calendar,
  ShieldCheck,
  Settings,
  UsersRound,
  ListTodo,
  ServerCog,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Solo visible/accesible para el owner. */
  ownerOnly?: boolean;
};

/** Ítems del sidebar — orden y nombres según 00-MASTER-SPEC.md. */
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Mis pendientes", href: "/pendientes", icon: ListTodo, ownerOnly: true },
  { label: "Clientes y Prospectos", href: "/clientes", icon: Users },
  { label: "Pedidos / Contratos / Facturas", href: "/pedidos", icon: FileText },
  { label: "Cobros y Entregas", href: "/cobros", icon: CalendarClock },
  { label: "Finanzas", href: "/finanzas", icon: Wallet },
  { label: "Influencers", href: "/influencers", icon: Megaphone },
  { label: "Equipo", href: "/equipo", icon: UsersRound },
  { label: "Calendario", href: "/calendario", icon: Calendar },
  { label: "Sistemas", href: "/sistemas", icon: ServerCog, ownerOnly: true },
  { label: "Historial / Auditoría", href: "/historial", icon: ShieldCheck },
  { label: "Configuración", href: "/configuracion", icon: Settings },
];

/** Marcas multi-marca según master spec. */
export const BRANDS = [
  { id: "all", label: "Todas las marcas" },
  { id: "jm-designs", label: EMPRESA.nombre },
  { id: "kitjoy", label: "KitJoy Studio" },
  { id: "jm-distribution", label: "JM Distribution" },
];
