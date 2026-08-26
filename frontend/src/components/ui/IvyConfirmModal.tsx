import React, { useState } from "react";
import { IvyModal } from "@/components/ui/IvyModal";
import { IvyButton } from "@/components/ui/IvyButton";
import { AlertTriangle, Trash2, HelpCircle } from "lucide-react";

export interface IvyConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title?: string;
  message?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "primary";
  isLoading?: boolean;
}

export const IvyConfirmModal: React.FC<IvyConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Deletion",
  message = "Are you sure you want to proceed? This action cannot be undone.",
  confirmText = "Delete",
  cancelText = "Cancel",
  variant = "danger",
  isLoading = false,
}) => {
  const [internalLoading, setInternalLoading] = useState(false);

  const handleConfirm = async () => {
    try {
      setInternalLoading(true);
      await onConfirm();
      onClose();
    } catch (e) {
      console.error("Confirmation action failed:", e);
    } finally {
      setInternalLoading(false);
    }
  };

  const isPending = isLoading || internalLoading;

  const getVariantStyles = () => {
    switch (variant) {
      case "danger":
        return {
          icon: <Trash2 className="w-6 h-6 text-ivy-red stroke-[2.2]" />,
          iconBg: "bg-ivy-red/10 border-ivy-red/20 shadow-ivy-red/10",
          btnVariant: "danger" as const,
        };
      case "warning":
        return {
          icon: <AlertTriangle className="w-6 h-6 text-ivy-orange stroke-[2.2]" />,
          iconBg: "bg-ivy-orange/10 border-ivy-orange/20 shadow-ivy-orange/10",
          btnVariant: "primary" as const,
        };
      default:
        return {
          icon: <HelpCircle className="w-6 h-6 text-ivy-purple stroke-[2.2]" />,
          iconBg: "bg-ivy-purple/10 border-ivy-purple/20 shadow-ivy-purple/10",
          btnVariant: "primary" as const,
        };
    }
  };

  const vStyles = getVariantStyles();

  return (
    <IvyModal isOpen={isOpen} onClose={isPending ? () => {} : onClose} maxWidth="sm">
      <div className="flex flex-col items-center text-center p-2 space-y-4">
        {/* Glowing Icon Badge */}
        <div
          className={`w-14 h-14 rounded-2xl border flex items-center justify-center shadow-lg transition-transform animate-in zoom-in-75 duration-200 ${vStyles.iconBg}`}
        >
          {vStyles.icon}
        </div>

        {/* Title & Description */}
        <div className="space-y-2 max-w-sm">
          <h3 className="text-lg font-black text-[var(--text-primary)] tracking-tight">
            {title}
          </h3>
          <div className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
            {message}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 w-full pt-2">
          <IvyButton
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isPending}
            className="w-full justify-center"
          >
            {cancelText}
          </IvyButton>
          <IvyButton
            type="button"
            variant={vStyles.btnVariant}
            onClick={handleConfirm}
            disabled={isPending}
            className="w-full justify-center"
          >
            {isPending ? "Deleting..." : confirmText}
          </IvyButton>
        </div>
      </div>
    </IvyModal>
  );
};
