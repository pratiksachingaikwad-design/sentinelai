import {
  AlertTriangle,
  Camera,
  FileText,
  Image,
  LayoutDashboard,
  LogOut,
  Search,
  Shield,
} from "lucide-react";
import type { Page } from "../App";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { cn } from "../lib/utils";

const navItems: {
  id: Page;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}[] = [
  { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { id: "surveillance", icon: Camera, label: "Surveillance" },
  { id: "criminals", icon: AlertTriangle, label: "Criminal DB" },
  { id: "missing", icon: Search, label: "Missing Persons" },
  { id: "logs", icon: FileText, label: "Detection Logs" },
  { id: "evidence", icon: Image, label: "Evidence" },
];

interface Props {
  page: Page;
  navigate: (p: Page) => void;
  children: React.ReactNode;
}

export default function Layout({ page, navigate, children }: Props) {
  const { clear } = useInternetIdentity();

  return (
    <div className="flex h-screen bg-[oklch(0.09_0.02_240)]">
      <aside className="w-60 flex flex-col border-r border-[oklch(0.22_0.03_240)] bg-[oklch(0.1_0.025_240)] flex-shrink-0">
        <div className="p-4 border-b border-[oklch(0.22_0.03_240)]">
          <div className="flex items-center gap-2">
            <Shield className="w-7 h-7 text-[oklch(0.75_0.18_200)]" />
            <div>
              <div className="font-bold text-sm tracking-widest text-[oklch(0.75_0.18_200)] font-mono">
                SENTINEL
              </div>
              <div className="text-[10px] text-[oklch(0.5_0.02_220)] tracking-widest font-mono">
                AI SURVEILLANCE
              </div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map(({ id, icon: Icon, label }) => (
            <button
              type="button"
              key={id}
              onClick={() => navigate(id)}
              data-ocid={`nav.${id}.link`}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded text-sm font-mono transition-all w-full text-left",
                page === id
                  ? "bg-[oklch(0.75_0.18_200_/_0.15)] text-[oklch(0.75_0.18_200)] border border-[oklch(0.75_0.18_200_/_0.3)]"
                  : "text-[oklch(0.6_0.02_220)] hover:text-[oklch(0.85_0.01_220)] hover:bg-[oklch(0.15_0.02_240)] border border-transparent",
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
        <div className="p-2 border-t border-[oklch(0.22_0.03_240)]">
          <button
            type="button"
            onClick={clear}
            data-ocid="nav.logout.button"
            className="flex items-center gap-3 px-3 py-2 w-full rounded text-sm font-mono text-[oklch(0.6_0.02_220)] hover:text-[oklch(0.65_0.25_25)] hover:bg-[oklch(0.58_0.25_25_/_0.1)] transition-all"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
