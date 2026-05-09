'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Snackbar,
    Alert,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import {
    TaskAlt as TaskIcon,
    Videocam as MeetingIcon,
    EventBusy as LeaveIcon,
    NoteAdd as NoteIcon,
    Alarm as ReminderIcon,
} from '@mui/icons-material';
import MiniCalendar from './MiniCalendar';
import ScheduleModal from './ScheduleModal';
import {
    fetchCalendarStatus,
    fetchCalendarEvents,
    fetchTeamMembers,
    syncCalendarRange,
    createCalendarEvent,
    redirectToGoogleAuth,
} from './calendarService';
import {
    groupEventsByDate,
    monthRangeKeys,
    sortEventsForDay,
    toDateKey,
    formatEventTime,
} from './calendarUtils';

const EVENT_TYPE_META = {
    task: { label: 'Task', icon: TaskIcon, color: '#22c55e' },
    meeting: { label: 'Meeting', icon: MeetingIcon, color: '#3b82f6' },
    leave: { label: 'Leave', icon: LeaveIcon, color: '#a855f7' },
};

function buildEventPayload(formData) {
    const start = new Date(`${formData.date}T${formData.time}:00`);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    const attendees = formData.actionType === 'meeting'
        ? (formData.participants || [])
            .filter((m) => m?.email)
            .map((m) => ({ email: m.email }))
        : [];

    const detailLines = [];
    if (formData.actionType === 'meeting') {
        detailLines.push(`Platform: ${formData.platform === 'in_person' ? 'In-person' : 'Google Meet'}`);
    }
    if (formData.notes) detailLines.push(`Notes: ${formData.notes}`);

    const eventType = formData.actionType === 'task'
        ? 'task'
        : formData.platform === 'in_person'
            ? 'personal'
            : 'meeting';

    return {
        title: formData.title,
        start: start.toISOString(),
        end: end.toISOString(),
        description: detailLines.join('\n'),
        attendees,
        event_type: eventType,
        timezone: 'Asia/Kolkata',
    };
}

