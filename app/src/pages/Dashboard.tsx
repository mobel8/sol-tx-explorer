import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useSolanaBalance } from "../hooks/useSolanaBalance";
import { MetricsCard } from "../components/MetricsCard";
import { ExplorerLink } from "../components/ExplorerLink";
import type { TxRecord } from "../hooks/useTransactionHistory";

interface DashboardProps {
  txHistory: {
    history: TxRecord[];
    totalTransactions: number;
    totalFees: number;
    avgConfirmTime: number;
  };
}

export const Dashboard: React.FC<DashboardProps> = ({ txHistory }) => {
  const { publicKey, connected } = useWallet();
  const { balance } = useSolanaBalance();

  if (!connected) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-6xl mb-4">&#9878;</div>
          <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
          <p className="text-gray-400">
            Connect a Solana wallet to start using SolTx Explorer
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Supports Phantom & Solflare on devnet
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Dashboard</h2>
        <p className="text-gray-400 text-sm">
          Wallet:{" "}
          <ExplorerLink
            address={publicKey?.toBase58()}
            label={publicKey?.toBase58().slice(0, 8) + "..."}
          />
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricsCard
          title="SOL Balance"
          value={balance !== null ? `${balance.toFixed(4)} SOL` : "..."}
          subtitle="Devnet"
        />
        <MetricsCard
          title="Transactions"
          value={txHistory.totalTransactions}
          subtitle="This session"
        />
        <MetricsCard
          title="Avg Confirm Time"
          value={
            txHistory.avgConfirmTime > 0
              ? `${Math.round(txHistory.avgConfirmTime)}ms`
              : "N/A"
          }
          subtitle="Confirmation latency"
        />
        <MetricsCard
          title="Total Fees"
          value={
            txHistory.totalFees > 0
              ? `${txHistory.totalFees} lam`
              : "0"
          }
          subtitle="Lamports spent"
        />
      </div>

      {/* Recent Transactions */}
      <div className="bg-solana-card border border-solana-border rounded-xl p-5">
        <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
        {txHistory.history.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No transactions yet. Use the TX Builder, Swap, or Bundle pages to
            send transactions.
          </p>
        ) : (
          <div className="space-y-2">
            {txHistory.history.slice(0, 10).map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-solana-dark/50"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-mono ${
                      tx.type === "transfer"
                        ? "bg-blue-500/20 text-blue-400"
                        : tx.type === "swap"
                        ? "bg-green-500/20 text-green-400"
                        : tx.type === "bundle"
                        ? "bg-purple-500/20 text-purple-400"
                        : "bg-yellow-500/20 text-yellow-400"
                    }`}
                  >
                    {tx.type}
                  </span>
                  <ExplorerLink signature={tx.signature} />
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-400">{tx.amount} SOL</span>
                  <span className="text-gray-500">{tx.timeMs}ms</span>
                  <span
                    className={
                      tx.status === "confirmed"
                        ? "text-solana-green"
                        : "text-red-400"
                    }
                  >
                    {tx.status === "confirmed" ? "\u2713" : "\u2717"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
