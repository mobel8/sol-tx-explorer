/**
 * Optimized Transaction Script
 * Benchmarks transaction confirmation times with different priority fee
 * levels and compute unit configurations.
 *
 * Usage: npm run optimized-tx
 */

import {
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
  ComputeBudgetProgram,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { connection, getExplorerUrl } from "./utils/connection";
import { loadWallet } from "./utils/wallet";

interface TxConfig {
  label: string;
  priorityFee: number; // microlamports per compute unit
  computeUnits: number;
  amountSol: number;
}

interface TxResult {
  label: string;
  signature: string;
  timeMs: number;
  fee: number;
  computeUnitsUsed: number;
  success: boolean;
}

const CONFIGS: TxConfig[] = [
  {
    label: "No optimization (baseline)",
    priorityFee: 0,
    computeUnits: 200_000,
    amountSol: 0.001,
  },
  {
    label: "Low priority fee",
    priorityFee: 1_000,
    computeUnits: 200_000,
    amountSol: 0.001,
  },
  {
    label: "Medium priority fee",
    priorityFee: 10_000,
    computeUnits: 200_000,
    amountSol: 0.001,
  },
  {
    label: "High priority + tight CU",
    priorityFee: 50_000,
    computeUnits: 50_000,
    amountSol: 0.001,
  },
];

async function sendWithConfig(
  wallet: Keypair,
  config: TxConfig
): Promise<TxResult> {
  const recipient = Keypair.generate().publicKey;
  const tx = new Transaction();

  if (config.priorityFee > 0) {
    tx.add(
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: config.priorityFee,
      })
    );
  }

  tx.add(
    ComputeBudgetProgram.setComputeUnitLimit({
      units: config.computeUnits,
    })
  );

  tx.add(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: recipient,
      lamports: Math.floor(config.amountSol * LAMPORTS_PER_SOL),
    })
  );

  const start = Date.now();

  try {
    const signature = await sendAndConfirmTransaction(connection, tx, [wallet], {
      commitment: "confirmed",
    });
    const elapsed = Date.now() - start;

    // Fetch tx details for metrics
    const details = await connection.getTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    return {
      label: config.label,
      signature,
      timeMs: elapsed,
      fee: details?.meta?.fee || 0,
      computeUnitsUsed: details?.meta?.computeUnitsConsumed || 0,
      success: true,
    };
  } catch (err) {
    return {
      label: config.label,
      signature: "",
      timeMs: Date.now() - start,
      fee: 0,
      computeUnitsUsed: 0,
      success: false,
    };
  }
}

async function benchmark() {
  console.log("=== SolTx Explorer - Transaction Optimization Benchmark ===\n");

  const wallet = loadWallet();

  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`Balance: ${balance / LAMPORTS_PER_SOL} SOL\n`);

  const totalNeeded = CONFIGS.reduce((sum, c) => sum + c.amountSol, 0) + 0.01;
  if (balance < totalNeeded * LAMPORTS_PER_SOL) {
    console.error(`Need at least ${totalNeeded} SOL. Run: npm run setup-wallet`);
    return;
  }

  console.log(`Running ${CONFIGS.length} transactions with different configs...\n`);

  const results: TxResult[] = [];

  for (const config of CONFIGS) {
    console.log(`  Sending: ${config.label}...`);
    const result = await sendWithConfig(wallet, config);
    results.push(result);

    if (result.success) {
      console.log(`    OK in ${result.timeMs}ms (fee: ${result.fee} lamports)`);
    } else {
      console.log(`    FAILED after ${result.timeMs}ms`);
    }

    // Small delay between transactions
    await new Promise((r) => setTimeout(r, 1000));
  }

  // Display comparison table
  console.log(`\n${"=".repeat(80)}`);
  console.log("BENCHMARK RESULTS");
  console.log(`${"=".repeat(80)}\n`);

  console.log(
    `${"Config".padEnd(35)} | ${"Time".padStart(8)} | ${"Fee".padStart(12)} | ${"CU Used".padStart(10)} | Status`
  );
  console.log(`${"-".repeat(35)}-+-${"-".repeat(8)}-+-${"-".repeat(12)}-+-${"-".repeat(10)}-+-------`);

  for (const r of results) {
    const status = r.success ? " OK " : "FAIL";
    const time = r.success ? `${r.timeMs}ms` : "N/A";
    const fee = r.success ? `${r.fee} lam` : "N/A";
    const cu = r.success ? r.computeUnitsUsed.toString() : "N/A";

    console.log(
      `${r.label.padEnd(35)} | ${time.padStart(8)} | ${fee.padStart(12)} | ${cu.padStart(10)} | ${status}`
    );
  }

  // Analysis
  const successful = results.filter((r) => r.success);
  if (successful.length > 1) {
    const fastest = successful.reduce((a, b) => (a.timeMs < b.timeMs ? a : b));
    const slowest = successful.reduce((a, b) => (a.timeMs > b.timeMs ? a : b));

    console.log(`\n--- Analysis ---`);
    console.log(`Fastest: ${fastest.label} (${fastest.timeMs}ms)`);
    console.log(`Slowest: ${slowest.label} (${slowest.timeMs}ms)`);
    console.log(`Speedup: ${((slowest.timeMs / fastest.timeMs - 1) * 100).toFixed(1)}%`);
  }

  if (successful.length > 0) {
    console.log(`\n--- Explorer Links ---`);
    successful.forEach((r) => {
      console.log(`  ${r.label}: ${getExplorerUrl(r.signature)}`);
    });
  }
}

benchmark().catch(console.error);
