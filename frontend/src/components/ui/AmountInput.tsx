import React from "react";
import { formatAmountInput, parseAmountInput } from "@/lib/amountUtils";
import { cn } from "@/lib/utils";

interface AmountInputProps {
  value: string;
  onChange: (formatted: string, numericValue: number) => void;
  placeholder?: string;
  autoFocus?: boolean;
  required?: boolean;
  className?: string;
  id?: string;
  prefix?: string;
  allowNegative?: boolean;
  disabled?: boolean;
}

export const AmountInput: React.FC<AmountInputProps> = ({
  value,
  onChange,
  placeholder = "0",
  autoFocus = false,
  required = false,
  className = "",
  id,
  prefix,
  allowNegative = false,
  disabled = false,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputVal = e.target.value;

    if (!allowNegative && inputVal.startsWith("-")) {
      inputVal = inputVal.replace(/^-+/, "");
    }

    const formatted = formatAmountInput(inputVal);
    const numeric = parseAmountInput(formatted);
    onChange(formatted, numeric);
  };

  return (
    <div className="relative flex items-center">
      {prefix && (
        <span className="absolute left-4 text-lg font-bold text-[var(--text-muted)] select-none">
          {prefix}
        </span>
      )}
      <input
        id={id}
        type="text"
        inputMode="decimal"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        autoFocus={autoFocus}
        required={required}
        disabled={disabled}
        className={cn(
          "w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-2xl px-4 py-3 text-2xl font-black text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple transition-colors",
          prefix ? "pl-12" : "",
          disabled ? "opacity-60 cursor-not-allowed" : "",
          className
        )}
      />
    </div>
  );
};
