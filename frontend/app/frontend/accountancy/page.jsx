'use client';

import { useState, useEffect } from 'react';
import AccountingJournalForm from '@/components/accounting-journal-form';
import AccountingBankImport from '@/components/accounting-bank-import';
import AccountingLedgerSummary from '@/components/accounting-ledger-summary';
import AccountingTrialBalance from '@/components/accounting-trial-balance';
import AccountingProfitLoss from '@/components/accounting-profit-loss';
import AccountingBalanceSheet from '@/components/accounting-balance-sheet';
import AccountingPendingExpenses from '@/components/accounting-pending-expenses';
import AccountingFinance from '@/components/accounting-finance';
import AccountingPayroll from '@/components/accounting-payroll';
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
  { key: 'payroll', label: 'Payroll' },
];

export default function AccountancyPage() {
  const [activeTab, setActiveTab] = useState('journal');
  const [journalMode, setJournalMode] = useState('manual'); // 'manual' | 'import'
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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

        

        {/* Tab bar */}
        {isMounted && (
          <>
            <div className="flex gap-1 mb-6 border-b border-soft-border flex-wrap">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              suppressHydrationWarning
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
        {activeTab === 'journal' && (
          <div className="space-y-4">
            {/* Manual / Import toggle */}
            <div className="flex gap-1 bg-cloud-gray border border-soft-border rounded-lg p-1 w-fit">
              <button
                type="button"
                suppressHydrationWarning
                onClick={() => setJournalMode('manual')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  journalMode === 'manual'
                    ? 'bg-white text-midnight-ink shadow-sm'
                    : 'text-cool-gray hover:text-midnight-ink'
                }`}
              >
                Manual Entry
              </button>
              <button
                type="button"
                suppressHydrationWarning
                onClick={() => setJournalMode('import')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  journalMode === 'import'
                    ? 'bg-white text-midnight-ink shadow-sm'
                    : 'text-cool-gray hover:text-midnight-ink'
                }`}
              >
                Import Statement
              </button>
            </div>
            {journalMode === 'manual' ? <AccountingJournalForm /> : <AccountingBankImport />}
          </div>
        )}
        {activeTab === 'ledger' && <AccountingLedgerSummary />}
        {activeTab === 'trial-balance' && <AccountingTrialBalance />}
        {activeTab === 'profit-loss' && <AccountingProfitLoss />}
        {activeTab === 'balance-sheet' && <AccountingBalanceSheet />}
        {activeTab === 'pending-expenses' && <AccountingPendingExpenses />}
        {activeTab === 'finance' && <AccountingFinance />}
        {activeTab === 'payroll' && <AccountingPayroll />}
          </>
        )}
      </div>
      <DeletionHistoryDrawer appLabel="accounting" modelName="journalentry" sheet="accounting" />
    </main>
  );
}
