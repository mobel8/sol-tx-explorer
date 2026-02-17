import { Connection, VersionedTransaction } from "@solana/web3.js";

const JUPITER_API = "https://quote-api.jup.ag/v6";

const SOL_MINT = "So11111111111111111111111111111111111111112";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

export interface SwapQuote {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  priceImpactPct: string;
  routePlan: Array<{
    swapInfo: { label: string; inAmount: string; outAmount: string };
    percent: number;
  }>;
}

export const TOKEN_LIST = [
  { symbol: "SOL", mint: SOL_MINT, decimals: 9 },
  { symbol: "USDC", mint: USDC_MINT, decimals: 6 },
];

export async function getSwapQuote(
  inputMint: string,
  outputMint: string,
  amountRaw: number,
  slippageBps: number = 50
): Promise<SwapQuote> {
  const params = new URLSearchParams({
    inputMint,
    outputMint,
    amount: amountRaw.toString(),
    slippageBps: slippageBps.toString(),
  });

  const res = await fetch(`${JUPITER_API}/quote?${params}`);
  if (!res.ok) throw new Error(`Quote failed: ${res.statusText}`);
  return res.json();
}

export async function buildSwapTransaction(
  quote: SwapQuote,
  userPublicKey: string
): Promise<VersionedTransaction> {
  const res = await fetch(`${JUPITER_API}/swap`, {
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

  if (!res.ok) throw new Error(`Swap build failed: ${res.statusText}`);
  const { swapTransaction } = await res.json();
  const buf = Buffer.from(swapTransaction, "base64");
  return VersionedTransaction.deserialize(buf);
}

export async function executeSwap(
  connection: Connection,
  transaction: VersionedTransaction
): Promise<string> {
  const signature = await connection.sendRawTransaction(
    transaction.serialize(),
    { skipPreflight: false, maxRetries: 3 }
  );
  await connection.confirmTransaction(signature, "confirmed");
  return signature;
}
