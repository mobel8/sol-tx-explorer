import { Keypair } from "@solana/web3.js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const WALLET_PATH =
  process.env.WALLET_PATH ||
  path.join(__dirname, "../../wallet.keypair.json");

export function loadWallet(): Keypair {
  if (!fs.existsSync(WALLET_PATH)) {
    console.log("No wallet found. Generating a new devnet wallet...");
    const keypair = Keypair.generate();
    fs.writeFileSync(WALLET_PATH, JSON.stringify(Array.from(keypair.secretKey)));
    console.log(`Wallet created: ${keypair.publicKey.toBase58()}`);
    console.log(`Saved to: ${WALLET_PATH}`);
    return keypair;
  }

  const secretKey = JSON.parse(fs.readFileSync(WALLET_PATH, "utf-8"));
  const keypair = Keypair.fromSecretKey(Uint8Array.from(secretKey));
  console.log(`Wallet loaded: ${keypair.publicKey.toBase58()}`);
  return keypair;
}

export function getOrCreateWallet(): Keypair {
  return loadWallet();
}
