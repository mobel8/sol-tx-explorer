import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Sidebar } from "./components/Sidebar";
import { PageTransition } from "./components/PageTransition";
import { Dashboard } from "./pages/Dashboard";
import { TxBuilder } from "./pages/TxBuilder";
import { SwapPage } from "./pages/SwapPage";
import { BundleSim } from "./pages/BundleSim";
import { VaultManager } from "./pages/VaultManager";
import { useTransactionHistory } from "./hooks/useTransactionHistory";
import { NavigationProvider } from "./contexts/NavigationContext";

const App: React.FC = () => {
  const txHistory = useTransactionHistory();
  const location = useLocation();

  return (
    <NavigationProvider>
      <div className="flex min-h-screen bg-mesh relative overflow-hidden">
        {/* Decorative orbs — colors driven by CSS theme variables */}
        <div className="orb orb-primary animate-float" style={{ top: "8%", right: "8%", animationDuration: "7s" }} />
        <div className="orb orb-secondary animate-float" style={{ bottom: "20%", left: "28%", animationDelay: "3s", animationDuration: "9s" }} />
        <div className="orb orb-primary animate-float" style={{ top: "55%", right: "35%", opacity: 0.15, width: 160, height: 160, animationDelay: "5s" }} />

        <Sidebar />

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
                      <Dashboard txHistory={txHistory} />
                    </PageTransition>
                  }
                />
                <Route
                  path="/tx-builder"
                  element={
                    <PageTransition>
                      <TxBuilder onTxComplete={txHistory.addTransaction} />
                    </PageTransition>
                  }
                />
                <Route
                  path="/swap"
                  element={
                    <PageTransition>
                      <SwapPage onTxComplete={txHistory.addTransaction} />
                    </PageTransition>
                  }
                />
                <Route
                  path="/bundles"
                  element={
                    <PageTransition>
                      <BundleSim onTxComplete={txHistory.addTransaction} />
                    </PageTransition>
                  }
                />
                <Route
                  path="/vault"
                  element={
                    <PageTransition>
                      <VaultManager />
                    </PageTransition>
                  }
                />
              </Routes>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </NavigationProvider>
  );
};

export default App;
