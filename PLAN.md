# SolTx Explorer — Plan de Projet Detaille

## Objectif
Construire un outil d'infrastructure de transactions Solana (devnet) avec dashboard,
pour demontrer la maitrise de la stack demandee par 01 Studio.

---

## PHASE 1 — Fondations & Scripts TypeScript (Priorite P0)

### 1.1 Setup Environnement
- [x] Structure monorepo creee (programs/, app/, scripts/, tests/)
- [x] package.json avec dependances (solana/web3.js, @jup-ag/api, jito-ts, ts-node)
- [x] tsconfig.json configure
- [x] .gitignore propre
- [x] Generer un wallet devnet (keypair) pour les tests
- [x] npm install OK (racine + app)

### 1.2 Script: Envoi de Transaction Basique (`scripts/send-tx.ts`)
- [x] Connexion au cluster devnet
- [x] Chargement du wallet depuis fichier keypair
- [x] Airdrop de SOL sur devnet
- [x] Envoi de SOL a une adresse cible
- [x] Ajout de priority fees (ComputeBudgetProgram)
- [x] Affichage du lien explorer Solana

### 1.3 Script: Jupiter Swap (`scripts/jupiter-swap.ts`)
- [x] Recuperer une quote SOL -> USDC via Jupiter API v6
- [x] Construire la transaction de swap
- [x] Signer et envoyer la transaction
- [x] Afficher le resultat (montant recu, fees, signature)

### 1.4 Script: Jito Bundle (`scripts/jito-bundle.ts`)
- [x] Creer 2-3 transactions ordonnees
- [x] Construire un bundle avec tip transaction
- [x] Envoyer via Jito Block Engine (ou simuler si devnet non dispo)
- [x] Afficher le statut du bundle

### 1.5 Script: Transaction Optimisee (`scripts/optimized-tx.ts`)
- [x] Comparer envoi avec/sans priority fees
- [x] Mesurer le temps de confirmation
- [x] Ajuster les compute units (setComputeUnitLimit)
- [x] Logger les metriques

---

## PHASE 2 — Programme On-Chain Anchor / Rust (Priorite P0)

### 2.1 Programme `tx-vault` (`programs/tx-vault/`)
Structure Anchor avec 4 instructions :

#### `initialize_vault`
- Cree un compte PDA (Program Derived Address) pour le vault
- Stocke l'authority (le createur) dans les donnees du compte
- Contexte: `vault` (PDA), `authority` (Signer), `system_program`

#### `deposit`
- Transfere des SOL du deposant vers le vault
- Utilise CPI (Cross-Program Invocation) vers le System Program
- Verifie que le vault est initialise
- Met a jour le solde enregistre

#### `withdraw`
- Retire des SOL du vault vers l'authority
- Verifie que le signataire == authority du vault
- Verifie le solde suffisant
- CPI transfer inverse

#### `log_transaction`
- Cree un compte PDA pour enregistrer les metadonnees d'une transaction
- Stocke: timestamp, montant, type (deposit/withdraw), adresse source
- Emet un event Anchor pour indexation off-chain

### 2.2 Tests Anchor (`tests/tx-vault.ts`)
- [x] Test initialize_vault : creation OK, PDA correcte
- [x] Test deposit : solde augmente, event emis
- [x] Test withdraw : solde diminue, verification authority
- [x] Test withdraw unauthorized : doit echouer
- [x] Test log_transaction : metadonnees correctes
- [x] Test zero-amount deposit : doit echouer

### 2.3 Deploiement
- [x] cargo check OK (compile sans erreur)
- [x] Build avec `cargo build-sbf` (SBF binary compiled)
- [x] Deploy sur devnet — Program ID: `H6Yyao9ugYXgXddnjtJ3k2qSBiwbTE7C6kwkW5XwPVEM`
- [x] Sauvegarder le program ID

---

## PHASE 3 — Dashboard React Frontend (Priorite P1)

### 3.1 Setup
- [x] Vite + React + TypeScript
- [x] Tailwind CSS configure avec theme Solana
- [x] @solana/wallet-adapter-react + Phantom + Solflare
- [x] Provider Solana (devnet) configure
- [x] npm install OK
- [x] vite build OK (production build)

### 3.2 Pages du Dashboard

#### Page: Dashboard (`/`)
- Solde du wallet connecte
- Nombre de transactions envoyees (session)
- Derniere transaction avec lien explorer
- Statut connexion devnet

#### Page: Transaction Builder (`/tx-builder`)
- Formulaire: adresse destinataire, montant SOL
- Slider: priority fee (micro-lamports)
- Slider: compute unit limit
- Bouton envoyer + statut en temps reel
- Historique des TX envoyees dans la session

#### Page: Jupiter Swap (`/swap`)
- Selection token source / destination
- Input montant
- Affichage quote en temps reel (prix, impact, route)
- Bouton swap + confirmation
- Historique des swaps

#### Page: Bundle Simulator (`/bundles`)
- Ajouter des transactions au bundle (drag & drop ou formulaire)
- Visualiser l'ordre des transactions
- Configurer le tip amount
- Envoyer le bundle
- Afficher le statut (landed, failed, pending)

#### Page: Vault Manager (`/vault`) — Interface pour le programme Anchor
- Initialiser un nouveau vault
- Deposer des SOL
- Retirer des SOL
- Voir l'historique des operations (events on-chain)

