# SolTx Explorer

**Solana Transaction Infrastructure Tool** — Bundle orchestration, on-chain optimization, Jupiter/Jito integration, kill switch.

![Rust](https://img.shields.io/badge/Rust-000000?style=flat&logo=rust&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Solana](https://img.shields.io/badge/Solana-9945FF?style=flat&logo=solana&logoColor=white)
![Anchor](https://img.shields.io/badge/Anchor-0.29-blue)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=white)

[Live Dashboard](https://sol-tx-explorer.vercel.app) | [GitHub](https://github.com/mobel8/sol-tx-explorer)

---

## Overview

SolTx Explorer is an infrastructure tool for building, optimizing, and monitoring Solana transactions on devnet. It provides:

- **Transaction Builder** — Send SOL with configurable priority fees and compute budget
- **Jupiter Integration** — Token swaps via Jupiter Aggregator (best route across all DEXes)
- **Jito Bundle** — Real atomic bundles via `jito-ts` SDK (SearcherClient + gRPC, devnet fallback)
- **On-Chain Vault** — Anchor/Rust program for PDA-based SOL custody with 7 instructions
- **Kill Switch** — Emergency pause/resume mechanism for the vault (on-chain safety guard)
- **Optimization Benchmark** — Compare confirmation times across priority fee configurations
- **Dashboard** — Real-time wallet metrics, transaction history, and explorer links

## Architecture

```
sol-tx-explorer/
├── programs/tx-vault/       # Anchor program (Rust) — on-chain vault
│   └── src/lib.rs           # 7 instructions: init, deposit, withdraw, log,
│                            #   emergency_pause, resume_vault, close_vault
├── scripts/                 # CLI tools (TypeScript)
│   ├── send-tx.ts           # Optimized SOL transfer with priority fees
│   ├── jupiter-swap.ts      # Jupiter API v6 swap (SOL <-> USDC)
│   ├── jito-bundle.ts       # Real Jito bundle (searcherClient + devnet fallback)
│   └── optimized-tx.ts      # Priority fee benchmark (4 configs compared)
├── app/                     # React dashboard (TypeScript + Tailwind)
│   └── src/
│       ├── pages/           # Dashboard, TxBuilder, Swap, Bundles, Vault
│       ├── services/        # Jupiter, Jito, Vault integration logic
│       └── hooks/           # useSolanaBalance, useTransactionHistory
└── tests/                   # Anchor program tests
    └── tx-vault.ts          # 10 test cases (init, deposit, withdraw, auth, log,
                             #   zero-amount, kill switch x4)
```

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Smart Contract | **Rust + Anchor** | On-chain vault program (PDA, CPI, events) |
| CLI Scripts | **TypeScript + ts-node** | Transaction building and testing |
| Blockchain | **Solana web3.js** | RPC interaction, transaction signing |
| DEX | **Jupiter SDK** | Token swap aggregation |
| MEV | **jito-ts SDK** | Real bundle submission (SearcherClient + gRPC) |
| Token | **@solana/spl-token** | SPL token operations |
| Frontend | **React 18 + TypeScript** | Dashboard UI |
| Styling | **Tailwind CSS** | Responsive design with Solana theme |
| Wallet | **Wallet Adapter** | Phantom & Solflare support |

## Key Technical Concepts Demonstrated

- **PDA (Program Derived Address)** — Deterministic vault accounts derived from seeds
- **CPI (Cross-Program Invocation)** — SOL transfers via System Program from Anchor
- **Kill Switch** — `is_paused` bool on-chain, guards deposit/withdraw with `require!`
- **Priority Fees** — `ComputeBudgetProgram.setComputeUnitPrice()` for faster inclusion
- **Compute Optimization** — `setComputeUnitLimit()` to reduce wasted compute
- **Jito Bundles** — Real `searcherClient.sendBundle()` with `VersionedTransaction` + tip
- **Jupiter Routing** — Best-price swaps across all Solana DEXes
- **Event Emission** — On-chain events for off-chain indexing
- **Account Validation** — Anchor constraints (`has_one`, `seeds`, `bump`, `close`)

## Setup

### Prerequisites

- Rust & Cargo (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)
- Node.js 18+ & npm
- Solana CLI (`sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"`)
- Anchor CLI (`cargo install --git https://github.com/coral-xyz/anchor anchor-cli`)

### Installation

```bash
# Clone the repository
git clone https://github.com/mobel8/sol-tx-explorer.git
cd sol-tx-explorer

# Install root dependencies (scripts + tests)
npm install

# Install frontend dependencies
cd app && npm install && cd ..

# Setup devnet wallet and airdrop SOL
npm run setup-wallet
```

### Running Scripts

```bash
# Send an optimized transaction
npm run send-tx

# Execute a Jupiter swap (SOL -> USDC)
npm run jupiter-swap

# Submit a real Jito bundle (mainnet) or sequential fallback (devnet)
npm run jito-bundle

# Run the priority fee benchmark
npm run optimized-tx
```

### Running the Dashboard

```bash
cd app
npm run dev
# Open http://localhost:5173
```

### Building the Anchor Program

```bash
# Build SBF binary (Solana 3.x)
cargo build-sbf

# Run tests (10 cases)
anchor test

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

## Anchor Program: tx-vault

> **Deployed on devnet** — Program ID: [`H6Yyao9ugYXgXddnjtJ3k2qSBiwbTE7C6kwkW5XwPVEM`](https://explorer.solana.com/address/H6Yyao9ugYXgXddnjtJ3k2qSBiwbTE7C6kwkW5XwPVEM?cluster=devnet)

The on-chain program provides **7 instructions**:

| Instruction | Description | Key Concepts |
|------------|-------------|--------------|
| `initialize_vault` | Creates a PDA vault account | PDA derivation, account init |
| `deposit` | Transfers SOL into the vault (blocked if paused) | CPI to System Program |
| `withdraw` | Withdraws SOL (authority only, blocked if paused) | `has_one`, kill switch guard |
| `log_transaction` | Records tx metadata on-chain | PDA indexing, event emission |
| `emergency_pause` | Freezes vault — no deposit/withdraw | Kill switch, `is_paused = true` |
| `resume_vault` | Re-enables vault operations | Kill switch, `is_paused = false` |
| `close_vault` | Closes vault, returns rent to authority | Anchor `close =` constraint |

### Account Structure

```rust
pub struct Vault {
    pub authority: Pubkey,        // Who controls the vault
    pub total_deposited: u64,     // Cumulative deposits (lamports)
    pub total_withdrawn: u64,     // Cumulative withdrawals (lamports)
    pub tx_count: u64,            // Transaction counter
    pub bump: u8,                 // PDA bump seed
    pub is_paused: bool,          // Kill switch — emergency stop flag
}
// SPACE = 8 (discriminator) + 32 + 8 + 8 + 8 + 1 + 1 = 66 bytes
```

### Events

| Event | Emitted by | Fields |
|-------|-----------|--------|
| `VaultCreated` | `initialize_vault` | `vault`, `authority` |
| `DepositEvent` | `deposit` | `vault`, `depositor`, `amount`, `total_deposited` |
| `WithdrawEvent` | `withdraw` | `vault`, `authority`, `amount`, `total_withdrawn` |
| `TransactionLogged` | `log_transaction` | `vault`, `tx_type`, `amount`, `description`, `timestamp` |
| `VaultPaused` | `emergency_pause` | `vault`, `authority`, `timestamp` |
| `VaultResumed` | `resume_vault` | `vault`, `authority`, `timestamp` |

### Errors

| Code | Description |
|------|-------------|
| `InvalidAmount` | Amount must be > 0 |
| `InsufficientFunds` | Vault balance too low |
| `Unauthorized` | Only authority can perform this action |
| `Overflow` | Arithmetic overflow |
| `DescriptionTooLong` | Description exceeds 128 characters |
| `VaultPaused` | Emergency stop is active — vault is frozen |

## Jito Bundle — Real SDK Integration

`scripts/jito-bundle.ts` uses the real `jito-ts` SDK:

```
IS_MAINNET=true → searcherClient (gRPC) → Bundle (VersionedTransaction[]) → sendBundle → onBundleResult
IS_MAINNET=false → sequential fallback (devnet, Jito Block Engine not available)
```

Key constraints respected:
- `Bundle` requires `VersionedTransaction` (v0), not legacy `Transaction`
- Tip TX appended last via `bundle.addTipTx()` (Jito protocol requirement)
- `onBundleResult()` stream with 30s timeout for result confirmation

## License

MIT
