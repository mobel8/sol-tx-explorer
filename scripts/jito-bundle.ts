/**
 * Jito Bundle Script
 * Demonstrates creating and submitting transaction bundles via Jito's
 * Block Engine for MEV-aware transaction ordering.
 *
 * Bundles allow multiple transactions to be executed atomically and in
 * a specific order, with a tip to the validator for inclusion priority.
 *
 * Usage: npm run jito-bundle
 */

import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  ComputeBudgetProgram,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { connection, getExplorerUrl } from "./utils/connection";
import { loadWallet } from "./utils/wallet";

// Jito tip accounts (mainnet)
const JITO_TIP_ACCOUNTS = [
  "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5",
  "HFqU5x63VTqvQss8hp11i4bVqkfRtQ7NmXwkihtHTAYc",
  "Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY",
  "ADaUMid9yfUytqMBgopwjb2DTLSLx5cAoXAk2ARPoVESr",
  "DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh",
  "ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt",
  "DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL",
  "3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT",
];

const TIP_AMOUNT_SOL = 0.0001; // Tip for the validator
const TRANSFER_AMOUNT_SOL = 0.001;

interface BundleTransaction {
  label: string;
  transaction: Transaction;
}

function getRandomTipAccount(): PublicKey {
  const index = Math.floor(Math.random() * JITO_TIP_ACCOUNTS.length);
  return new PublicKey(JITO_TIP_ACCOUNTS[index]);
}

function createTransferTx(
  from: PublicKey,
  to: PublicKey,
  amountSol: number,
  priorityFee: number
): Transaction {
  const tx = new Transaction();

  tx.add(
    ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: priorityFee,
    })
  );

  tx.add(
    ComputeBudgetProgram.setComputeUnitLimit({
      units: 200_000,
    })
  );

  tx.add(
    SystemProgram.transfer({
      fromPubkey: from,
      toPubkey: to,
      lamports: Math.floor(amountSol * LAMPORTS_PER_SOL),
    })
  );

  return tx;
}

function createTipTransaction(
  from: PublicKey,
  tipAccount: PublicKey,
  tipAmountSol: number
): Transaction {
  const tx = new Transaction();

  tx.add(
    SystemProgram.transfer({
      fromPubkey: from,
      toPubkey: tipAccount,
      lamports: Math.floor(tipAmountSol * LAMPORTS_PER_SOL),
    })
  );

  return tx;
}

async function submitBundle(
  transactions: BundleTransaction[],
  wallet: Keypair
) {
  console.log(`\nSubmitting bundle of ${transactions.length} transactions...`);

  const signatures: string[] = [];

  for (const { label, transaction } of transactions) {
    try {
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [wallet],
        { commitment: "confirmed" }
      );
      signatures.push(signature);
      console.log(`  [OK] ${label}: ${signature.slice(0, 20)}...`);
    } catch (err) {
      console.error(`  [FAIL] ${label}: ${err instanceof Error ? err.message : err}`);
    }
  }

  return signatures;
}

async function jitoBundle() {
  console.log("=== SolTx Explorer - Jito Bundle Simulator ===\n");

  const wallet = loadWallet();

  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`Balance: ${balance / LAMPORTS_PER_SOL} SOL`);

  const totalNeeded = (TRANSFER_AMOUNT_SOL * 3 + TIP_AMOUNT_SOL) * LAMPORTS_PER_SOL;
  if (balance < totalNeeded) {
    console.error(`Need at least ${totalNeeded / LAMPORTS_PER_SOL} SOL. Run: npm run setup-wallet`);
    return;
  }

  // Create bundle: 3 ordered transfers + 1 tip
  const recipient1 = Keypair.generate().publicKey;
  const recipient2 = Keypair.generate().publicKey;
  const recipient3 = Keypair.generate().publicKey;
  const tipAccount = getRandomTipAccount();

  console.log(`\n--- Bundle Configuration ---`);
  console.log(`Transactions: 3 transfers + 1 tip`);
  console.log(`Transfer amount: ${TRANSFER_AMOUNT_SOL} SOL each`);
  console.log(`Tip amount: ${TIP_AMOUNT_SOL} SOL`);
  console.log(`Tip account: ${tipAccount.toBase58().slice(0, 20)}...`);

  // Build the bundle transactions in order
  const bundleTxs: BundleTransaction[] = [
    {
      label: "Transfer #1 (high priority)",
      transaction: createTransferTx(wallet.publicKey, recipient1, TRANSFER_AMOUNT_SOL, 5000),
    },
    {
      label: "Transfer #2 (medium priority)",
      transaction: createTransferTx(wallet.publicKey, recipient2, TRANSFER_AMOUNT_SOL, 3000),
    },
    {
      label: "Transfer #3 (low priority)",
      transaction: createTransferTx(wallet.publicKey, recipient3, TRANSFER_AMOUNT_SOL, 1000),
    },
    {
      label: "Jito Tip",
      transaction: createTipTransaction(wallet.publicKey, tipAccount, TIP_AMOUNT_SOL),
    },
  ];

  console.log(`\n--- Executing Bundle ---`);
  const startTime = Date.now();

  const signatures = await submitBundle(bundleTxs, wallet);

  const elapsed = Date.now() - startTime;

  console.log(`\n--- Bundle Results ---`);
  console.log(`Total transactions: ${bundleTxs.length}`);
  console.log(`Successful: ${signatures.length}`);
  console.log(`Total time: ${elapsed}ms`);
  console.log(`Avg time per tx: ${Math.round(elapsed / bundleTxs.length)}ms`);

  if (signatures.length > 0) {
    console.log(`\n--- Explorer Links ---`);
    signatures.forEach((sig, i) => {
      console.log(`  TX ${i + 1}: ${getExplorerUrl(sig)}`);
    });
  }

  const newBalance = await connection.getBalance(wallet.publicKey);
  console.log(`\nFinal balance: ${newBalance / LAMPORTS_PER_SOL} SOL`);
  console.log(`Total spent: ${(balance - newBalance) / LAMPORTS_PER_SOL} SOL`);

  console.log(`\n--- Note ---`);
  console.log(`On mainnet with Jito Block Engine, these transactions would be`);
  console.log(`submitted as an atomic bundle, guaranteeing execution order.`);
  console.log(`This demo executes them sequentially on devnet to simulate the flow.`);
}

jitoBundle().catch(console.error);
