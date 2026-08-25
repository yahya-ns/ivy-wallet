import React from "react";
import { cn } from "@/lib/utils";

interface IvyCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  elevation?: "flat" | "normal" | "elevated";
  highlight?: boolean;
}

export const IvyCard: React.FC<IvyCardProps> = ({
  children,
  className,
  elevation = "normal",
  highlight = false,
  ...props
}) => {
  const elevationStyles = {
    flat: "bg-[var(--bg-surface)] border border-[var(--border-subtle)]",
    normal: "ivy-card shadow-sm",
    elevated: "ivy-card shadow-lg shadow-black/10 bg-[var(--bg-surface-elevated)]",
  };

  return (
    <div
      className={cn(
        "rounded-[24px] overflow-hidden transition-all duration-200",
        elevationStyles[elevation],
        highlight && "ring-2 ring-ivy-purple/50 border-ivy-purple",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
