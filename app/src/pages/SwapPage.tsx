import React, { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDownUp, Search, Zap } from "lucide-react";
import {
  TOKEN_LIST,
  getSwapQuote,
  buildSwapTransaction,
  executeSwap,
  SwapQuote,
} from "../services/jupiter";
import { TxStatus, TxState } from "../components/TxStatus";
import { GlassCard } from "../components/GlassCard";
import { GradientButton } from "../components/GradientButton";
import type { TxRecord } from "../hooks/useTransactionHistory";

interface SwapPageProps {
  onTxComplete: (tx: Omit<TxRecord, "id">) => void;
}

export const SwapPage: React.FC<SwapPageProps> = ({ onTxComplete }) => {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();

  const [inputToken, setInputToken] = useState(TOKEN_LIST[0]);
  const [outputToken, setOutputToken] = useState(TOKEN_LIST[1]);
  const [amount, setAmount] = useState("0.01");
  const [slippage, setSlippage] = useState(50);
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [txStatus, setTxStatus] = useState<TxState>("idle");
  const [signature, setSignature] = useState<string>();
  const [error, setError] = useState<string>();
  const [quoteLoading, setQuoteLoading] = useState(false);

  const fetchQuote = async () => {
    setQuoteLoading(true);
    setError(undefined);
    try {
      const amountRaw = Math.floor(
        parseFloat(amount) * Math.pow(10, inputToken.decimals)
      );
      const q = await getSwapQuote(
        inputToken.mint,
        outputToken.mint,
        amountRaw,
        slippage
      );
      setQuote(q);
    } catch (err: any) {
      setError(err.message);
      setQuote(null);
    } finally {
      setQuoteLoading(false);
    }
  };

  const handleSwap = async () => {
    if (!publicKey || !signTransaction || !quote) return;

    setTxStatus("sending");
    setError(undefined);
    const startTime = Date.now();

    try {
      const tx = await buildSwapTransaction(quote, publicKey.toBase58());
      tx.sign([]);

      setTxStatus("confirming");
      const sig = await executeSwap(connection, tx);
      const elapsed = Date.now() - startTime;

      setSignature(sig);
      setTxStatus("confirmed");

      onTxComplete({
        type: "swap",
        signature: sig,
        amount: parseFloat(amount),
        status: "confirmed",
        timestamp: Date.now(),
        timeMs: elapsed,
      });
    } catch (err: any) {
      setError(err.message);
      setTxStatus("failed");
    }
  };

  const outputAmount = quote
    ? parseInt(quote.outAmount) / Math.pow(10, outputToken.decimals)
    : null;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1 text-gradient">Jupiter Swap</h2>
        <p className="text-gray-400 text-sm">
          Swap tokens using Jupiter Aggregator — finds the best route across all
          Solana DEXes.
        </p>
      </div>

      <GlassCard hover={false} gradient>
        <div className="space-y-5">
          {/* Input Token */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">From</label>
            <div className="flex gap-3">
              <select
                value={inputToken.symbol}
                onChange={(e) => {
                  const t = TOKEN_LIST.find((t) => t.symbol === e.target.value);
                  if (t) setInputToken(t);
                }}
                className="bg-solana-dark/50 border border-solana-border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-solana-purple"
              >
                {TOKEN_LIST.map((t) => (
                  <option key={t.mint} value={t.symbol}>
                    {t.symbol}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="0.001"
                className="flex-1 bg-solana-dark/50 border border-solana-border rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:border-solana-purple focus:outline-none focus:ring-1 focus:ring-solana-purple/30 transition-all"
              />
            </div>
          </div>

          {/* Swap direction button */}
          <div className="flex justify-center">
            <motion.button
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.3 }}
              onClick={() => {
                setInputToken(outputToken);
                setOutputToken(inputToken);
                setQuote(null);
              }}
              className="p-3 rounded-xl glass border border-solana-border hover:border-solana-purple transition-colors"
            >
              <ArrowDownUp className="w-4 h-4 text-solana-purple" />
            </motion.button>
          </div>

          {/* Output Token */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">To</label>
            <div className="flex gap-3">
              <select
                value={outputToken.symbol}
                onChange={(e) => {
                  const t = TOKEN_LIST.find((t) => t.symbol === e.target.value);
                  if (t) setOutputToken(t);
                }}
                className="bg-solana-dark/50 border border-solana-border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-solana-purple"
              >
                {TOKEN_LIST.map((t) => (
                  <option key={t.mint} value={t.symbol}>
                    {t.symbol}
                  </option>
                ))}
              </select>
              <div className="flex-1 bg-solana-dark/50 border border-solana-border rounded-xl px-4 py-2.5 text-gray-400 font-mono text-sm">
                {outputAmount !== null
                  ? outputAmount.toFixed(outputToken.decimals)
                  : "Get quote first..."}
              </div>
            </div>
          </div>

          {/* Slippage */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Slippage:{" "}
              <span className="text-solana-green font-mono">{slippage / 100}%</span>
            </label>
            <div className="flex gap-2">
              {[10, 50, 100, 300].map((bps) => (
                <button
                  key={bps}
                  onClick={() => setSlippage(bps)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-mono transition-all ${
                    slippage === bps
                      ? "bg-solana-purple/20 text-solana-purple border border-solana-purple/40 glow-purple"
                      : "bg-solana-dark/50 text-gray-400 border border-solana-border hover:border-solana-purple/30"
                  }`}
                >
                  {bps / 100}%
                </button>
              ))}
            </div>
          </div>

          {/* Quote Info */}
          <AnimatePresence>
            {quote && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-solana-dark/30 rounded-xl p-4 space-y-2 text-sm border border-solana-border/50">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Rate</span>
                    <span className="text-white font-mono">
                      1 {inputToken.symbol} ={" "}
                      {(
                        (parseInt(quote.outAmount) /
                          Math.pow(10, outputToken.decimals)) /
                        (parseInt(quote.inAmount) /
                          Math.pow(10, inputToken.decimals))
                      ).toFixed(4)}{" "}
                      {outputToken.symbol}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Price Impact</span>
                    <span className="text-white font-mono">
                      {quote.priceImpactPct}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Route</span>
                    <span className="text-white font-mono text-xs">
                      {quote.routePlan.map((r) => r.swapInfo.label).join(" > ")}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Buttons */}
          <div className="flex gap-3">
            <GradientButton
              onClick={fetchQuote}
              loading={quoteLoading}
              variant="outline"
              className="flex-1"
            >
              <Search className="w-4 h-4" />
              Get Quote
            </GradientButton>
            <GradientButton
              onClick={handleSwap}
              disabled={!publicKey || !quote || txStatus === "sending"}
              variant="green"
              className="flex-1"
            >
              <Zap className="w-4 h-4" />
              Swap
            </GradientButton>
          </div>

          <TxStatus status={txStatus} signature={signature} error={error} />
        </div>
      </GlassCard>
    </div>
  );
};
