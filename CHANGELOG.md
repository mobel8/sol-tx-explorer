# CHANGELOG — SolTx Explorer

> Journal complet des mises à jour, décisions techniques et état du projet.
> Dernière mise à jour : **2026-02-18**

---

## Table des matières

1. [État actuel du projet](#1-état-actuel-du-projet)
2. [Session 2 — 2026-02-18 : Kill Switch + Jito Réel + Corrections](#2-session-2--2026-02-18--kill-switch--jito-réel--corrections)
3. [Session 1 — Construction initiale (26 commits)](#3-session-1--construction-initiale-26-commits)
4. [Plan d'origine (archivé)](#4-plan-dorigine-archivé)
5. [Métriques du projet](#5-métriques-du-projet)

---

## 1. État actuel du projet

### Résumé

| Élément | Valeur |
|---------|--------|
| Version | 1.1.0 |
| Date | 2026-02-18 |
| Git commits | 26 (session 1) + mises à jour session 2 |
| Réseau cible | Solana Devnet |
| Programme on-chain | `H6Yyao9ugYXgXddnjtJ3k2qSBiwbTE7C6kwkW5XwPVEM` |
| Dashboard live | https://sol-tx-explorer.vercel.app |
| GitHub | https://github.com/mobel8/sol-tx-explorer |
| Wallet devnet | `6f1jqiz64iLeh4PZoKWuAL7vyZpTy5jJjwSZC4AX5X39` |

### Ce que fait le projet

**SolTx Explorer** est une infrastructure complète de gestion de transactions Solana composée de trois couches :

**1. Smart contract on-chain (Rust / Anchor)**
Un vault PDA déployé sur devnet avec 7 instructions, sécurisé par des contraintes Anchor, un système d'events d'audit, et un kill switch d'urgence.

**2. Scripts CLI (TypeScript)**
Cinq outils en ligne de commande pour interagir directement avec le réseau : envoi de SOL, swap Jupiter, bundle Jito (avec vrai SDK mainnet), benchmark de priority fees.

**3. Dashboard frontend (React / TypeScript)**
Interface visuelle complète : constructeur de transactions, simulateur de bundles, swap UI Jupiter, gestionnaire de vault avec kill switch, dashboard de métriques en temps réel.

### Architecture complète actuelle

```
sol-tx-explorer/
│
├── programs/tx-vault/src/lib.rs     # Smart contract Anchor (7 instructions)
│   ├── initialize_vault             # Crée le PDA vault
│   ├── deposit                      # Dépôt SOL via CPI (bloqué si paused)
│   ├── withdraw                     # Retrait SOL authority-only (bloqué si paused)
│   ├── emergency_pause              # Kill switch — fige toutes les opérations
│   ├── resume_vault                 # Reprend les opérations après pause
│   ├── close_vault                  # Ferme le vault (irréversible, récupère rent)
│   └── log_transaction              # Enregistre un record d'audit on-chain
│
├── scripts/
│   ├── jito-bundle.ts               # Bundle Jito (vrai SDK mainnet + fallback devnet)
│   ├── jupiter-swap.ts              # Swap SOL↔USDC via Jupiter v6
│   ├── optimized-tx.ts              # Benchmark 4 configs priority fees
│   ├── send-tx.ts                   # Transfer SOL simple avec compute budget
│   ├── setup-wallet.ts              # Génération + airdrop wallet devnet
│   └── utils/
│       ├── connection.ts            # RPC + explorer URL helpers
│       └── wallet.ts                # Keypair load/create
│
├── app/src/
│   ├── pages/
│   │   ├── Dashboard.tsx            # Métriques + historique session
│   │   ├── TxBuilder.tsx            # Constructeur TX avec sliders
│   │   ├── SwapPage.tsx             # Jupiter swap UI
│   │   ├── BundleSim.tsx            # Bundle simulator Jito
│   │   └── VaultManager.tsx         # Vault + Kill Switch UI
│   ├── services/
│   │   ├── vault.ts                 # PDA derivation + fetchVaultState
│   │   ├── jito.ts                  # Bundle devnet sim (browser-safe)
│   │   └── jupiter.ts               # Quote + swap + execute
│   ├── hooks/
│   │   ├── useSolanaBalance.ts      # Polling + listener temps réel
│   │   └── useTransactionHistory.ts # Historique session
│   └── contexts/
│       └── LogContext.tsx           # Terminal global (MAX_LOGS=200, useReducer)
│
└── tests/tx-vault.ts                # 10 tests Anchor (dont 4 kill switch)
```

### Struct Vault (état actuel)

```rust
pub struct Vault {
    pub authority: Pubkey,    // Propriétaire du vault (32 bytes)
    pub total_deposited: u64, // Cumul dépôts en lamports (8 bytes)
    pub total_withdrawn: u64, // Cumul retraits en lamports (8 bytes)
    pub tx_count: u64,        // Compteur de transactions (8 bytes)
    pub bump: u8,             // Bump seed PDA (1 byte)
    pub is_paused: bool,      // Kill switch (1 byte) ← AJOUTÉ en v1.1
}
// SPACE total : 8 (discriminator) + 66 = 74 bytes
```

### Checks de compilation (état OK)

| Check | Résultat |
|-------|----------|
| `cargo build-sbf` | ✅ 0 erreur, 17 warnings cosmétiques Anchor |
| `tsc --noEmit` (scripts + tests) | ✅ 0 erreur |
| `tsc --noEmit` (app) | ✅ 0 erreur |
| `vite build` | ✅ EXIT 0, 2430 modules |

---

## 2. Session 2 — 2026-02-18 : Kill Switch + Jito Réel + Corrections

### Contexte

Préparation pour entretien technique avec 01 Studio. Deux lacunes majeures identifiées dans le projet :
1. Pas de kill switch dans le smart contract → lacune critique pour un programme gérant des fonds
2. Jito `jito-ts` installé mais jamais utilisé → soumission de bundles non atomique

### 2.1 Kill Switch — `programs/tx-vault/src/lib.rs`

**Problème avant :** Le vault n'avait aucun mécanisme d'arrêt d'urgence. En cas de bug exploité, aucune façon de bloquer les opérations sans upgrader le programme (15 min minimum).

**Changements apportés :**

| Élément | Avant | Après |
|---------|-------|-------|
| `Vault.is_paused` | Absent | `pub is_paused: bool` |
| `Vault::SPACE` | 65 bytes | 66 bytes (+1 pour le bool) |
| `initialize_vault` | — | `vault.is_paused = false` |
| `deposit` | Pas de guard | `require!(!vault.is_paused, VaultError::VaultPaused)` |
| `withdraw` | Pas de guard | `require!(!vault.is_paused, VaultError::VaultPaused)` |
| `emergency_pause` | Instruction inexistante | Instruction + contexte `EmergencyPause` |
| `resume_vault` | Instruction inexistante | Instruction (même contexte) |
| `close_vault` | Instruction inexistante | Instruction + `close = authority` |
| `VaultPaused` | Erreur inexistante | `#[msg("Vault is paused...")]` |
| Events | 4 events | 6 events (+`VaultPaused`, +`VaultResumed`) |

**Détail technique du close_vault :**
La contrainte Anchor `close = authority` dans le contexte `CloseVault` gère automatiquement :
- Zéro du discriminateur du compte (invalide l'account)
- Transfert de TOUS les lamports (solde + rent) vers `authority`

**Rebuild SBF :** `cargo build-sbf` → 0 erreur ✅

---

### 2.2 Jito Réel SDK — `scripts/jito-bundle.ts`

**Problème avant :** Le script utilisait `sendAndConfirmTransaction` en boucle — chaque transaction était indépendante, pas de Bundle Jito. `jito-ts` était dans `package.json` mais jamais importé.

**Changements apportés :**

Le script est entièrement réécrit avec deux chemins distincts :

**Chemin mainnet (`SOLANA_CLUSTER=mainnet-beta`) — VRAI SDK :**
```typescript
import { searcherClient } from "jito-ts/dist/sdk/block-engine/searcher";
import { Bundle } from "jito-ts/dist/sdk/block-engine/types";

// 1. Construit des VersionedTransaction (v0) — requis par Bundle
const txs = await Promise.all([
  buildTransferTx(wallet, recipient1, 0.001, 5_000, blockhash),
  buildTransferTx(wallet, recipient2, 0.001, 3_000, blockhash),
  buildTransferTx(wallet, recipient3, 0.001, 1_000, blockhash),
]);

// 2. Crée le Bundle + ajoute le tip (DOIT être last — protocole Jito)
const bundle = new Bundle(txs, MAX_BUNDLE_SIZE);
bundle.addTipTx(wallet, tipLamports, tipAccount, blockhash);

// 3. Connecte au Block Engine via gRPC
const client = searcherClient("mainnet.block-engine.jito.wtf:443", wallet);

// 4. Soumet le bundle atomique → UUID
const bundleId = await client.sendBundle(bundle);

// 5. Écoute le résultat en streaming
client.onBundleResult(
  (result) => { /* Landed / Failed / Dropped */ },
  (err) => reject(err)
);
```

**Chemin devnet (défaut) — Fallback séquentiel :**
- `sendAndConfirmTransaction` individuel, clairement labellé `submitSequentialFallback`
- Message d'avertissement explicite en console
- Même logique de construction (tip, ordering, compute budget)

**Pourquoi VersionedTransaction ?**
`Bundle` de jito-ts prend `VersionedTransaction[]` — les transactions legacy ne sont pas acceptées. La conversion utilise `TransactionMessage.compileToV0Message()`.

---

### 2.3 Service Frontend — `app/src/services/jito.ts`

**Problème :** `submitBundleSequential` — le nom même de la fonction trahissait qu'elle n'était pas atomique.

**Changements :**
- Renommé en `submitBundleDevnetSim` (nom honnête sur ce que ça fait)
- JSDoc expliquant pourquoi pas de `SearcherClient` en browser : le client gRPC nécessite une `Keypair` avec secret key — impossible dans un wallet browser
- Architecture de production documentée : frontend → POST backend → SearcherClient → Block Engine

**Import mis à jour dans `BundleSim.tsx` :**
```typescript
// Avant
import { submitBundleSequential } from "../services/jito";
// Après
import { submitBundleDevnetSim } from "../services/jito";
```

---

### 2.4 VaultManager Frontend — `app/src/pages/VaultManager.tsx`

**Ajouts :**
- **Badge "⚠ PAUSED"** : dans la carte Vault Details, le statut affiche rouge et "⚠ PAUSED" si `isPaused === true`
- **Carte Kill Switch** : nouvelle section rouge avec bouton "Emergency Pause" / "Resume Vault" selon l'état
- **Architecture Note** : ajout de `is_paused: bool` dans la liste des features expliquées

**Parsing du champ `is_paused` :**
Dans `vault.ts`, le buffer raw du compte on-chain est parsé manuellement :
```typescript
// Layout: 8 discriminator + 32 authority + 8 td + 8 tw + 8 tc + 1 bump + 1 is_paused
const isPaused = data.length >= 66 ? data[65] === 1 : false;
```

---

### 2.5 Tests Anchor — `tests/tx-vault.ts`

**Ajout de 4 tests kill switch (6 → 10 total) :**

| # | Test | Vérifie |
|---|------|---------|
| 7 | `emergency_pause freezes the vault` | `isPaused === true` après pause |
| 8 | `rejects deposit when vault is paused` | Erreur `VaultPaused` sur deposit |
| 9 | `rejects withdrawal when vault is paused` | Erreur `VaultPaused` sur withdraw |
| 10 | `resume_vault re-enables operations` | `isPaused === false` + deposit réussit |

**Modification test #1 :**
- Ajout `expect(vault.isPaused).to.equal(false)` dans "initializes a vault"

---

### 2.6 Corrections TypeScript — `tsc --noEmit` propre

**4 corrections pour zéro erreur de compilation :**

| Fichier | Erreur | Correction |
|---------|--------|------------|
| `scripts/jupiter-swap.ts` | `response.json()` retourne `unknown` en strict mode | Cast `as Promise<JupiterQuote>` et `as { swapTransaction: string }` |
| `app/tsconfig.json` | `import.meta.env` inconnu sans types Vite | Ajout `"types": ["vite/client"]` |
| `tsconfig.json` (racine) | Globals `describe`, `it`, `before` inconnus | Ajout `"types": ["node", "mocha"]` |
| `package.json` (racine) | `@types/chai` et `@types/mocha` absents | Ajout en devDependencies + `npm install` |
| `tests/tx-vault.ts` | `.fetch()` Anchor retourne `unknown` avec `Program<any>` | Cast `as any` sur tous les `.fetch()` |

---

## 3. Session 1 — Construction initiale (26 commits)

### Phase 1 — Fondations & Scripts TypeScript

| Tâche | Statut | Notes |
|-------|--------|-------|
| Structure monorepo (programs/, app/, scripts/, tests/) | ✅ | |
| package.json racine + app | ✅ | |
| tsconfig.json racine + app | ✅ | Mis à jour en session 2 |
| .gitignore propre | ✅ | wallet.keypair.json exclu |
| .env.example | ✅ | |
| Génération wallet devnet | ✅ | `6f1jqiz64iLeh4PZoKWuAL7vyZpTy5jJjwSZC4AX5X39` |
| `scripts/send-tx.ts` | ✅ | Priority fees, compute budget, explorer link |
| `scripts/jupiter-swap.ts` | ✅ | Jupiter API v6, VersionedTransaction |
| `scripts/jito-bundle.ts` | ✅ (refactorisé session 2) | Vrai SDK jito-ts en session 2 |
| `scripts/optimized-tx.ts` | ✅ | Benchmark 4 configs, tableau comparatif |
| `scripts/setup-wallet.ts` | ✅ | Génération + airdrop |
| `scripts/utils/connection.ts` | ✅ | |
| `scripts/utils/wallet.ts` | ✅ | |

### Phase 2 — Programme On-Chain Anchor / Rust

| Tâche | Statut | Notes |
|-------|--------|-------|
| `programs/tx-vault/src/lib.rs` | ✅ (étendu session 2) | 4 → 7 instructions |
| `initialize_vault` | ✅ | PDA derivation, event VaultCreated |
| `deposit` | ✅ | CPI System Program, kill switch guard en session 2 |
| `withdraw` | ✅ | has_one authority, lamports directs, kill switch guard en session 2 |
| `emergency_pause` | ✅ | Ajouté session 2 |
| `resume_vault` | ✅ | Ajouté session 2 |
| `close_vault` | ✅ | Ajouté session 2 |
| `log_transaction` | ✅ | PDA tx_record, events, description ≤128 |
| `cargo check` OK | ✅ | 0 erreur |
| `cargo build-sbf` | ✅ | SBF binary compilé (blake3=1.5.5 pinned) |
| Deploy devnet | ✅ | `H6Yyao9ugYXgXddnjtJ3k2qSBiwbTE7C6kwkW5XwPVEM` |
| Tests Anchor (session 1) | ✅ | 6 tests |
| Tests Anchor (session 2) | ✅ | +4 kill switch tests = 10 total |

**Note sur le pin blake3 :** Le toolchain BPF de Solana est bloqué à une version LLVM antérieure à Rust 1.85. `blake3 ^1.5.6` migre vers l'édition 2024 incompatible avec le BPF target `bpfel-unknown-unknown`. Le pin `blake3 = "=1.5.5"` force la version compatible.

**Note sur Anchor build :** Anchor 0.29 expose `build-bpf` mais Solana CLI 3.x ne connaît que `build-sbf`. La commande correcte est `cargo build-sbf` directement (pas via `anchor build`).

### Phase 3 — Dashboard React Frontend

| Tâche | Statut | Notes |
|-------|--------|-------|
| Vite + React 18 + TypeScript | ✅ | |
| Tailwind CSS + thème Solana custom | ✅ | |
| @solana/wallet-adapter (Phantom + Solflare) | ✅ | |
| `App.tsx` (router + lazy loading + terminal) | ✅ | |
| `pages/Dashboard.tsx` | ✅ | Métriques + historique session |
| `pages/TxBuilder.tsx` | ✅ | Sliders priority fee + CU |
| `pages/SwapPage.tsx` | ✅ | Jupiter UI avec slippage presets |
| `pages/BundleSim.tsx` | ✅ | Animé avec Framer Motion |
| `pages/VaultManager.tsx` | ✅ (étendu session 2) | Kill switch ajouté |
| `services/vault.ts` | ✅ (étendu session 2) | isPaused parsé depuis buffer |
| `services/jito.ts` | ✅ (refactorisé session 2) | submitBundleDevnetSim |
| `services/jupiter.ts` | ✅ | |
| `hooks/useSolanaBalance.ts` | ✅ | onAccountChange listener |
| `hooks/useTransactionHistory.ts` | ✅ | |
| `contexts/LogContext.tsx` | ✅ | useReducer, MAX_LOGS=200 |
| `vite build` production | ✅ | EXIT 0 |
| Deploy Vercel | ✅ | https://sol-tx-explorer.vercel.app |

### Phase 4 — Documentation & Qualité

| Tâche | Statut | Notes |
|-------|--------|-------|
| README.md (EN) | ✅ (mis à jour session 2) | |
| GUIDE.md (FR) | ✅ (mis à jour session 2) | |
| PLAN.md (archivé) | ✅ → fusionné dans CHANGELOG | |
| CHANGELOG.md | ✅ | Créé en session 2 |
| ENTRETIEN_SURVIE.md | ✅ | Préparation entretien 01 Studio |
| Commentaires JSDoc | ✅ | Sur tous les scripts |
| Types TypeScript stricts | ✅ | Après corrections session 2 |
| Gestion d'erreurs | ✅ | |
| .env.example | ✅ | |
| 26+ commits Git | ✅ | |
| Push GitHub | ⏳ | À faire |
| Screenshot dashboard | ⏳ | À faire |

---

## 4. Plan d'origine (archivé)

> Le PLAN.md original documentait les phases 1 à 4 du projet. Son contenu est maintenant intégré dans la section 3 de ce fichier (Session 1). Le fichier PLAN.md est conservé comme référence courte.

**Objectif original :** Construire un outil d'infrastructure Solana complet pour démontrer la maîtrise de la stack demandée par 01 Studio (Rust, Anchor, TypeScript, React, Jito, Jupiter).

**Résultat :** Objectif atteint et dépassé (kill switch + vrai SDK Jito ajoutés en session 2).

---

## 5. Métriques du projet

### Code

| Métrique | Session 1 | Session 2 (actuel) |
|----------|-----------|---------------------|
| Instructions Anchor | 4 | **7** |
| Tests Anchor | 6 | **10** |
| Lignes Rust (lib.rs) | ~280 | **440** |
| Erreurs `tsc --noEmit` | 30+ | **0** |
| Erreurs `vite build` | 0 | **0** |
| Erreurs `cargo build-sbf` | 0 | **0** |

### Dépendances clés

| Package | Version | Usage |
|---------|---------|-------|
| `@coral-xyz/anchor` | ^0.29.0 | Rust IDL client |
| `@solana/web3.js` | ^1.95.0 | Blockchain interaction |
| `jito-ts` | ^3.0.1 | Bundle submission (SearcherClient gRPC) |
| `@jup-ag/api` | ^6.0.27 | Jupiter swap API |
| `react` | ^18.2.0 | UI framework |
| `framer-motion` | ^12.34.1 | Animations |
| `tailwindcss` | ^3.4.1 | Styling |

### Concepts Solana démontrés

| Concept | Fichier(s) | Niveau |
|---------|-----------|--------|
| PDA (Program Derived Address) | `lib.rs`, `vault.ts` | Fondamental |
| CPI (Cross-Program Invocation) | `lib.rs:deposit` | Fondamental |
| Anchor Constraints | `lib.rs` (has_one, close, seeds) | Intermédiaire |
| Events on-chain | `lib.rs` (6 events) | Intermédiaire |
| Overflow safety | `lib.rs` (checked_add) | Intermédiaire |
| Rent-exempt awareness | `lib.rs:withdraw` | Intermédiaire |
| Kill Switch pattern | `lib.rs` (is_paused) | Avancé |
| Account closure | `lib.rs:close_vault` | Avancé |
| Priority Fees | `scripts/send-tx.ts`, `optimized-tx.ts` | Fondamental |
| Compute Budget | Tous les scripts | Fondamental |
| VersionedTransaction v0 | `jito-bundle.ts`, `jupiter-swap.ts` | Intermédiaire |
| Jito Bundle (vrai SDK) | `jito-bundle.ts` | Avancé |
| Jupiter multi-hop routing | `jupiter-swap.ts`, `jupiter.ts` | Intermédiaire |
| Wallet Adapter (browser) | `SolanaProvider.tsx` | Fondamental |
| Real-time balance listener | `useSolanaBalance.ts` | Intermédiaire |
| useReducer pour logs | `LogContext.tsx` | React intermédiaire |
| Lazy loading + Suspense | `App.tsx` | React intermédiaire |

---

*Ce fichier remplace et fusionne `PLAN.md` (archivé). Prochaine mise à jour prévue après le déploiement mainnet ou l'ajout de nouvelles features.*
