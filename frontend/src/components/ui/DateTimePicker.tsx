import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  setHours,
  setMinutes,
  getHours,
  getMinutes,
  isValid,
} from "date-fns";
import { useTheme } from "@/components/theme/ThemeProvider";
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sparkles,
} from "lucide-react";

interface DateTimePickerProps {
  value: string; // ISO string or date-time string
  onChange: (value: string) => void;
  mode?: "datetime" | "date";
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  value,
  onChange,
  mode = "datetime",
  label,
  placeholder = "Select Date & Time",
  disabled = false,
  className = "",
}) => {
  const { formatDate, formatTime } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [popoverCoords, setPopoverCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    placement: "top" | "bottom";
  } | null>(null);

  // Parse valid date from value or fallback to now
  const parsedDate = value ? new Date(value) : new Date();
  const currentDate = isValid(parsedDate) ? parsedDate : new Date();

  // State for browsing calendar months
  const [viewDate, setViewDate] = useState<Date>(currentDate);

  // Sync viewDate when opening or when value changes
  useEffect(() => {
    if (isValid(parsedDate)) {
      setViewDate(parsedDate);
    }
  }, [value, isOpen]);

  // Calculate position (auto flip top or bottom based on viewport space)
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = Math.min(320, window.innerWidth - 32);
    const popoverHeight = mode === "datetime" ? 380 : 310;

    // Horizontal alignment
    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 16) {
      left = window.innerWidth - 16 - popoverWidth;
    }
    if (left < 16) left = 16;

    // Check vertical space
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    // If space below is insufficient and space above is larger, open upward
    if (spaceBelow < popoverHeight && spaceAbove > spaceBelow) {
      setPopoverCoords({
        bottom: window.innerHeight - rect.top + 8,
        left,
        width: popoverWidth,
        placement: "top",
      });
    } else {
      setPopoverCoords({
        top: rect.bottom + 8,
        left,
        width: popoverWidth,
        placement: "bottom",
      });
    }
  }, [mode]);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleScrollOrResize = () => updatePosition();
      window.addEventListener("scroll", handleScrollOrResize, true);
      window.addEventListener("resize", handleScrollOrResize);
      return () => {
        window.removeEventListener("scroll", handleScrollOrResize, true);
        window.removeEventListener("resize", handleScrollOrResize);
      };
    }
  }, [isOpen, updatePosition]);

  // Click outside and Escape handling
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
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
      document.addEventListener("touchstart", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Helper to emit updated date
  const emitChange = (newDate: Date) => {
    if (mode === "date") {
      onChange(format(newDate, "yyyy-MM-dd"));
    } else {
      onChange(newDate.toISOString());
    }
  };

  const handleSelectDay = (day: Date) => {
    let updated = new Date(day);
    if (mode === "datetime") {
      updated = setHours(updated, getHours(currentDate));
      updated = setMinutes(updated, getMinutes(currentDate));
    }
    emitChange(updated);
    if (mode === "date") {
      setIsOpen(false);
    }
  };

  const handleHourChange = (newHours: number) => {
    let normalized = (newHours + 24) % 24;
    const updated = setHours(currentDate, normalized);
    emitChange(updated);
  };

  const handleMinuteChange = (newMinutes: number) => {
    let normalized = (newMinutes + 60) % 60;
    const updated = setMinutes(currentDate, normalized);
    emitChange(updated);
  };

  const handleSetNow = () => {
    const now = new Date();
    emitChange(now);
    setViewDate(now);
  };

  // Generate calendar days matrix
  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const currentHour = getHours(currentDate);
  const currentMinute = getMinutes(currentDate);

  const popoverContent = isOpen && popoverCoords && (
    <div
      ref={popoverRef}
      style={{
        position: "fixed",
        top: popoverCoords.top !== undefined ? `${popoverCoords.top}px` : undefined,
        bottom: popoverCoords.bottom !== undefined ? `${popoverCoords.bottom}px` : undefined,
        left: `${popoverCoords.left}px`,
        width: `${popoverCoords.width}px`,
        zIndex: 9999,
      }}
      className={`bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-2xl p-4 max-w-[95vw] backdrop-blur-xl ${
        popoverCoords.placement === "top"
          ? "animate-in fade-in slide-in-from-bottom-2 duration-150"
          : "animate-in fade-in slide-in-from-top-2 duration-150"
      }`}
    >
      {/* Month/Year Navigation */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
        <button
          type="button"
          onClick={() => setViewDate(subMonths(viewDate, 1))}
          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] transition-colors cursor-pointer"
          title="Previous Month"
        >
          <ChevronLeft size={16} />
        </button>

        <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
          {format(viewDate, "MMMM yyyy")}
        </span>

        <button
          type="button"
          onClick={() => setViewDate(addMonths(viewDate, 1))}
          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] transition-colors cursor-pointer"
          title="Next Month"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 text-center mt-3 mb-1">
        {weekDayNames.map((d) => (
          <div
            key={d}
            className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {calendarDays.map((day) => {
          const isSelected = isSameDay(day, currentDate);
          const isCurrentMonth = isSameMonth(day, viewDate);
          const isTodayDate = isToday(day);

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => handleSelectDay(day)}
              className={`h-8 w-8 mx-auto rounded-xl flex items-center justify-center text-xs font-semibold transition-all duration-150 cursor-pointer ${
                isSelected
                  ? "bg-ivy-purple text-white font-bold shadow-md scale-105"
                  : !isCurrentMonth
                  ? "text-[var(--text-muted)] opacity-30 hover:opacity-80 hover:bg-[var(--bg-surface-elevated)]"
                  : isTodayDate
                  ? "bg-ivy-purple/15 text-ivy-purple font-bold hover:bg-ivy-purple/25"
                  : "text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)]"
              }`}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>

      {/* Time Picker Section (for datetime mode) */}
      {mode === "datetime" && (
        <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={13} className="text-ivy-purple" />
              Time
            </span>
            <button
              type="button"
              onClick={handleSetNow}
              className="text-[10px] font-bold text-ivy-purple hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Sparkles size={11} />
              Set to Now
            </button>
          </div>

          {/* Time Steppers */}
          <div className="flex items-center justify-center gap-2 bg-[var(--bg-surface-elevated)] p-2 rounded-xl border border-[var(--border-subtle)]">
            {/* Hours */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleHourChange(currentHour - 1)}
                className="w-6 h-6 rounded-md bg-[var(--bg-surface)] hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center text-xs font-bold text-[var(--text-primary)] cursor-pointer"
              >
                -
              </button>
              <span className="w-8 text-center text-xs font-bold text-[var(--text-primary)]">
                {String(currentHour).padStart(2, "0")}
              </span>
              <button
                type="button"
                onClick={() => handleHourChange(currentHour + 1)}
                className="w-6 h-6 rounded-md bg-[var(--bg-surface)] hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center text-xs font-bold text-[var(--text-primary)] cursor-pointer"
              >
                +
              </button>
            </div>

            <span className="font-bold text-[var(--text-muted)]">:</span>

            {/* Minutes */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleMinuteChange(currentMinute - 5)}
                className="w-6 h-6 rounded-md bg-[var(--bg-surface)] hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center text-xs font-bold text-[var(--text-primary)] cursor-pointer"
              >
                -
              </button>
              <span className="w-8 text-center text-xs font-bold text-[var(--text-primary)]">
                {String(currentMinute).padStart(2, "0")}
              </span>
              <button
                type="button"
                onClick={() => handleMinuteChange(currentMinute + 5)}
                className="w-6 h-6 rounded-md bg-[var(--bg-surface)] hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center text-xs font-bold text-[var(--text-primary)] cursor-pointer"
              >
                +
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popover Footer */}
      <div className="mt-3 pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleSetNow}
          className="text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] py-1.5 px-2 rounded-lg hover:bg-[var(--bg-surface-elevated)] transition-colors cursor-pointer"
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="bg-ivy-purple hover:bg-ivy-purple/90 text-white text-xs font-bold py-1.5 px-4 rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  );

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] hover:border-ivy-purple focus:border-ivy-purple rounded-xl px-3 py-2 text-left flex items-center justify-between gap-2.5 transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          isOpen ? "ring-2 ring-ivy-purple/20 border-ivy-purple" : ""
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-xl bg-ivy-purple/15 text-ivy-purple flex items-center justify-center shrink-0">
            <CalendarIcon size={16} />
          </div>
          <div className="min-w-0 flex-1 flex flex-col justify-center">
            <span className="text-xs font-bold text-[var(--text-primary)] truncate">
              {formatDate(currentDate)}
            </span>
            {mode === "datetime" ? (
              <span className="text-[11px] font-semibold text-[var(--text-muted)] truncate flex items-center gap-1">
                <Clock size={11} className="inline" />
                {formatTime(currentDate)}
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-[var(--text-muted)] truncate">
                {placeholder}
              </span>
            )}
          </div>
        </div>

        <ChevronDown
          size={16}
          className={`text-[var(--text-muted)] shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-ivy-purple" : ""
          }`}
        />
      </button>

      {/* Portal Popover outside modal container */}
      {typeof document !== "undefined" && popoverContent && createPortal(popoverContent, document.body)}
    </div>
  );
};
