import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";

// Program ID - updated after deployment
const PROGRAM_ID = new PublicKey("11111111111111111111111111111111");

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

    // Simplified parsing - in production, use Anchor IDL deserialization
    return {
      authority: authority.toBase58(),
      totalDeposited: 0,
      totalWithdrawn: 0,
      txCount: 0,
      balance,
    };
  } catch {
    return null;
  }
}
