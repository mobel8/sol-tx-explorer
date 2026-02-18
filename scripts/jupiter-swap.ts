/**
 * Jupiter Swap Script
 * Demonstrates token swapping on Solana using Jupiter Aggregator API v6.
 * Fetches the best route, builds the swap transaction, and executes it.
 *
 * Usage: npm run jupiter-swap
 */

import {
  LAMPORTS_PER_SOL,
  VersionedTransaction,
} from "@solana/web3.js";
import { connection, getExplorerUrl } from "./utils/connection";
import { loadWallet } from "./utils/wallet";

// Token addresses (mainnet-beta addresses, used for quotes)
const SOL_MINT = "So11111111111111111111111111111111111111112";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

const JUPITER_API_URL = "https://quote-api.jup.ag/v6";
const SWAP_AMOUNT_SOL = 0.01;

interface JupiterQuote {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  priceImpactPct: string;
  routePlan: Array<{
    swapInfo: {
      ammKey: string;
      label: string;
      inputMint: string;
      outputMint: string;
      inAmount: string;
      outAmount: string;
      feeAmount: string;
      feeMint: string;
    };
    percent: number;
  }>;
}

async function getQuote(
  inputMint: string,
  outputMint: string,
  amount: number
): Promise<JupiterQuote> {
  const params = new URLSearchParams({
    inputMint,
    outputMint,
    amount: amount.toString(),
    slippageBps: "50", // 0.5% slippage
  });

  const response = await fetch(`${JUPITER_API_URL}/quote?${params}`);

  if (!response.ok) {
    throw new Error(`Jupiter quote failed: ${response.statusText}`);
  }

  return response.json() as Promise<JupiterQuote>;
}

async function getSwapTransaction(
  quote: JupiterQuote,
  userPublicKey: string
): Promise<string> {
  const response = await fetch(`${JUPITER_API_URL}/swap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey,
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: "auto",
    }),
  });

  if (!response.ok) {
    throw new Error(`Jupiter swap failed: ${response.statusText}`);
  }

  const data = await response.json() as { swapTransaction: string };
  return data.swapTransaction;
}

async function jupiterSwap() {
  console.log("=== SolTx Explorer - Jupiter Swap ===\n");

  const wallet = loadWallet();

  // Check balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`Balance: ${balance / LAMPORTS_PER_SOL} SOL\n`);

  if (balance < SWAP_AMOUNT_SOL * LAMPORTS_PER_SOL) {
    console.error("Insufficient balance. Run: npm run setup-wallet");
    return;
  }

  // Step 1: Get quote
  const amountLamports = SWAP_AMOUNT_SOL * LAMPORTS_PER_SOL;
  console.log(`Getting quote: ${SWAP_AMOUNT_SOL} SOL -> USDC...`);

  try {
    const quote = await getQuote(SOL_MINT, USDC_MINT, amountLamports);

    const outAmountUSDC = parseInt(quote.outAmount) / 1_000_000; // USDC has 6 decimals
    console.log(`\n--- Quote ---`);
    console.log(`Input: ${SWAP_AMOUNT_SOL} SOL`);
    console.log(`Output: ${outAmountUSDC.toFixed(6)} USDC`);
    console.log(`Price impact: ${quote.priceImpactPct}%`);
    console.log(`Route: ${quote.routePlan.map((r) => r.swapInfo.label).join(" -> ")}`);

    // Step 2: Get swap transaction
    console.log(`\nBuilding swap transaction...`);
    const swapTxBase64 = await getSwapTransaction(
      quote,
      wallet.publicKey.toBase58()
    );

    // Step 3: Deserialize, sign, and send
    const swapTxBuf = Buffer.from(swapTxBase64, "base64");
    const transaction = VersionedTransaction.deserialize(swapTxBuf);
    transaction.sign([wallet]);

    console.log("Sending swap transaction...");
    const startTime = Date.now();

    const signature = await connection.sendRawTransaction(
      transaction.serialize(),
      {
        skipPreflight: false,
        maxRetries: 3,
      }
    );

    await connection.confirmTransaction(signature, "confirmed");
    const elapsed = Date.now() - startTime;

    console.log(`\n--- Swap Confirmed ---`);
    console.log(`Signature: ${signature}`);
    console.log(`Time: ${elapsed}ms`);
    console.log(`Explorer: ${getExplorerUrl(signature)}`);

    // Check new balance
    const newBalance = await connection.getBalance(wallet.publicKey);
    console.log(`\nNew SOL balance: ${newBalance / LAMPORTS_PER_SOL} SOL`);
  } catch (err) {
    if (err instanceof Error && err.message.includes("quote")) {
      console.log("\nNote: Jupiter quotes may not be available on devnet.");
      console.log("This script demonstrates the full integration flow.");
      console.log("On mainnet, this would execute a real swap via Jupiter.");
    } else {
      console.error("\nSwap failed:", err instanceof Error ? err.message : err);
    }
  }
}

jupiterSwap().catch(console.error);
