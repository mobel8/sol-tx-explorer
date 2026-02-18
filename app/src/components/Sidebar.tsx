import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  ArrowRight,
  ArrowLeftRight,
  Layers,
  Shield,
} from "lucide-react";
import { NetworkBadge } from "./NetworkBadge";
import { ThemeToggle } from "./ThemeToggle";

const NAV_ITEMS = [
  { path: "/",           label: "Dashboard",    icon: LayoutDashboard },
  { path: "/tx-builder", label: "TX Builder",   icon: ArrowRight },
  { path: "/swap",       label: "Jupiter Swap", icon: ArrowLeftRight },
  { path: "/bundles",    label: "Bundle Sim",   icon: Layers },
  { path: "/vault",      label: "Vault",        icon: Shield },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();

  return (
    <aside className="w-64 glass-dark min-h-screen p-4 flex flex-col">
      {/* Logo */}
      <div className="mb-8">
        <h1 className="text-xl font-bold">
          <span className="text-gradient-animate text-2xl">SolTx</span>
          <span className="text-white/80"> Explorer</span>
        </h1>
        <p className="text-xs text-gray-500 mt-1 font-mono">
          Transaction Infrastructure
        </p>
        <div className="mt-3">
          <NetworkBadge network="devnet" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== "/" && location.pathname.startsWith(item.path));
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className="relative block"
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-xl"
                  style={{
                    background: "rgba(var(--primary-rgb), 0.14)",
                    border: "1px solid rgba(var(--primary-rgb), 0.32)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
                  }}
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <div
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                  isActive
                    ? "font-semibold"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
                style={isActive ? { color: "var(--primary)" } : undefined}
              >
                <Icon
                  className="w-4 h-4 flex-shrink-0"
                  style={isActive ? { filter: "drop-shadow(0 0 6px var(--primary))" } : undefined}
                />
                {item.label}
              </div>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        className="mt-auto pt-4 space-y-3"
        style={{ borderTop: "1px solid rgba(var(--primary-rgb), 0.18)" }}
      >
        {/* Theme switcher */}
        <ThemeToggle />

        {/* Tech badges */}
        <div className="flex flex-wrap gap-1.5 justify-center">
          {["Solana", "Jupiter", "Jito", "Anchor"].map((tech) => (
            <span
              key={tech}
              className="px-2 py-0.5 rounded-full text-[10px] font-mono"
              style={{
                background: "rgba(var(--primary-rgb), 0.08)",
                color: "rgba(var(--primary-rgb), 0.65)",
                border: "1px solid rgba(var(--primary-rgb), 0.18)",
              }}
            >
              {tech}
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
};
