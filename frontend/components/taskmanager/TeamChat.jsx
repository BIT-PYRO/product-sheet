'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Box, Typography, TextField, IconButton, Avatar, Badge,
    List, ListItemButton, ListItemAvatar, ListItemText,
    CircularProgress, InputAdornment, Divider, Tooltip,
    Paper,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import SendIcon from '@mui/icons-material/Send';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------
async function apiGet(url) {
    const r = await fetch(url, { credentials: 'include' });
    if (!r.ok) throw new Error(`Request failed (${r.status})`);
    return r.json();
}

async function apiPost(url, body) {
    const r = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`Request failed (${r.status})`);
    return r.json();
}

function getInitials(user) {
    if (!user) return '?';
    if (user.first_name || user.last_name) {
        return `${(user.first_name || '')[0] || ''}${(user.last_name || '')[0] || ''}`.toUpperCase();
    }
    return (user.username || '?')[0].toUpperCase();
}

function formatTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const isToday =
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();
    if (isToday) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ---------------------------------------------------------------------------
// ContactList — left panel
// ---------------------------------------------------------------------------
function ContactList({ onSelect, search, setSearch, conversations, contacts, loadingContacts }) {
    const convUserIds = new Set(
        conversations.filter(c => c.other_user).map(c => c.other_user.id)
    );

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#fafafa', borderRight: '1px solid #e0e0e0' }}>
            <Box sx={{ p: 1.5, borderBottom: '1px solid #e0e0e0' }}>
                <TextField
                    size="small"
                    fullWidth
                    placeholder="Search people…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                                </InputAdornment>
                            ),
                        },
                    }}
                    sx={{ bgcolor: '#fff', borderRadius: 1 }}
                />
            </Box>

            <Box sx={{ flex: 1, overflowY: 'auto' }}>
                {conversations.length > 0 && (
                    <>
                        <Typography variant="caption" sx={{ px: 2, pt: 1.5, pb: 0.5, display: 'block', color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Chats
                        </Typography>
                        <List disablePadding>
                            {conversations.map(conv => (
                                <ListItemButton key={conv.id} onClick={() => onSelect({ type: 'conv', conv })} sx={{ py: 1 }}>
                                    <ListItemAvatar sx={{ minWidth: 42 }}>
                                        <Badge
                                            badgeContent={conv.unread_count || 0}
                                            color="error"
                                            overlap="circular"
                                            sx={{ '& .MuiBadge-badge': { fontSize: 10, minWidth: 16, height: 16 } }}
                                        >
                                            <Avatar sx={{ width: 34, height: 34, bgcolor: '#6366f1', fontSize: 13 }}>
                                                {getInitials(conv.other_user)}
                                            </Avatar>
                                        </Badge>
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={
                                            <Typography variant="body2" fontWeight={conv.unread_count > 0 ? 700 : 400} noWrap>
                                                {conv.other_user?.display_name || conv.other_user?.username || '—'}
                                            </Typography>
                                        }
                                        secondary={
                                            <Typography variant="caption" color="text.secondary" noWrap component="div" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {conv.last_message?.content || 'No messages yet'}
                                                </span>
                                                <span style={{ flexShrink: 0, marginLeft: 4 }}>{formatTime(conv.last_message?.created_at)}</span>
                                            </Typography>
                                        }
                                    />
                                </ListItemButton>
                            ))}
                        </List>
                    </>
                )}

                {loadingContacts ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', pt: 2 }}>
                        <CircularProgress size={20} />
                    </Box>
                ) : (
                    <>
                        {contacts.filter(u => !convUserIds.has(u.id)).length > 0 && (
                            <>
                                <Typography variant="caption" sx={{ px: 2, pt: 1.5, pb: 0.5, display: 'block', color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    People
                                </Typography>
                                <List disablePadding>
                                    {contacts.filter(u => !convUserIds.has(u.id)).map(user => (
                                        <ListItemButton key={user.id} onClick={() => onSelect({ type: 'user', user })} sx={{ py: 1 }}>
                                            <ListItemAvatar sx={{ minWidth: 42 }}>
                                                <Avatar sx={{ width: 34, height: 34, bgcolor: '#10b981', fontSize: 13 }}>
                                                    {getInitials(user)}
                                                </Avatar>
                                            </ListItemAvatar>
                                            <ListItemText
                                                primary={
                                                    <Typography variant="body2" noWrap>
                                                        {user.display_name || user.username}
                                                    </Typography>
                                                }
                                                secondary={<Typography variant="caption" color="text.secondary" noWrap>{user.email}</Typography>}
                                            />
                                        </ListItemButton>
                                    ))}
                                </List>
                            </>
                        )}
                        {conversations.length === 0 && contacts.filter(u => !convUserIds.has(u.id)).length === 0 && (
                            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', pt: 4, px: 2 }}>
                                No team members found.
                            </Typography>
                        )}
                    </>
                )}
            </Box>
        </Box>
    );
}

// ---------------------------------------------------------------------------
// MessageThread — right panel
// ---------------------------------------------------------------------------
function MessageThread({ conversation, onBack, onSend, messages, loadingMessages, sending }) {
    const [draft, setDraft] = useState('');
    const bottomRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        inputRef.current?.focus();
    }, [conversation?.id]);

    function handleSend() {
        const text = draft.trim();
        if (!text) return;
        setDraft('');
        onSend(text);
    }

    function handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }

    const otherUser = conversation?.other_user;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1, borderBottom: '1px solid #e0e0e0', bgcolor: '#fff', flexShrink: 0 }}>
                <Tooltip title="Back">
                    <IconButton size="small" onClick={onBack}>
                        <ArrowBackIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
                <Avatar sx={{ width: 30, height: 30, bgcolor: '#6366f1', fontSize: 12 }}>
                    {getInitials(otherUser)}
                </Avatar>
                <Typography variant="subtitle2" fontWeight={600} noWrap>
                    {otherUser?.display_name || otherUser?.username || '—'}
                </Typography>
            </Box>

            {/* Messages */}
            <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5, display: 'flex', flexDirection: 'column', gap: 0.75, bgcolor: '#f5f5f5' }}>
                {loadingMessages ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}>
                        <CircularProgress size={24} />
                    </Box>
                ) : messages.length === 0 ? (
                    <Box sx={{ textAlign: 'center', pt: 6 }}>
                        <ForumOutlinedIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                        <Typography variant="body2" color="text.secondary">
                            No messages yet. Say hi!
                        </Typography>
                    </Box>
                ) : (
                    messages.map(msg => (
                        <Box
                            key={msg.id}
                            sx={{
                                display: 'flex',
                                justifyContent: msg.is_mine ? 'flex-end' : 'flex-start',
                                alignItems: 'flex-end',
                                gap: 0.5,
                            }}
                        >
                            {!msg.is_mine && (
                                <Avatar sx={{ width: 22, height: 22, bgcolor: '#6366f1', fontSize: 10, flexShrink: 0, mb: 0.25 }}>
                                    {getInitials(msg.sender)}
                                </Avatar>
                            )}
                            <Box sx={{ maxWidth: '72%' }}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        px: 1.5,
                                        py: 0.75,
                                        borderRadius: msg.is_mine
                                            ? '12px 12px 2px 12px'
                                            : '12px 12px 12px 2px',
                                        bgcolor: msg.is_mine ? '#6366f1' : '#fff',
                                        color: msg.is_mine ? '#fff' : 'text.primary',
                                        wordBreak: 'break-word',
                                    }}
                                >
                                    <Typography variant="body2" sx={{ lineHeight: 1.45 }}>
                                        {msg.content}
                                    </Typography>
                                </Paper>
                                <Typography variant="caption" sx={{ display: 'block', color: 'text.disabled', mt: 0.25, textAlign: msg.is_mine ? 'right' : 'left', fontSize: 10 }}>
                                    {formatTime(msg.created_at)}
                                </Typography>
                            </Box>
                        </Box>
                    ))
                )}
                <div ref={bottomRef} />
            </Box>

            {/* Input */}
            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, px: 1.5, py: 1, borderTop: '1px solid #e0e0e0', bgcolor: '#fff', flexShrink: 0 }}>
                <TextField
                    inputRef={inputRef}
                    size="small"
                    fullWidth
                    multiline
                    maxRows={4}
                    placeholder="Type a message…"
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={sending}
                    sx={{ bgcolor: '#f9fafb', borderRadius: 2 }}
                />
                <IconButton
                    color="primary"
                    onClick={handleSend}
                    disabled={!draft.trim() || sending}
                    sx={{ bgcolor: '#6366f1', color: '#fff', '&:hover': { bgcolor: '#4f46e5' }, '&:disabled': { bgcolor: '#e0e0e0', color: '#9e9e9e' }, flexShrink: 0 }}
                >
                    {sending ? <CircularProgress size={18} sx={{ color: 'inherit' }} /> : <SendIcon fontSize="small" />}
                </IconButton>
            </Box>
        </Box>
    );
}

