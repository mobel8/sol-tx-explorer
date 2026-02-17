# SolTx Explorer

**Solana Transaction Infrastructure Tool** — Bundle orchestration, on-chain optimization, Jupiter/Jito integration.

![Rust](https://img.shields.io/badge/Rust-000000?style=flat&logo=rust&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Solana](https://img.shields.io/badge/Solana-9945FF?style=flat&logo=solana&logoColor=white)
![Anchor](https://img.shields.io/badge/Anchor-0.29-blue)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=white)

[Live Dashboard](https://app-lemon-five-12.vercel.app) | [GitHub](https://github.com/mobel8/sol-tx-explorer)

---

## Overview

SolTx Explorer is an infrastructure tool for building, optimizing, and monitoring Solana transactions on devnet. It provides:

- **Transaction Builder** — Send SOL with configurable priority fees and compute budget
- **Jupiter Integration** — Token swaps via Jupiter Aggregator (best route across all DEXes)
- **Jito Bundle Simulator** — Ordered atomic transaction bundles with validator tips
- **On-Chain Vault** — Anchor/Rust program for PDA-based SOL custody with CPI transfers
- **Optimization Benchmark** — Compare confirmation times across priority fee configurations
- **Dashboard** — Real-time wallet metrics, transaction history, and explorer links

## Architecture

```
sol-tx-explorer/
├── programs/tx-vault/       # Anchor program (Rust) — on-chain vault
│   └── src/lib.rs           # 4 instructions: initialize, deposit, withdraw, log
├── scripts/                 # CLI tools (TypeScript)
│   ├── send-tx.ts           # Optimized SOL transfer with priority fees
│   ├── jupiter-swap.ts      # Jupiter API v6 swap (SOL <-> USDC)
│   ├── jito-bundle.ts       # Jito bundle simulation with tip transactions
│   └── optimized-tx.ts      # Priority fee benchmark (4 configs compared)
├── app/                     # React dashboard (TypeScript + Tailwind)
│   └── src/
│       ├── pages/           # Dashboard, TxBuilder, Swap, Bundles, Vault
│       ├── services/        # Jupiter, Jito, Vault integration logic
│       └── hooks/           # useSolanaBalance, useTransactionHistory
└── tests/                   # Anchor program tests
    └── tx-vault.ts          # 6 test cases (init, deposit, withdraw, auth, log)
```

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Smart Contract | **Rust + Anchor** | On-chain vault program (PDA, CPI, events) |
| CLI Scripts | **TypeScript + ts-node** | Transaction building and testing |
| Blockchain | **Solana web3.js** | RPC interaction, transaction signing |
| DEX | **Jupiter SDK** | Token swap aggregation |
| MEV | **Jito SDK** | Bundle submission with tips |
| Token | **@solana/spl-token** | SPL token operations |
| Frontend | **React 18 + TypeScript** | Dashboard UI |
| Styling | **Tailwind CSS** | Responsive design with Solana theme |
| Wallet | **Wallet Adapter** | Phantom & Solflare support |

## Key Technical Concepts Demonstrated

- **PDA (Program Derived Address)** — Deterministic vault accounts derived from seeds
- **CPI (Cross-Program Invocation)** — SOL transfers via System Program from Anchor
- **Priority Fees** — `ComputeBudgetProgram.setComputeUnitPrice()` for faster inclusion
- **Compute Optimization** — `setComputeUnitLimit()` to reduce wasted compute
- **Jito Bundles** — Ordered transaction execution with validator tips
- **Jupiter Routing** — Best-price swaps across all Solana DEXes
- **Event Emission** — On-chain events for off-chain indexing
- **Account Validation** — Anchor constraints (`has_one`, `seeds`, `bump`)

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

# Install root dependencies (scripts)
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

# Simulate a Jito bundle (3 transfers + tip)
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
anchor build
anchor test
anchor deploy --provider.cluster devnet
```

## Anchor Program: tx-vault

The on-chain program provides 4 instructions:

| Instruction | Description | Key Concepts |
|------------|-------------|--------------|
| `initialize_vault` | Creates a PDA vault account | PDA derivation, account init |
| `deposit` | Transfers SOL into the vault | CPI to System Program |
| `withdraw` | Withdraws SOL (authority only) | Signature verification, `has_one` |
| `log_transaction` | Records tx metadata on-chain | PDA indexing, event emission |

### Account Structure

```rust
pub struct Vault {
    pub authority: Pubkey,        // Who controls the vault
    pub total_deposited: u64,     // Cumulative deposits (lamports)
    pub total_withdrawn: u64,     // Cumulative withdrawals (lamports)
    pub tx_count: u64,            // Transaction counter
    pub bump: u8,                 // PDA bump seed
}
```

## License

MIT
