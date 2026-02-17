import React from "react";
import { motion } from "framer-motion";
import { Check, X, Loader2, Send, Shield } from "lucide-react";

export type TxState = "idle" | "sending" | "confirming" | "confirmed" | "failed";

interface TxStatusProps {
  status: TxState;
  signature?: string;
  error?: string;
}

const STEPS = [
  { key: "sending", label: "Sending", icon: Send },
  { key: "confirming", label: "Confirming", icon: Shield },
  { key: "confirmed", label: "Confirmed", icon: Check },
];

function getStepState(
  stepKey: string,
  currentStatus: TxState
): "completed" | "active" | "pending" | "failed" {
  const order = ["sending", "confirming", "confirmed"];
  const currentIdx = order.indexOf(currentStatus);
  const stepIdx = order.indexOf(stepKey);

  if (currentStatus === "failed") {
    return currentIdx >= stepIdx ? "failed" : "pending";
  }
  if (stepIdx < currentIdx) return "completed";
  if (stepIdx === currentIdx) return "active";
  return "pending";
}

export const TxStatus: React.FC<TxStatusProps> = ({ status, signature, error }) => {
  if (status === "idle") return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="pt-2"
    >
      <div className="flex items-center justify-between">
        {STEPS.map((step, i) => {
          const state = getStepState(step.key, status);
          const Icon = step.icon;

          return (
            <React.Fragment key={step.key}>
              {/* Step circle */}
              <div className="flex flex-col items-center gap-1.5">
                <motion.div
                  animate={
                    state === "active"
                      ? { boxShadow: ["0 0 0px rgba(153,69,255,0)", "0 0 20px rgba(153,69,255,0.5)", "0 0 0px rgba(153,69,255,0)"] }
                      : {}
                  }
                  transition={state === "active" ? { duration: 1.5, repeat: Infinity } : {}}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    state === "completed"
                      ? "bg-solana-green/20 text-solana-green"
                      : state === "active"
                      ? "bg-solana-purple/20 text-solana-purple"
                      : state === "failed"
                      ? "bg-red-500/20 text-red-400"
                      : "bg-solana-dark text-gray-600"
                  }`}
                >
                  {state === "completed" ? (
                    <Check className="w-4 h-4" />
                  ) : state === "active" && status !== "confirmed" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : state === "failed" ? (
                    <X className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </motion.div>
                <span className={`text-[10px] font-mono ${
                  state === "completed" ? "text-solana-green" :
                  state === "active" ? "text-solana-purple" :
                  state === "failed" ? "text-red-400" : "text-gray-600"
                }`}>
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-[2px] mx-2 rounded-full overflow-hidden bg-solana-dark">
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{
                      width:
                        getStepState(STEPS[i + 1].key, status) !== "pending"
                          ? "100%"
                          : "0%",
                    }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className={`h-full ${
                      status === "failed" ? "bg-red-400" : "bg-gradient-to-r from-solana-purple to-solana-green"
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Signature link */}
      {signature && status === "confirmed" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 text-center"
        >
          <a
            href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-solana-green text-xs font-mono hover:underline"
          >
            {signature.slice(0, 20)}...
          </a>
        </motion.div>
      )}

      {/* Error */}
      {error && status === "failed" && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-2 text-red-400 text-xs text-center"
        >
          {error}
        </motion.p>
      )}
    </motion.div>
  );
};