// ---------------------------------------------------------------------------
// TeamChat — main component
// ---------------------------------------------------------------------------
export default function TeamChat({
    isOpen,
    onClose,
    embedded = false,
    title = 'My Chats',
    showCloseButton = true,
    focusMessageId = '',
    focusWithUserId = '',
}) {
    const [contacts, setContacts] = useState([]);
    const [conversations, setConversations] = useState([]);
    const [loadingContacts, setLoadingContacts] = useState(true);
    const [search, setSearch] = useState('');
    const [activeConv, setActiveConv] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [sending, setSending] = useState(false);
    const lastMessageIdRef = useRef(null);
    const pollRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;
        loadContacts();
        loadConversations();
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const t = setTimeout(() => loadContacts(search), 250);
        return () => clearTimeout(t);
    }, [search, isOpen]);

    useEffect(() => {
        if (!focusWithUserId || !isOpen) return;
        const uid = parseInt(focusWithUserId, 10);
        if (!uid) return;
        openConvWithUser(uid);
    }, [focusWithUserId, isOpen]);

    useEffect(() => {
        if (!activeConv) {
            clearInterval(pollRef.current);
            return;
        }
        clearInterval(pollRef.current);
        pollRef.current = setInterval(() => pollMessages(activeConv.id), 4000);
        return () => clearInterval(pollRef.current);
    }, [activeConv]);

    useEffect(() => {
        if (!isOpen) return;
        const t = setInterval(loadConversations, 8000);
        return () => clearInterval(t);
    }, [isOpen]);

    async function loadContacts(q = '') {
        setLoadingContacts(true);
        try {
            const url = q ? `/api/mydesk/chat/contacts/?search=${encodeURIComponent(q)}` : '/api/mydesk/chat/contacts/';
            const data = await apiGet(url);
            setContacts(data);
        } catch { /* ignore */ } finally {
            setLoadingContacts(false);
        }
    }

    async function loadConversations() {
        try {
            const data = await apiGet('/api/mydesk/chat/conversations/');
            setConversations(data);
        } catch { /* ignore */ }
    }

    async function openConvWithUser(userId) {
        try {
            const conv = await apiPost('/api/mydesk/chat/conversations/', { recipient_id: userId });
            setActiveConv(conv);
            await loadMessagesForConv(conv.id);
            await loadConversations();
        } catch { /* ignore */ }
    }

    async function loadMessagesForConv(convId, isBackground = false) {
        if (!isBackground) setLoadingMessages(true);
        try {
            const msgs = await apiGet(`/api/mydesk/chat/conversations/${convId}/messages/`);
            setMessages(msgs);
            if (msgs.length > 0) lastMessageIdRef.current = msgs[msgs.length - 1].id;
            apiPost(`/api/mydesk/chat/conversations/${convId}/read/`, {}).catch(() => { });
        } catch { /* ignore */ } finally {
            if (!isBackground) setLoadingMessages(false);
        }
    }

    async function pollMessages(convId) {
        try {
            const after = lastMessageIdRef.current;
            const url = after
                ? `/api/mydesk/chat/conversations/${convId}/messages/?after=${after}`
                : `/api/mydesk/chat/conversations/${convId}/messages/`;
            const newMsgs = await apiGet(url);
            if (newMsgs.length > 0) {
                setMessages(prev => {
                    const existingIds = new Set(prev.map(m => m.id));
                    const fresh = newMsgs.filter(m => !existingIds.has(m.id));
                    return fresh.length ? [...prev, ...fresh] : prev;
                });
                lastMessageIdRef.current = newMsgs[newMsgs.length - 1].id;
                apiPost(`/api/mydesk/chat/conversations/${convId}/read/`, {}).catch(() => { });
                loadConversations();
            }
        } catch { /* ignore */ }
    }

    async function handleSelectContact(item) {
        if (item.type === 'conv') {
            setActiveConv(item.conv);
            lastMessageIdRef.current = null;
            await loadMessagesForConv(item.conv.id);
        } else {
            await openConvWithUser(item.user.id);
        }
    }

    async function handleSend(text) {
        if (!activeConv) return;
        setSending(true);
        try {
            const msg = await apiPost(`/api/mydesk/chat/conversations/${activeConv.id}/messages/`, { content: text });
            setMessages(prev => [...prev, msg]);
            lastMessageIdRef.current = msg.id;
            loadConversations();
        } catch { /* ignore */ } finally {
            setSending(false);
        }
    }

    function handleBack() {
        setActiveConv(null);
        setMessages([]);
        lastMessageIdRef.current = null;
        clearInterval(pollRef.current);
        loadConversations();
    }

    if (!isOpen) return null;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#fff', borderRadius: embedded ? 0 : 2, overflow: 'hidden', boxShadow: embedded ? 'none' : 3 }}>
            {/* Title bar */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.25, borderBottom: '1px solid #e0e0e0', bgcolor: '#fff', flexShrink: 0 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#1a1a2e' }}>
                    {title}
                </Typography>
                {showCloseButton && (
                    <IconButton size="small" onClick={onClose}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                )}
            </Box>

            {/* Body */}
            <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {/* Left: contact/conversation list */}
                <Box sx={{
                    width: { xs: activeConv ? 0 : '100%', md: 260 },
                    flexShrink: 0,
                    overflow: 'hidden',
                    transition: 'width 0.2s',
                    display: { xs: activeConv ? 'none' : 'flex', md: 'flex' },
                    flexDirection: 'column',
                }}>
                    <ContactList
                        onSelect={handleSelectContact}
                        search={search}
                        setSearch={setSearch}
                        conversations={conversations}
                        contacts={contacts}
                        loadingContacts={loadingContacts}
                    />
                </Box>

                <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />

                {/* Right: message thread */}
                <Box sx={{
                    flex: 1,
                    overflow: 'hidden',
                    display: { xs: activeConv ? 'flex' : 'none', md: 'flex' },
                    flexDirection: 'column',
                }}>
                    {activeConv ? (
                        <MessageThread
                            conversation={activeConv}
                            onBack={handleBack}
                            onSend={handleSend}
                            messages={messages}
                            loadingMessages={loadingMessages}
                            sending={sending}
                        />
                    ) : (
                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'text.secondary' }}>
                            <ForumOutlinedIcon sx={{ fontSize: 56, mb: 2, opacity: 0.3 }} />
                            <Typography variant="body1" color="text.secondary">
                                Select a person to start chatting
                            </Typography>
                        </Box>
                    )}
                </Box>
            </Box>
        </Box>
    );
}

