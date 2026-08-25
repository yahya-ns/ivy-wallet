import React from "react";
import { cn } from "@/lib/utils";

interface IvyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "success" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg" | "icon";
  children: React.ReactNode;
}

export const IvyButton: React.FC<IvyButtonProps> = ({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center font-bold transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]";

  const variantStyles = {
    primary:
      "bg-ivy-purple text-white shadow-lg shadow-ivy-purple/25 hover:bg-ivy-purple-light hover:shadow-ivy-purple/40",
    secondary:
      "bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] hover:bg-[var(--border-color)] border border-[var(--border-subtle)]",
    success:
      "bg-ivy-green text-white shadow-lg shadow-ivy-green/25 hover:brightness-110",
    danger:
      "bg-ivy-red text-white shadow-lg shadow-ivy-red/25 hover:brightness-110",
    ghost:
      "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-surface-elevated)] hover:text-[var(--text-primary)]",
    outline:
      "bg-transparent text-[var(--text-primary)] border-2 border-[var(--border-color)] hover:border-ivy-purple hover:text-ivy-purple",
  };

  const sizeStyles = {
    sm: "px-3.5 py-1.5 text-xs rounded-full gap-1.5",
    md: "px-5 py-2.5 text-sm rounded-full gap-2",
    lg: "px-7 py-3.5 text-base rounded-full gap-2.5",
    icon: "p-2.5 rounded-full aspect-square",
  };

  return (
    <button
      className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
      {...props}
    >
      {children}
    </button>
  );
};
