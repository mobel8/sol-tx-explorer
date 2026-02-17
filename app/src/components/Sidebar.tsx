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

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/tx-builder", label: "TX Builder", icon: ArrowRight },
  { path: "/swap", label: "Jupiter Swap", icon: ArrowLeftRight },
  { path: "/bundles", label: "Bundle Sim", icon: Layers },
  { path: "/vault", label: "Vault", icon: Shield },
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
                  className="absolute inset-0 rounded-xl bg-solana-purple/15 border border-solana-purple/30"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <div
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  isActive
                    ? "text-solana-purple font-medium"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="w-4.5 h-4.5" />
                {item.label}
              </div>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="mt-auto pt-4 border-t border-solana-border/50">
        <div className="flex flex-wrap gap-1.5 justify-center">
          {["Solana", "Jupiter", "Jito", "Anchor"].map((tech) => (
            <span
              key={tech}
              className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-solana-purple/10 text-solana-purple/70 border border-solana-purple/20"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
};
