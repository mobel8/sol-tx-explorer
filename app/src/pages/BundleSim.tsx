import React, { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Keypair } from "@solana/web3.js";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Plus, Layers, Send } from "lucide-react";
import { BundleItem, BundleResult, submitBundleSequential } from "../services/jito";
import { TxStatus, TxState } from "../components/TxStatus";
import { ExplorerLink } from "../components/ExplorerLink";
import { GlassCard } from "../components/GlassCard";
import { GradientButton } from "../components/GradientButton";
import type { TxRecord } from "../hooks/useTransactionHistory";

interface BundleSimProps {
  onTxComplete: (tx: Omit<TxRecord, "id">) => void;
}

export const BundleSim: React.FC<BundleSimProps> = ({ onTxComplete }) => {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [items, setItems] = useState<BundleItem[]>([
    {
      id: "1",
      recipient: Keypair.generate().publicKey.toBase58(),
      amountSol: 0.001,
      priorityFee: 5000,
      label: "Transfer #1",
    },
    {
      id: "2",
      recipient: Keypair.generate().publicKey.toBase58(),
      amountSol: 0.001,
      priorityFee: 3000,
      label: "Transfer #2",
    },
  ]);
  const [tipAmount, setTipAmount] = useState(0.0001);
  const [results, setResults] = useState<BundleResult[]>([]);
  const [txStatus, setTxStatus] = useState<TxState>("idle");
  const [error, setError] = useState<string>();

  const addItem = () => {
    const num = items.length + 1;
    setItems((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        recipient: Keypair.generate().publicKey.toBase58(),
        amountSol: 0.001,
        priorityFee: 1000,
        label: `Transfer #${num}`,
      },
    ]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: keyof BundleItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleSubmitBundle = async () => {
    if (!wallet.publicKey || !wallet.signTransaction) return;

    setTxStatus("sending");
    setError(undefined);
    setResults([]);

    try {
      const bundleResults = await submitBundleSequential(
        connection,
        items,
        wallet,
        tipAmount
      );

      setResults(bundleResults);
      const allSuccess = bundleResults.every((r) => r.success);
      setTxStatus(allSuccess ? "confirmed" : "failed");

      bundleResults.forEach((r) => {
        if (r.success) {
          onTxComplete({
            type: "bundle",
            signature: r.signature,
            amount: 0.001,
            status: "confirmed",
            timestamp: Date.now(),
            timeMs: r.timeMs,
          });
        }
      });
    } catch (err: any) {
      setError(err.message);
      setTxStatus("failed");
    }
  };

  const isProcessing = txStatus === "sending" || txStatus === "confirming";

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1 text-gradient">
          Bundle Simulator
        </h2>
        <p className="text-gray-400 text-sm">
          Simulate Jito-style transaction bundles — ordered atomic execution
          with validator tips.
        </p>
      </div>

      {/* Bundle Items */}
      <div className="space-y-3">
        <AnimatePresence>
          {items.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: -100, scale: 0.9 }}
              transition={{ duration: 0.25 }}
            >
              <GlassCard hover={false} className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-solana-purple to-solana-green flex items-center justify-center text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <span className="text-sm font-semibold text-white">
                      {item.label}
                    </span>
                  </div>
                  {items.length > 1 && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400/60 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Recipient
                    </label>
                    <input
                      type="text"
                      value={item.recipient}
                      onChange={(e) =>
                        updateItem(item.id, "recipient", e.target.value)
                      }
                      className="w-full bg-solana-dark/50 border border-solana-border rounded-lg px-2 py-1.5 text-white font-mono text-xs focus:border-solana-purple focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Amount (SOL)
                    </label>
                    <input
                      type="number"
                      value={item.amountSol}
                      onChange={(e) =>
                        updateItem(item.id, "amountSol", parseFloat(e.target.value))
                      }
                      step="0.001"
                      className="w-full bg-solana-dark/50 border border-solana-border rounded-lg px-2 py-1.5 text-white font-mono text-xs focus:border-solana-purple focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Priority Fee
                    </label>
                    <input
                      type="number"
                      value={item.priorityFee}
                      onChange={(e) =>
                        updateItem(item.id, "priorityFee", parseInt(e.target.value))
                      }
                      className="w-full bg-solana-dark/50 border border-solana-border rounded-lg px-2 py-1.5 text-white font-mono text-xs focus:border-solana-purple focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add + Tip */}
      <div className="flex items-center gap-4">
        <GradientButton onClick={addItem} variant="outline">
          <Plus className="w-4 h-4" />
          Add Transaction
        </GradientButton>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-400">Tip:</label>
          <input
            type="number"
            value={tipAmount}
            onChange={(e) => setTipAmount(parseFloat(e.target.value))}
            step="0.0001"
            className="w-24 bg-solana-dark/50 border border-solana-border rounded-lg px-2 py-1.5 text-white font-mono text-xs focus:border-solana-purple focus:outline-none transition-colors"
          />
          <span className="text-xs text-gray-500 font-mono">SOL</span>
        </div>
      </div>

      {/* Submit */}
      <GradientButton
        onClick={handleSubmitBundle}
        disabled={!wallet.publicKey || isProcessing}
        loading={isProcessing}
        fullWidth
      >
        <Layers className="w-4 h-4" />
        {isProcessing
          ? "Submitting Bundle..."
          : `Submit Bundle (${items.length} tx + tip)`}
      </GradientButton>

      <TxStatus status={txStatus} error={error} />

      {/* Results */}
      <AnimatePresence>
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <GlassCard hover={false}>
              <div className="flex items-center gap-2 mb-4">
                <Send className="w-5 h-5 text-solana-purple" />
                <h3 className="text-lg font-semibold">Bundle Results</h3>
              </div>
              <div className="space-y-2">
                {results.map((r, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center justify-between py-2.5 px-4 rounded-xl bg-solana-dark/30"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={
                          r.success ? "text-solana-green" : "text-red-400"
                        }
                      >
                        {r.success ? "\u2713" : "\u2717"}
                      </span>
                      <span className="text-sm">{r.label}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-500 font-mono">
                        {r.timeMs}ms
                      </span>
                      {r.success && <ExplorerLink signature={r.signature} />}
                      {r.error && (
                        <span className="text-red-400 text-xs">{r.error}</span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-solana-border/50 text-sm text-gray-400 font-mono">
                Total time:{" "}
                {results.reduce((sum, r) => sum + r.timeMs, 0)}ms |{" "}
                {results.filter((r) => r.success).length}/{results.length}{" "}
                successful
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
