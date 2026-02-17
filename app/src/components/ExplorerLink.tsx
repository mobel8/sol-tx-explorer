import React from "react";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";

interface ExplorerLinkProps {
  signature?: string;
  address?: string;
  label?: string;
  cluster?: string;
}

export const ExplorerLink: React.FC<ExplorerLinkProps> = ({
  signature,
  address,
  label,
  cluster = "devnet",
}) => {
  const base = "https://explorer.solana.com";
  const href = signature
    ? `${base}/tx/${signature}?cluster=${cluster}`
    : `${base}/address/${address}?cluster=${cluster}`;

  const display = label || (signature || address || "").slice(0, 16) + "...";

  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      whileHover={{ x: 2 }}
      className="inline-flex items-center gap-1.5 text-solana-green hover:text-solana-purple transition-colors font-mono text-sm"
    >
      {display}
      <ExternalLink className="w-3 h-3 opacity-50" />
    </motion.a>
  );
};
