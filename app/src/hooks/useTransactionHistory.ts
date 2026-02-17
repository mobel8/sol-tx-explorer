import { useState, useCallback } from "react";

export interface TxRecord {
  id: string;
  type: "transfer" | "swap" | "bundle" | "vault";
  signature: string;
  amount: number;
  status: "confirmed" | "failed";
  timestamp: number;
  timeMs: number;
  fee?: number;
}

export function useTransactionHistory() {
  const [history, setHistory] = useState<TxRecord[]>([]);

  const addTransaction = useCallback((tx: Omit<TxRecord, "id">) => {
    setHistory((prev) => [
      { ...tx, id: `tx-${Date.now()}-${Math.random().toString(36).slice(2)}` },
      ...prev,
    ]);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const totalTransactions = history.length;
  const totalFees = history.reduce((sum, tx) => sum + (tx.fee || 0), 0);
  const avgConfirmTime =
    history.length > 0
      ? history.reduce((sum, tx) => sum + tx.timeMs, 0) / history.length
      : 0;

  return {
    history,
    addTransaction,
    clearHistory,
    totalTransactions,
    totalFees,
    avgConfirmTime,
  };
}
