import React from "react";

export type TxState = "idle" | "sending" | "confirming" | "confirmed" | "failed";

interface TxStatusProps {
  status: TxState;
  signature?: string;
  error?: string;
}

const STATUS_CONFIG: Record<TxState, { label: string; color: string; pulse: boolean }> = {
  idle: { label: "Ready", color: "text-gray-400", pulse: false },
  sending: { label: "Sending...", color: "text-yellow-400", pulse: true },
  confirming: { label: "Confirming...", color: "text-blue-400", pulse: true },
  confirmed: { label: "Confirmed", color: "text-solana-green", pulse: false },
  failed: { label: "Failed", color: "text-red-400", pulse: false },
};

export const TxStatus: React.FC<TxStatusProps> = ({ status, signature, error }) => {
  const config = STATUS_CONFIG[status];

  return (
    <div className="flex items-center gap-2">
      <div className={`flex items-center gap-2 ${config.color}`}>
        {config.pulse && (
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-current"></span>
          </span>
        )}
        {!config.pulse && status === "confirmed" && <span>&#10003;</span>}
        {!config.pulse && status === "failed" && <span>&#10007;</span>}
        <span className="text-sm font-mono">{config.label}</span>
      </div>
      {signature && status === "confirmed" && (
        <a
          href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-solana-green text-xs underline font-mono"
        >
          {signature.slice(0, 12)}...
        </a>
      )}
      {error && status === "failed" && (
        <span className="text-red-400 text-xs">{error}</span>
      )}
    </div>
  );
};
