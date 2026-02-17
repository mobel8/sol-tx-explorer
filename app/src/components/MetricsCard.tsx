import React from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { AnimatedCounter } from "./AnimatedCounter";

interface MetricsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  index?: number;
}

export const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  index = 0,
}) => {
  const numericValue = typeof value === "number" ? value : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4, ease: "easeOut" }}
    >
      <GlassCard shimmer hover>
        {/* Gradient top border accent */}
        <div className="absolute top-0 left-4 right-4 h-[2px] bg-gradient-to-r from-solana-purple to-solana-green rounded-full" />

        <div className="flex items-center justify-between mb-3">
          <span className="text-gray-400 text-sm">{title}</span>
          {Icon && (
            <div className="p-2 rounded-lg bg-solana-purple/10">
              <Icon className="w-4 h-4 text-solana-purple" />
            </div>
          )}
        </div>
        <div className="text-2xl font-bold text-white">
          {numericValue !== null ? (
            <AnimatedCounter value={numericValue} />
          ) : (
            value
          )}
        </div>
        {subtitle && (
          <div className="text-xs text-gray-500 mt-1">{subtitle}</div>
        )}
      </GlassCard>
    </motion.div>
  );
};
