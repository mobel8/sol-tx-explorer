import React, { useState, useRef, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import { Send } from "lucide-react";
import { TxStatus, TxState } from "../components/TxStatus";
import { GlassCard } from "../components/GlassCard";
import { GradientButton } from "../components/GradientButton";
import type { TxRecord } from "../hooks/useTransactionHistory";

interface TxBuilderProps {
  onTxComplete: (tx: Omit<TxRecord, "id">) => void;
}

function useRangeProgress(
  ref: React.RefObject<HTMLInputElement>,
  value: number,
  min: number,
  max: number
) {
  useEffect(() => {
    if (ref.current) {
      const pct = ((value - min) / (max - min)) * 100;
      ref.current.style.setProperty("--range-progress", `${pct}%`);
    }
  }, [value, min, max, ref]);
}

export const TxBuilder: React.FC<TxBuilderProps> = ({ onTxComplete }) => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("0.01");
  const [priorityFee, setPriorityFee] = useState(1000);
  const [computeUnits, setComputeUnits] = useState(200000);
  const [txStatus, setTxStatus] = useState<TxState>("idle");
  const [signature, setSignature] = useState<string>();
  const [error, setError] = useState<string>();

  const feeRef = useRef<HTMLInputElement>(null);
  const cuRef = useRef<HTMLInputElement>(null);
  useRangeProgress(feeRef, priorityFee, 0, 100000);
  useRangeProgress(cuRef, computeUnits, 50000, 1400000);

  const isProcessing = txStatus === "sending" || txStatus === "confirming";

  const handleSend = async () => {
    if (!publicKey) return;

    let recipientKey: PublicKey;
    try {
      recipientKey = new PublicKey(recipient);
    } catch {
      setError("Invalid recipient address");
      setTxStatus("failed");
      return;
    }

    setTxStatus("sending");
    setError(undefined);
    const startTime = Date.now();

    try {
      const tx = new Transaction();

      if (priorityFee > 0) {
        tx.add(
          ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: priorityFee,
          })
        );
      }

      tx.add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnits })
      );

      tx.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: recipientKey,
          lamports: Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL),
        })
      );

      setTxStatus("confirming");
      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");

      const elapsed = Date.now() - startTime;
      setSignature(sig);
      setTxStatus("confirmed");

      onTxComplete({
        type: "transfer",
        signature: sig,
        amount: parseFloat(amount),
        status: "confirmed",
        timestamp: Date.now(),
        timeMs: elapsed,
      });
    } catch (err: any) {
      setError(err.message);
      setTxStatus("failed");

      onTxComplete({
        type: "transfer",
        signature: "",
        amount: parseFloat(amount),
        status: "failed",
        timestamp: Date.now(),
        timeMs: Date.now() - startTime,
      });
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1 text-gradient">
          Transaction Builder
        </h2>
        <p className="text-gray-400 text-sm">
          Build and send optimized SOL transactions with configurable priority
          fees and compute budget.
        </p>
      </div>

      <GlassCard hover={false} gradient>
        <div className="space-y-5">
          {/* Recipient */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Recipient Address
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Enter Solana address..."
              className="w-full bg-solana-dark/50 border border-solana-border rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:border-solana-purple focus:outline-none focus:ring-1 focus:ring-solana-purple/30 transition-all"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Amount (SOL)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.001"
              min="0"
              className="w-full bg-solana-dark/50 border border-solana-border rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:border-solana-purple focus:outline-none focus:ring-1 focus:ring-solana-purple/30 transition-all"
            />
          </div>

          {/* Priority Fee Slider */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Priority Fee:{" "}
              <span className="text-solana-green font-mono">{priorityFee.toLocaleString()}</span>{" "}
              microlamports/CU
            </label>
            <input
              ref={feeRef}
              type="range"
              min="0"
              max="100000"
              step="500"
              value={priorityFee}
              onChange={(e) => setPriorityFee(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>0 (no priority)</span>
              <span>100,000 (high priority)</span>
            </div>
          </div>

          {/* Compute Units Slider */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Compute Unit Limit:{" "}
              <span className="text-solana-green font-mono">
                {computeUnits.toLocaleString()}
              </span>{" "}
              CU
            </label>
            <input
              ref={cuRef}
              type="range"
              min="50000"
              max="1400000"
              step="50000"
              value={computeUnits}
              onChange={(e) => setComputeUnits(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>50K (tight)</span>
              <span>1.4M (max)</span>
            </div>
          </div>

          {/* Send Button */}
          <GradientButton
            onClick={handleSend}
            disabled={!publicKey || isProcessing}
            loading={isProcessing}
            fullWidth
          >
            <Send className="w-4 h-4" />
            {!publicKey ? "Connect Wallet First" : "Send Transaction"}
          </GradientButton>

          {/* Status */}
          <TxStatus status={txStatus} signature={signature} error={error} />
        </div>
      </GlassCard>
    </div>
  );
};
