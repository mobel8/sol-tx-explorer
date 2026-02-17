# SolTx Explorer — Guide complet

> **Réseau utilisé : Solana Devnet** (argent virtuel, sans valeur réelle)

---

## Table des matières

1. [C'est quoi ce projet ?](#1-cest-quoi-ce-projet-)
2. [La blockchain Solana — les bases](#2-la-blockchain-solana--les-bases)
3. [Architecture technique](#3-architecture-technique)
4. [Le smart contract on-chain (tx-vault)](#4-le-smart-contract-on-chain-tx-vault)
5. [Le frontend — chaque page expliquée](#5-le-frontend--chaque-page-expliquée)
6. [Glossaire complet des termes](#6-glossaire-complet-des-termes)
7. [Comment obtenir du SOL de test (Devnet)](#7-comment-obtenir-du-sol-de-test-devnet)
8. [Lancer le projet en local](#8-lancer-le-projet-en-local)
9. [Stack technique](#9-stack-technique)

---

## 1. C'est quoi ce projet ?

**SolTx Explorer** est une application web de gestion et d'exploration de transactions Solana.
Elle permet de :

- **Envoyer des SOL** manuellement vers n'importe quelle adresse
- **Swapper des tokens** (échanger SOL contre USDC et vice-versa) via Jupiter
- **Simuler des bundles Jito** (groupes de transactions atomiques)
- **Gérer un vault on-chain** (coffre-fort de SOL sécurisé par un smart contract Rust)
- **Visualiser l'historique** de toutes les transactions effectuées

C'est un projet portfolio démontrant des compétences en développement Rust/Solana côté on-chain, et React/TypeScript côté frontend.

---

## 2. La blockchain Solana — les bases

### SOL
La cryptomonnaie native de la blockchain Solana. Elle sert à :
- Payer les **frais de transaction** (fees)
- Payer le **loyer des comptes** (rent)
- Interagir avec les smart contracts

### Lamport
La plus petite unité de SOL, comme le centime pour l'euro.
- **1 SOL = 1 000 000 000 lamports** (1 milliard)
- Les frais de transaction sont exprimés en lamports

### Compte (Account)
Tout sur Solana est un "compte". Un compte peut être :
- Un **wallet** (portefeuille, détenu par un utilisateur)
- Un **programme** (smart contract, code exécutable)
- Un **compte de données** (stockage on-chain, associé à un programme)

### Devnet / Testnet / Mainnet
- **Devnet** : Réseau de développement avec des SOL **fictifs et gratuits**. C'est ce réseau qu'utilise ce projet.
- **Testnet** : Réseau de test avancé, aussi fictif.
- **Mainnet** : Le vrai réseau, avec de vrais SOL ayant une valeur réelle.

### Signature de transaction
Identifiant unique d'une transaction sur la blockchain (comme un numéro de reçu). Permet de retrouver n'importe quelle transaction sur [Solana Explorer](https://explorer.solana.com).

### Slot
Unité de temps sur Solana. Un nouveau slot est créé toutes les ~400 millisecondes. Chaque slot peut contenir des transactions. Le "slot number" identifie un moment précis dans l'histoire de la blockchain.

---

## 3. Architecture technique

```
sol-tx-explorer/
│
├── programs/tx-vault/          ← Smart contract Rust (on-chain)
│   └── src/lib.rs              ← Code du programme Solana
│
├── app/                        ← Frontend React (off-chain)
│   └── src/
│       ├── pages/              ← Pages de l'application
│       ├── components/         ← Composants réutilisables
│       ├── services/           ← Intégrations API (Jupiter, Jito, Vault)
│       └── hooks/              ← Logique React réutilisable
│
├── scripts/                    ← Scripts CLI TypeScript
│   ├── send-tx.ts              ← Envoyer des SOL en ligne de commande
│   ├── jupiter-swap.ts         ← Swap de tokens en CLI
│   ├── jito-bundle.ts          ← Soumettre un bundle Jito en CLI
│   └── optimized-tx.ts         ← Benchmark des priority fees
│
└── tests/                      ← Tests du smart contract
    └── tx-vault.ts             ← 6 cas de test Anchor
```

**Flux général :**
```
Navigateur (React) → Phantom Wallet (signe les transactions) → RPC Solana → Blockchain Devnet
```

---

## 4. Le smart contract on-chain (tx-vault)

**ID du programme déployé sur devnet :** `H6Yyao9ugYXgXddnjtJ3k2qSBiwbTE7C6kwkW5XwPVEM`

Le smart contract est écrit en **Rust** avec le framework **Anchor**. Il gère des "vaults" (coffres-forts) de SOL associés à des wallets utilisateurs.

### 4.1 — PDA (Program Derived Address)

Un **PDA** est une adresse de compte générée de façon déterministe à partir de :
- Des **seeds** (graines) : mots-clés + données
- L'**ID du programme**

Contrairement à un wallet classique, un PDA n'a pas de clé privée — seul le programme peut le contrôler.

Dans ce projet, le vault de chaque utilisateur est un PDA dérivé de :
```
seeds = ["vault", adresse_du_wallet]
```
→ Chaque wallet a donc son propre vault unique, calculable sans avoir besoin de le stocker.

### 4.2 — Structure du Vault

```rust
pub struct Vault {
    pub authority: Pubkey,       // Adresse du propriétaire (seul à pouvoir retirer)
    pub total_deposited: u64,    // Total cumulé des dépôts (en lamports)
    pub total_withdrawn: u64,    // Total cumulé des retraits (en lamports)
    pub tx_count: u64,           // Nombre de transactions effectuées
    pub bump: u8,                // Numéro technique du PDA (canonique)
}
```

### 4.3 — Structure TransactionRecord

Chaque transaction peut être enregistrée on-chain :
```rust
pub struct TransactionRecord {
    pub vault: Pubkey,           // Vault associé
    pub authority: Pubkey,       // Propriétaire
    pub tx_type: TxType,         // Type (Deposit, Withdraw, Swap, Bundle, Transfer)
    pub amount: u64,             // Montant en lamports
    pub description: String,     // Description (128 caractères max)
    pub timestamp: i64,          // Heure Unix de la transaction
    pub slot: u64,               // Slot blockchain au moment de la tx
}
```

### 4.4 — Les 4 instructions du programme

#### `initialize_vault`
Crée le vault PDA pour un wallet.
- Ne peut être appelé qu'une fois par wallet
- Le vault est vide au départ
- Émet l'événement `VaultCreated`

#### `deposit(amount: u64)`
Transfère des SOL depuis le wallet vers le vault.
- Utilise un **CPI** (appel au System Program pour le vrai transfert de SOL)
- Incrémente `total_deposited` et `tx_count`
- Émet l'événement `DepositEvent`

#### `withdraw(amount: u64)`
Retire des SOL du vault vers le wallet propriétaire.
- **Sécurisé** : seul l'`authority` peut retirer
- Vérifie que le vault a assez de fonds (moins le loyer minimum)
- Émet l'événement `WithdrawEvent`

#### `log_transaction(tx_type, amount, description)`
Enregistre un événement de transaction on-chain.
- Crée un compte `TransactionRecord` (PDA unique par numéro de tx)
- Utile pour avoir un historique immuable sur la blockchain
- Émet l'événement `TransactionLogged`

### 4.5 — CPI (Cross-Program Invocation)

Un **CPI** est un appel d'un programme vers un autre programme.
Dans `deposit`, le contrat tx-vault appelle le **System Program** de Solana pour transférer les SOL. C'est la façon standard de déplacer des SOL dans un smart contract Anchor.

### 4.6 — Events (Événements)

Les événements sont des données émises par le programme, indexables par des services off-chain.
- `VaultCreated { vault, authority }`
- `DepositEvent { vault, depositor, amount, total_deposited }`
- `WithdrawEvent { vault, authority, amount, total_withdrawn }`
- `TransactionLogged { vault, tx_type, amount, description, timestamp }`

### 4.7 — Erreurs du programme

| Code | Message |
|------|---------|
| `InvalidAmount` | Montant invalide (doit être > 0) |
| `InsufficientFunds` | Fonds insuffisants dans le vault |
| `Unauthorized` | Seul l'authority peut effectuer cette action |
| `Overflow` | Dépassement arithmétique |
| `DescriptionTooLong` | Description > 128 caractères |

---

## 5. Le frontend — chaque page expliquée

### 5.1 — Dashboard (page d'accueil)

**URL :** `/`

La page principale. Elle affiche :
- **Solde SOL** du wallet connecté (mis à jour en temps réel)
- **Nombre de transactions** effectuées pendant la session
- **Temps de confirmation moyen** des transactions
- **Total des frais payés** (en lamports)
- **Historique récent** : les 10 dernières transactions avec type, montant, signature et statut

> Si aucun wallet n'est connecté, un message invite à se connecter via Phantom.

---

### 5.2 — TxBuilder (Constructeur de transaction)

**URL :** `/tx-builder`

Permet d'envoyer des SOL manuellement avec un contrôle fin.

**Paramètres configurables :**
- **Adresse destinataire** : adresse Solana valide (58 caractères Base58)
- **Montant en SOL** : combien envoyer
- **Priority Fee** (0–100 000 microlamports/CU) : frais supplémentaires pour passer en priorité
- **Compute Unit Limit** (50K–1.4M CU) : limite de calcul allouée à la transaction

**Comment ça marche :**
1. L'utilisateur remplit les champs
2. La transaction est construite avec deux instructions supplémentaires : `setComputeUnitPrice` et `setComputeUnitLimit`
3. Phantom signe la transaction
4. La transaction est envoyée et confirmée
5. Le résultat (signature, temps) s'affiche

---

### 5.3 — SwapPage (Échange de tokens)

**URL :** `/swap`

Interface d'échange de tokens via **Jupiter Aggregator** — le meilleur agrégateur DEX de Solana.

**Fonctionnalités :**
- Choisir le token d'entrée et de sortie (SOL, USDC, etc.)
- Inverser la direction du swap en un clic
- Configurer le **slippage** (0.1%, 0.5%, 1%, 3%)
- Afficher le taux de change en temps réel
- Afficher le **price impact** et le chemin de routage

**Flux du swap :**
1. Appel à l'API Jupiter pour obtenir un devis (`getSwapQuote`)
2. Construction de la transaction de swap (`buildSwapTransaction`)
3. Signature par le wallet
4. Exécution et confirmation (`sendRawTransaction`)

---

### 5.4 — BundleSim (Simulateur de bundles)

**URL :** `/bundles`

Simule la soumission de **bundles Jito** — groupes de transactions exécutés dans un ordre précis.

**Fonctionnalités :**
- Ajouter plusieurs transactions dans un bundle
- Configurer chaque transaction : destinataire, montant, priority fee
- Définir un **tip** (pourboire) envoyé aux validateurs Jito
- Soumettre le bundle et voir les résultats transaction par transaction

**Résultats :**
- Signature et statut de chaque transaction
- Temps d'exécution
- Taux de succès global

---

### 5.5 — VaultManager (Gestionnaire de vault)

**URL :** `/vault`

Interface pour interagir avec le smart contract tx-vault déployé on-chain.

**Fonctionnalités :**
- Voir l'adresse PDA du vault (calculée depuis le wallet connecté)
- **Initialiser** le vault (création on-chain, une seule fois)
- **Déposer** des SOL dans le vault
- **Retirer** des SOL depuis le vault
- Voir le solde, le total déposé et le nombre de transactions

> Note : le vault est une adresse PDA — sans clé privée, contrôlée uniquement par le programme.

---

## 6. Glossaire complet des termes

| Terme | Définition |
|-------|-----------|
| **Blockchain** | Base de données distribuée, immuable et décentralisée |
| **Solana** | Blockchain haute performance (~65 000 tx/sec, ~400ms par slot) |
| **SOL** | Token natif de Solana, utilisé pour payer les frais |
| **Lamport** | Plus petite unité de SOL (1 SOL = 1 milliard de lamports) |
| **Wallet** | Portefeuille cryptographique (clé publique + clé privée) |
| **Phantom** | Extension navigateur pour gérer un wallet Solana |
| **Pubkey** | Clé publique = adresse visible d'un compte (58 chars Base58) |
| **Devnet** | Réseau Solana de test avec des fonds fictifs et gratuits |
| **RPC** | API de connexion à un nœud Solana pour envoyer des transactions |
| **Smart Contract** | Programme autonome déployé et exécuté sur la blockchain |
| **Anchor** | Framework Rust pour écrire des smart contracts Solana facilement |
| **PDA** | Adresse dérivée du programme — contrôlée par le code, pas un humain |
| **CPI** | Appel d'un programme vers un autre (ex: tx-vault → System Program) |
| **Instruction** | Unité d'action dans une transaction Solana |
| **Transaction** | Ensemble d'instructions signées, envoyées à la blockchain |
| **Signature** | Identifiant unique d'une transaction (hash cryptographique) |
| **Slot** | Unité de temps Solana (~400ms), contient les transactions |
| **Rent** | Loyer payé pour maintenir un compte actif on-chain |
| **Bump** | Chiffre canonique validant un PDA (évite les collisions) |
| **Compute Units (CU)** | Unité de calcul consommée par chaque instruction |
| **Priority Fee** | Frais supplémentaires pour passer avant les autres transactions |
| **Compute Budget** | Programme Solana permettant de configurer les CU et les fees |
| **Jupiter** | Agrégateur DEX Solana — trouve le meilleur taux de swap entre tokens |
| **DEX** | Exchange décentralisé (pas de banque, contrat automatique) |
| **Swap** | Échanger un token contre un autre |
| **Slippage** | Tolérance d'écart de prix acceptable lors d'un swap (ex: 0.5%) |
| **Price Impact** | Impact de l'ordre sur le prix du marché (grand ordre = fort impact) |
| **Jito** | Infrastructure MEV sur Solana permettant des bundles atomiques |
| **Bundle** | Groupe de transactions exécutées dans un ordre garanti |
| **MEV** | Miner/Maximal Extractable Value — profits tirés de l'ordre des transactions |
| **Tip** | Pourboire payé aux validateurs Jito pour inclure un bundle |
| **IDL** | Interface Definition Language — fichier JSON décrivant un programme Anchor |
| **Anchor** | Framework facilitant l'écriture de smart contracts Solana en Rust |
| **SBF** | Solana Berkeley Packet Filter — format binaire des programmes Solana |
| **Event** | Données émises par un smart contract, indexables off-chain |
| **Confirmed** | Niveau de finalité d'une transaction (quasi-définitif) |
| **Finalized** | Niveau de finalité maximal (irrévocable) |
| **Vite** | Bundler/dev server ultra-rapide pour projets React/TypeScript |
| **Tailwind CSS** | Framework CSS utilitaire (classes directement dans le HTML) |
| **Framer Motion** | Bibliothèque d'animations pour React |
| **Recharts** | Bibliothèque de graphiques pour React |
| **React Router** | Gestion des routes/pages dans une application React |
| **Hook** | Fonction React réutilisable (commence par `use`) |
| **Provider** | Composant React qui fournit du contexte à ses enfants |
| **Polyfill** | Code qui émule une fonctionnalité manquante dans un environnement |

---

## 7. Comment obtenir du SOL de test (Devnet)

> Le projet est configuré sur **Devnet**, pas Testnet.

### Étape 1 — Configurer Phantom sur Devnet

1. Ouvre Phantom
2. Clique sur l'icône en haut à gauche (hamburger menu)
3. Va dans **Settings** → **Developer Settings** (ou **Network**)
4. Sélectionne **Solana Devnet** ← (pas Testnet !)
5. Reviens au wallet principal

### Étape 2 — Obtenir des SOL gratuits

**Option A — Via le site officiel :**
1. Va sur [https://faucet.solana.com](https://faucet.solana.com)
2. Copie ton adresse wallet depuis Phantom
3. Colle-la dans le champ
4. Sélectionne **Devnet** et demande 2 SOL
5. Attends quelques secondes → les SOL apparaissent

**Option B — Via la ligne de commande :**
```bash
export PATH="$HOME/.cargo/bin:$HOME/.local/share/solana/install/active_release/bin:$PATH"
solana airdrop 2 6f1jqiz64iLeh4PZoKWuAL7vyZpTy5jJjwSZC4AX5X39 --url devnet
```

**Option C — Via Solana CLI interactif :**
```bash
solana config set --url devnet
solana airdrop 2
```

> Le faucet devnet limite à ~2 SOL par requête. Tu peux en demander plusieurs fois.

---

## 8. Lancer le projet en local

### Prérequis
- Node.js v18 (via nvm)
- Wallet Phantom configuré sur **Devnet**
- SOL de test sur le wallet

### Démarrer le frontend
```bash
cd app
npm run dev
```
→ Ouvre http://localhost:5173

### Lancer les scripts CLI (nécessite des SOL devnet)
```bash
# Envoyer des SOL
npm run send-tx

# Swap Jupiter
npm run jupiter-swap

# Bundle Jito
npm run jito-bundle

# Benchmark de priority fees
npm run optimized-tx
```

---

## 9. Stack technique

| Couche | Technologie | Rôle |
|--------|------------|------|
| Smart Contract | Rust + Anchor 0.29 | Programme on-chain (tx-vault) |
| Blockchain | Solana Devnet | Réseau de test |
| Frontend | React 18 + TypeScript | Interface utilisateur |
| Build tool | Vite | Bundler ultra-rapide |
| Style | Tailwind CSS | Design utilitaire |
| Animations | Framer Motion | Transitions et effets |
| Graphiques | Recharts | Visualisation de données |
| Wallet | @solana/wallet-adapter | Connexion Phantom/Solflare |
| Swap | Jupiter API v6 | Agrégateur DEX |
| Bundles | Jito | MEV et bundles atomiques |
| Routing | React Router v6 | Navigation entre pages |
