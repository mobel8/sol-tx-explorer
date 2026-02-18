import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";

// Program ID loaded from env var — set VITE_PROGRAM_ID in .env.local
// Falls back to the devnet deployment address
const PROGRAM_ID = new PublicKey(
  import.meta.env.VITE_PROGRAM_ID || "H6Yyao9ugYXgXddnjtJ3k2qSBiwbTE7C6kwkW5XwPVEM"
);

export function getVaultPDA(authority: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), authority.toBuffer()],
    PROGRAM_ID
  );
}

export function getTxRecordPDA(
  vault: PublicKey,
  txCount: number
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("tx_record"),
      vault.toBuffer(),
      new anchor.BN(txCount).toArrayLike(Buffer, "le", 8),
    ],
    PROGRAM_ID
  );
}

export interface VaultState {
  authority: string;
  totalDeposited: number;
  totalWithdrawn: number;
  txCount: number;
  balance: number;
  isPaused: boolean;
}

export async function fetchVaultState(
  connection: Connection,
  authority: PublicKey
): Promise<VaultState | null> {
  const [vaultPda] = getVaultPDA(authority);

  try {
    const accountInfo = await connection.getAccountInfo(vaultPda);
    if (!accountInfo) return null;

    const balance = accountInfo.lamports / LAMPORTS_PER_SOL;

    // Vault layout: 8 discriminator + 32 authority + 8 total_deposited +
    //               8 total_withdrawn + 8 tx_count + 1 bump + 1 is_paused = 66 bytes
    // is_paused is at byte offset 65 (0-indexed)
    const data = accountInfo.data;
    const isPaused = data.length >= 66 ? data[65] === 1 : false;

    return {
      authority: authority.toBase58(),
      totalDeposited: 0,
      totalWithdrawn: 0,
      txCount: 0,
      balance,
      isPaused,
    };
  } catch {
    return null;
  }
}
