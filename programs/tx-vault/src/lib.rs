use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("11111111111111111111111111111111"); // Placeholder - updated after deploy

/// Tx-Vault: On-chain vault program for Solana transaction orchestration.
///
/// This program provides:
/// - Vault creation with PDA (Program Derived Address)
/// - SOL deposits via CPI (Cross-Program Invocation)
/// - Authorized withdrawals with signature verification
/// - On-chain transaction logging with event emission
/// - Emergency pause / resume (kill switch) for incident response
#[program]
pub mod tx_vault {
    use super::*;

    /// Initialize a new vault with the caller as authority.
    /// The vault account is a PDA derived from ["vault", authority].
    pub fn initialize_vault(ctx: Context<InitializeVault>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.authority = ctx.accounts.authority.key();
        vault.total_deposited = 0;
        vault.total_withdrawn = 0;
        vault.tx_count = 0;
        vault.bump = ctx.bumps.vault;
        vault.is_paused = false;

        emit!(VaultCreated {
            vault: vault.key(),
            authority: vault.authority,
        });

        msg!("Vault initialized for authority: {}", vault.authority);
        Ok(())
    }

    /// Deposit SOL into the vault via CPI to the System Program.
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        // Kill switch: reject all deposits when vault is paused
        require!(!ctx.accounts.vault.is_paused, VaultError::VaultPaused);
        require!(amount > 0, VaultError::InvalidAmount);

        // CPI: Transfer SOL from depositor to vault PDA
        let cpi_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.depositor.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            },
        );
        system_program::transfer(cpi_ctx, amount)?;

        // Update vault state
        let vault = &mut ctx.accounts.vault;
        vault.total_deposited = vault
            .total_deposited
            .checked_add(amount)
            .ok_or(VaultError::Overflow)?;
        vault.tx_count = vault.tx_count.checked_add(1).ok_or(VaultError::Overflow)?;

        emit!(DepositEvent {
            vault: vault.key(),
            depositor: ctx.accounts.depositor.key(),
            amount,
            total_deposited: vault.total_deposited,
        });

        msg!("Deposited {} lamports into vault", amount);
        Ok(())
    }

    /// Withdraw SOL from the vault. Only the authority can withdraw.
    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        // Kill switch: reject all withdrawals when vault is paused
        require!(!ctx.accounts.vault.is_paused, VaultError::VaultPaused);
        require!(amount > 0, VaultError::InvalidAmount);

        let vault = &mut ctx.accounts.vault;

        // Verify the vault has enough balance
        let vault_balance = vault.to_account_info().lamports();
        let rent_exempt = Rent::get()?.minimum_balance(Vault::SPACE);
        let available = vault_balance.saturating_sub(rent_exempt);

        require!(amount <= available, VaultError::InsufficientFunds);

        // Transfer SOL from vault PDA to authority.
        // For PDA-owned accounts, we modify lamports directly — a CPI via
        // system_program::transfer would fail because the vault PDA is owned
        // by this program, not by the System Program.
        **vault.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx
            .accounts
            .authority
            .to_account_info()
            .try_borrow_mut_lamports()? += amount;

        vault.total_withdrawn = vault
            .total_withdrawn
            .checked_add(amount)
            .ok_or(VaultError::Overflow)?;
        vault.tx_count = vault.tx_count.checked_add(1).ok_or(VaultError::Overflow)?;

        emit!(WithdrawEvent {
            vault: vault.key(),
            authority: ctx.accounts.authority.key(),
            amount,
            total_withdrawn: vault.total_withdrawn,
        });

        msg!("Withdrew {} lamports from vault", amount);
        Ok(())
    }

    /// Freeze all vault operations immediately.
    /// Only the authority can pause. Idempotent (pausing an already-paused
    /// vault is a no-op rather than an error, for safe retries under load).
    pub fn emergency_pause(ctx: Context<EmergencyPause>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.is_paused = true;

        emit!(VaultPaused {
            vault: vault.key(),
            authority: ctx.accounts.authority.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        msg!(
            "VAULT PAUSED — emergency stop activated by {}",
            ctx.accounts.authority.key()
        );
        Ok(())
    }

    /// Resume vault operations after an emergency pause.
    /// Only the authority can resume.
    pub fn resume_vault(ctx: Context<EmergencyPause>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.is_paused = false;

        emit!(VaultResumed {
            vault: vault.key(),
            authority: ctx.accounts.authority.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        msg!("Vault resumed by {}", ctx.accounts.authority.key());
        Ok(())
    }

    /// Close the vault, reclaiming all SOL (balance + rent) to the authority.
    /// Irreversible — the account is deleted from the blockchain.
    pub fn close_vault(_ctx: Context<CloseVault>) -> Result<()> {
        // The `close = authority` constraint on the vault account handles
        // zeroing the discriminator and transferring all lamports to authority.
        msg!("Vault closed — all funds returned to authority");
        Ok(())
    }

    /// Log a transaction record on-chain for audit/tracking purposes.
    pub fn log_transaction(
        ctx: Context<LogTransaction>,
        tx_type: TxType,
        amount: u64,
        description: String,
    ) -> Result<()> {
        require!(description.len() <= 128, VaultError::DescriptionTooLong);

        let record = &mut ctx.accounts.tx_record;
        record.vault = ctx.accounts.vault.key();
        record.authority = ctx.accounts.authority.key();
        record.tx_type = tx_type;
        record.amount = amount;
        record.description = description.clone();
        record.timestamp = Clock::get()?.unix_timestamp;
        record.slot = Clock::get()?.slot;

        let vault = &mut ctx.accounts.vault;
        vault.tx_count = vault.tx_count.checked_add(1).ok_or(VaultError::Overflow)?;

        emit!(TransactionLogged {
            vault: vault.key(),
            tx_type,
            amount,
            description,
            timestamp: record.timestamp,
        });

        msg!("Transaction logged: type={:?}, amount={}", tx_type, amount);
        Ok(())
    }
}

// ============================================================================
// Account Structures
// ============================================================================

/// Main vault account, stored as a PDA.
#[account]
pub struct Vault {
    /// The authority who controls this vault (can withdraw and pause).
    pub authority: Pubkey,
    /// Total SOL deposited (cumulative, in lamports).
    pub total_deposited: u64,
    /// Total SOL withdrawn (cumulative, in lamports).
    pub total_withdrawn: u64,
    /// Total number of transactions recorded.
    pub tx_count: u64,
    /// PDA bump seed.
    pub bump: u8,
    /// Kill switch: when true, all deposits and withdrawals are rejected.
    pub is_paused: bool,
}

impl Vault {
    /// Space: 8 (discriminator) + 32 + 8 + 8 + 8 + 1 + 1 = 66
    pub const SPACE: usize = 8 + 32 + 8 + 8 + 8 + 1 + 1;
}

/// On-chain transaction record for audit logging.
#[account]
pub struct TransactionRecord {
    /// The vault this record belongs to.
    pub vault: Pubkey,
    /// The authority who created this record.
    pub authority: Pubkey,
    /// Type of transaction.
    pub tx_type: TxType,
    /// Amount in lamports.
    pub amount: u64,
    /// Human-readable description (max 128 chars).
    pub description: String,
    /// Unix timestamp when recorded.
    pub timestamp: i64,
    /// Slot when recorded.
    pub slot: u64,
}

impl TransactionRecord {
    /// Space: 8 + 32 + 32 + 1 + 8 + (4 + 128) + 8 + 8 = 229
    pub const SPACE: usize = 8 + 32 + 32 + 1 + 8 + (4 + 128) + 8 + 8;
}

/// Transaction type enum for logging.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub enum TxType {
    Deposit,
    Withdraw,
    Swap,
    Bundle,
    Transfer,
}

// ============================================================================
// Instruction Contexts (Account Validation)
// ============================================================================

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(
        init,
        payer = authority,
        space = Vault::SPACE,
        seeds = [b"vault", authority.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, Vault>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(
        mut,
        seeds = [b"vault", vault.authority.as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, Vault>,

    #[account(mut)]
    pub depositor: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        mut,
        seeds = [b"vault", vault.authority.as_ref()],
        bump = vault.bump,
        has_one = authority @ VaultError::Unauthorized,
    )]
    pub vault: Account<'info, Vault>,

    #[account(mut)]
    pub authority: Signer<'info>,
}

/// Shared context for emergency_pause and resume_vault.
/// Only the vault authority can call either instruction.
#[derive(Accounts)]
pub struct EmergencyPause<'info> {
    #[account(
        mut,
        seeds = [b"vault", vault.authority.as_ref()],
        bump = vault.bump,
        has_one = authority @ VaultError::Unauthorized,
    )]
    pub vault: Account<'info, Vault>,

    pub authority: Signer<'info>,
}

