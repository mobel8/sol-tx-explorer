import React from "react";
import { motion } from "framer-motion";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  gradient?: boolean;
  hover?: boolean;
  shimmer?: boolean;
  onClick?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = "",
  gradient = false,
  hover = true,
  shimmer = false,
  onClick,
}) => {
  return (
    <motion.div
      whileHover={hover ? { scale: 1.01, y: -2 } : undefined}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onClick={onClick}
      className={`
        glass rounded-2xl p-5
        ${gradient ? "gradient-border" : ""}
        ${shimmer ? "shimmer-overlay" : ""}
        ${hover ? "cursor-default" : ""}
        ${className}
      `}
    >
      {children}
    </motion.div>
  );
};
