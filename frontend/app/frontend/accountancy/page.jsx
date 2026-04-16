'use client';

import { useState } from 'react';
import AccountingJournalForm from '@/components/accounting-journal-form';

const TABS = [
  { key: 'journal', label: 'Journal Entry' },
];

export default function AccountancyPage() {
  const [activeTab, setActiveTab] = useState('journal');

  return (
    <main style={{ padding: 24 }}>
      <h1>Accountancy</h1>
      <p style={{ marginBottom: 16 }}>All accounting frontend screens for this sub project will live here.</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '8px 12px',
              border: '1px solid #ccc',
              background: activeTab === tab.key ? '#f1f5f9' : '#fff',
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'journal' ? <AccountingJournalForm /> : null}
    </main>
  );
}
