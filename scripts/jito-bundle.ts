/**
 * Jito Bundle Script
 *
 * Demonstrates real Jito bundle submission using the jito-ts SDK.
 *
 * On mainnet (SOLANA_CLUSTER=mainnet-beta + JITO_BLOCK_ENGINE_URL set):
 *   → Submits a true atomic bundle via SearcherClient gRPC.
 *   → All transactions land in the same slot in order, or none land.
 *
 * On devnet (default):
 *   → Jito Block Engine does not exist on devnet.
 *   → Falls back to sequential submission with a clear warning.
 *   → Bundle construction logic (tip, ordering, compute budget) is identical.
 *
 * Usage:
 *   npm run jito-bundle                          # devnet simulation
 *   SOLANA_CLUSTER=mainnet-beta npm run jito-bundle  # mainnet (needs JITO_BLOCK_ENGINE_URL)
 */

import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
  ComputeBudgetProgram,
  sendAndConfirmTransaction,
  Transaction,
} from "@solana/web3.js";
import { searcherClient } from "jito-ts/dist/sdk/block-engine/searcher";
import { Bundle } from "jito-ts/dist/sdk/block-engine/types";
import { connection, getExplorerUrl } from "./utils/connection";
import { loadWallet } from "./utils/wallet";

// ─── Configuration ─────────────────────────────────────────────────────────

const CLUSTER = process.env.SOLANA_CLUSTER ?? "devnet";
const IS_MAINNET = CLUSTER === "mainnet-beta";

// Default Block Engine URL for mainnet. Override via env var for other regions
// (e.g. "amsterdam.mainnet.block-engine.jito.wtf:443").
const BLOCK_ENGINE_URL =
  process.env.JITO_BLOCK_ENGINE_URL ?? "mainnet.block-engine.jito.wtf:443";

// Jito accepts a maximum of 5 transactions per bundle.
const MAX_BUNDLE_SIZE = 5;

const TIP_AMOUNT_SOL = 0.0001;
const TRANSFER_AMOUNT_SOL = 0.001;

// Official Jito tip accounts (mainnet). Randomizing distributes tips evenly
// across validators and avoids front-running patterns on tip accounts themselves.
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

function getRandomTipAccount(): PublicKey {
  const index = Math.floor(Math.random() * JITO_TIP_ACCOUNTS.length);
  return new PublicKey(JITO_TIP_ACCOUNTS[index]);
}

// ─── Transaction Construction ───────────────────────────────────────────────

/**
 * Build a VersionedTransaction (v0) transferring SOL with a priority fee.
 * Jito bundles require VersionedTransaction — legacy Transaction is not supported.
 */
