import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { motion } from "framer-motion";
import { Coins, Zap, Clock, Flame, Wallet, Activity } from "lucide-react";
import { useSolanaBalance } from "../hooks/useSolanaBalance";
import { MetricsCard } from "../components/MetricsCard";
import { ExplorerLink } from "../components/ExplorerLink";
import { GlassCard } from "../components/GlassCard";
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
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="inline-block mb-6"
          >
            <div className="w-20 h-20 rounded-2xl bg-solana-purple/10 border border-solana-purple/20 flex items-center justify-center glow-purple">
              <Wallet className="w-10 h-10 text-solana-purple" />
            </div>
          </motion.div>
          <h2 className="text-2xl font-bold mb-2 text-gradient">
            Connect Your Wallet
          </h2>
          <p className="text-gray-400 max-w-sm">
            Connect a Solana wallet to start using SolTx Explorer
          </p>
          <p className="text-gray-600 text-sm mt-2 font-mono">
            Supports Phantom & Solflare on devnet
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-1 text-gradient">Dashboard</h2>
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
          icon={Coins}
          index={0}
        />
        <MetricsCard
          title="Transactions"
          value={txHistory.totalTransactions}
          subtitle="This session"
          icon={Zap}
          index={1}
        />
        <MetricsCard
          title="Avg Confirm Time"
          value={
            txHistory.avgConfirmTime > 0
              ? `${Math.round(txHistory.avgConfirmTime)}ms`
              : "N/A"
          }
          subtitle="Confirmation latency"
          icon={Clock}
          index={2}
        />
        <MetricsCard
          title="Total Fees"
          value={txHistory.totalFees > 0 ? `${txHistory.totalFees} lam` : "0"}
          subtitle="Lamports spent"
          icon={Flame}
          index={3}
        />
      </div>

      {/* Recent Transactions */}
      <GlassCard hover={false}>
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-solana-purple" />
          <h3 className="text-lg font-semibold">Recent Transactions</h3>
        </div>
        {txHistory.history.length === 0 ? (
          <div className="text-center py-8">
            <motion.div
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-gray-600 text-sm"
            >
              No transactions yet. Use the TX Builder, Swap, or Bundle pages to
              send transactions.
            </motion.div>
          </div>
        ) : (
          <div className="space-y-2">
            {txHistory.history.slice(0, 10).map((tx, i) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between py-2.5 px-4 rounded-xl bg-solana-dark/30 hover:bg-solana-dark/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2.5 py-0.5 rounded-lg text-xs font-mono font-medium ${
                      tx.type === "transfer"
                        ? "bg-blue-500/15 text-blue-400"
                        : tx.type === "swap"
                        ? "bg-green-500/15 text-green-400"
                        : tx.type === "bundle"
                        ? "bg-purple-500/15 text-purple-400"
                        : "bg-yellow-500/15 text-yellow-400"
                    }`}
                  >
                    {tx.type}
                  </span>
                  <ExplorerLink signature={tx.signature} />
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-400 font-mono">{tx.amount} SOL</span>
                  <span className="text-gray-500 font-mono">{tx.timeMs}ms</span>
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
              </motion.div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
};