export default function ChatCalendarModal({ open, onClose }) {
    const today = useMemo(() => toDateKey(new Date()), []);

    const [calendarMonth, setCalendarMonth] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });
    const [calendarEvents, setCalendarEvents] = useState([]);
    const [calendarLoading, setCalendarLoading] = useState(false);
    const [calendarConnected, setCalendarConnected] = useState(false);
    const [selectedDate, setSelectedDate] = useState(today);
    const [members, setMembers] = useState([]);

    const [scheduleOpen, setScheduleOpen] = useState(false);
    const [scheduleType, setScheduleType] = useState('meeting');
    const [scheduleSubmitting, setScheduleSubmitting] = useState(false);
    const [scheduleError, setScheduleError] = useState('');

    const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

    const eventsByDate = useMemo(() => groupEventsByDate(calendarEvents), [calendarEvents]);
    const selectedDayEvents = useMemo(
        () => sortEventsForDay(eventsByDate[selectedDate] || []),
        [eventsByDate, selectedDate],
    );

    const loadEvents = useCallback(async (monthDate) => {
        setCalendarLoading(true);
        try {
            const { start, end } = monthRangeKeys(monthDate);
            const events = await fetchCalendarEvents({ start, end });
            setCalendarEvents(events);
        } catch {
            setCalendarEvents([]);
        } finally {
            setCalendarLoading(false);
        }
    }, []);

    // Initialise when the modal opens
    useEffect(() => {
        if (!open) return;
        fetchCalendarStatus().then((status) => {
            setCalendarConnected(Boolean(status.connected));
        }).catch(() => setCalendarConnected(false));
        fetchTeamMembers().then(setMembers).catch(() => setMembers([]));
        loadEvents(calendarMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    useEffect(() => {
        if (!open) return;
        if (calendarConnected) loadEvents(calendarMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [calendarMonth, calendarConnected]);

    const handleSync = async () => {
        if (!calendarConnected) return;
        setCalendarLoading(true);
        try {
            const { start, end } = monthRangeKeys(calendarMonth);
            await syncCalendarRange({ start, end });
            await loadEvents(calendarMonth);
        } catch {
            /* silently ignore */
        } finally {
            setCalendarLoading(false);
        }
    };

    const handleDayClick = (dateKey) => {
        setSelectedDate(dateKey);
    };

    const openSchedule = (type) => {
        setScheduleType(type);
        setScheduleError('');
        setScheduleOpen(true);
    };

    const handleScheduleSubmit = async (formData) => {
        setScheduleSubmitting(true);
        setScheduleError('');
        try {
            const payload = buildEventPayload(formData);
            await createCalendarEvent(payload);
            setScheduleOpen(false);
            await loadEvents(calendarMonth);
            setToast({ open: true, message: 'Event created!', severity: 'success' });
        } catch (err) {
            setScheduleError(err.message || 'Unable to create event.');
        } finally {
            setScheduleSubmitting(false);
        }
    };

    const handleAddNote = () => {
        onClose();
        // Navigate to My Notes section in MyDesk
        window.location.href = '/mydesk?section=my-notes';
    };

    const handleSetReminder = () => {
        openSchedule('task');
    };

    const selectedDayLabel = selectedDate
        ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString([], {
            weekday: 'short',
            month: 'long',
            day: 'numeric',
        })
        : '';

    return (
        <>
            <Dialog
                open={open}
                onClose={onClose}
                maxWidth="sm"
                fullWidth
                slotProps={{
                    paper: { sx: { borderRadius: 3, overflow: 'hidden' } },
                }}
            >
                {/* Header */}
                <DialogTitle
                    sx={{
                        bgcolor: '#1565c0',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        py: 1.5,
                        px: 2.5,
                    }}
                >
                    <Box sx={{ fontSize: 20, lineHeight: 1 }}>📅</Box>
                    <Typography component="span" variant="h6" sx={{ fontWeight: 700, fontSize: 17, flex: 1 }}>
                        Calendar
                    </Typography>
                    {calendarLoading && <CircularProgress size={18} sx={{ color: 'rgba(255,255,255,0.8)' }} />}
                    <IconButton size="small" onClick={onClose} sx={{ color: 'white', ml: 0.5 }}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>

                <DialogContent sx={{ p: 0 }}>
                    {/* Calendar grid */}
                    <Box sx={{ px: 2.5, pt: 2 }}>
                        <MiniCalendar
                            monthDate={calendarMonth}
                            eventsByDate={eventsByDate}
                            selectedDate={selectedDate}
                            loading={calendarLoading}
                            onPrevMonth={() =>
                                setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
                            }
                            onNextMonth={() =>
                                setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
                            }
                            onSync={handleSync}
                            onDayClick={handleDayClick}
                        />
                    </Box>

                    <Divider sx={{ mt: 2 }} />

                    {/* Selected day label */}
                    <Box sx={{ px: 2.5, pt: 1.5, pb: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: 14 }}>
                            {selectedDayLabel}
                        </Typography>
                    </Box>

                    {/* Action buttons */}
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: 1,
                            px: 2.5,
                            pb: 1.5,
                        }}
                    >
                        <Button
                            size="small"
                            variant="outlined"
                            onClick={() => openSchedule('meeting')}
                            sx={{ fontSize: 12, borderColor: '#3b82f6', color: '#3b82f6', '&:hover': { bgcolor: '#eff6ff' } }}
                        >
                            New Meeting
                        </Button>
                        <Button
                            size="small"
                            variant="outlined"
                            onClick={() => openSchedule('task')}
                            sx={{ fontSize: 12, borderColor: '#22c55e', color: '#16a34a', '&:hover': { bgcolor: '#f0fdf4' } }}
                        >
                            New Task
                        </Button>
                        <Button
                            size="small"
                            variant="outlined"
                            onClick={handleAddNote}
                            sx={{ fontSize: 12, borderColor: '#f59e0b', color: '#d97706', '&:hover': { bgcolor: '#fffbeb' } }}
                        >
                            Add Note
                        </Button>
                        <Button
                            size="small"
                            variant="outlined"
                            onClick={handleSetReminder}
                            sx={{ fontSize: 12, borderColor: '#ef4444', color: '#dc2626', '&:hover': { bgcolor: '#fef2f2' } }}
                        >
                            Set Reminder
                        </Button>
                    </Box>

                    <Divider />

                    {/* Day events list */}
                    <Box sx={{ px: 2.5, py: 1.5, minHeight: 72 }}>
                        {!calendarConnected && (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                                <Typography variant="caption" color="text.secondary">
                                    Connect Google Calendar to see events.
                                </Typography>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={redirectToGoogleAuth}
                                    sx={{ fontSize: 11, whiteSpace: 'nowrap' }}
                                >
                                    Connect Google
                                </Button>
                            </Box>
                        )}
                        {calendarConnected && selectedDayEvents.length === 0 && (
                            <Typography variant="caption" color="text.secondary">
                                No events for this day.
                            </Typography>
                        )}
                        {calendarConnected && selectedDayEvents.length > 0 && (
                            <List dense disablePadding>
                                {selectedDayEvents.map((ev) => {
                                    const meta = EVENT_TYPE_META[ev.calendarType] || EVENT_TYPE_META.meeting;
                                    const IconComp = meta.icon;
                                    return (
                                        <ListItem key={ev.id} disableGutters sx={{ py: 0.5 }}>
                                            <ListItemIcon sx={{ minWidth: 30 }}>
                                                <IconComp fontSize="small" sx={{ color: meta.color }} />
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={ev.title || 'Untitled'}
                                                secondary={formatEventTime(ev.start)}
                                                slotProps={{
                                                    primary: { variant: 'body2', fontWeight: 600, sx: { fontSize: 13 } },
                                                    secondary: { variant: 'caption' },
                                                }}
                                            />
                                        </ListItem>
                                    );
                                })}
                            </List>
                        )}
                    </Box>
                </DialogContent>
            </Dialog>

            {/* Schedule (New Meeting / New Task / Set Reminder) */}
            <ScheduleModal
                open={scheduleOpen}
                actionType={scheduleType}
                selectedDate={selectedDate}
                members={members}
                submitting={scheduleSubmitting}
                connected={calendarConnected}
                error={scheduleError}
                onClose={() => setScheduleOpen(false)}
                onSubmit={handleScheduleSubmit}
                onConnectGoogle={redirectToGoogleAuth}
            />

            {/* Toast */}
            <Snackbar
                open={toast.open}
                autoHideDuration={3000}
                onClose={() => setToast((prev) => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    severity={toast.severity}
                    onClose={() => setToast((prev) => ({ ...prev, open: false }))}
                    sx={{ width: '100%' }}
                >
                    {toast.message}
                </Alert>
            </Snackbar>
        </>
    );
}
