import React, { useState } from "react";
import type { SavingsGoal, Category } from "../types";
import { buttonClasses } from "../styles/classes";
import { Modal } from "./common/Modal";
import { formatAmount, formatDate } from "../utils/formatting";
import PageHeader from "./common/PageHeader";
import { SavingsGoalForm, type SavingsGoalFormState } from "./common/SavingsGoalForm";
import { ContributionForm, type ContributionFormState } from "./common/ContributionForm";

type SavingsViewProps = {
  savingsGoals: SavingsGoal[];
  categories: Category[];
  defaultCurrency: string;
  onCreateSavingsGoal: (goal: SavingsGoalFormState) => Promise<void>;
  onUpdateSavingsGoal: (goalId: string, goal: SavingsGoalFormState) => Promise<void>;
  onDeleteSavingsGoal: (goalId: string) => Promise<void>;
  onAddContribution: (goalId: string, contribution: ContributionFormState) => Promise<void>;
};

export default function SavingsView({
  savingsGoals,
  categories,
  defaultCurrency,
  onCreateSavingsGoal,
  onUpdateSavingsGoal,
  onDeleteSavingsGoal,
  onAddContribution
}: SavingsViewProps) {
  const [status, setStatus] = useState("");
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [addingContributionTo, setAddingContributionTo] = useState<SavingsGoal | null>(null);
  const [showAddGoalForm, setShowAddGoalForm] = useState(false);

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

  return (
    <>
      <PageHeader
        title="Savings Goals"
        description="Track and manage your savings goals"
      />

      <section className="bg-white rounded-2xl p-6 mb-6 shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Your Goals</h2>
          <button className={buttonClasses.primary} onClick={() => { setEditingGoal(null); setShowAddGoalForm(true); }}>
            Add New Goal
          </button>
        </div>
        {savingsGoals.length === 0 ? (
          <p className="text-slate-500 text-sm">No savings goals yet. Create your first goal to get started.</p>
        ) : (
          <div className="grid gap-5">
            {savingsGoals.map((goal) => {
              const percent = (goal.currentAmount / goal.targetAmount) * 100;
              return (
                <div key={goal.id} className="border border-slate-200 rounded-xl p-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="m-0 text-base font-semibold">{goal.label}</h3>
                      <p className="mt-1 text-slate-500 text-xs">
                        Target: {formatAmount(goal.targetAmount, defaultCurrency)} by {formatDate(goal.targetDate ?? "")}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className={buttonClasses.secondary}
                        type="button"
                        onClick={() => setAddingContributionTo(goal)}
                      >
                        Add Contribution
                      </button>
                      <button
                        className={buttonClasses.secondary}
                        type="button"
                        onClick={() => setEditingGoal(goal)}
                      >
                        Edit
                      </button>
                      <button
                        className={buttonClasses.danger}
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete the "${goal.label}" goal?`)) {
                            void onDeleteSavingsGoal(goal.id);
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex justify-between text-sm">
                      <span>{formatAmount(goal.currentAmount, defaultCurrency)}</span>
                      <span>{percent.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-200 rounded mt-1">
                      <div
                        className="h-full rounded bg-green-600 transition-all duration-300"
                        style={{ width: `${Math.min(100, percent)}%` }}
                      />
                    </div>
                  </div>

                  {goal.contributions && goal.contributions.length > 0 && (
                    <div className="mt-4 border-t pt-4">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Contributions</h4>
                      <ul className="space-y-1 max-h-40 overflow-y-auto pr-1 text-xs">
                        {goal.contributions
                          .slice()
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .map(c => (
                            <li key={c.id} className="flex justify-between items-center">
                              <span>{formatDate(c.date)}</span>
                              <span className="tabular-nums font-medium">{formatAmount(c.amount, c.currency)}</span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <Modal isOpen={showAddGoalForm || !!editingGoal} onClose={() => { setShowAddGoalForm(false); setEditingGoal(null); }} title={editingGoal ? "Edit Savings Goal" : "Create New Savings Goal"}>
        <SavingsGoalForm
          onSubmit={editingGoal ? handleUpdateGoal : handleCreateGoal}
          onCancel={() => { setShowAddGoalForm(false); setEditingGoal(null); }}
          goal={editingGoal}
          status={status}
          submitText={editingGoal ? "Save Changes" : "Create Goal"}
          defaultCurrency={defaultCurrency}
        />
      </Modal>

      <Modal isOpen={!!addingContributionTo} onClose={() => setAddingContributionTo(null)} title={`Add Contribution to ${addingContributionTo?.label}`}>
        <ContributionForm
          onSubmit={handleAddContribution}
          onCancel={() => setAddingContributionTo(null)}
          status={status}
        />
      </Modal>
    </>
  );
}
