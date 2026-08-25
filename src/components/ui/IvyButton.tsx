"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface IvyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "success" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

export function IvyButton({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: IvyButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-medium rounded-full transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer";

  const sizeStyles = {
    sm: "px-3.5 py-1.5 text-xs gap-1.5",
    md: "px-5 py-2.5 text-sm gap-2",
    lg: "px-6 py-3.5 text-base gap-2.5 font-semibold",
  };

  const variantStyles = {
    primary:
      "bg-ivy-purple text-white hover:bg-ivy-purple-kindaLight shadow-md shadow-ivy-purple/25",
    secondary:
      "bg-ivy-extraLightGray dark:bg-ivy-darkGray text-ivy-black dark:text-ivy-white hover:opacity-90",
    success:
      "bg-ivy-green text-white hover:bg-ivy-green-kindaLight shadow-md shadow-ivy-green/25",
    danger:
      "bg-ivy-red text-white hover:bg-ivy-red-kindaLight shadow-md shadow-ivy-red/25",
    outline:
      "border border-ivy-lightGray dark:border-ivy-darkGray text-ivy-black dark:text-ivy-white hover:bg-black/5 dark:hover:bg-white/5",
    ghost:
      "text-ivy-gray hover:text-ivy-black dark:hover:text-ivy-white hover:bg-black/5 dark:hover:bg-white/5",
  };

  return (
    <button
      className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
}