async function buildTransferTx(
  from: Keypair,
  to: PublicKey,
  amountSol: number,
  priorityFeeMicroLamports: number,
  blockhash: string
): Promise<VersionedTransaction> {
  const instructions = [
    // Priority fee must be added BEFORE the business instruction.
    ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: priorityFeeMicroLamports,
    }),
    ComputeBudgetProgram.setComputeUnitLimit({
      units: 200_000,
    }),
    SystemProgram.transfer({
      fromPubkey: from.publicKey,
      toPubkey: to,
      lamports: Math.floor(amountSol * LAMPORTS_PER_SOL),
    }),
  ];

  const message = new TransactionMessage({
    payerKey: from.publicKey,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message();

  const tx = new VersionedTransaction(message);
  tx.sign([from]);
  return tx;
}

// ─── Mainnet: Real Atomic Bundle Submission ─────────────────────────────────

/**
 * Submit transactions as a true atomic Jito bundle on mainnet.
 *
 * Flow:
 *   1. Build VersionedTransactions (all sharing the same blockhash).
 *   2. Create a Bundle and add the tip via addTipTx.
 *   3. Connect to the Block Engine via gRPC (searcherClient).
 *   4. Send the bundle — returns a UUID on acceptance.
 *   5. Listen to onBundleResult for final status (Landed / Failed / Dropped).
 *
 * Atomicity guarantee: the Block Engine includes all transactions in the same
 * slot in order, or none. There is no partial execution.
 */
async function submitRealBundle(
  transactions: VersionedTransaction[],
  wallet: Keypair,
  blockhash: string
): Promise<string> {
  console.log(`  Connecting to Block Engine: ${BLOCK_ENGINE_URL}`);

  // The searcherClient authenticates via keypair — this identifies the searcher
  // to Jito. Production bots use a whitelisted keypair registered with Jito.
  const client = searcherClient(BLOCK_ENGINE_URL, wallet);

  // Build the Bundle. addTipTx appends the tip as the last transaction —
  // this is required by the Jito protocol for bundle identification.
  const tipAccount = getRandomTipAccount();
  const tipLamports = Math.floor(TIP_AMOUNT_SOL * LAMPORTS_PER_SOL);

  let bundle = new Bundle(transactions, MAX_BUNDLE_SIZE);
  const bundleOrError = bundle.addTipTx(
    wallet,
    tipLamports,
    tipAccount,
    blockhash
  );
  if (bundleOrError instanceof Error) {
    throw new Error(`Failed to add tip tx: ${bundleOrError.message}`);
  }
  bundle = bundleOrError;

  console.log(`  Tip: ${TIP_AMOUNT_SOL} SOL → ${tipAccount.toBase58().slice(0, 20)}...`);

  // sendBundle returns the bundle UUID on acceptance by the Block Engine.
  // Acceptance ≠ inclusion — the bundle may still be dropped if the tip is
  // too low relative to other searchers competing for the same slot.
  const bundleId = await client.sendBundle(bundle);
  console.log(`  Bundle submitted — UUID: ${bundleId}`);

  // Listen for the final result via the streaming API.
  // Possible statuses: Landed (included in a block), Failed (revert),
  // Dropped (tip too low or timeout).
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Bundle status timeout after 30s — may have been dropped (tip too low?)"));
    }, 30_000);

    const cancel = client.onBundleResult(
      (result) => {
        if (result.bundleId === bundleId) {
          clearTimeout(timeout);
          cancel();
          if (result.accepted) {
            console.log(`  Bundle LANDED in slot: ${result.accepted.slot}`);
            resolve(bundleId);
          } else if (result.rejected) {
            const reason =
              result.rejected.simulationFailure?.msg ??
              result.rejected.droppedBundle?.msg ??
              "unknown reason";
            reject(new Error(`Bundle rejected: ${reason}`));
          }
        }
      },
      (err) => {
        clearTimeout(timeout);
        reject(err);
      }
    );
  });
}

// ─── Devnet Fallback: Sequential Simulation ─────────────────────────────────

/**
 * Devnet fallback — no Jito Block Engine exists on devnet.
 *
 * Sends each transaction individually via the standard RPC. This is NOT atomic:
 * transactions are independent and can be reordered or partially confirmed.
 * The bundle construction logic (tip placement, compute budget, ordering) is
 * identical to mainnet — only the transport differs.
 */
