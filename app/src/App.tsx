import React from "react";
import { Routes, Route } from "react-router-dom";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./pages/Dashboard";
import { TxBuilder } from "./pages/TxBuilder";
import { SwapPage } from "./pages/SwapPage";
import { BundleSim } from "./pages/BundleSim";
import { VaultManager } from "./pages/VaultManager";
import { useTransactionHistory } from "./hooks/useTransactionHistory";

const App: React.FC = () => {
  const txHistory = useTransactionHistory();

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 border-b border-solana-border flex items-center justify-between px-6">
          <h2 className="text-lg font-semibold text-gray-300">
            Solana Transaction Infrastructure
          </h2>
          <WalletMultiButton className="!bg-solana-purple hover:!bg-solana-purple/80" />
        </header>

        {/* Main content */}
        <main className="flex-1 p-6 overflow-auto">
          <Routes>
            <Route
              path="/"
              element={<Dashboard txHistory={txHistory} />}
            />
            <Route
              path="/tx-builder"
              element={<TxBuilder onTxComplete={txHistory.addTransaction} />}
            />
            <Route
              path="/swap"
              element={<SwapPage onTxComplete={txHistory.addTransaction} />}
            />
            <Route
              path="/bundles"
              element={<BundleSim onTxComplete={txHistory.addTransaction} />}
            />
            <Route path="/vault" element={<VaultManager />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default App;