### 3.3 Composants Partages
- [x] `<WalletMultiButton />` — bouton connexion wallet (via wallet-adapter-react-ui)
- [x] `<TxStatus />` — affichage statut transaction (idle/sending/confirming/confirmed/failed)
- [x] `<ExplorerLink />` — lien cliquable vers Solana Explorer
- [x] `<NetworkBadge />` — badge devnet/mainnet/testnet
- [x] `<MetricsCard />` — carte avec titre + valeur + subtitle
- [x] `<Sidebar />` — navigation laterale avec icones

### 3.4 Deploiement
- [x] Build de production OK
- [x] Deploy sur Vercel — https://app-lemon-five-12.vercel.app
- [x] URL publique dans le README

---

## PHASE 4 — Polish & Documentation (Priorite P2)

### 4.1 README.md
- [x] Titre + badges (Rust, TypeScript, Solana, Anchor, React)
- [ ] Screenshot du dashboard
- [x] Description du projet
- [x] Architecture diagram (ASCII tree)
- [x] Instructions d'installation (prereqs, setup, run)
- [x] Liste des features
- [x] Stack technique complete
- [x] Licence MIT

### 4.2 Qualite Code
- [x] Commentaires JSDoc sur les scripts
- [x] Types TypeScript propres (interfaces definies)
- [x] Gestion d'erreurs dans les scripts
- [x] .env.example pour les variables d'environnement

### 4.3 Git History
- [x] git init + premier commit
- [x] Commits atomiques et messages clairs (26 commits)
- [x] Au moins 15-20 commits pour montrer une progression
- [x] Push sur GitHub — https://github.com/mobel8/sol-tx-explorer

---

## Stack Technique Complete

| Categorie | Technologie | Usage |
|-----------|-------------|-------|
| Smart Contract | Rust + Anchor | Programme tx-vault on-chain |
| Backend Scripts | TypeScript + ts-node | Scripts CLI transactions |
| Blockchain | Solana web3.js | Interaction avec la chain |
| DEX | Jupiter SDK (@jup-ag/api) | Swap de tokens |
| MEV/Bundles | Jito SDK (jito-ts) | Bundle de transactions |
| Token | @solana/spl-token | Operations sur tokens SPL |
| Frontend | React 18 + TypeScript | Dashboard UI |
| Styling | Tailwind CSS | Design responsive |
| Wallet | @solana/wallet-adapter | Connexion Phantom/Solflare |
| Charts | Recharts | Graphiques metriques |
| Deploy | Vercel | Hosting frontend |
| Versioning | Git + GitHub | Code source |

---

## Fichiers Cles a Creer

```
sol-tx-explorer/
├── PLAN.md                          <- CE FICHIER
├── README.md                        <- Documentation publique
├── package.json                     <- Dependances Node
├── tsconfig.json                    <- Config TypeScript
├── .gitignore                       <- Fichiers ignores
├── .env.example                     <- Variables d'environnement
│
├── programs/
│   └── tx-vault/
│       ├── Cargo.toml               <- Dependances Rust
│       ├── Anchor.toml              <- Config Anchor
│       └── src/
│           └── lib.rs               <- Programme Anchor principal
│
├── scripts/
│   ├── send-tx.ts                   <- Envoi transaction basique
│   ├── jupiter-swap.ts              <- Swap via Jupiter
│   ├── jito-bundle.ts               <- Bundle Jito
│   ├── optimized-tx.ts              <- TX avec priority fees
│   └── utils/
│       ├── connection.ts            <- Helper connexion Solana
│       └── wallet.ts                <- Helper chargement wallet
│
├── app/
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── public/
│   └── src/
│       ├── App.tsx                  <- Router principal
│       ├── main.tsx                 <- Entry point
│       ├── components/
│       │   ├── WalletConnect.tsx
│       │   ├── TxStatus.tsx
│       │   ├── ExplorerLink.tsx
│       │   ├── NetworkBadge.tsx
│       │   └── MetricsCard.tsx
│       ├── pages/
│       │   ├── Dashboard.tsx
│       │   ├── TxBuilder.tsx
│       │   ├── SwapPage.tsx
│       │   ├── BundleSim.tsx
│       │   └── VaultManager.tsx
│       ├── hooks/
│       │   ├── useSolanaBalance.ts
│       │   └── useTransactionHistory.ts
│       └── services/
│           ├── jupiter.ts
│           ├── jito.ts
│           └── vault.ts
│
└── tests/
    └── tx-vault.ts                  <- Tests Anchor
```

---

## Ordre d'Execution Recommande

1. **Maintenant** : Setup package.json + tsconfig + .gitignore + wallet devnet
2. **Ensuite** : scripts/send-tx.ts (transaction basique = preuve de concept)
3. **Puis** : scripts/jupiter-swap.ts + scripts/jito-bundle.ts
4. **Puis** : programs/tx-vault/src/lib.rs (Anchor/Rust)
5. **Puis** : app/ (dashboard React)
6. **Enfin** : README + polish + deploy

Chaque etape produit un livrable testable independamment.

---

## Notes Importantes

- Tout se fait sur **devnet** (pas de vrais fonds)
- Utiliser `solana airdrop` pour obtenir du SOL de test
- Jupiter API fonctionne sur devnet avec des tokens de test
- Jito bundles : si pas dispo sur devnet, creer une simulation realiste
- Le wallet keypair ne doit JAMAIS etre commit (ajouter au .gitignore)
