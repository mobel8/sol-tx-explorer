import React, { useState, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { motion } from "framer-motion";
import { Shield, Wallet, ArrowDownToLine, ArrowUpFromLine, Terminal, Coins, TrendingUp, Hash, AlertTriangle, Play } from "lucide-react";
import { MetricsCard } from "../components/MetricsCard";
import { ExplorerLink } from "../components/ExplorerLink";
import { TxStatus, TxState } from "../components/TxStatus";
import { GlassCard } from "../components/GlassCard";
import { GradientButton } from "../components/GradientButton";
import { getVaultPDA, fetchVaultState, VaultState } from "../services/vault";

export const VaultManager: React.FC = () => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  const [vaultState, setVaultState] = useState<VaultState | null>(null);
  const [depositAmount, setDepositAmount] = useState("0.1");
  const [withdrawAmount, setWithdrawAmount] = useState("0.05");
  const [txStatus, setTxStatus] = useState<TxState>("idle");
  const [signature, setSignature] = useState<string>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!publicKey) return;
    loadVault();
  }, [publicKey]);

  const loadVault = async () => {
    if (!publicKey) return;
    setLoading(true);
    try {
      const state = await fetchVaultState(connection, publicKey);
      setVaultState(state);
    } catch {
      setVaultState(null);
    } finally {
      setLoading(false);
    }
  };

  const [vaultPdaAddress, setVaultPdaAddress] = useState<string>("");

  useEffect(() => {
    if (publicKey) {
      const [pda] = getVaultPDA(publicKey);
      setVaultPdaAddress(pda.toBase58());
    }
  }, [publicKey]);

  if (!publicKey) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-solana-purple/10 border border-solana-purple/20 flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-solana-purple" />
          </div>
          <p className="text-gray-400">Connect your wallet to manage vaults.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1 text-gradient">
          Vault Manager
        </h2>
        <p className="text-gray-400 text-sm">
          Interact with the on-chain tx-vault Anchor program — deposit,
          withdraw, and track SOL in your PDA vault.
        </p>
      </div>

      {/* Vault Info */}
      <GlassCard hover={false} gradient>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-solana-purple" />
          <h3 className="text-lg font-semibold">Vault Details</h3>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center py-1.5">
            <span className="text-gray-500">Vault PDA</span>
            <ExplorerLink
              address={vaultPdaAddress}
              label={vaultPdaAddress.slice(0, 20) + "..."}
            />
          </div>
          <div className="flex justify-between items-center py-1.5 border-t border-solana-border/30">
            <span className="text-gray-500">Authority</span>
            <ExplorerLink
              address={publicKey.toBase58()}
              label={publicKey.toBase58().slice(0, 20) + "..."}
            />
          </div>
          <div className="flex justify-between items-center py-1.5 border-t border-solana-border/30">
            <span className="text-gray-500">Status</span>
            <span
              className={
                !vaultState
                  ? "text-yellow-400 font-mono"
                  : vaultState.isPaused
                  ? "text-red-400 font-mono font-bold"
                  : "text-solana-green font-mono"
              }
            >
              {loading
                ? "Loading..."
                : !vaultState
                ? "Not Initialized"
                : vaultState.isPaused
                ? "⚠ PAUSED"
                : "Active"}
            </span>
          </div>
        </div>
      </GlassCard>

      {/* Metrics */}
      {vaultState && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricsCard
            title="Vault Balance"
            value={`${vaultState.balance.toFixed(4)} SOL`}
            icon={Coins}
            index={0}
          />
          <MetricsCard
            title="Total Deposited"
            value={`${(vaultState.totalDeposited / LAMPORTS_PER_SOL).toFixed(4)} SOL`}
            icon={TrendingUp}
            index={1}
          />
          <MetricsCard
            title="Transactions"
            value={vaultState.txCount}
            icon={Hash}
            index={2}
          />
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Initialize */}
        {!vaultState && (
          <GlassCard hover={false} className="col-span-2">
            <h3 className="text-lg font-semibold mb-3">Initialize Vault</h3>
            <p className="text-gray-400 text-sm mb-4">
              Create a new PDA vault for your wallet. This is a one-time
              operation.
            </p>
            <GradientButton
              fullWidth
              onClick={() => {
                setError("Deploy the Anchor program first (anchor deploy)");
                setTxStatus("failed");
              }}
            >
              <Shield className="w-4 h-4" />
              Initialize Vault (requires deployed program)
            </GradientButton>
          </GlassCard>
        )}

        {/* Deposit */}
        <GlassCard hover={false}>
          <div className="flex items-center gap-2 mb-3">
            <ArrowDownToLine className="w-4 h-4 text-solana-green" />
            <h3 className="font-semibold">Deposit SOL</h3>
          </div>
          <input
            type="number"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            step="0.01"
            className="w-full bg-solana-dark/50 border border-solana-border rounded-xl px-4 py-2.5 text-white font-mono text-sm mb-3 focus:border-solana-green focus:outline-none focus:ring-1 focus:ring-solana-green/30 transition-all"
          />
          <GradientButton
            fullWidth
            disabled={!vaultState}
            variant="green"
          >
            <ArrowDownToLine className="w-4 h-4" />
            Deposit {depositAmount} SOL
          </GradientButton>
        </GlassCard>

        {/* Withdraw */}
        <GlassCard hover={false}>
          <div className="flex items-center gap-2 mb-3">
            <ArrowUpFromLine className="w-4 h-4 text-solana-purple" />
            <h3 className="font-semibold">Withdraw SOL</h3>
          </div>
          <input
            type="number"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            step="0.01"
            className="w-full bg-solana-dark/50 border border-solana-border rounded-xl px-4 py-2.5 text-white font-mono text-sm mb-3 focus:border-solana-purple focus:outline-none focus:ring-1 focus:ring-solana-purple/30 transition-all"
          />
          <GradientButton
            fullWidth
            disabled={!vaultState}
            variant="purple"
          >
            <ArrowUpFromLine className="w-4 h-4" />
            Withdraw {withdrawAmount} SOL
          </GradientButton>
        </GlassCard>
      </div>

      {/* Kill Switch */}
      {vaultState && (
        <GlassCard hover={false} className="border-red-500/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <h3 className="font-semibold text-red-400">Emergency Kill Switch</h3>
            </div>
            <span
              className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                vaultState.isPaused
                  ? "bg-red-500/20 text-red-400"
                  : "bg-solana-green/10 text-solana-green"
              }`}
            >
              {vaultState.isPaused ? "PAUSED" : "RUNNING"}
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            {vaultState.isPaused
              ? "Vault is frozen — all deposits and withdrawals are blocked until resumed."
              : "Instantly freeze all deposits and withdrawals. Irreversible until you resume."}
          </p>
          <div className="flex gap-3">
            <GradientButton
              fullWidth
              variant={vaultState.isPaused ? "green" : "outline"}
              onClick={() => {
                setError(
                  vaultState.isPaused
                    ? "resumeVault() — requires deployed program (anchor deploy)"
                    : "emergencyPause() — requires deployed program (anchor deploy)"
                );
                setTxStatus("failed");
              }}
            >
              {vaultState.isPaused ? (
                <>
                  <Play className="w-4 h-4" />
                  Resume Vault
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4" />
                  Emergency Pause
                </>
              )}
            </GradientButton>
          </div>
        </GlassCard>
      )}

      <TxStatus status={txStatus} signature={signature} error={error} />

      {/* Architecture Note */}
      <GlassCard hover={false} className="border-solana-purple/20">
        <div className="flex items-center gap-2 mb-3">
          <Terminal className="w-5 h-5 text-solana-purple" />
          <h3 className="font-semibold text-solana-purple">
            Architecture Note
          </h3>
        </div>
        <div className="text-sm text-gray-400 space-y-1 font-mono">
          <p className="text-gray-300 mb-2">The tx-vault program uses:</p>
          <div className="space-y-1.5 ml-1">
            <p>
              <span className="text-solana-purple">&gt;</span>{" "}
              <strong className="text-gray-300">PDA</strong> — vault derived
              from ["vault", authority]
            </p>
            <p>
              <span className="text-solana-purple">&gt;</span>{" "}
              <strong className="text-gray-300">CPI</strong> — SOL transfers
              via System Program
            </p>
            <p>
              <span className="text-solana-purple">&gt;</span>{" "}
              <strong className="text-gray-300">Validation</strong> — Anchor
              constraints ensure only authority can withdraw
            </p>
            <p>
              <span className="text-solana-purple">&gt;</span>{" "}
              <strong className="text-gray-300">Kill Switch</strong> —{" "}
              <code className="text-red-400">is_paused: bool</code> blocks all
              ops; resumable by authority only
            </p>
            <p>
              <span className="text-solana-purple">&gt;</span>{" "}
              <strong className="text-gray-300">Events</strong> — all ops emit
              events for off-chain indexing
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};
