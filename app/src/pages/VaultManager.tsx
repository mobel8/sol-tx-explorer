import React, { useState, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { MetricsCard } from "../components/MetricsCard";
import { ExplorerLink } from "../components/ExplorerLink";
import { TxStatus, TxState } from "../components/TxStatus";
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
        <p className="text-gray-400">Connect your wallet to manage vaults.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Vault Manager</h2>
        <p className="text-gray-400 text-sm">
          Interact with the on-chain tx-vault Anchor program — deposit,
          withdraw, and track SOL in your PDA vault.
        </p>
      </div>

      {/* Vault Info */}
      <div className="bg-solana-card border border-solana-border rounded-xl p-5">
        <h3 className="text-lg font-semibold mb-3">Vault Details</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Vault PDA</span>
            <ExplorerLink address={vaultPdaAddress} label={vaultPdaAddress.slice(0, 20) + "..."} />
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Authority</span>
            <ExplorerLink address={publicKey.toBase58()} label={publicKey.toBase58().slice(0, 20) + "..."} />
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Status</span>
            <span className={vaultState ? "text-solana-green" : "text-yellow-400"}>
              {loading ? "Loading..." : vaultState ? "Active" : "Not Initialized"}
            </span>
          </div>
        </div>
      </div>

      {/* Metrics */}
      {vaultState && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricsCard
            title="Vault Balance"
            value={`${vaultState.balance.toFixed(4)} SOL`}
          />
          <MetricsCard
            title="Total Deposited"
            value={`${(vaultState.totalDeposited / LAMPORTS_PER_SOL).toFixed(4)} SOL`}
          />
          <MetricsCard
            title="Transactions"
            value={vaultState.txCount}
          />
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Initialize */}
        {!vaultState && (
          <div className="bg-solana-card border border-solana-border rounded-xl p-5 col-span-2">
            <h3 className="text-lg font-semibold mb-3">Initialize Vault</h3>
            <p className="text-gray-400 text-sm mb-4">
              Create a new PDA vault for your wallet. This is a one-time
              operation.
            </p>
            <button
              className="w-full bg-solana-purple hover:bg-solana-purple/80 text-white font-semibold py-3 rounded-lg transition-colors"
              onClick={() => {
                setError("Deploy the Anchor program first (anchor deploy)");
                setTxStatus("failed");
              }}
            >
              Initialize Vault (requires deployed program)
            </button>
          </div>
        )}

        {/* Deposit */}
        <div className="bg-solana-card border border-solana-border rounded-xl p-5">
          <h3 className="font-semibold mb-3">Deposit SOL</h3>
          <input
            type="number"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            step="0.01"
            className="w-full bg-solana-dark border border-solana-border rounded-lg px-4 py-2.5 text-white font-mono text-sm mb-3 focus:border-solana-green focus:outline-none"
          />
          <button
            disabled={!vaultState}
            className="w-full bg-solana-green text-solana-dark hover:bg-solana-green/80 disabled:bg-gray-700 disabled:text-gray-500 font-semibold py-2.5 rounded-lg transition-colors"
          >
            Deposit {depositAmount} SOL
          </button>
        </div>

        {/* Withdraw */}
        <div className="bg-solana-card border border-solana-border rounded-xl p-5">
          <h3 className="font-semibold mb-3">Withdraw SOL</h3>
          <input
            type="number"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            step="0.01"
            className="w-full bg-solana-dark border border-solana-border rounded-lg px-4 py-2.5 text-white font-mono text-sm mb-3 focus:border-solana-purple focus:outline-none"
          />
          <button
            disabled={!vaultState}
            className="w-full bg-solana-purple text-white hover:bg-solana-purple/80 disabled:bg-gray-700 disabled:text-gray-500 font-semibold py-2.5 rounded-lg transition-colors"
          >
            Withdraw {withdrawAmount} SOL
          </button>
        </div>
      </div>

      <TxStatus status={txStatus} signature={signature} error={error} />

      {/* Architecture Note */}
      <div className="bg-solana-dark border border-solana-border rounded-xl p-5">
        <h3 className="font-semibold mb-2 text-solana-purple">Architecture Note</h3>
        <div className="text-sm text-gray-400 space-y-1">
          <p>The tx-vault program uses:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>PDA (Program Derived Address)</strong> — vault account derived from ["vault", authority]</li>
            <li><strong>CPI (Cross-Program Invocation)</strong> — SOL transfers via System Program</li>
            <li><strong>Account Validation</strong> — Anchor constraints ensure only authority can withdraw</li>
            <li><strong>Event Emission</strong> — all operations emit events for off-chain indexing</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
