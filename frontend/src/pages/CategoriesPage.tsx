import React, { useState, useEffect, useCallback } from "react";
import { Category } from "@/lib/types";
import { IvyCard } from "@/components/ui/IvyCard";
import { IvyButton } from "@/components/ui/IvyButton";
import { IvyIcon } from "@/components/ui/IvyIcon";
import { IvyModal } from "@/components/ui/IvyModal";
import { COLOR_OPTIONS, ICON_OPTIONS } from "@/lib/constants";
import { Plus, Edit2, Trash2 } from "lucide-react";

export const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [color, setColor] = useState("#12B880");
  const [icon, setIcon] = useState("tag");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/categories");
      if (res.ok) setCategories(await res.json());
    } catch (e) {
      console.error("Failed to fetch categories:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleOpenCreate = () => {
    setSelectedCat(null);
    setName("");
    setColor("#12B880");
    setIcon("tag");
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setSelectedCat(cat);
    setName(cat.name);
    setColor(cat.color || "#12B880");
    setIcon(cat.icon || "tag");
    setError(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    try {
      await fetch(`/api/categories/${id}`, { method: "DELETE" });
      fetchCategories();
      window.dispatchEvent(new CustomEvent("ivy-data-updated"));
    } catch (e) {
      console.error("Delete category failed:", e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter a category name");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const url = selectedCat ? `/api/categories/${selectedCat.id}` : `/api/categories`;
      const method = selectedCat ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), color, icon }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save category");
      }

      setIsModalOpen(false);
      fetchCategories();
      window.dispatchEvent(new CustomEvent("ivy-data-updated"));
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">
            Categories
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            Organize transactions with personalized categories, colors, and icons.
          </p>
        </div>

        <IvyButton onClick={handleOpenCreate} variant="primary" size="md">
          <Plus size={18} className="stroke-[2.5]" />
          <span>New Category</span>
        </IvyButton>
      </div>

      {/* Categories Grid */}
      {loading ? (
        <div className="py-12 text-center text-sm font-semibold text-[var(--text-muted)]">
          Loading categories...
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4">
          {categories.map((cat) => (
            <IvyCard
              key={cat.id}
              className="p-4 flex flex-col items-center justify-between text-center relative group hover:border-ivy-purple/40"
            >
              <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                <button
                  onClick={() => handleOpenEdit(cat)}
                  className="p-1 rounded-lg text-[var(--text-muted)] hover:text-ivy-purple hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  title="Edit"
                >
                  <Edit2 size={13} />
                </button>
                <button
                  onClick={() => handleDelete(cat.id)}
                  className="p-1 rounded-lg text-[var(--text-muted)] hover:text-ivy-red hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white my-2 shadow-md transition-transform group-hover:scale-105"
                style={{ backgroundColor: cat.color }}
              >
                <IvyIcon name={cat.icon || "tag"} size={22} />
              </div>

              <p className="font-bold text-xs sm:text-sm text-[var(--text-primary)] truncate max-w-full mt-1">
                {cat.name}
              </p>
            </IvyCard>
          ))}

          {/* Add Category Card */}
          <button
            onClick={handleOpenCreate}
            className="p-4 rounded-[24px] border-2 border-dashed border-[var(--border-color)] hover:border-ivy-purple bg-[var(--bg-surface-elevated)]/40 hover:bg-ivy-purple/5 transition-all duration-200 flex flex-col items-center justify-center text-center cursor-pointer min-h-[120px] group"
          >
            <div className="w-10 h-10 rounded-xl bg-[var(--bg-surface-elevated)] group-hover:bg-ivy-purple group-hover:text-white flex items-center justify-center text-[var(--text-muted)] transition-colors mb-1 shadow-inner">
              <Plus size={20} className="stroke-[2.5]" />
            </div>
            <span className="text-xs font-bold text-[var(--text-primary)]">Add Category</span>
          </button>
        </div>
      )}

      {/* Create / Edit Category Modal */}
      <IvyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedCat ? "Edit Category" : "New Category"}
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-ivy-red/10 border border-ivy-red/30 text-ivy-red rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
              Category Name
            </label>
            <input
              type="text"
              placeholder="e.g. Groceries, Entertainment, Gaming"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
              required
            />
          </div>

          {/* Color selector */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-wider">
              Color
            </label>
            <div className="flex flex-wrap gap-2.5">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-7 h-7 rounded-full transition-transform cursor-pointer shadow-sm ${
                    color === c.value
                      ? "scale-125 ring-2 ring-offset-2 ring-ivy-purple"
                      : "hover:scale-110"
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {/* Icon selector */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-wider">
              Icon
            </label>
            <div className="grid grid-cols-6 gap-2 max-h-36 overflow-y-auto p-1">
              {ICON_OPTIONS.map((iconName) => (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => setIcon(iconName)}
                  className={`p-2.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                    icon === iconName
                      ? "border-ivy-purple bg-ivy-purple/10 text-ivy-purple"
                      : "border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] hover:border-[var(--border-color)]"
                  }`}
                >
                  <IvyIcon name={iconName} size={18} />
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <IvyButton type="submit" disabled={saving} className="w-full py-3">
              {saving ? "Saving..." : selectedCat ? "Update Category" : "Create Category"}
            </IvyButton>
          </div>
        </form>
      </IvyModal>
    </div>
  );
};
