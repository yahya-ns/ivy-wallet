"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface IvyCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
}

export function IvyCard({
  children,
  className,
  hoverable = false,
  ...props
}: IvyCardProps) {
  return (
    <div
      className={cn(
        "ivy-card p-5 sm:p-6",
        hoverable && "cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
