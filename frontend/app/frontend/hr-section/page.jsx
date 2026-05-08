'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { ChevronLeft, Menu } from 'lucide-react';
import MasterNavigationDrawer from '@/components/master_navigation_drawer';
import DateTimeStamp from '@/components/date-time-stamp';

// Dynamic imports for all tabs
const ManageMembersPage = dynamic(() => import('@/app/frontend/manage-members/page'), { ssr: false });
const MasterWorkforceSheet = dynamic(() => import('@/components/master_workforce_sheet'), { ssr: false });
const HRMasterTaskTracker = dynamic(() => import('@/components/hr/hr-task-tracker'), { ssr: false });
const HRMeetingManager = dynamic(() => import('@/components/hr/hr-meeting-manager'), { ssr: false });
const HRAttendanceDashboard = dynamic(() => import('@/components/hr/hr-attendance-dashboard'), { ssr: false });
const HRLeaveRequests = dynamic(() => import('@/components/hr/hr-leave-requests'), { ssr: false });
const HRPayrollDashboard = dynamic(() => import('@/components/hr/hr-payroll-dashboard'), { ssr: false });
const HRExpensesTracker = dynamic(() => import('@/components/hr/hr-expenses-tracker'), { ssr: false });
const HRDiaryTracker = dynamic(() => import('@/components/hr/hr-diary-tracker'), { ssr: false });
const HRDeptExpenses = dynamic(() => import('@/components/hr/hr-dept-expenses'), { ssr: false });
const HROrgHierarchy = dynamic(() => import('@/components/hr/hr-org-hierarchy'), { ssr: false });

const SIDEBAR_ITEMS = [
  { path: 'team-directory', label: 'Team Directory', component: ManageMembersPage },
  { path: 'master-workforce-sheet', label: 'Master Workforce Sheet', component: MasterWorkforceSheet },
  { path: 'master-task-manager', label: 'Master Task Manager', component: HRMasterTaskTracker },
  { path: 'meeting-manager', label: 'Meeting Manager', component: HRMeetingManager },
  { path: 'attendance-dashboard', label: 'Attendance Dashboard', component: HRAttendanceDashboard },
  { path: 'org-hierarchy', label: 'Org Hierarchy', component: HROrgHierarchy },
  { path: 'payroll', label: 'Payroll', component: HRPayrollDashboard },
  { path: 'expenses', label: 'Expenses', component: HRExpensesTracker },
  { path: 'dept-expenses', label: 'Dept Expenses', component: HRDeptExpenses },
  { path: 'diary', label: 'Diary', component: HRDiaryTracker },
];

export default function HRSectionPage() {
  const [activeTab, setActiveTab] = useState('team-directory');
  const [collapsed, setCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const ActiveComponent = SIDEBAR_ITEMS.find(i => i.path === activeTab)?.component;

  return (
    <main className="h-screen w-full flex flex-col bg-cloud-gray overflow-hidden">
      {/* Fixed header (Top Navigation) */}
      <div className="shrink-0 z-[60] bg-white/95 py-2 border-b border-soft-border shadow-sm backdrop-blur px-3 md:px-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <MasterNavigationDrawer inHeader />
          <h1 className="text-xl font-bold tracking-tight text-midnight-ink">Human Resources</h1>
        </div>
        <DateTimeStamp />
      </div>

      {/* Main Body (Sidebar + Content) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div 
          className={`flex-shrink-0 transition-all duration-200 ease-in-out border-r border-soft-border bg-white flex flex-col overflow-hidden ${
            collapsed ? 'w-12' : 'w-[220px]'
          }`}
        >
          <div className={`flex items-center p-1 ${collapsed ? 'justify-center' : 'justify-end'}`}>
            <button 
              onClick={() => setCollapsed(!collapsed)} 
              className="p-1 hover:bg-cloud-gray rounded"
            >
              {collapsed ? <Menu className="w-5 h-5 text-cool-gray" /> : <ChevronLeft className="w-5 h-5 text-cool-gray" />}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-1 px-1.5 space-y-1">
            {SIDEBAR_ITEMS.map((item) => {
              const isActive = activeTab === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => setActiveTab(item.path)}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center rounded flex-shrink-0 transition-colors ${
                    collapsed ? 'justify-center h-9 px-0' : 'px-3 py-2'
                  } ${
                    isActive 
                      ? 'bg-trust-blue text-white' 
                      : 'hover:bg-cloud-gray text-midnight-ink'
                  }`}
                >
                  {collapsed ? (
                    <div className={`w-6 h-6 flex items-center justify-center rounded text-xs font-bold ${isActive ? 'text-white' : 'text-cool-gray'}`}>
                      {item.label.charAt(0)}
                    </div>
                  ) : (
                    <span className={`text-[14px] truncate ${isActive ? 'font-semibold' : 'font-normal'}`}>
                      {item.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto relative bg-[#F3F4F6]">
          {isMounted && ActiveComponent ? (
            <ActiveComponent />
          ) : isMounted && !ActiveComponent ? (
            <div className="flex items-center justify-center h-full text-cool-gray text-sm italic">
              Module not implemented yet.
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
