"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface IvyModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
}

export function IvyModal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "md",
}: IvyModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-200">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={cn(
          "relative z-10 w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-t-[32px] sm:rounded-[32px] shadow-2xl p-6 max-h-[90vh] overflow-y-auto transform transition-all duration-300 animate-in fade-in slide-in-from-bottom-6 sm:slide-in-from-bottom-2",
          maxWidthStyles[maxWidth]
        )}
      >
        {/* Modal Handle for mobile */}
        <div className="w-12 h-1.5 bg-ivy-gray/40 rounded-full mx-auto mb-4 sm:hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border-subtle)]">
          {title && (
            <h3 className="text-lg font-bold text-[var(--text-primary)]">
              {title}
            </h3>
          )}
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div>{children}</div>
      </div>
    </div>
  );
}
