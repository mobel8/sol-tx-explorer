import { Connection, clusterApiUrl, Cluster } from "@solana/web3.js";
import dotenv from "dotenv";

dotenv.config();

const cluster = (process.env.SOLANA_CLUSTER || "devnet") as Cluster;
const rpcUrl = process.env.SOLANA_RPC_URL || clusterApiUrl(cluster);

export const connection = new Connection(rpcUrl, "confirmed");

export function getExplorerUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`;
}

export function getAccountExplorerUrl(address: string): string {
  return `https://explorer.solana.com/address/${address}?cluster=${cluster}`;
}

export { cluster };
