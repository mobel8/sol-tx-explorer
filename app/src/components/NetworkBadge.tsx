import React from "react";

interface NetworkBadgeProps {
  network: "devnet" | "mainnet-beta" | "testnet";
}

const COLORS = {
  devnet: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "mainnet-beta": "bg-green-500/20 text-green-400 border-green-500/30",
  testnet: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

const DOT_COLORS = {
  devnet: "bg-yellow-400",
  "mainnet-beta": "bg-green-400",
  testnet: "bg-blue-400",
};

export const NetworkBadge: React.FC<NetworkBadgeProps> = ({ network }) => {
  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono border ${COLORS[network]}`}
    >
      <span className="relative flex h-2 w-2">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${DOT_COLORS[network]}`} />
        <span className={`relative inline-flex rounded-full h-2 w-2 ${DOT_COLORS[network]}`} />
      </span>
      {network}
    </span>
  );
};
