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
      whileHover={hover ? { scale: 1.012, y: -3 } : undefined}
      transition={{ type: "spring", stiffness: 500, damping: 32 }}
      onClick={onClick}
      // will-change hints the browser to promote this element to its own
      // GPU compositor layer → jank-free hover animations
      style={{ willChange: "transform" }}
      className={`
        glass rounded-2xl p-5 relative
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
