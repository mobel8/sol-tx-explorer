import React from "react";

interface NetworkBadgeProps {
  network: "devnet" | "mainnet-beta" | "testnet";
}

export const NetworkBadge: React.FC<NetworkBadgeProps> = ({ network }) => {
  const colors = {
    devnet: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    "mainnet-beta": "bg-green-500/20 text-green-400 border-green-500/30",
    testnet: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-mono border ${colors[network]}`}
    >
      {network}
    </span>
  );
};
