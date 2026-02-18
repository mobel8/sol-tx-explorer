import React, { Suspense, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { Sidebar } from "./components/Sidebar";
import { PageTransition } from "./components/PageTransition";
import { Terminal, TERMINAL_OPEN_H, TERMINAL_CLOSED_H } from "./components/Terminal";
import { useTransactionHistory } from "./hooks/useTransactionHistory";
import { NavigationProvider } from "./contexts/NavigationContext";
import { useLog } from "./contexts/LogContext";

// ── Lazy-load every page → each becomes a separate JS chunk ──────────────────
const Dashboard = React.lazy(() =>
  import("./pages/Dashboard").then((m) => ({ default: m.Dashboard }))
);
const TxBuilder = React.lazy(() =>
  import("./pages/TxBuilder").then((m) => ({ default: m.TxBuilder }))
);
const SwapPage = React.lazy(() =>
  import("./pages/SwapPage").then((m) => ({ default: m.SwapPage }))
);
const BundleSim = React.lazy(() =>
  import("./pages/BundleSim").then((m) => ({ default: m.BundleSim }))
);
const VaultManager = React.lazy(() =>
  import("./pages/VaultManager").then((m) => ({ default: m.VaultManager }))
);

// ── Skeleton loader shown while a page chunk is loading ──────────────────────
const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center h-72">
    <div className="flex gap-2 items-end">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block w-2 rounded-full"
          style={{ background: "var(--primary)", height: 8 }}
          animate={{ scaleY: [1, 2.5, 1] }}
          transition={{
            duration: 0.7,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  </div>
);

// ── Invisible component: watches wallet state and emits log events ────────────
const WalletLogger: React.FC = () => {
  const { publicKey, wallet } = useWallet();
  const { addLog } = useLog();

  useEffect(() => {
    if (publicKey) {
      const pk = publicKey.toBase58();
      addLog(
        "SUCCESS",
        `${wallet?.adapter.name ?? "Wallet"} connected`,
        `pubkey: ${pk.slice(0, 8)}...${pk.slice(-6)}`
      );
    }
  }, [publicKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
};

// ── Route → terminal log mapping ──────────────────────────────────────────────
const ROUTE_LOGS: Record<string, (addLog: ReturnType<typeof useLog>["addLog"]) => void> = {
  "/": (add) => add("INFO", "Dashboard loaded", "metrics: balance · tx history · network"),
  "/tx-builder": (add) => add("INFO", "TX Builder ready", "ComputeBudgetProgram + SystemProgram"),
  "/swap": (add) => add("INFO", "Jupiter Swap initialized", "API v6 · quote-api.jup.ag · VersionedTransaction"),
  "/bundles": (add) => {
    add("INFO", "Jito Bundle Simulator loaded");
    setTimeout(
      () => add("INFO", "Jito Block Engine client ready", "8 tip accounts · atomic execution"),
      380
    );
  },
  "/vault": (add) => add("INFO", "Vault Manager loaded", "Anchor · PDA seeds: [vault, authority]"),
};

// ── Main app ──────────────────────────────────────────────────────────────────
const App: React.FC = () => {
  const txHistory = useTransactionHistory();
  const location = useLocation();
  const { addLog, isTerminalOpen } = useLog();

  // Boot sequence — fires once on mount
  useEffect(() => {
    addLog("INFO", "SolTx Explorer initialized", "v1.0.0");
    const t1 = setTimeout(
      () => addLog("INFO", "Connecting to Solana devnet RPC..."),
      320
    );
    const t2 = setTimeout(
      () => addLog("SUCCESS", "RPC endpoint established", "commitment: confirmed · cluster: devnet"),
      920
    );
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Emit a log every time the active route changes
  useEffect(() => {
    ROUTE_LOGS[location.pathname]?.(addLog);
  }, [location.pathname, addLog]);

  const terminalH = isTerminalOpen ? TERMINAL_OPEN_H : TERMINAL_CLOSED_H;

  return (
    <NavigationProvider>
      <div
        className="flex min-h-screen bg-mesh relative overflow-hidden"
        style={{ paddingBottom: terminalH }}
      >
        {/* Decorative orbs — colors driven by CSS theme variables */}
        <div
          className="orb orb-primary animate-float"
          style={{ top: "8%", right: "8%", animationDuration: "7s" }}
        />
        <div
          className="orb orb-secondary animate-float"
          style={{
            bottom: "20%",
            left: "28%",
            animationDelay: "3s",
            animationDuration: "9s",
          }}
        />
        <div
          className="orb orb-primary animate-float"
          style={{
            top: "55%",
            right: "35%",
            opacity: 0.12,
            width: 150,
            height: 150,
            animationDelay: "5s",
          }}
        />

        <Sidebar />

        {/* Wallet event watcher — renders nothing */}
        <WalletLogger />

        <div className="flex-1 flex flex-col relative z-10">
          {/* Header */}
          <header className="glass-header sticky top-0 z-20 h-16 flex items-center justify-between px-6">
            <h2 className="text-sm font-medium text-gray-400 tracking-wide">
              Solana Transaction Infrastructure
            </h2>
            <WalletMultiButton />
          </header>

          {/* Main content */}
          <main className="flex-1 p-6 overflow-auto">
            <AnimatePresence mode="wait">
              <Routes location={location} key={location.pathname}>
                <Route
                  path="/"
                  element={
                    <PageTransition>
                      <Suspense fallback={<PageLoader />}>
                        <Dashboard txHistory={txHistory} />
                      </Suspense>
                    </PageTransition>
                  }
                />
                <Route
                  path="/tx-builder"
                  element={
                    <PageTransition>
                      <Suspense fallback={<PageLoader />}>
                        <TxBuilder onTxComplete={txHistory.addTransaction} />
                      </Suspense>
                    </PageTransition>
                  }
                />
                <Route
                  path="/swap"
                  element={
                    <PageTransition>
                      <Suspense fallback={<PageLoader />}>
                        <SwapPage onTxComplete={txHistory.addTransaction} />
                      </Suspense>
                    </PageTransition>
                  }
                />
                <Route
                  path="/bundles"
                  element={
                    <PageTransition>
                      <Suspense fallback={<PageLoader />}>
                        <BundleSim onTxComplete={txHistory.addTransaction} />
                      </Suspense>
                    </PageTransition>
                  }
                />
                <Route
                  path="/vault"
                  element={
                    <PageTransition>
                      <Suspense fallback={<PageLoader />}>
                        <VaultManager />
                      </Suspense>
                    </PageTransition>
                  }
                />
              </Routes>
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* Fixed terminal — rendered outside the overflow:hidden container */}
      <Terminal />
    </NavigationProvider>
  );
};

export default App;
