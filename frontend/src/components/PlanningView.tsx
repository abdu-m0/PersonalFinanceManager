import React, { useState } from "react";
import type { Budget, BudgetProgress, SavingsGoal, Category } from "../types";
import { buttonClasses } from "../styles/classes";
import { Modal } from "./common/Modal";
import { formatAmount, formatDate, capitalize } from "../utils/formatting";
import { PageHeader } from "./common/PageHeader";
import { BudgetForm, type BudgetFormState } from "./common/BudgetForm";
import { SavingsGoalForm, type SavingsGoalFormState } from "./common/SavingsGoalForm";
import { ContributionForm, type ContributionFormState } from "./common/ContributionForm";

type PlanningViewProps = {
  budgets: Budget[];
  budgetProgress: Map<string, BudgetProgress[]>;
  savingsGoals: SavingsGoal[];
  defaultCurrency: string;
  categories: Category[];
  onCreateCategory: (name: string) => Promise<void>;
  onCreateBudget: (budget: BudgetFormState) => Promise<void>;
  onUpdateBudget: (budgetId: string, budget: BudgetFormState) => Promise<void>;
  onDeleteBudget: (budgetId: string) => Promise<void>;
  onCreateSavingsGoal: (goal: SavingsGoalFormState) => Promise<void>;
  onUpdateSavingsGoal: (goalId: string, goal: SavingsGoalFormState) => Promise<void>;
  onDeleteSavingsGoal: (goalId: string) => Promise<void>;
  onAddContribution: (goalId: string, contribution: ContributionFormState) => Promise<void>;
  onDeleteContribution: (goalId: string, contributionId: string) => Promise<void>;
};

