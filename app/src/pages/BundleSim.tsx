import React, { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Keypair } from "@solana/web3.js";
import { BundleItem, BundleResult, submitBundleSequential } from "../services/jito";
import { TxStatus, TxState } from "../components/TxStatus";
import { ExplorerLink } from "../components/ExplorerLink";
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

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Bundle Simulator</h2>
        <p className="text-gray-400 text-sm">
          Simulate Jito-style transaction bundles — ordered atomic execution
          with validator tips.
        </p>
      </div>

      {/* Bundle Items */}
      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="bg-solana-card border border-solana-border rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-solana-purple">
                #{index + 1} {item.label}
              </span>
              {items.length > 1 && (
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  Remove
                </button>
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
                  className="w-full bg-solana-dark border border-solana-border rounded px-2 py-1.5 text-white font-mono text-xs focus:border-solana-purple focus:outline-none"
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
                  className="w-full bg-solana-dark border border-solana-border rounded px-2 py-1.5 text-white font-mono text-xs focus:border-solana-purple focus:outline-none"
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
                    updateItem(
                      item.id,
                      "priorityFee",
                      parseInt(e.target.value)
                    )
                  }
                  className="w-full bg-solana-dark border border-solana-border rounded px-2 py-1.5 text-white font-mono text-xs focus:border-solana-purple focus:outline-none"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add + Tip */}
      <div className="flex items-center gap-4">
        <button
          onClick={addItem}
          className="px-4 py-2 bg-solana-dark border border-solana-border rounded-lg text-gray-400 hover:text-white hover:border-solana-purple text-sm transition-colors"
        >
          + Add Transaction
        </button>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-400">Tip:</label>
          <input
            type="number"
            value={tipAmount}
            onChange={(e) => setTipAmount(parseFloat(e.target.value))}
            step="0.0001"
            className="w-24 bg-solana-dark border border-solana-border rounded px-2 py-1.5 text-white font-mono text-xs focus:border-solana-purple focus:outline-none"
          />
          <span className="text-xs text-gray-500">SOL</span>
        </div>
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmitBundle}
        disabled={
          !wallet.publicKey ||
          txStatus === "sending" ||
          txStatus === "confirming"
        }
        className="w-full bg-solana-purple hover:bg-solana-purple/80 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-3 rounded-lg transition-colors"
      >
        {txStatus === "sending"
          ? "Submitting Bundle..."
          : `Submit Bundle (${items.length} tx + tip)`}
      </button>

      <TxStatus status={txStatus} error={error} />

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-solana-card border border-solana-border rounded-xl p-5">
          <h3 className="text-lg font-semibold mb-3">Bundle Results</h3>
          <div className="space-y-2">
            {results.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-solana-dark/50"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`${
                      r.success ? "text-solana-green" : "text-red-400"
                    }`}
                  >
                    {r.success ? "\u2713" : "\u2717"}
                  </span>
                  <span className="text-sm">{r.label}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-500">{r.timeMs}ms</span>
                  {r.success && <ExplorerLink signature={r.signature} />}
                  {r.error && (
                    <span className="text-red-400 text-xs">{r.error}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-solana-border text-sm text-gray-400">
            Total time:{" "}
            {results.reduce((sum, r) => sum + r.timeMs, 0)}ms |{" "}
            {results.filter((r) => r.success).length}/{results.length} successful
          </div>
        </div>
      )}
    </div>
  );
};
