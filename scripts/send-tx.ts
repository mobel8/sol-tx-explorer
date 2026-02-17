/**
 * Send Transaction Script
 * Demonstrates sending SOL on Solana devnet with configurable priority fees
 * and compute budget optimization.
 *
 * Usage: npm run send-tx
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

// Configuration
const RECIPIENT = Keypair.generate().publicKey; // Random recipient for demo
const AMOUNT_SOL = 0.01;
const PRIORITY_FEE_MICROLAMPORTS = 1000; // Priority fee per compute unit
const COMPUTE_UNIT_LIMIT = 200_000;

async function sendTransaction() {
  console.log("=== SolTx Explorer - Send Transaction ===\n");

  // Load wallet
  const wallet = loadWallet();

  // Check balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`Balance: ${balance / LAMPORTS_PER_SOL} SOL`);

  if (balance < AMOUNT_SOL * LAMPORTS_PER_SOL) {
    console.error("Insufficient balance. Run: npm run setup-wallet");
    return;
  }

  // Build transaction with compute budget optimization
  const transaction = new Transaction();

  // 1. Set compute unit price (priority fee)
  transaction.add(
    ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: PRIORITY_FEE_MICROLAMPORTS,
    })
  );

  // 2. Set compute unit limit
  transaction.add(
    ComputeBudgetProgram.setComputeUnitLimit({
      units: COMPUTE_UNIT_LIMIT,
    })
  );

  // 3. SOL transfer instruction
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: RECIPIENT,
      lamports: AMOUNT_SOL * LAMPORTS_PER_SOL,
    })
  );

  console.log(`\nSending ${AMOUNT_SOL} SOL to ${RECIPIENT.toBase58()}`);
  console.log(`Priority fee: ${PRIORITY_FEE_MICROLAMPORTS} microlamports/CU`);
  console.log(`Compute limit: ${COMPUTE_UNIT_LIMIT} CU`);

  // Send and confirm
  const startTime = Date.now();

  try {
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [wallet],
      { commitment: "confirmed" }
    );

    const elapsed = Date.now() - startTime;

    console.log(`\n--- Transaction Confirmed ---`);
    console.log(`Signature: ${signature}`);
    console.log(`Time: ${elapsed}ms`);
    console.log(`Explorer: ${getExplorerUrl(signature)}`);

    // Fetch transaction details
    const txDetails = await connection.getTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    if (txDetails?.meta) {
      const fee = txDetails.meta.fee;
      const computeUnitsConsumed = txDetails.meta.computeUnitsConsumed || 0;
      console.log(`\n--- Metrics ---`);
      console.log(`Fee paid: ${fee} lamports (${fee / LAMPORTS_PER_SOL} SOL)`);
      console.log(`Compute units used: ${computeUnitsConsumed}`);
      console.log(`Slot: ${txDetails.slot}`);
    }
  } catch (err) {
    console.error("\nTransaction failed:", err instanceof Error ? err.message : err);
  }
}

sendTransaction().catch(console.error);
