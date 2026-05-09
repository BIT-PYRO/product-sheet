'use client';
/**
 * MeetScheduleModal — rich "Schedule a Meeting" dialog that matches the product design.
 * Triggered by the "Meet" button in My Chats.
 *
 * Features:
 *  - Meeting title, date, time
 *  - Duration chips: 30m / 1h / 1.5h / 2h
 *  - Tag Members (multi-select chips)
 *  - Description textarea
 *  - Notification Before: 10 min / 1 hr / Custom
 *  - Reminder Channels: Email / Push (multi-select)
 *  - "Schedule & Create Meet" → creates Google Calendar event + sends chat notification message
 */
import React, { useEffect, useState } from 'react';
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    Stack,
    TextField,
    Typography,
    Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import VideoCallIcon from '@mui/icons-material/Videocam';
import { createCalendarEvent, fetchCalendarStatus, fetchTeamMembers, redirectToGoogleAuth } from './calendarService';

const DURATIONS = [
    { label: '30m', minutes: 30 },
    { label: '1h', minutes: 60 },
    { label: '1.5h', minutes: 90 },
    { label: '2h', minutes: 120 },
];

const NOTIF_BEFORE = [
    { label: '10 min', value: 10 },
    { label: '1 hr', value: 60 },
    { label: 'Custom', value: 'custom' },
];

const REMINDER_CHANNELS = ['Email', 'Push'];

function pad2(n) { return String(n).padStart(2, '0'); }

