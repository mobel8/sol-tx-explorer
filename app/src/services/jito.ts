/**
 * Jito bundle service — browser / wallet-adapter layer.
 *
 * Why no jito-ts SearcherClient here?
 * The SearcherClient (gRPC) requires a Keypair with a secret key for auth.
 * Browser wallets never expose the secret key — they only sign transactions.
 * In a production system, the frontend would POST serialized transactions to a
 * backend service which would then submit them via SearcherClient.
 *
 * For this devnet demo, submitBundleDevnetSim sends each transaction
 * individually through the standard RPC, demonstrating the same bundle
 * construction logic (tip account, ordering, compute budget).
 */

import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  ComputeBudgetProgram,
} from "@solana/web3.js";

// Official Jito tip accounts (mainnet).
// Randomizing prevents front-running on tip accounts and distributes
// rewards evenly across Jito-connected validators.
const JITO_TIP_ACCOUNTS = [
  "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5",
  "HFqU5x63VTqvQss8hp11i4bVqkfRtQ7NmXwkihtHTAYc",
  "Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY",
];

export interface BundleItem {
  id: string;
  recipient: string;
  amountSol: number;
  priorityFee: number;
  label: string;
}

export interface BundleResult {
  label: string;
  signature: string;
  success: boolean;
  timeMs: number;
  error?: string;
}

export function getRandomTipAccount(): PublicKey {
  const idx = Math.floor(Math.random() * JITO_TIP_ACCOUNTS.length);
  return new PublicKey(JITO_TIP_ACCOUNTS[idx]);
}

/**
 * Build a transaction with priority fee instructions prepended.
 * Each bundle transaction gets its own compute budget — this is how
 * Jito bundles work on mainnet (each tx is independent but ordered).
 */
export function createBundleTransaction(
  from: PublicKey,
  to: PublicKey,
  amountSol: number,
  priorityFee: number
): Transaction {
  const tx = new Transaction();

  if (priorityFee > 0) {
    // setComputeUnitPrice must come BEFORE the business instruction.
    tx.add(
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee })
    );
    tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }));
  }

  tx.add(
    SystemProgram.transfer({
      fromPubkey: from,
      toPubkey: to,
      lamports: Math.floor(amountSol * LAMPORTS_PER_SOL),
    })
  );

  return tx;
}

/**
 * Devnet simulation — sends bundle transactions sequentially.
 *
 * On mainnet, a production implementation would:
 *   1. Serialize all VersionedTransactions.
 *   2. POST them to a backend endpoint.
 *   3. The backend creates a Bundle with jito-ts and calls searcherClient.sendBundle().
 *   4. The Block Engine guarantees atomic, ordered inclusion in a single slot.
 *
 * The tip transaction is always appended LAST — this is the Jito protocol
 * convention that allows the Block Engine to identify and validate the bundle.
 */
export async function submitBundleDevnetSim(
  connection: Connection,
  items: BundleItem[],
  wallet: any, // WalletAdapter — no secret key exposed
  tipAmountSol: number
): Promise<BundleResult[]> {
  const results: BundleResult[] = [];

  // Submit each transfer transaction in order (simulating bundle ordering)
  for (const item of items) {
    const start = Date.now();
    try {
      const tx = createBundleTransaction(
        wallet.publicKey,
        new PublicKey(item.recipient),
        item.amountSol,
        item.priorityFee
      );
      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = wallet.publicKey;

      const signed = await wallet.signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(sig, "confirmed");

      results.push({
        label: item.label,
        signature: sig,
        success: true,
        timeMs: Date.now() - start,
      });
    } catch (err: any) {
      results.push({
        label: item.label,
        signature: "",
        success: false,
        timeMs: Date.now() - start,
        error: err.message,
      });
    }
  }

  // Tip transaction — always last, as required by the Jito bundle protocol.
  const tipStart = Date.now();
  try {
    const tipTx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: getRandomTipAccount(),
        lamports: Math.floor(tipAmountSol * LAMPORTS_PER_SOL),
      })
    );
    const { blockhash } = await connection.getLatestBlockhash();
    tipTx.recentBlockhash = blockhash;
    tipTx.feePayer = wallet.publicKey;

    const signed = await wallet.signTransaction(tipTx);
    const sig = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction(sig, "confirmed");

    results.push({
      label: "Jito Tip",
      signature: sig,
      success: true,
      timeMs: Date.now() - tipStart,
    });
  } catch (err: any) {
    results.push({
      label: "Jito Tip",
      signature: "",
      success: false,
      timeMs: Date.now() - tipStart,
      error: err.message,
    });
  }

  return results;
}
