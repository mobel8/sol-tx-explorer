/**
 * Setup Wallet Script
 * Generates a devnet wallet and requests an airdrop of SOL for testing.
 *
 * Usage: npm run setup-wallet
 */

import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { connection, getAccountExplorerUrl } from "./utils/connection";
import { getOrCreateWallet } from "./utils/wallet";

async function main() {
  console.log("=== SolTx Explorer - Wallet Setup ===\n");

  const wallet = getOrCreateWallet();
  const publicKey = wallet.publicKey;

  // Check current balance
  const balance = await connection.getBalance(publicKey);
  console.log(`Current balance: ${balance / LAMPORTS_PER_SOL} SOL`);

  // Airdrop if balance is low
  if (balance < 1 * LAMPORTS_PER_SOL) {
    console.log("\nRequesting airdrop of 2 SOL...");
    try {
      const sig = await connection.requestAirdrop(
        publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await connection.confirmTransaction(sig, "confirmed");
      const newBalance = await connection.getBalance(publicKey);
      console.log(`Airdrop successful! New balance: ${newBalance / LAMPORTS_PER_SOL} SOL`);
    } catch (err) {
      console.error("Airdrop failed (rate limited?). Try again later.");
      console.error(err instanceof Error ? err.message : err);
    }
  } else {
    console.log("Balance sufficient, skipping airdrop.");
  }

  console.log(`\nExplorer: ${getAccountExplorerUrl(publicKey.toBase58())}`);
  console.log("\nWallet setup complete!");
}

main().catch(console.error);
