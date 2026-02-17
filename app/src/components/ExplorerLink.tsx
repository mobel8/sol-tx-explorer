import React from "react";

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
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-solana-green hover:text-solana-purple transition-colors font-mono text-sm underline"
    >
      {display}
    </a>
  );
};