async function submitSequentialFallback(
  legacyTxs: Array<{ label: string; tx: Transaction }>,
  wallet: Keypair
): Promise<string[]> {
  console.log("\n  ⚠  DEVNET MODE — Sequential fallback (no Block Engine on devnet)");
  console.log("  On mainnet, set SOLANA_CLUSTER=mainnet-beta and JITO_BLOCK_ENGINE_URL");
  console.log("  for true atomic bundle submission.\n");

  const signatures: string[] = [];
  for (const { label, tx } of legacyTxs) {
    try {
      const sig = await sendAndConfirmTransaction(connection, tx, [wallet], {
        commitment: "confirmed",
      });
      signatures.push(sig);
      console.log(`  ✓ ${label}: ${sig.slice(0, 20)}...`);
    } catch (err) {
      console.error(`  ✗ ${label}: ${err instanceof Error ? err.message : err}`);
    }
  }
  return signatures;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function jitoBundle() {
  console.log("=== SolTx Explorer — Jito Bundle ===");
  console.log(`Cluster  : ${CLUSTER}`);
  console.log(`Mode     : ${IS_MAINNET ? "MAINNET (real atomic bundle)" : "DEVNET (sequential fallback)"}\n`);

  const wallet = loadWallet();
  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`Balance  : ${balance / LAMPORTS_PER_SOL} SOL`);

  const totalNeeded = (TRANSFER_AMOUNT_SOL * 3 + TIP_AMOUNT_SOL) * LAMPORTS_PER_SOL;
  if (balance < totalNeeded) {
    console.error(`Need at least ${totalNeeded / LAMPORTS_PER_SOL} SOL. Run: npm run setup-wallet`);
    return;
  }

  const recipient1 = Keypair.generate().publicKey;
  const recipient2 = Keypair.generate().publicKey;
  const recipient3 = Keypair.generate().publicKey;

  console.log("\n--- Bundle (3 ordered transfers + tip) ---");

  if (IS_MAINNET) {
    // ── Mainnet path: real atomic bundle ──────────────────────────────────

    const { blockhash } = await connection.getLatestBlockhash("confirmed");

    const transactions = await Promise.all([
      buildTransferTx(wallet, recipient1, TRANSFER_AMOUNT_SOL, 5_000, blockhash),
      buildTransferTx(wallet, recipient2, TRANSFER_AMOUNT_SOL, 3_000, blockhash),
      buildTransferTx(wallet, recipient3, TRANSFER_AMOUNT_SOL, 1_000, blockhash),
    ]);

    console.log("Transactions built. Submitting atomic bundle...\n");
    const start = Date.now();

    try {
      const bundleId = await submitRealBundle(transactions, wallet, blockhash);
      console.log(`\nBundle landed. ID: ${bundleId}`);
      console.log(`Time: ${Date.now() - start}ms`);
    } catch (err) {
      console.error(`\nBundle failed: ${err instanceof Error ? err.message : err}`);
    }
  } else {
    // ── Devnet path: sequential fallback ──────────────────────────────────

    const tipAccount = getRandomTipAccount();

    const makeTx = (to: PublicKey, priorityFee: number) => {
      const tx = new Transaction();
      tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }));
      tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }));
      tx.add(SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: to,
        lamports: Math.floor(TRANSFER_AMOUNT_SOL * LAMPORTS_PER_SOL),
      }));
      return tx;
    };

    const legacyTxs = [
      { label: "Transfer #1 (5 000 μlamports)", tx: makeTx(recipient1, 5_000) },
      { label: "Transfer #2 (3 000 μlamports)", tx: makeTx(recipient2, 3_000) },
      { label: "Transfer #3 (1 000 μlamports)", tx: makeTx(recipient3, 1_000) },
      {
        label: "Jito Tip",
        tx: new Transaction().add(SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: tipAccount,
          lamports: Math.floor(TIP_AMOUNT_SOL * LAMPORTS_PER_SOL),
        })),
      },
    ];

    const start = Date.now();
    const signatures = await submitSequentialFallback(legacyTxs, wallet);
    const elapsed = Date.now() - start;

    console.log(`\n--- Results ---`);
    console.log(`Confirmed: ${signatures.length}/${legacyTxs.length} | Time: ${elapsed}ms`);

    if (signatures.length > 0) {
      console.log("\n--- Explorer Links ---");
      signatures.forEach((sig, i) => {
        console.log(`  TX ${i + 1}: ${getExplorerUrl(sig)}`);
      });
    }
  }

  const finalBalance = await connection.getBalance(wallet.publicKey);
  console.log(`\nFinal balance: ${finalBalance / LAMPORTS_PER_SOL} SOL`);
}

jitoBundle().catch(console.error);
