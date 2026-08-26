import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Tag } from "@/lib/types";
import { COLOR_OPTIONS } from "@/lib/constants";
import { X, Plus, Check } from "lucide-react";

interface TagInputProps {
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  label?: string;
  placeholder?: string;
}

export const TagInput: React.FC<TagInputProps> = ({
  selectedTagIds = [],
  onChange,
  label = "Tags",
  placeholder = "Add tags (e.g. #office, #reimburse)...",
}) => {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [popoverCoords, setPopoverCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    placement: "top" | "bottom";
  } | null>(null);

  const fetchTags = async () => {
    try {
      const res = await fetch("/api/tags");
      if (res.ok) {
        const data = await res.json();
        setAllTags(data);
      }
    } catch (e) {
      console.error("Failed to fetch tags:", e);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const popoverWidth = Math.min(Math.max(rect.width, 260), window.innerWidth - 32);
    const popoverHeight = 240; // Estimated max height for suggestions

    // Horizontal alignment
    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 16) {
      left = window.innerWidth - 16 - popoverWidth;
    }
    if (left < 16) left = 16;

    // Check vertical space
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    if (spaceBelow < popoverHeight && spaceAbove > spaceBelow) {
      setPopoverCoords({
        bottom: window.innerHeight - rect.top + 6,
        left,
        width: popoverWidth,
        placement: "top",
      });
    } else {
      setPopoverCoords({
        top: rect.bottom + 6,
        left,
        width: popoverWidth,
        placement: "bottom",
      });
    }
  }, []);

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
  }, [isOpen, updatePosition, selectedTagIds]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const cleanQuery = inputValue.trim().replace(/^#+/, "");
  const selectedTags = allTags.filter((t) => selectedTagIds.includes(t.id));
  const filteredTags = allTags.filter((t) =>
    t.name.toLowerCase().includes(cleanQuery.toLowerCase())
  );
  const exactMatch = allTags.some(
    (t) => t.name.toLowerCase() === cleanQuery.toLowerCase()
  );

  const handleToggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onChange([...selectedTagIds, tagId]);
    }
    setInputValue("");
    inputRef.current?.focus();
  };

  const handleRemoveTag = (e: React.MouseEvent, tagId: string) => {
    e.stopPropagation();
    onChange(selectedTagIds.filter((id) => id !== tagId));
  };

  const handleCreateNewTag = async (nameToCreate: string) => {
    if (!nameToCreate.trim()) return;
    setIsCreating(true);

    try {
      // Pick a balanced color from COLOR_OPTIONS
      const randomColor =
        COLOR_OPTIONS[Math.floor(Math.random() * COLOR_OPTIONS.length)].value;

      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nameToCreate.trim(),
          color: randomColor,
        }),
      });

      if (res.ok) {
        const newTag: Tag = await res.json();
        setAllTags((prev) => {
          if (prev.some((t) => t.id === newTag.id)) return prev;
          return [...prev, newTag];
        });
        if (!selectedTagIds.includes(newTag.id)) {
          onChange([...selectedTagIds, newTag.id]);
        }
        setInputValue("");
        setIsOpen(false);
      }
    } catch (e) {
      console.error("Failed to create tag:", e);
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (cleanQuery) {
        const match = allTags.find(
          (t) => t.name.toLowerCase() === cleanQuery.toLowerCase()
        );
        if (match) {
          if (!selectedTagIds.includes(match.id)) {
            onChange([...selectedTagIds, match.id]);
          }
          setInputValue("");
        } else {
          handleCreateNewTag(cleanQuery);
        }
      }
    } else if (e.key === "Backspace" && !inputValue && selectedTagIds.length > 0) {
      onChange(selectedTagIds.slice(0, -1));
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

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
      className={`bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-2xl p-1.5 space-y-1 max-h-56 overflow-y-auto backdrop-blur-xl ${
        popoverCoords.placement === "top"
          ? "animate-in fade-in slide-in-from-bottom-2 duration-150"
          : "animate-in fade-in slide-in-from-top-2 duration-150"
      }`}
    >
      {cleanQuery && !exactMatch && (
        <button
          type="button"
          disabled={isCreating}
          onClick={() => handleCreateNewTag(cleanQuery)}
          className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left text-xs font-bold text-ivy-purple bg-ivy-purple/10 hover:bg-ivy-purple/15 border border-ivy-purple/20 transition-all cursor-pointer"
        >
          <Plus size={15} className="stroke-[3]" />
          <span>Create tag "#{cleanQuery}"</span>
        </button>
      )}

      {filteredTags.length === 0 && !cleanQuery ? (
        <div className="p-3 text-center text-xs text-[var(--text-muted)]">
          No tags available. Type a name to create one!
        </div>
      ) : (
        filteredTags.map((tag) => {
          const isSelected = selectedTagIds.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => handleToggleTag(tag.id)}
              className={`w-full flex items-center justify-between gap-2.5 p-2 rounded-xl text-left cursor-pointer transition-all duration-150 ${
                isSelected
                  ? "bg-ivy-purple/10 border border-ivy-purple/30 text-[var(--text-primary)] font-bold"
                  : "hover:bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="text-xs font-bold truncate">#{tag.name}</span>
              </div>

              {isSelected && (
                <div className="shrink-0 pl-1">
                  <Check size={14} className="text-ivy-purple stroke-[3]" />
                </div>
              )}
            </button>
          );
        })
      )}
    </div>
  );

  return (
    <div className="relative">
      {label && (
        <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
          {label}
        </label>
      )}

      {/* Input container with chips */}
      <div
        ref={containerRef}
        onClick={() => {
          inputRef.current?.focus();
          setIsOpen(true);
        }}
        className={`min-h-[42px] w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] focus-within:border-ivy-purple rounded-xl px-3 py-1.5 flex flex-wrap items-center gap-1.5 cursor-text transition-all ${
          isOpen ? "ring-2 ring-ivy-purple/20 border-ivy-purple" : ""
        }`}
      >
        {/* Selected tag pills */}
        {selectedTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-xs"
            style={{
              backgroundColor: `${tag.color}15`,
              color: tag.color,
              border: `1px solid ${tag.color}35`,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: tag.color }}
            />
            <span>#{tag.name}</span>
            <button
              type="button"
              onClick={(e) => handleRemoveTag(e, tag.id)}
              className="hover:opacity-75 p-0.5 rounded-full transition-opacity cursor-pointer"
            >
              <X size={12} className="stroke-[2.5]" />
            </button>
          </span>
        ))}

        {/* Input text */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selectedTags.length === 0 ? placeholder : "Add more tags..."}
          className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] py-1"
        />
      </div>

      {/* Portal Dropdown suggestions */}
      {typeof document !== "undefined" && popoverContent && createPortal(popoverContent, document.body)}
    </div>
  );
};
