import React, { useState, useRef, useEffect } from "react";
import { Category } from "@/lib/types";
import { IvyIcon } from "./IvyIcon";
import { ChevronDown, Check, Tag } from "lucide-react";

interface CategorySelectProps {
  value: string;
  onChange: (categoryId: string) => void;
  categories: Category[];
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const CategorySelect: React.FC<CategorySelectProps> = ({
  value,
  onChange,
  categories,
  label,
  placeholder = "Select Category",
  disabled = false,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedCategory = categories.find((c) => c.id === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (catId: string) => {
    onChange(catId);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] hover:border-ivy-purple focus:border-ivy-purple rounded-xl px-3 py-2 text-left flex items-center justify-between gap-2.5 transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          isOpen ? "ring-2 ring-ivy-purple/20 border-ivy-purple" : ""
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {selectedCategory ? (
            <>
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                style={{ backgroundColor: selectedCategory.color || "#5C3DF5" }}
              >
                <IvyIcon name={selectedCategory.icon || "tag"} size={16} />
              </div>
              <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                {selectedCategory.name}
              </span>
            </>
          ) : (
            <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs font-medium py-1">
              <Tag size={16} />
              <span>{placeholder}</span>
            </div>
          )}
        </div>

        <ChevronDown
          size={16}
          className={`text-[var(--text-muted)] shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-ivy-purple" : ""
          }`}
        />
      </button>

      {/* Options Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-2xl p-1.5 space-y-1 max-h-60 overflow-y-auto backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
          {categories.length === 0 ? (
            <div className="p-3 text-center text-xs text-[var(--text-muted)]">
              No categories available
            </div>
          ) : (
            categories.map((cat) => {
              const isSelected = cat.id === value;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelect(cat.id)}
                  className={`w-full flex items-center justify-between gap-2.5 p-2 rounded-xl text-left cursor-pointer transition-all duration-150 ${
                    isSelected
                      ? "bg-ivy-purple/10 border border-ivy-purple/30 text-[var(--text-primary)] font-bold"
                      : "hover:bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] border border-transparent"
                  }`}
                >
                  {/* Left: Icon & Name */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                      style={{ backgroundColor: cat.color || "#5C3DF5" }}
                    >
                      <IvyIcon name={cat.icon || "tag"} size={16} />
                    </div>
                    <span className="text-xs font-bold truncate">
                      {cat.name}
                    </span>
                  </div>

                  {/* Right: Check Icon */}
                  {isSelected && (
                    <div className="shrink-0 pl-1">
                      <Check size={16} className="text-ivy-purple stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
