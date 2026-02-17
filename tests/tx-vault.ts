import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { expect } from "chai";

// Import the generated IDL type (after anchor build)
// import { TxVault } from "../target/types/tx_vault";

describe("tx-vault", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // const program = anchor.workspace.TxVault as Program<TxVault>;
  const program = anchor.workspace.TxVault as Program<any>;
  const authority = provider.wallet;

  let vaultPda: PublicKey;
  let vaultBump: number;

  before(async () => {
    // Derive the vault PDA
    [vaultPda, vaultBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), authority.publicKey.toBuffer()],
      program.programId
    );

    // Airdrop SOL for testing
    const sig = await provider.connection.requestAirdrop(
      authority.publicKey,
      5 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig);
  });

  it("initializes a vault", async () => {
    await program.methods
      .initializeVault()
      .accounts({
        vault: vaultPda,
        authority: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const vault = await program.account.vault.fetch(vaultPda);
    expect(vault.authority.toBase58()).to.equal(authority.publicKey.toBase58());
    expect(vault.totalDeposited.toNumber()).to.equal(0);
    expect(vault.totalWithdrawn.toNumber()).to.equal(0);
    expect(vault.txCount.toNumber()).to.equal(0);
  });

  it("deposits SOL into the vault", async () => {
    const depositAmount = 0.5 * LAMPORTS_PER_SOL;

    await program.methods
      .deposit(new anchor.BN(depositAmount))
      .accounts({
        vault: vaultPda,
        depositor: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const vault = await program.account.vault.fetch(vaultPda);
    expect(vault.totalDeposited.toNumber()).to.equal(depositAmount);
    expect(vault.txCount.toNumber()).to.equal(1);

    // Check vault balance increased
    const vaultBalance = await provider.connection.getBalance(vaultPda);
    expect(vaultBalance).to.be.greaterThan(0);
  });

  it("withdraws SOL from the vault", async () => {
    const withdrawAmount = 0.1 * LAMPORTS_PER_SOL;

    const balanceBefore = await provider.connection.getBalance(
      authority.publicKey
    );

    await program.methods
      .withdraw(new anchor.BN(withdrawAmount))
      .accounts({
        vault: vaultPda,
        authority: authority.publicKey,
      })
      .rpc();

    const vault = await program.account.vault.fetch(vaultPda);
    expect(vault.totalWithdrawn.toNumber()).to.equal(withdrawAmount);
    expect(vault.txCount.toNumber()).to.equal(2);

    const balanceAfter = await provider.connection.getBalance(
      authority.publicKey
    );
    // Balance should have increased (minus tx fee)
    expect(balanceAfter).to.be.greaterThan(balanceBefore - 10000);
  });

  it("prevents unauthorized withdrawal", async () => {
    const attacker = Keypair.generate();

    // Airdrop to attacker so they can pay for tx
    const sig = await provider.connection.requestAirdrop(
      attacker.publicKey,
      1 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig);

    try {
      await program.methods
        .withdraw(new anchor.BN(0.01 * LAMPORTS_PER_SOL))
        .accounts({
          vault: vaultPda,
          authority: attacker.publicKey,
        })
        .signers([attacker])
        .rpc();

      // Should not reach here
      expect.fail("Should have thrown an error");
    } catch (err: any) {
      // Expect a constraint error (unauthorized or PDA mismatch)
      expect(err).to.exist;
    }
  });

  it("logs a transaction record", async () => {
    const vault = await program.account.vault.fetch(vaultPda);
    const txCount = vault.txCount.toNumber();

    const [txRecordPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("tx_record"),
        vaultPda.toBuffer(),
        new anchor.BN(txCount).toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    await program.methods
      .logTransaction(
        { transfer: {} }, // TxType::Transfer
        new anchor.BN(0.05 * LAMPORTS_PER_SOL),
        "Test transfer to external wallet"
      )
      .accounts({
        vault: vaultPda,
        txRecord: txRecordPda,
        authority: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const record = await program.account.transactionRecord.fetch(txRecordPda);
    expect(record.vault.toBase58()).to.equal(vaultPda.toBase58());
    expect(record.amount.toNumber()).to.equal(0.05 * LAMPORTS_PER_SOL);
    expect(record.description).to.equal("Test transfer to external wallet");
    expect(record.timestamp.toNumber()).to.be.greaterThan(0);
  });

  it("rejects zero-amount deposit", async () => {
    try {
      await program.methods
        .deposit(new anchor.BN(0))
        .accounts({
          vault: vaultPda,
          depositor: authority.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      expect.fail("Should have thrown InvalidAmount error");
    } catch (err: any) {
      expect(err.toString()).to.include("InvalidAmount");
    }
  });
});
