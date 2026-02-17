import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  ComputeBudgetProgram,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

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

export function createBundleTransaction(
  from: PublicKey,
  to: PublicKey,
  amountSol: number,
  priorityFee: number
): Transaction {
  const tx = new Transaction();

  if (priorityFee > 0) {
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

export async function submitBundleSequential(
  connection: Connection,
  items: BundleItem[],
  wallet: any, // WalletAdapter
  tipAmountSol: number
): Promise<BundleResult[]> {
  const results: BundleResult[] = [];

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

  // Tip transaction
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
