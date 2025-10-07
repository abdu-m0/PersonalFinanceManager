import React, { useState, useMemo, useEffect } from 'react';
import type { Budget, BudgetPeriod, Category } from '../../types';
import { FormInput, FormSelect, CategorySelect, CurrencyInput } from './FormComponents';
import { buttonClasses } from '../../styles/classes';
import { Modal } from './Modal';
import Switch from './Switch';

export type BudgetFormState = {
  label: string;
  period: BudgetPeriod;
  startDate: string;
  endDate: string;
  carryForward: boolean;
  locked: boolean;
  categories: Array<{
    id: string;
    category: string;
    limit: string;
    carryForward: boolean;
  }>;
};

type BudgetFormProps = {
  onSubmit: (budget: BudgetFormState) => Promise<void>;
  onCancel?: () => void;
  budget?: Budget | null;
  categories: Category[];
  onCreateCategory: (name: string) => Promise<void>;
  status: string;
  submitText: string;
};

export function BudgetForm({
  onSubmit,
  onCancel,
  budget,
  categories,
  onCreateCategory,
  status,
  submitText,
}: BudgetFormProps) {
  const categoryNameOptions = useMemo(() => {
    const seen = new Set<string>();
    categories.forEach((category) => {
      const name = category.name.trim();
      if (name && !seen.has(name)) {
        seen.add(name);
      }
    });
    if (seen.size === 0) {
      seen.add("General");
    }
    return Array.from(seen).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [categories]);
  const fallbackCategoryName = categoryNameOptions[0] ?? "General";

  const [formState, setFormState] = useState<BudgetFormState>(() => ({
    label: budget?.label || "",
    period: budget?.period || "monthly",
    startDate: budget?.startDate || new Date().toISOString().slice(0, 10),
    endDate: budget?.endDate || "",
    carryForward: budget?.carryForward ?? true,
    locked: budget?.locked ?? false,
    categories: budget?.categories.map(c => ({ ...c, limit: c.limit.toString() })) || [{ id: crypto.randomUUID(), category: fallbackCategoryName, limit: "0", carryForward: true }]
  }));

  useEffect(() => {
    if (budget) {
      setFormState({
        label: budget.label,
        period: budget.period,
        startDate: budget.startDate,
        endDate: budget.endDate || "",
        carryForward: budget.carryForward,
        locked: budget.locked,
        categories: budget.categories.map(c => ({ ...c, limit: c.limit.toString(), id: c.id || crypto.randomUUID() })),
      });
    }
  }, [budget]);

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryStatus, setCategoryStatus] = useState("");

  const handleChange = (field: keyof BudgetFormState, value: string | boolean | BudgetPeriod) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  };

  const handleCategoryChange = (index: number, field: keyof BudgetFormState['categories'][0], value: string | boolean) => {
    setFormState(prev => ({
      ...prev,
      categories: prev.categories.map((cat, i) => i === index ? { ...cat, [field]: value } : cat)
    }));
  };

  const addCategoryRow = () => {
    setFormState(prev => ({
      ...prev,
      categories: [...prev.categories, { id: crypto.randomUUID(), category: fallbackCategoryName, limit: "0", carryForward: false }]
    }));
  };

  const removeCategoryRow = (index: number) => {
    setFormState(prev => ({
      ...prev,
      categories: prev.categories.filter((_, i) => i !== index)
    }));
  };

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      setCategoryStatus("Enter a category name");
      return;
    }
    try {
      setCategoryStatus("Adding...");
      await onCreateCategory(name);
      setCategoryStatus(`Added ${name}`);
      setNewCategoryName("");
      setIsAddingCategory(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add category";
      setCategoryStatus(message);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSubmit(formState);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6">
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="Label"
            value={formState.label}
            onChange={(value) => handleChange('label', value)}
            required
          />
          <FormSelect
            label="Period"
            value={formState.period}
            onChange={(value) => handleChange('period', value as BudgetPeriod)}
            options={[
              { value: "monthly", label: "Monthly" },
              { value: "weekly", label: "Weekly" },
              { value: "custom", label: "Custom" }
            ]}
          />
        </div>
        <div className="flex gap-2 items-center">
          <FormInput
            label="Date Range"
            type="date"
            value={formState.startDate}
            onChange={(value) => handleChange('startDate', value)}
            placeholder="Start date"
          />
          <div className="mx-2 text-slate-400">to</div>
          <FormInput
            label=""
            type="date"
            value={formState.endDate}
            onChange={(value) => handleChange('endDate', value)}
            placeholder="End date"
          />
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-3">
          <h3 className="m-0 text-sm font-semibold">Categories</h3>
          {categoryStatus && (
            <span className={`text-xs block mt-1 ${categoryStatus.startsWith("Added") ? "text-emerald-700" : "text-rose-700"}`}>{categoryStatus}</span>
          )}
        </div>

        {formState.categories.map((category, index) => (
          <div key={category.id} className="grid grid-cols-[2fr_1fr_32px] gap-3 items-start mb-3">
            <CategorySelect
              label="Category"
              value={category.category}
              options={categoryNameOptions}
              onChange={(value) => handleCategoryChange(index, "category", value)}
            />
            <CurrencyInput
              label="Limit"
              value={category.limit}
              onChange={(value) => handleCategoryChange(index, "limit", value)}
            />
            <div className="flex justify-end">
              <button
                type="button"
                className="text-red-500 hover:text-red-700 font-bold text-xl"
                onClick={() => removeCategoryRow(index)}
                disabled={formState.categories.length === 1}
                title="Remove category"
              >
                ×
              </button>
            </div>
          </div>
        ))}
        <div className="flex gap-2 mt-2">
          <button type="button" className={buttonClasses.secondary} onClick={addCategoryRow}>
            Add Category
          </button>
          <button
            type="button"
            className={`${buttonClasses.secondary} border-sky-400 bg-sky-50 text-sky-700`}
            onClick={() => setIsAddingCategory(true)}
          >
            Create Category
          </button>
        </div>
      </div>

      <Modal isOpen={isAddingCategory} onClose={() => setIsAddingCategory(false)} title="Create New Category">
        <div className="flex gap-2 mb-4 flex-wrap">
          <input
            type="text"
            value={newCategoryName}
            placeholder="Category name"
            onChange={(e) => setNewCategoryName(e.target.value)}
            className="flex-1 min-w-[200px] px-2 py-2 rounded-lg border text-sm border-slate-300"
          />
          <button type="button" className={buttonClasses.primary} onClick={handleCreateCategory}>
            Save
          </button>
          <button type="button" className={buttonClasses.secondary} onClick={() => setIsAddingCategory(false)}>
            Cancel
          </button>
        </div>
        {categoryStatus && (
          <span className={`text-xs block mt-1 ${categoryStatus.startsWith("Added") ? "text-emerald-700" : "text-rose-700"}`}>{categoryStatus}</span>
        )}
      </Modal>

      <div className="mt-6">
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                <Switch checked={formState.carryForward} onChange={(v: boolean) => handleChange('carryForward', v)} ariaLabel="Carry forward" />
                <span className="text-sm font-semibold">Carry forward remaining amounts</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={formState.locked} onChange={(v: boolean) => handleChange('locked', v)} ariaLabel="Lock budget" />
                <span className="text-sm font-semibold">Lock budget period</span>
              </div>
            </div>
      </div>

      <div className="flex items-center gap-4 mt-6">
        <button className={buttonClasses.primary} type="submit">
          {submitText}
        </button>
        {onCancel && (
          <button type="button" className={buttonClasses.secondary} onClick={onCancel}>
            Cancel
          </button>
        )}
        {status && <span className="text-sm text-slate-700">{status}</span>}
      </div>
    </form>
  );
}
