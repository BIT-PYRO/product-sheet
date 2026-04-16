'use client';

import { useState } from 'react';
import AccountingJournalForm from '@/components/accounting-journal-form';
import AccountingLedgerSummary from '@/components/accounting-ledger-summary';

const TABS = [
  { key: 'journal', label: 'Journal Entry' },
  { key: 'ledger', label: 'Ledger Summary' },
];

export default function AccountancyPage() {
  const [activeTab, setActiveTab] = useState('journal');

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Accountancy</h1>
      <p style={{ marginBottom: 16, color: '#6b7280', fontSize: 14 }}>
        Manage journal entries and view ledger summaries.
      </p>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid #e5e7eb' }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 18px',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid #2563eb' : '2px solid transparent',
              background: 'transparent',
              color: activeTab === tab.key ? '#2563eb' : '#6b7280',
              fontWeight: activeTab === tab.key ? 600 : 400,
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'journal' && <AccountingJournalForm />}
      {activeTab === 'ledger' && <AccountingLedgerSummary />}
    </main>
  );
}
