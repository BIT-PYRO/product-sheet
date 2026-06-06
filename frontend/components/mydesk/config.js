import {
    StickyNote2 as NotesIcon,
    TaskAlt as TasksIcon,
    Forum as ChatsIcon,
    Analytics as AnalyticsIcon,
    Person as ProfileIcon,
    Payments as ExpensesIcon,
    BeachAccess as LeaveIcon,
    FactCheck as AttendanceIcon,
    RequestQuote as PayrollIcon,
    PhotoLibrary as GalleryIcon,
    Description as LogsIcon,
    MenuBook as LogbookIcon,
    VideoCall as MeetingsIcon,
} from '@mui/icons-material';

export const MYDESK_NAV_ITEMS = [
    { id: 'my-notes', label: 'My Notes', icon: NotesIcon },
    { id: 'my-tasks', label: 'Task Manager', icon: TasksIcon },
    { id: 'my-chats', label: 'My Chats', icon: ChatsIcon },
    { id: 'my-analytics', label: 'My Analytics', icon: AnalyticsIcon, inactive: true },
    { id: 'my-profile', label: 'My Profile', icon: ProfileIcon, inactive: true },
    { id: 'expenses', label: 'Expenses', icon: ExpensesIcon },
    { id: 'my-attendance', label: 'My Attendance', icon: AttendanceIcon },
    { id: 'my-payroll', label: 'My Payroll', icon: PayrollIcon },
    { id: 'leave-requests', label: 'Leave Requests', icon: LeaveIcon },
    { id: 'gallery', label: 'My Vault', icon: GalleryIcon },
    { id: 'logs', label: 'Logs', icon: LogsIcon, inactive: true },
    { id: 'logbook', label: 'My Diary', icon: LogbookIcon },
    { id: 'my-meetings', label: 'My Meetings', icon: MeetingsIcon },
];

export const MYDESK_SECTION_CONTENT = {
    'my-notes': {
        title: 'My Notes',
        subtitle: 'Personal knowledge space with rich editing and quick capture.',
        groups: [
            {
                title: 'Core',
                items: [
                    'Rich text editor support: bold, lists, highlights',
                    'Quick-create floating action button',
                    'Attach photos, videos, and files',
                    'Google Drive attachment support',
                ],
            },
            {
                title: 'Organization',
                items: [
                    'Tags and labels for note grouping',
                    'Pin important notes',
                    'Search and filter notes quickly',
                    'Auto-save drafts with version history',
                ],
            },
        ],
    },
    'my-tasks': {
        title: 'My Tasks',
        subtitle: 'Track execution across views, priorities, and collaborations.',
        groups: [
            {
                title: 'Views & Categories',
                items: [
                    'Views: Kanban, List, Calendar',
                    'Categories: Personal To-Do, Assigned to Others, Overdue, Completed',
                    'Priority levels: Critical, High, Medium, Low',
                ],
            },
            {
                title: 'Execution',
                items: [
                    'Consult/help threads with colleague tagging',
                    'Escalation path for blocked tasks',
                    'Due dates, reminders, subtasks, and attachments',
                ],
            },
        ],
    },
    'my-chats': {
        title: 'My Chats',
        subtitle: 'Continue conversations with your team in real time.',
        groups: [
            {
                title: 'Chat',
                items: [
                    'Same Team Chat experience as Quick Action',
                    'Messages stay synced across all chat entry points',
                    'Supports direct, group, and broadcast conversations',
                ],
            },
        ],
    },
    'my-analytics': {
        title: 'My Analytics',
        subtitle: 'Personal productivity snapshots powered by work signals.',
        groups: [
            {
                title: 'Insights',
                items: [
                    'Productivity score (completed vs created this week)',
                    'Time-on-task heatmap (most productive periods)',
                    'Task completion trend over 30/60/90 days',
                    'Notes created per week',
                ],
            },
            {
                title: 'Personal Ops',
                items: [
                    'Leave utilization: taken vs balance',
                    'Expense summary: monthly spend trend',
                ],
            },
        ],
    },
    'my-profile': {
        title: 'My Profile',
        subtitle: 'Quick access to your role profile and identity context.',
        groups: [
            {
                title: 'Profile',
                items: [
                    'View current profile details',
                    'Quick-edit shortcut',
                    'Role, team, manager, and joining date',
                    'Google Workspace avatar sync',
                ],
            },
        ],
    },
    expenses: {
        title: 'Expenses',
        subtitle: 'Track spending and approvals with receipts and exports.',
        groups: [
            {
                title: 'Expense Flow',
                items: [
                    'Log categories: travel, food, equipment, misc',
                    'Upload receipt photo or PDF',
                    'Status flow: Draft → Submitted → Approved/Rejected',
                    'Monthly budget vs spent visualization',
                    'Export to PDF/CSV',
                ],
            },
        ],
    },
    'leave-requests': {
        title: 'Leave Requests',
        subtitle: 'Apply, track, and sync leave lifecycle in one place.',
        groups: [
            {
                title: 'Leave Management',
                items: [
                    'Apply: casual, sick, earned, WFH',
                    'Leave balance by leave type',
                    'History with pending/approved/rejected status',
                    'Google Calendar sync after approval',
                    'Manager approval flow',
                ],
            },
        ],
    },
    'my-attendance': {
        title: 'My Attendance',
        subtitle: 'Mark attendance daily and track your monthly records.',
        groups: [
            {
                title: 'Attendance Flow',
                items: [
                    'Mark today as present, half-day, WFH, on-duty, leave, or absent',
                    'Submit regularization with reason and timing details',
                    'See your latest status, timings, and regularization notes',
                ],
            },
        ],
    },
    'my-payroll': {
        title: 'My Payroll',
        subtitle: 'View salary, payslips, tax declarations, and CTC structure.',
        groups: [
            {
                title: 'Payroll Workspace',
                items: [
                    'Detailed monthly payslip with earnings and deductions',
                    'Financial year salary history with month-wise PDF download',
                    'Tax regime selection and 80C declaration with proof upload',
                    'CTC component split with taxability visibility',
                ],
            },
        ],
    },
    gallery: {
        title: 'My Vault',
        subtitle: 'Personal storage for files, images, sharing, and favorites.',
        groups: [
            {
                title: 'Media',
                items: [
                    'Manual upload for photos/videos/files',
                    'Album creation and vault-style organization',
                    'Share files with teammates anytime',
                    'Mark favorites and reference images',
                    'Secure open/download for restricted files',
                    'Personal-only media archive',
                ],
            },
        ],
    },
    logs: {
        title: 'Logs',
        subtitle: 'Auto-captured activity stream for traceability.',
        groups: [
            {
                title: 'Audit Trail',
                items: [
                    'Auto-capture: logins and task status changes',
                    'Track note creation and file uploads',
                    'Filters by date and action type',
                    'Export-ready for audits',
                ],
            },
        ],
    },
    logbook: {
        title: 'My Diary',
        subtitle: 'Manual daily/weekly work diary and reporting view.',
        groups: [
            {
                title: 'Work Journal',
                items: [
                    'Daily/weekly entries: what I worked on today',
                    'Rich text editor with standup and EOD templates',
                    'Shareable report for manager',
                    'Google Docs export support',
                ],
            },
        ],
    },
    'my-meetings': {
        title: 'My Meetings',
        subtitle: 'Track upcoming meetings and join with one click.',
        groups: [
            {
                title: 'Meetings',
                items: [
                    'View scheduled meeting title, details, and timing',
                    'Join meeting directly from list',
                    'Create and save new meetings from this section',
                ],
            },
        ],
    },
};