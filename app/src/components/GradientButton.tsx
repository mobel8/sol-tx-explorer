import React from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

interface GradientButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "purple" | "green" | "outline";
  className?: string;
  fullWidth?: boolean;
}

const variants = {
  purple: "bg-gradient-to-r from-solana-purple to-purple-600 text-white hover:shadow-[0_0_30px_rgba(153,69,255,0.4)]",
  green: "bg-gradient-to-r from-solana-green to-emerald-400 text-solana-dark hover:shadow-[0_0_30px_rgba(20,241,149,0.4)]",
  outline: "bg-transparent border border-solana-purple text-solana-purple hover:bg-solana-purple/10",
};

export const GradientButton: React.FC<GradientButtonProps> = ({
  children,
  onClick,
  disabled = false,
  loading = false,
  variant = "purple",
  className = "",
  fullWidth = false,
}) => {
  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.02 } : undefined}
      whileTap={!disabled ? { scale: 0.98 } : undefined}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        relative font-semibold py-3 px-6 rounded-xl transition-all duration-200
        disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none
        ${variants[variant]}
        ${fullWidth ? "w-full" : ""}
        ${className}
      `}
    >
      <span className={`flex items-center justify-center gap-2 ${loading ? "opacity-0" : ""}`}>
        {children}
      </span>
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin" />
        </span>
      )}
    </motion.button>
  );
};
