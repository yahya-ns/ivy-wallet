import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Category, Tag } from "@/lib/types";
import { IvyCard } from "@/components/ui/IvyCard";
import { IvyButton } from "@/components/ui/IvyButton";
import { IvyIcon } from "@/components/ui/IvyIcon";
import { IvyModal } from "@/components/ui/IvyModal";
import { IvyConfirmModal } from "@/components/ui/IvyConfirmModal";
import { COLOR_OPTIONS, ICON_OPTIONS } from "@/lib/constants";
import { Plus, Edit2, Trash2, Tags as TagsIcon, FolderTree, ChevronRight } from "lucide-react";

export const CategoriesPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"categories" | "tags">("categories");

  // Category states
  const [categories, setCategories] = useState<Category[]>([]);
  const [catLoading, setCatLoading] = useState(true);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);

  // Category form states
  const [catName, setCatName] = useState("");
  const [catColor, setCatColor] = useState("#12B880");
  const [catIcon, setCatIcon] = useState("tag");
  const [catParentId, setCatParentId] = useState<string>("");
  const [catSaving, setCatSaving] = useState(false);
  const [catError, setCatError] = useState<string | null>(null);

  // Tag states
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagLoading, setTagLoading] = useState(true);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);

  // Tag form states
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState("#5C3DF5");
  const [tagSaving, setTagSaving] = useState(false);
  const [tagError, setTagError] = useState<string | null>(null);

  // Confirm delete modals
  const [confirmCat, setConfirmCat] = useState<{ id: string; name: string; isSub?: boolean } | null>(null);
  const [confirmTag, setConfirmTag] = useState<{ id: string; name: string } | null>(null);

  // Fetch Categories
  const fetchCategories = useCallback(async () => {
    setCatLoading(true);
    try {
      const res = await fetch("/api/categories");
      if (res.ok) setCategories(await res.json());
    } catch (e) {
      console.error("Failed to fetch categories:", e);
    } finally {
      setCatLoading(false);
    }
  }, []);

  // Fetch Tags
  const fetchTags = useCallback(async () => {
    setTagLoading(true);
    try {
      const res = await fetch("/api/tags");
      if (res.ok) setTags(await res.json());
    } catch (e) {
      console.error("Failed to fetch tags:", e);
    } finally {
      setTagLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchTags();
  }, [fetchCategories, fetchTags]);

  // Root categories
  const rootCategories = categories.filter((c) => !c.parentId);

  // Parent Category object if a parentId is chosen
  const parentCategoryObj = catParentId
    ? categories.find((c) => c.id === catParentId)
    : null;

  // --- Category Handlers ---
  const handleOpenCreateCategory = (parentId?: string) => {
    setSelectedCat(null);
    setCatName("");
    const parent = parentId ? categories.find((c) => c.id === parentId) : null;
    setCatColor(parent?.color || "#12B880");
    setCatIcon(parent?.icon || "tag");
    setCatParentId(parentId || "");
    setCatError(null);
    setIsCatModalOpen(true);
  };

  const handleOpenEditCategory = (cat: Category) => {
    setSelectedCat(cat);
    setCatName(cat.name);
    const parent = cat.parentId ? categories.find((c) => c.id === cat.parentId) : null;
    setCatColor(parent?.color || cat.color || "#12B880");
    setCatIcon(parent?.icon || cat.icon || "tag");
    setCatParentId(cat.parentId || "");
    setCatError(null);
    setIsCatModalOpen(true);
  };

  const executeDeleteCategory = async () => {
    if (!confirmCat) return;
    try {
      await fetch(`/api/categories/${confirmCat.id}`, { method: "DELETE" });
      fetchCategories();
      window.dispatchEvent(new CustomEvent("ivy-data-updated"));
    } catch (e) {
      console.error("Delete category failed:", e);
    }
  };

  const handleSubmitCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      setCatError("Please enter a category name");
      return;
    }

    setCatSaving(true);
    setCatError(null);

    try {
      const url = selectedCat ? `/api/categories/${selectedCat.id}` : `/api/categories`;
      const method = selectedCat ? "PUT" : "POST";

      const effectiveColor = parentCategoryObj ? parentCategoryObj.color : catColor;
      const effectiveIcon = parentCategoryObj ? parentCategoryObj.icon : catIcon;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: catName.trim(),
          color: effectiveColor,
          icon: effectiveIcon,
          parentId: catParentId ? catParentId : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save category");
      }

      setIsCatModalOpen(false);
      fetchCategories();
      window.dispatchEvent(new CustomEvent("ivy-data-updated"));
    } catch (err: any) {
      setCatError(err.message || "An error occurred");
    } finally {
      setCatSaving(false);
    }
  };

  // --- Tag Handlers ---
  const handleOpenCreateTag = () => {
    setSelectedTag(null);
    setTagName("");
    setTagColor("#5C3DF5");
    setTagError(null);
    setIsTagModalOpen(true);
  };

  const handleOpenEditTag = (tg: Tag) => {
    setSelectedTag(tg);
    setTagName(tg.name);
    setTagColor(tg.color || "#5C3DF5");
    setTagError(null);
    setIsTagModalOpen(true);
  };

  const executeDeleteTag = async () => {
    if (!confirmTag) return;
    try {
      await fetch(`/api/tags/${confirmTag.id}`, { method: "DELETE" });
      fetchTags();
      window.dispatchEvent(new CustomEvent("ivy-data-updated"));
    } catch (e) {
      console.error("Delete tag failed:", e);
    }
  };

  const handleSubmitTag = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = tagName.trim().replace(/^#+/, "");
    if (!cleanName) {
      setTagError("Please enter a tag name");
      return;
    }

    setTagSaving(true);
    setTagError(null);

    try {
      const url = selectedTag ? `/api/tags/${selectedTag.id}` : `/api/tags`;
      const method = selectedTag ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanName,
          color: tagColor,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save tag");
      }

      setIsTagModalOpen(false);
      fetchTags();
      window.dispatchEvent(new CustomEvent("ivy-data-updated"));
    } catch (err: any) {
      setTagError(err.message || "An error occurred");
    } finally {
      setTagSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">
            Categories & Tags
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            Organize transactions with hierarchical sub-categories and custom tags. Click any to view detailed activity.
          </p>
        </div>

        {/* Segmented Tab Navigation */}
        <div className="flex items-center p-1 bg-[var(--bg-surface-elevated)] rounded-2xl border border-[var(--border-subtle)] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("categories")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeTab === "categories"
                ? "bg-ivy-purple text-white shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            <FolderTree size={16} />
            <span>Categories ({rootCategories.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("tags")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeTab === "tags"
                ? "bg-ivy-purple text-white shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            <TagsIcon size={16} />
            <span>Tags ({tags.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CATEGORIES & SUB-CATEGORIES */}
      {/* ========================================================================= */}
      {activeTab === "categories" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
              Main Categories & Sub-Categories
            </span>
            <IvyButton onClick={() => handleOpenCreateCategory()} variant="primary" size="sm">
              <Plus size={16} className="stroke-[2.5]" />
              <span>New Category</span>
            </IvyButton>
          </div>

          {catLoading ? (
            <div className="py-12 text-center text-sm font-semibold text-[var(--text-muted)]">
              Loading categories...
            </div>
          ) : rootCategories.length === 0 ? (
            <IvyCard className="p-12 text-center">
              <p className="text-base font-bold text-[var(--text-primary)]">No Categories Found</p>
              <p className="text-xs text-[var(--text-muted)] mt-1 mb-4">
                Create your first category to organize transactions.
              </p>
              <IvyButton onClick={() => handleOpenCreateCategory()} size="sm">
                <Plus size={16} />
                <span>Create Category</span>
              </IvyButton>
            </IvyCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rootCategories.map((cat) => {
                const subcategories = cat.subcategories || [];

                return (
                  <IvyCard
                    key={cat.id}
                    onClick={() => setLocation(`/categories/${cat.id}`)}
                    className="p-5 flex flex-col justify-between hover:border-ivy-purple/50 hover:shadow-md transition-all group cursor-pointer"
                  >
                    {/* Top Row: Icon, Title & Actions */}
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-md transition-transform group-hover:scale-105"
                            style={{ backgroundColor: cat.color }}
                          >
                            <IvyIcon name={cat.icon || "tag"} size={22} />
                          </div>

                          <div className="min-w-0">
                            <h3 className="font-extrabold text-base text-[var(--text-primary)] truncate flex items-center gap-1.5">
                              <span>{cat.name}</span>
                              <ChevronRight size={14} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                            </h3>
                            <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                              {subcategories.length}{" "}
                              {subcategories.length === 1 ? "sub-category" : "sub-categories"}
                            </span>
                          </div>
                        </div>

                        {/* Edit / Delete / Add Subcategory buttons */}
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditCategory(cat);
                            }}
                            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-ivy-purple hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                            title="Edit Category"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmCat({ id: cat.id, name: cat.name, isSub: false });
                            }}
                            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-ivy-red hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                            title="Delete Category"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Sub-categories List */}
                      <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                          <span>Sub-Categories</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenCreateCategory(cat.id);
                            }}
                            className="text-ivy-purple hover:underline flex items-center gap-0.5 cursor-pointer font-bold lowercase first-letter:uppercase"
                          >
                            <Plus size={13} className="stroke-[3]" />
                            <span>Add sub</span>
                          </button>
                        </div>

                        {subcategories.length === 0 ? (
                          <p className="text-xs text-[var(--text-muted)] italic py-1">
                            No sub-categories yet. Click to view transactions or add sub.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {subcategories.map((sub) => (
                              <div
                                key={sub.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLocation(`/categories/${cat.id}`);
                                }}
                                className="group/sub inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-ivy-purple/30 transition-all cursor-pointer"
                              >
                                <span
                                  className="w-1.5 h-1.5 rounded-full shrink-0"
                                  style={{ backgroundColor: sub.color || cat.color }}
                                />
                                <span className="truncate max-w-[130px]">{sub.name}</span>
                                <div className="hidden group-hover/sub:flex items-center gap-0.5 ml-1">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenEditCategory(sub);
                                    }}
                                    className="p-0.5 text-[var(--text-muted)] hover:text-ivy-purple cursor-pointer"
                                    title="Edit sub-category"
                                  >
                                    <Edit2 size={10} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setConfirmCat({ id: sub.id, name: sub.name, isSub: true });
                                    }}
                                    className="p-0.5 text-[var(--text-muted)] hover:text-ivy-red cursor-pointer"
                                    title="Delete sub-category"
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </IvyCard>
                );
              })}

              {/* Add Category Card */}
              <button
                type="button"
                onClick={() => handleOpenCreateCategory()}
                className="p-6 rounded-[24px] border-2 border-dashed border-[var(--border-color)] hover:border-ivy-purple bg-[var(--bg-surface-elevated)]/40 hover:bg-ivy-purple/5 transition-all duration-200 flex flex-col items-center justify-center text-center cursor-pointer min-h-[160px] group"
              >
                <div className="w-12 h-12 rounded-2xl bg-[var(--bg-surface-elevated)] group-hover:bg-ivy-purple group-hover:text-white flex items-center justify-center text-[var(--text-muted)] transition-colors mb-2 shadow-inner">
                  <Plus size={24} className="stroke-[2.5]" />
                </div>
                <span className="text-sm font-bold text-[var(--text-primary)]">Add New Category</span>
                <span className="text-xs text-[var(--text-muted)] mt-0.5">
                  Create a parent category with custom icon & color
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TAGS MANAGER */}
      {/* ========================================================================= */}
      {activeTab === "tags" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
              All Transaction Tags
            </span>
            <IvyButton onClick={handleOpenCreateTag} variant="primary" size="sm">
              <Plus size={16} className="stroke-[2.5]" />
              <span>New Tag</span>
            </IvyButton>
          </div>

          {tagLoading ? (
            <div className="py-12 text-center text-sm font-semibold text-[var(--text-muted)]">
              Loading tags...
            </div>
          ) : tags.length === 0 ? (
            <IvyCard className="p-12 text-center">
              <p className="text-base font-bold text-[var(--text-primary)]">No Tags Created Yet</p>
              <p className="text-xs text-[var(--text-muted)] mt-1 mb-4">
                Tags help you cross-reference transactions across multiple categories.
              </p>
              <IvyButton onClick={handleOpenCreateTag} size="sm">
                <Plus size={16} />
                <span>Create First Tag</span>
              </IvyButton>
            </IvyCard>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4">
              {tags.map((tg) => (
                <IvyCard
                  key={tg.id}
                  onClick={() => setLocation(`/tags/${tg.id}`)}
                  className="p-4 flex items-center justify-between group hover:border-ivy-purple/50 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm"
                      style={{ backgroundColor: tg.color }}
                    >
                      <TagsIcon size={18} />
                    </div>

                    <div className="min-w-0">
                      <p className="font-bold text-sm text-[var(--text-primary)] truncate flex items-center gap-1">
                        <span>#{tg.name}</span>
                        <ChevronRight size={13} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </p>
                      <p className="text-[11px] font-semibold text-[var(--text-muted)]">
                        {tg.transactionCount || 0}{" "}
                        {(tg.transactionCount || 0) === 1 ? "transaction" : "transactions"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditTag(tg);
                      }}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-ivy-purple hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                      title="Edit Tag"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmTag({ id: tg.id, name: tg.name });
                      }}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-ivy-red hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                      title="Delete Tag"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </IvyCard>
              ))}

              {/* Add Tag Card */}
              <button
                type="button"
                onClick={handleOpenCreateTag}
                className="p-4 rounded-[24px] border-2 border-dashed border-[var(--border-color)] hover:border-ivy-purple bg-[var(--bg-surface-elevated)]/40 hover:bg-ivy-purple/5 transition-all duration-200 flex flex-col items-center justify-center text-center cursor-pointer min-h-[90px] group"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)] group-hover:text-ivy-purple">
                  <Plus size={16} className="stroke-[2.5]" />
                  <span>Add Tag</span>
                </div>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE / EDIT CATEGORY */}
      {/* ========================================================================= */}
      <IvyModal
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        title={
          selectedCat
            ? catParentId
              ? "Edit Sub-Category"
              : "Edit Category"
            : catParentId
            ? "New Sub-Category"
            : "New Category"
        }
        maxWidth="md"
      >
        <form onSubmit={handleSubmitCategory} className="space-y-4">
          {catError && (
            <div className="p-3 bg-ivy-red/10 border border-ivy-red/30 text-ivy-red rounded-xl text-xs font-semibold">
              {catError}
            </div>
          )}

          {/* Parent Category Selector */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
              Category Level & Hierarchy
            </label>
            <select
              value={catParentId}
              onChange={(e) => {
                const newParentId = e.target.value;
                setCatParentId(newParentId);
                if (newParentId) {
                  const p = categories.find((c) => c.id === newParentId);
                  if (p) {
                    setCatColor(p.color || "#12B880");
                    setCatIcon(p.icon || "tag");
                  }
                }
              }}
              className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-sm font-semibold text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
            >
              <option value="">None (Top-Level Main Category)</option>
              {rootCategories
                .filter((r) => !selectedCat || r.id !== selectedCat.id)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    📁 Under "{r.name}"
                  </option>
                ))}
            </select>
          </div>

          {/* If Sub-category is selected: show inherited info banner */}
          {parentCategoryObj ? (
            <div className="p-3 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                style={{ backgroundColor: parentCategoryObj.color }}
              >
                <IvyIcon name={parentCategoryObj.icon || "tag"} size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--text-primary)]">
                  Inherited from "{parentCategoryObj.name}"
                </p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Icon and color are locked and inherited directly from the parent category.
                </p>
              </div>
            </div>
          ) : null}

          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
              {catParentId ? "Sub-Category Name" : "Category Name"}
            </label>
            <input
              type="text"
              placeholder={catParentId ? "e.g. Coffee & Cafe, Fast Food" : "e.g. Food & Dining, Shopping"}
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
              required
              autoFocus
            />
          </div>

          {/* Color & Icon selectors only for Top-Level Main Categories */}
          {!catParentId && (
            <>
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
                      onClick={() => setCatColor(c.value)}
                      className={`w-7 h-7 rounded-full transition-transform cursor-pointer shadow-sm ${
                        catColor === c.value
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
                      onClick={() => setCatIcon(iconName)}
                      className={`p-2.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                        catIcon === iconName
                          ? "border-ivy-purple bg-ivy-purple/10 text-ivy-purple"
                          : "border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] hover:border-[var(--border-color)]"
                      }`}
                    >
                      <IvyIcon name={iconName} size={18} />
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Submit */}
          <div className="pt-2">
            <IvyButton type="submit" disabled={catSaving} className="w-full py-3">
              {catSaving
                ? "Saving..."
                : selectedCat
                ? catParentId
                  ? "Update Sub-Category"
                  : "Update Category"
                : catParentId
                ? "Create Sub-Category"
                : "Create Category"}
            </IvyButton>
          </div>
        </form>
      </IvyModal>

      {/* ========================================================================= */}
      {/* MODAL: CREATE / EDIT TAG */}
      {/* ========================================================================= */}
      <IvyModal
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        title={selectedTag ? "Edit Tag" : "New Tag"}
        maxWidth="md"
      >
        <form onSubmit={handleSubmitTag} className="space-y-4">
          {tagError && (
            <div className="p-3 bg-ivy-red/10 border border-ivy-red/30 text-ivy-red rounded-xl text-xs font-semibold">
              {tagError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
              Tag Name
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-bold text-sm">
                #
              </span>
              <input
                type="text"
                placeholder="office, reimburse, weekend, holiday"
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] rounded-xl pl-8 pr-4 py-2.5 text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:border-ivy-purple"
                required
                autoFocus
              />
            </div>
          </div>

          {/* Color selector */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-wider">
              Tag Color
            </label>
            <div className="flex flex-wrap gap-2.5">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setTagColor(c.value)}
                  className={`w-7 h-7 rounded-full transition-transform cursor-pointer shadow-sm ${
                    tagColor === c.value
                      ? "scale-125 ring-2 ring-offset-2 ring-ivy-purple"
                      : "hover:scale-110"
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <IvyButton type="submit" disabled={tagSaving} className="w-full py-3">
              {tagSaving ? "Saving..." : selectedTag ? "Update Tag" : "Create Tag"}
            </IvyButton>
          </div>
        </form>
      </IvyModal>

      {/* Themed Confirm Modal: Delete Category or Subcategory */}
      <IvyConfirmModal
        isOpen={!!confirmCat}
        onClose={() => setConfirmCat(null)}
        onConfirm={executeDeleteCategory}
        title={confirmCat?.isSub ? "Delete Sub-Category?" : "Delete Category?"}
        message={
          confirmCat?.isSub
            ? `Are you sure you want to delete "${confirmCat.name}"? Transactions will remain in the parent category.`
            : `Are you sure you want to delete "${confirmCat?.name}" and all of its sub-categories? Existing transactions will remain.`
        }
        confirmText={confirmCat?.isSub ? "Delete Sub-Category" : "Delete Category"}
      />

      {/* Themed Confirm Modal: Delete Tag */}
      <IvyConfirmModal
        isOpen={!!confirmTag}
        onClose={() => setConfirmTag(null)}
        onConfirm={executeDeleteTag}
        title="Delete Tag?"
        message={`Are you sure you want to delete #${confirmTag?.name}? Transactions will remain without this tag.`}
        confirmText="Delete Tag"
      />
    </div>
  );
};
