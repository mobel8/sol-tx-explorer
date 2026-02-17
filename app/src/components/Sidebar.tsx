import React from "react";
import { NavLink } from "react-router-dom";
import { NetworkBadge } from "./NetworkBadge";

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: "\u25A6" },
  { path: "/tx-builder", label: "TX Builder", icon: "\u2192" },
  { path: "/swap", label: "Jupiter Swap", icon: "\u21C4" },
  { path: "/bundles", label: "Bundle Sim", icon: "\u2630" },
  { path: "/vault", label: "Vault", icon: "\u26C1" },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-solana-card border-r border-solana-border min-h-screen p-4 flex flex-col">
      <div className="mb-8">
        <h1 className="text-xl font-bold">
          <span className="text-solana-purple">Sol</span>
          <span className="text-solana-green">Tx</span>
          <span className="text-white"> Explorer</span>
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Transaction Infrastructure
        </p>
        <div className="mt-3">
          <NetworkBadge network="devnet" />
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-solana-purple/20 text-solana-purple border border-solana-purple/30"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto pt-4 border-t border-solana-border">
        <p className="text-xs text-gray-600 text-center">
          Built with Solana web3.js
        </p>
        <p className="text-xs text-gray-600 text-center">
          Jupiter | Jito | Anchor
        </p>
      </div>
    </aside>
  );
};
