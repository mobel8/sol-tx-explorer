import React from "react";

interface MetricsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
}

export const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  subtitle,
  icon,
}) => {
  return (
    <div className="bg-solana-card border border-solana-border rounded-xl p-5 hover:border-solana-purple/50 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-400 text-sm">{title}</span>
        {icon && <span className="text-2xl">{icon}</span>}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {subtitle && (
        <div className="text-xs text-gray-500 mt-1">{subtitle}</div>
      )}
    </div>
  );
};