export default function PlanningView({
  budgets,
  budgetProgress,
  savingsGoals,
  defaultCurrency,
  categories,
  onCreateCategory,
  onCreateBudget,
  onUpdateBudget,
  onDeleteBudget,
  onCreateSavingsGoal,
  onUpdateSavingsGoal,
  onDeleteSavingsGoal,
  onAddContribution,
  onDeleteContribution,
}: PlanningViewProps) {
  const [activeTab, setActiveTab] = useState<"budgets" | "savings">("budgets");
  const [status, setStatus] = useState("");

  // Budgeting state
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [showAddBudgetForm, setShowAddBudgetForm] = useState(false);

  // Savings state
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [addingContributionTo, setAddingContributionTo] = useState<SavingsGoal | null>(null);
  const [showAddGoalForm, setShowAddGoalForm] = useState(false);
  const [viewingHistoryOf, setViewingHistoryOf] = useState<SavingsGoal | null>(null);

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

  const handleCreateGoal = async (goalData: SavingsGoalFormState) => {
    try {
      setStatus("Saving...");
      await onCreateSavingsGoal(goalData);
      setStatus("");
      setShowAddGoalForm(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to create savings goal";
      setStatus(message);
    }
  };

  const handleUpdateGoal = async (goalData: SavingsGoalFormState) => {
    if (!editingGoal) return;
    try {
      setStatus("Saving...");
      await onUpdateSavingsGoal(editingGoal.id, goalData);
      setStatus("");
      setEditingGoal(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to update savings goal";
      setStatus(message);
    }
  };

  const handleAddContribution = async (contributionData: ContributionFormState) => {
    if (!addingContributionTo) return;
    try {
      setStatus("Saving...");
      await onAddContribution(addingContributionTo.id, contributionData);
      setStatus("");
      setAddingContributionTo(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to add contribution";
      setStatus(message);
    }
  };

  const renderBudgets = () => (
    <section className="bg-white rounded-2xl p-6 mb-6 shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Active Budgets</h2>
        <button className={buttonClasses.primary} onClick={() => { setEditingBudget(null); setShowAddBudgetForm(true); }}>
          Add New Budget
        </button>
      </div>
      {budgets.length === 0 ? (
        <p className="text-slate-500 text-sm">No budgets yet. Create one to get started.</p>
      ) : (
        <div className="grid gap-5">
          {budgets.map((budget) => {
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
                    <button className={buttonClasses.secondary} type="button" onClick={() => setEditingBudget(budget)}>Edit</button>
                    <button className={buttonClasses.danger} type="button" onClick={() => { if (window.confirm(`Delete "${budget.label}"?`)) { void onDeleteBudget(budget.id); } }}>Delete</button>
                  </div>
                </div>
                <div className="mt-4 grid gap-3">
                  {budget.categories.map((category) => {
                    const progress = progressEntries.find((e) => e.category.toLowerCase() === category.category.toLowerCase());
                    const percent = progress ? (progress.spent / (progress.limit || category.limit)) * 100 : 0;
                    return (
                      <div key={category.id ?? category.category}>
                        <div className="flex justify-between text-sm">
                          <span>{category.category}</span>
                          <span>{formatAmount(progress?.spent ?? 0, defaultCurrency)} / {formatAmount(progress?.limit ?? category.limit, defaultCurrency)}</span>
                        </div>
                        <div className="h-1.5 bg-slate-200 rounded mt-1">
                          <div className={`h-full rounded transition-all duration-300 ${percent > 90 ? "bg-rose-600" : percent > 75 ? "bg-orange-400" : "bg-blue-600"}`} style={{ width: `${Math.min(100, percent)}%` }} />
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
  );

  const renderSavings = () => (
    <section className="bg-white rounded-2xl p-6 mb-6 shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Your Goals</h2>
        <button className={buttonClasses.primary} onClick={() => { setEditingGoal(null); setShowAddGoalForm(true); }}>
          Add New Goal
        </button>
      </div>
      {savingsGoals.length === 0 ? (
        <p className="text-slate-500 text-sm">No savings goals yet. Create one to get started.</p>
      ) : (
        <div className="grid gap-5">
          {savingsGoals.map((goal) => {
            const percent = (goal.currentAmount / goal.targetAmount) * 100;
            return (
              <div key={goal.id} className="border border-slate-200 rounded-xl p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="m-0 text-base font-semibold">{goal.label}</h3>
                    <p className="mt-1 text-slate-500 text-xs">Target: {formatAmount(goal.targetAmount, defaultCurrency)} by {formatDate(goal.targetDate ?? "")}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className={buttonClasses.secondary} type="button" onClick={() => setAddingContributionTo(goal)}>Add Contribution</button>
                    <button className={buttonClasses.secondary} type="button" onClick={() => setViewingHistoryOf(goal)}>History</button>
                    <button className={buttonClasses.secondary} type="button" onClick={() => setEditingGoal(goal)}>Edit</button>
                    <button className={buttonClasses.danger} type="button" onClick={() => { if (window.confirm(`Delete "${goal.label}"?`)) { void onDeleteSavingsGoal(goal.id); } }}>Delete</button>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-sm">
                    <span>{formatAmount(goal.currentAmount, defaultCurrency)}</span>
                    <span>{percent.toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-200 rounded mt-1">
                    <div className="h-full rounded bg-green-600 transition-all duration-300" style={{ width: `${Math.min(100, percent)}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );

  return (
    <>
      <PageHeader title="Planning" description="Manage your budgets and savings goals." />

      {renderBudgets()}
      {renderSavings()}

      <Modal isOpen={showAddBudgetForm || !!editingBudget} onClose={() => { setShowAddBudgetForm(false); setEditingBudget(null); }} title={editingBudget ? "Edit Budget" : "Create New Budget"}>
        <BudgetForm onSubmit={editingBudget ? handleUpdateBudget : handleCreateBudget} onCancel={() => { setShowAddBudgetForm(false); setEditingBudget(null); }} budget={editingBudget} categories={categories} onCreateCategory={onCreateCategory} status={status} submitText={editingBudget ? "Save Changes" : "Create Budget"} />
      </Modal>

      <Modal isOpen={showAddGoalForm || !!editingGoal} onClose={() => { setShowAddGoalForm(false); setEditingGoal(null); }} title={editingGoal ? "Edit Savings Goal" : "Create New Savings Goal"}>
        <SavingsGoalForm onSubmit={editingGoal ? handleUpdateGoal : handleCreateGoal} onCancel={() => { setShowAddGoalForm(false); setEditingGoal(null); }} goal={editingGoal} status={status} submitText={editingGoal ? "Save Changes" : "Create Goal"} defaultCurrency={defaultCurrency} />
      </Modal>

      <Modal isOpen={!!addingContributionTo} onClose={() => setAddingContributionTo(null)} title={`Add Contribution to ${addingContributionTo?.label}`}>
        <ContributionForm onSubmit={handleAddContribution} onCancel={() => setAddingContributionTo(null)} status={status} />
      </Modal>

      {viewingHistoryOf && (
        <Modal isOpen={!!viewingHistoryOf} onClose={() => setViewingHistoryOf(null)} title={`Contribution History for ${viewingHistoryOf.label}`}>
          <div className="p-4">
            {viewingHistoryOf.contributions.length === 0 ? (
              <p>No contributions yet.</p>
            ) : (
              <ul className="space-y-2">
                {viewingHistoryOf.contributions.map(c => (
                  <li key={c.id} className="flex justify-between items-center text-sm p-2 rounded-md bg-slate-50">
                    <span>{formatDate(c.date)}</span>
                    <span>{formatAmount(c.amount, c.currency)}</span>
                    <button onClick={() => onDeleteContribution(viewingHistoryOf.id, c.id)} className="text-red-500 hover:text-red-700">Delete</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
