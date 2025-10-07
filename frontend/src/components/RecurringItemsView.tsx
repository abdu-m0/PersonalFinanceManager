import React, { useMemo, useState } from "react";
import type { RecurringItem, Account, Category, Contact, RecurringItemType } from "../types";
import { PageHeader } from "./common/PageHeader";
import { Modal } from "./common/Modal";
import { RecurringItemForm, type RecurringItemFormState } from "./common/RecurringItemForm";
import RecurringItemCard from "./common/RecurringItemCard";
import { capitalize } from "../utils/formatting";
import { buttonClasses } from "../styles/classes";

type RecurringItemsViewProps = {
  recurringItems: RecurringItem[];
  accounts: Account[];
  categories: Category[];
  contacts: Contact[];
  defaultCurrency: string;
  onCreateRecurringItem: (item: RecurringItemFormState) => Promise<void>;
  onUpdateRecurringItem: (itemId: string, item: RecurringItemFormState) => Promise<void>;
  onDeleteRecurringItem: (itemId: string) => Promise<void>;
};

const itemTypes: RecurringItemType[] = ["income", "expense", "transfer"];

export default function RecurringItemsView({
  recurringItems,
  accounts,
  categories,
  contacts,
  defaultCurrency,
  onCreateRecurringItem,
  onUpdateRecurringItem,
  onDeleteRecurringItem,
}: RecurringItemsViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RecurringItem | null>(null);
  const [status, setStatus] = useState("");
  const [activeTab, setActiveTab] = useState<RecurringItemType | "all">("all");

  const openAddModal = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: RecurringItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setStatus("");
  };

  const handleSubmit = async (formData: RecurringItemFormState) => {
    try {
      setStatus("Saving...");
      if (editingItem) {
        await onUpdateRecurringItem(editingItem.id, formData);
      } else {
        await onCreateRecurringItem(formData);
      }
      closeModal();
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred.";
      setStatus(message);
    }
  };

  const filteredItems = useMemo(() => {
    if (activeTab === "all") {
      return recurringItems;
    }
    return recurringItems.filter(item => item.type === activeTab);
  }, [recurringItems, activeTab]);

  const accountsById = useMemo(() => 
    accounts.reduce((acc, account) => {
      acc[account.id] = account;
      return acc;
    }, {} as Record<string, Account>),
  [accounts]);

  return (
    <>
      <PageHeader 
        title="Recurring Items" 
        description="Manage your scheduled incomes, expenses, and transfers."
        actions={
          <button className={buttonClasses.primary} onClick={openAddModal}>
            Add New Item
          </button>
        }
      />

      <div className="mb-4 border-b border-slate-200">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("all")}
            className={`${
              activeTab === "all"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
          >
            All
          </button>
          {itemTypes.map(type => (
            <button
              key={type}
              onClick={() => setActiveTab(type)}
              className={`${
                activeTab === type
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
            >
              {capitalize(type)}s
            </button>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map(item => (
          <RecurringItemCard
            key={item.id}
            item={item}
            account={item.accountId ? accountsById[item.accountId] : undefined}
            onEdit={openEditModal}
            onDelete={onDeleteRecurringItem}
          />
        ))}
      </div>
      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-500">No recurring items found for this category.</p>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingItem ? "Edit Recurring Item" : "Add Recurring Item"}>
        <RecurringItemForm
          item={editingItem}
          accounts={accounts}
          categories={categories.map(c => c.name)}
          contacts={contacts}
          defaultCurrency={defaultCurrency}
          onSubmit={handleSubmit}
          onCancel={closeModal}
          status={status}
        />
      </Modal>
    </>
  );
}