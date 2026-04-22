'use client';

import { useState } from 'react';
import AccountingJournalForm from '@/components/accounting-journal-form';
import AccountingLedgerSummary from '@/components/accounting-ledger-summary';
import AccountingTrialBalance from '@/components/accounting-trial-balance';
import AccountingProfitLoss from '@/components/accounting-profit-loss';
import AccountingBalanceSheet from '@/components/accounting-balance-sheet';
import AccountingPendingExpenses from '@/components/accounting-pending-expenses';
import AccountingFinance from '@/components/accounting-finance';
import MasterNavigationDrawer from '@/components/master_navigation_drawer';
import DateTimeStamp from '@/components/date-time-stamp';
import DeletionHistoryDrawer from '@/components/deletion-history-drawer';

const TABS = [
  { key: 'journal', label: 'Journal Entry' },
  { key: 'ledger', label: 'Ledger Summary' },
  { key: 'trial-balance', label: 'Trial Balance' },
  { key: 'profit-loss', label: 'Profit & Loss' },
  { key: 'balance-sheet', label: 'Balance Sheet' },
  { key: 'pending-expenses', label: 'Pending Expenses' },
  { key: 'finance', label: 'Finance' },
];

export default function AccountancyPage() {
  const [activeTab, setActiveTab] = useState('journal');

  return (
    <main className="min-h-screen bg-cloud-gray">

      {/* Fixed header — same pattern as Orders, Master Sheets */}
      <div className="transition-[left,width] duration-300 ease-in-out fixed top-0 left-0 right-0 z-[60] bg-white/95 py-2 border-b border-soft-border shadow-sm backdrop-blur px-3 md:px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <MasterNavigationDrawer inHeader />
            <h1 className="text-xl font-bold tracking-tight text-midnight-ink">ACCOUNTANCY</h1>
          </div>
          <DateTimeStamp />
        </div>
      </div>

      {/* Page body — padded below fixed header */}
      <div className="w-full pt-16 px-3 md:px-6 pb-10">

        {/* Sub-header */}
        <div className="mb-6 pt-4">
          <p className="text-sm text-cool-gray">Manage journal entries, expenses, and view ledger summaries.</p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-6 border-b border-soft-border flex-wrap">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-trust-blue text-trust-blue'
                  : 'border-transparent text-cool-gray hover:text-midnight-ink'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'journal' && <AccountingJournalForm />}
        {activeTab === 'ledger' && <AccountingLedgerSummary />}
        {activeTab === 'trial-balance' && <AccountingTrialBalance />}
        {activeTab === 'profit-loss' && <AccountingProfitLoss />}
        {activeTab === 'balance-sheet' && <AccountingBalanceSheet />}
        {activeTab === 'pending-expenses' && <AccountingPendingExpenses />}
        {activeTab === 'finance' && <AccountingFinance />}
      </div>
      <DeletionHistoryDrawer appLabel="accounting" modelName="journalentry" />
    </main>
  );
}