function todayDateStr() {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function nowTimeStr() {
    const d = new Date();
    const h = d.getHours();
    const m = Math.ceil(d.getMinutes() / 15) * 15;
    if (m === 60) return `${pad2(h + 1)}:00`;
    return `${pad2(h)}:${pad2(m)}`;
}

export default function MeetScheduleModal({ open, onClose, onSendChatMessage }) {
    const [title, setTitle] = useState('');
    const [date, setDate] = useState(todayDateStr);
    const [time, setTime] = useState(nowTimeStr);
    const [durationMin, setDurationMin] = useState(60);
    const [allMembers, setAllMembers] = useState([]);
    const [taggedMembers, setTaggedMembers] = useState([]);
    const [description, setDescription] = useState('');
    const [notifBefore, setNotifBefore] = useState(10);
    const [channels, setChannels] = useState(['Push']);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [connected, setConnected] = useState(true);

    // Load members + calendar status when the modal opens
    useEffect(() => {
        if (!open) return;
        setTitle('');
        setDate(todayDateStr());
        setTime(nowTimeStr());
        setDurationMin(60);
        setTaggedMembers([]);
        setDescription('');
        setNotifBefore(10);
        setChannels(['Push']);
        setError('');

        fetchTeamMembers().then(setAllMembers).catch(() => setAllMembers([]));
        fetchCalendarStatus().then((s) => setConnected(Boolean(s.connected))).catch(() => setConnected(false));
    }, [open]);

    const toggleMember = (member) => {
        setTaggedMembers((prev) => {
            const exists = prev.some((m) => m.id === member.id);
            return exists ? prev.filter((m) => m.id !== member.id) : [...prev, member];
        });
    };

    const toggleChannel = (ch) => {
        setChannels((prev) =>
            prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch],
        );
    };

    const memberName = (m) =>
        m.full_name || ((m.first_name || '') + ' ' + (m.last_name || '')).trim() || m.username || m.email || 'Member';

    const handleSubmit = async () => {
        if (!title.trim()) { setError('Please enter a meeting title.'); return; }
        setError('');
        setSubmitting(true);

        try {
            const start = new Date(`${date}T${time}:00`);
            const end = new Date(start.getTime() + durationMin * 60 * 1000);

            const attendees = taggedMembers.filter((m) => m.email).map((m) => ({ email: m.email }));

            const descLines = [];
            if (description.trim()) descLines.push(description.trim());
            descLines.push(`Platform: Google Meet`);
            if (notifBefore !== 'custom') descLines.push(`Reminder: ${notifBefore} min before`);
            if (channels.length) descLines.push(`Channels: ${channels.join(', ')}`);

            await createCalendarEvent({
                title: title.trim(),
                start: start.toISOString(),
                end: end.toISOString(),
                description: descLines.join('\n'),
                attendees,
                event_type: 'meeting',
                timezone: 'Asia/Kolkata',
            });

            // Send a chat notification message if a conversation is open
            if (onSendChatMessage) {
                const durationLabel = DURATIONS.find((d) => d.minutes === durationMin)?.label || `${durationMin}m`;
                const memberList = taggedMembers.map(memberName).join(', ') || 'No members tagged';
                const dateFormatted = new Date(`${date}T${time}:00`).toLocaleString([], {
                    weekday: 'short', month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                });
                const chatMsg =
                    `📅 Meeting Scheduled\n` +
                    `Subject: ${title.trim()}\n` +
                    `When: ${dateFormatted} (${durationLabel})\n` +
                    `Members: ${memberList}` +
                    (description.trim() ? `\nNotes: ${description.trim()}` : '');
                onSendChatMessage(chatMsg);
            }

            onClose();
        } catch (err) {
            setError(err.message || 'Failed to schedule meeting.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            slotProps={{ paper: { sx: { borderRadius: 3 } } }}
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
                <VideoCallIcon sx={{ fontSize: 20 }} />
                <Typography component="span" variant="h6" sx={{ fontWeight: 700, fontSize: 17, flex: 1 }}>
                    Schedule a Meeting
                </Typography>
                <IconButton size="small" onClick={onClose} sx={{ color: 'white' }}>
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ pt: 2.5, pb: 1, px: 2.5 }}>
                {!connected && (
                    <Alert
                        severity="warning"
                        sx={{ mb: 2 }}
                        action={
                            <Button size="small" color="inherit" onClick={redirectToGoogleAuth}>
                                Connect Google
                            </Button>
                        }
                    >
                        Google Calendar is not connected.
                    </Alert>
                )}
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                <Stack spacing={2.5}>
                    {/* Title */}
                    <TextField
                        label="Meeting Title *"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        fullWidth
                        autoFocus
                        size="small"
                    />

                    {/* Date + Time */}
                    <Stack direction="row" spacing={2}>
                        <TextField
                            label="Date"
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            fullWidth
                            size="small"
                            slotProps={{ inputLabel: { shrink: true } }}
                        />
                        <TextField
                            label="Time"
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            fullWidth
                            size="small"
                            slotProps={{ inputLabel: { shrink: true } }}
                        />
                    </Stack>

                    {/* Duration */}
                    <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 0.75, display: 'block' }}>
                            Duration
                        </Typography>
                        <Stack direction="row" spacing={1}>
                            {DURATIONS.map((d) => (
                                <Chip
                                    key={d.minutes}
                                    label={d.label}
                                    onClick={() => setDurationMin(d.minutes)}
                                    variant={durationMin === d.minutes ? 'filled' : 'outlined'}
                                    color={durationMin === d.minutes ? 'primary' : 'default'}
                                    sx={{ fontWeight: durationMin === d.minutes ? 700 : 400 }}
                                />
                            ))}
                        </Stack>
                    </Box>

                    {/* Tag Members */}
                    <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 0.75, display: 'block' }}>
                            Tag Members
                        </Typography>
                        {allMembers.length === 0 ? (
                            <Typography variant="caption" color="text.secondary">Loading members…</Typography>
                        ) : (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                                {allMembers.map((m) => {
                                    const selected = taggedMembers.some((t) => t.id === m.id);
                                    return (
                                        <Chip
                                            key={m.id}
                                            label={memberName(m)}
                                            onClick={() => toggleMember(m)}
                                            variant={selected ? 'filled' : 'outlined'}
                                            color={selected ? 'primary' : 'default'}
                                            size="small"
                                            sx={{ fontWeight: selected ? 600 : 400 }}
                                        />
                                    );
                                })}
                            </Box>
                        )}
                    </Box>

                    {/* Description */}
                    <TextField
                        label="Description (optional)"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        fullWidth
                        multiline
                        minRows={3}
                        size="small"
                        placeholder="Description (optional)"
                    />

                    {/* Notification Before */}
                    <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 0.75, display: 'block' }}>
                            Notification Before
                        </Typography>
                        <Stack direction="row" spacing={1}>
                            {NOTIF_BEFORE.map((n) => (
                                <Chip
                                    key={n.value}
                                    label={n.label}
                                    onClick={() => setNotifBefore(n.value)}
                                    variant={notifBefore === n.value ? 'filled' : 'outlined'}
                                    color={notifBefore === n.value ? 'primary' : 'default'}
                                    sx={{ fontWeight: notifBefore === n.value ? 700 : 400 }}
                                />
                            ))}
                        </Stack>
                    </Box>

                    {/* Reminder Channels */}
                    <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 0.75, display: 'block' }}>
                            Reminder Channels
                        </Typography>
                        <Stack direction="row" spacing={1}>
                            {REMINDER_CHANNELS.map((ch) => (
                                <Chip
                                    key={ch}
                                    label={ch}
                                    onClick={() => toggleChannel(ch)}
                                    variant={channels.includes(ch) ? 'filled' : 'outlined'}
                                    color={channels.includes(ch) ? 'primary' : 'default'}
                                    sx={{ fontWeight: channels.includes(ch) ? 700 : 400 }}
                                />
                            ))}
                        </Stack>
                    </Box>
                </Stack>
            </DialogContent>

            {/* Actions */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, px: 2.5, py: 2 }}>
                <Button onClick={onClose} disabled={submitting} sx={{ color: '#6b7280' }}>
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={submitting || !title.trim()}
                    startIcon={submitting ? <CircularProgress size={15} color="inherit" /> : <VideoCallIcon />}
                    sx={{
                        bgcolor: '#1565c0',
                        fontWeight: 700,
                        px: 2.5,
                        '&:hover': { bgcolor: '#1251a3' },
                    }}
                >
                    {submitting ? 'Scheduling…' : 'Schedule & Create Meet'}
                </Button>
            </Box>
        </Dialog>
    );
}
