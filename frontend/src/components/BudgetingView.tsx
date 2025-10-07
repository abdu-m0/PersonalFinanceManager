import React, { useState } from "react";
import type { Budget, BudgetProgress, Category } from "../types";
import { buttonClasses } from "../styles/classes";
import { Modal } from "./common/Modal";
import { formatAmount, capitalize } from "../utils/formatting";
import PageHeader from "./common/PageHeader";
import { BudgetForm, type BudgetFormState } from "./common/BudgetForm";

type BudgetingViewProps = {
  budgets: Budget[];
  budgetProgress: Map<string, BudgetProgress[]>;
  defaultCurrency: string;
  categories: Category[];
  onCreateCategory: (name: string) => Promise<void>;
  onCreateBudget: (budget: BudgetFormState) => Promise<void>;
  onUpdateBudget: (budgetId: string, budget: BudgetFormState) => Promise<void>;
  onDeleteBudget: (budgetId: string) => Promise<void>;
};

export default function BudgetingView({
  budgets,
  budgetProgress,
  defaultCurrency,
  categories,
  onCreateCategory,
  onCreateBudget,
  onUpdateBudget,
  onDeleteBudget
}: BudgetingViewProps) {
  const [status, setStatus] = useState("");
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [showAddBudgetForm, setShowAddBudgetForm] = useState(false);

  const handleCreateBudget = async (budgetData: BudgetFormState) => {
    try {
      setStatus("Saving...");
      await onCreateBudget(budgetData);
      setStatus("");
      setShowAddBudgetForm(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to create budget";
      setStatus(message);
    }
  };

  const handleUpdateBudget = async (budgetData: BudgetFormState) => {
    if (!editingBudget) return;
    try {
      setStatus("Saving...");
      await onUpdateBudget(editingBudget.id, budgetData);
      setStatus("");
      setEditingBudget(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to update budget";
      setStatus(message);
    }
  };

  return (
    <>
      <PageHeader
        title="Budgeting"
        description="Track and manage your spending limits"
      />

      <section className="bg-white rounded-2xl p-6 mb-6 shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Active Budgets</h2>
          <button className={buttonClasses.primary} onClick={() => { setEditingBudget(null); setShowAddBudgetForm(true); }}>
            Add New Budget
          </button>
        </div>
        {budgets.length === 0 ? (
          <p className="text-slate-500 text-sm">No budgets yet. Create your first budget below.</p>
        ) : (
          <div className="grid gap-5">
            {budgets.map((budget) => {
              const safeCategories = Array.isArray((budget as any).categories) ? (budget as any).categories : [];
              const progressEntries = budgetProgress.get(budget.id) ?? [];
              return (
                <div key={budget.id} className="border border-slate-200 rounded-xl p-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="m-0 text-base font-semibold">{budget.label}</h3>
                      <p className="mt-1 text-slate-500 text-xs">
                        {capitalize(budget.period)} · starts {budget.startDate} {budget.endDate ? `· ends ${budget.endDate}` : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className={buttonClasses.secondary}
                        type="button"
                        onClick={() => setEditingBudget(budget)}
                      >
                        Edit
                      </button>
                      <button
                        className={buttonClasses.danger}
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete the "${budget.label}" budget?`)) {
                            void onDeleteBudget(budget.id);
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3">
                    {safeCategories.map((category: any) => {
                      const progress = progressEntries.find((entry) => entry.category.toLowerCase() === category.category.toLowerCase());
                      const percent = progress ? (progress.spent / (progress.limit || category.limit)) * 100 : 0;
                      return (
                        <div key={category.id ?? category.category}>
                          <div className="flex justify-between text-sm">
                            <span>{category.category}</span>
                            <span>
                              {formatAmount(progress?.spent ?? 0, progress?.currency ?? defaultCurrency)} /{" "}
                              {formatAmount(progress?.limit ?? category.limit, progress?.currency ?? defaultCurrency)}
                            </span>
                          </div>
                          <div className="h-1.5 bg-slate-200 rounded mt-1">
                            <div
                              className={`h-full rounded transition-all duration-300 ${
                                percent > 90
                                  ? "bg-rose-600"
                                  : percent > 75
                                  ? "bg-orange-400"
                                  : "bg-blue-600"
                              }`}
                              style={{ width: `${Math.min(100, percent)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <Modal isOpen={showAddBudgetForm || !!editingBudget} onClose={() => { setShowAddBudgetForm(false); setEditingBudget(null); }} title={editingBudget ? "Edit Budget" : "Create New Budget"}>
        <BudgetForm
          onSubmit={editingBudget ? handleUpdateBudget : handleCreateBudget}
          onCancel={() => { setShowAddBudgetForm(false); setEditingBudget(null); }}
          budget={editingBudget}
          categories={categories}
          onCreateCategory={onCreateCategory}
          status={status}
          submitText={editingBudget ? "Save Changes" : "Create Budget"}
        />
      </Modal>
    </>
  );
}