/// Close the vault and reclaim rent to the authority.
/// The `close = authority` constraint zeroes the account and
/// transfers all lamports (balance + rent) to authority.
#[derive(Accounts)]
pub struct CloseVault<'info> {
    #[account(
        mut,
        close = authority,
        seeds = [b"vault", vault.authority.as_ref()],
        bump = vault.bump,
        has_one = authority @ VaultError::Unauthorized,
    )]
    pub vault: Account<'info, Vault>,

    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct LogTransaction<'info> {
    #[account(
        mut,
        seeds = [b"vault", vault.authority.as_ref()],
        bump = vault.bump,
        has_one = authority @ VaultError::Unauthorized,
    )]
    pub vault: Account<'info, Vault>,

    #[account(
        init,
        payer = authority,
        space = TransactionRecord::SPACE,
        seeds = [
            b"tx_record",
            vault.key().as_ref(),
            &vault.tx_count.to_le_bytes(),
        ],
        bump,
    )]
    pub tx_record: Account<'info, TransactionRecord>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

// ============================================================================
// Events (for off-chain indexing)
// ============================================================================

#[event]
pub struct VaultCreated {
    pub vault: Pubkey,
    pub authority: Pubkey,
}

#[event]
pub struct DepositEvent {
    pub vault: Pubkey,
    pub depositor: Pubkey,
    pub amount: u64,
    pub total_deposited: u64,
}

#[event]
pub struct WithdrawEvent {
    pub vault: Pubkey,
    pub authority: Pubkey,
    pub amount: u64,
    pub total_withdrawn: u64,
}

#[event]
pub struct VaultPaused {
    pub vault: Pubkey,
    pub authority: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct VaultResumed {
    pub vault: Pubkey,
    pub authority: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct TransactionLogged {
    pub vault: Pubkey,
    pub tx_type: TxType,
    pub amount: u64,
    pub description: String,
    pub timestamp: i64,
}

// ============================================================================
// Errors
// ============================================================================

#[error_code]
pub enum VaultError {
    #[msg("Invalid amount: must be greater than 0")]
    InvalidAmount,

    #[msg("Insufficient funds in vault")]
    InsufficientFunds,

    #[msg("Unauthorized: only the vault authority can perform this action")]
    Unauthorized,

    #[msg("Arithmetic overflow")]
    Overflow,

    #[msg("Description too long: max 128 characters")]
    DescriptionTooLong,

    #[msg("Vault is paused — emergency stop is active, contact the authority")]
    VaultPaused,
}
