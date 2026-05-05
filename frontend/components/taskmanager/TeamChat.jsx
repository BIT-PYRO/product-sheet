'use client';

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import {
  Box,
  Typography,
  Avatar,
  TextField,
  IconButton,
  Badge,
  Tooltip,
  Menu,
  MenuItem,
  Divider,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SendIcon from '@mui/icons-material/Send';
import ChatIcon from '@mui/icons-material/Chat';

// --- Helpers -----------------------------------------------------------------

function getInitials(user) {
  if (!user) return '?';
  const f = (user.first_name || '').trim();
  const l = (user.last_name || '').trim();
  if (f && l) return (f[0] + l[0]).toUpperCase();
  if (f) return f[0].toUpperCase();
  return (user.username || '?')[0].toUpperCase();
}

function getDisplayName(user) {
  if (!user) return 'Unknown';
  const full = ((user.first_name || '') + ' ' + (user.last_name || '')).trim();
  return full || user.username || 'Unknown';
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatConvTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = diffMs / 60000;
  if (diffMins < 1) return 'now';
  if (diffMins < 60) return Math.round(diffMins) + 'm';
  const diffHours = diffMins / 60;
  if (diffHours < 24) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

async function apiFetch(path, options) {
  const opts = options || {};
  const res = await fetch('/api/mydesk/' + path, {
    headers: Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {}),
    credentials: 'include',
    method: opts.method || 'GET',
    body: opts.body || undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(function() { return res.statusText; });
    throw new Error(text || res.statusText);
  }
  if (res.status === 204) return null;
  return res.json();
}

// --- OnlineDot ---------------------------------------------------------------
function OnlineDot({ isOnline, size }) {
  const s = size || 10;
  return (
    React.createElement(Box, {
      sx: {
        width: s,
        height: s,
        borderRadius: '50%',
        bgcolor: isOnline ? '#22c55e' : '#ef4444',
        border: '1.5px solid white',
        flexShrink: 0,
      }
    })
  );
}

// --- ContactAvatar -----------------------------------------------------------
function ContactAvatar({ user, isBroadcast, size }) {
  const sz = size || 38;
  if (isBroadcast) {
    return (
      React.createElement(Avatar, {
        sx: { width: sz, height: sz, bgcolor: '#1a3a8f', fontSize: 12, fontWeight: 700 }
      }, 'ALL')
    );
  }
  return (
    React.createElement(Box, { sx: { position: 'relative', display: 'inline-flex' } },
      React.createElement(Avatar, {
        sx: { width: sz, height: sz, bgcolor: '#1a3a8f', fontSize: sz > 36 ? 16 : 13, fontWeight: 600 }
      }, getInitials(user)),
      React.createElement(Box, { sx: { position: 'absolute', bottom: 0, right: 0 } },
        React.createElement(OnlineDot, { isOnline: user && user.is_online })
      )
    )
  );
}

// --- ContactListItem ---------------------------------------------------------
function ContactListItem({ conv, user, isSelected, onClick }) {
  const isBroadcast = conv && conv.is_broadcast;
  const displayUser = (conv && conv.other_user) || user;
  const displayName = isBroadcast
    ? 'Everyone (broadcast)'
    : getDisplayName(displayUser);
  const lastMsg = conv && conv.last_message;
  const unread = (conv && conv.unread_count) || 0;
  const timestamp = lastMsg && lastMsg.created_at
    ? formatConvTime(lastMsg.created_at)
    : conv && conv.created_at
    ? formatConvTime(conv.created_at)
    : '';

  return (
    React.createElement(Box, {
      onClick: onClick,
      sx: {
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 1.5,
        py: 1,
        cursor: 'pointer',
        bgcolor: isSelected ? '#e8f0fe' : 'transparent',
        borderLeft: isSelected ? '3px solid #2563eb' : '3px solid transparent',
        '&:hover': { bgcolor: isSelected ? '#e8f0fe' : '#f5f7fa' },
        transition: 'background 0.15s',
      }
    },
      React.createElement(ContactAvatar, { user: displayUser, isBroadcast: isBroadcast }),
      React.createElement(Box, { sx: { flex: 1, minWidth: 0 } },
        React.createElement(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
          React.createElement(Typography, { variant: 'body2', fontWeight: unread > 0 ? 700 : 500, noWrap: true, sx: { fontSize: 13 } }, displayName),
          React.createElement(Typography, { variant: 'caption', color: 'text.secondary', sx: { fontSize: 11, flexShrink: 0, ml: 0.5 } }, timestamp)
        ),
        React.createElement(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
          React.createElement(Typography, {
            variant: 'caption',
            color: unread > 0 ? 'text.primary' : 'text.secondary',
            noWrap: true,
            sx: { fontSize: 12, fontWeight: unread > 0 ? 600 : 400, flex: 1 }
          }, lastMsg ? lastMsg.content : 'Start conversation'),
          unread > 0 && React.createElement(Badge, {
            badgeContent: unread,
            color: 'primary',
            sx: { '& .MuiBadge-badge': { fontSize: 10, minWidth: 18, height: 18 } }
          })
        )
      )
    )
  );
}

// --- MessageBubble -----------------------------------------------------------
function MessageBubble({ msg, onDelete }) {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [hovered, setHovered] = useState(false);

  return (
    React.createElement(Box, {
      sx: {
        display: 'flex',
        justifyContent: msg.is_mine ? 'flex-end' : 'flex-start',
        mb: 1.5,
        px: 2,
        position: 'relative',
      },
      onMouseEnter: function() { setHovered(true); },
      onMouseLeave: function() { setHovered(false); },
    },
      !msg.is_mine && React.createElement(Box, { sx: { mr: 1, alignSelf: 'flex-end' } },
        React.createElement(ContactAvatar, { user: msg.sender, size: 28 })
      ),
      React.createElement(Box, { sx: { maxWidth: '68%' } },
        !msg.is_mine && React.createElement(Typography, {
          variant: 'caption', color: 'text.secondary',
          sx: { pl: 0.5, mb: 0.25, display: 'block' }
        }, getDisplayName(msg.sender)),

        React.createElement(Box, { sx: { display: 'flex', alignItems: 'flex-end', gap: 0.5 } },
          hovered && msg.is_mine && React.createElement(IconButton, {
            size: 'small',
            onClick: function(e) { setMenuAnchor(e.currentTarget); },
            sx: { p: 0.25 }
          }, React.createElement(MoreVertIcon, { sx: { fontSize: 16, color: 'text.secondary' } })),

          React.createElement(Box, {
            sx: {
              bgcolor: msg.is_mine ? '#dbeafe' : '#ffffff',
              border: msg.is_mine ? 'none' : '1px solid #e5e7eb',
              borderRadius: msg.is_mine ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
              px: 1.5,
              py: 0.75,
              boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
            }
          },
            React.createElement(Typography, { variant: 'body2', sx: { fontSize: 13.5, color: '#1f2937', lineHeight: 1.5 } },
              msg.content
            )
          ),

          hovered && !msg.is_mine && React.createElement(IconButton, {
            size: 'small',
            onClick: function(e) { setMenuAnchor(e.currentTarget); },
            sx: { p: 0.25 }
          }, React.createElement(MoreVertIcon, { sx: { fontSize: 16, color: 'text.secondary' } }))
        ),

        React.createElement(Typography, {
          variant: 'caption',
          sx: {
            fontSize: 11,
            color: '#9ca3af',
            mt: 0.25,
            display: 'block',
            textAlign: msg.is_mine ? 'right' : 'left',
            pl: msg.is_mine ? 0 : 0.5,
          }
        }, formatTime(msg.created_at) + (msg.is_mine && msg.is_delivered ? ' · Delivered' : ''))
      ),

      React.createElement(Menu, {
        anchorEl: menuAnchor,
        open: Boolean(menuAnchor),
        onClose: function() { setMenuAnchor(null); },
        anchorOrigin: { vertical: 'top', horizontal: 'center' },
        PaperProps: { elevation: 2, sx: { borderRadius: 1.5, minWidth: 120 } }
      },
        msg.is_mine && React.createElement(MenuItem, {
          dense: true,
          onClick: function() { setMenuAnchor(null); onDelete && onDelete(msg.id); },
          sx: { color: '#ef4444', fontSize: 13 }
        }, 'Delete'),
        React.createElement(MenuItem, {
          dense: true,
          onClick: function() {
            navigator.clipboard.writeText(msg.content).catch(function() {});
            setMenuAnchor(null);
          },
          sx: { fontSize: 13 }
        }, 'Copy')
      )
    )
  );
}

// --- Main TeamChat -----------------------------------------------------------
export default function TeamChat({ isOpen, embedded, title, showCloseButton, focusWithUserId }) {
  var [contacts, setContacts] = useState([]);
  var [conversations, setConversations] = useState([]);
  var [broadcastConv, setBroadcastConv] = useState(null);
  var [selectedConvId, setSelectedConvId] = useState(null);
  var [messages, setMessages] = useState([]);
  var [input, setInput] = useState('');
  var [search, setSearch] = useState('');
  var [loading, setLoading] = useState(true);
  var [sending, setSending] = useState(false);
  var [lastMsgId, setLastMsgId] = useState(0);
  var [isMobileListOpen, setIsMobileListOpen] = useState(true);

  var messagesEndRef = useRef(null);
  var pollTimerRef = useRef(null);
  var heartbeatTimerRef = useRef(null);
  var inputRef = useRef(null);
  var lastMsgIdRef = useRef(0);

  useEffect(function() { lastMsgIdRef.current = lastMsgId; }, [lastMsgId]);

  var scrollToBottom = useCallback(function() {
    messagesEndRef.current && messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, []);

  var sendHeartbeat = useCallback(async function() {
    try { await apiFetch('chat/heartbeat/', { method: 'POST', body: '{}' }); }
    catch (_) {}
  }, []);

  var refreshConversations = useCallback(async function() {
    try {
      var data = await apiFetch('chat/conversations/');
      setConversations(data || []);
    } catch (_) {}
  }, []);

  var loadMessages = useCallback(async function(convId, after) {
    if (!convId) return;
    var a = after || 0;
    try {
      var url = a > 0
        ? 'chat/conversations/' + convId + '/messages/?after=' + a
        : 'chat/conversations/' + convId + '/messages/';
      var data = await apiFetch(url);
      if (!data) return;
      if (a > 0) {
        if (data.length > 0) {
          setMessages(function(prev) { return prev.concat(data); });
          var newId = data[data.length - 1].id;
          setLastMsgId(newId);
          lastMsgIdRef.current = newId;
          setTimeout(scrollToBottom, 50);
        }
      } else {
        setMessages(data);
        if (data.length > 0) {
          var mid = data[data.length - 1].id;
          setLastMsgId(mid);
          lastMsgIdRef.current = mid;
        }
        setTimeout(scrollToBottom, 50);
      }
      apiFetch('chat/conversations/' + convId + '/read/', { method: 'POST', body: '{}' }).catch(function() {});
    } catch (e) { console.error('Load messages error:', e); }
  }, [scrollToBottom]);

  var startPolling = useCallback(function(convId) {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    pollTimerRef.current = setInterval(async function() {
      if (!convId) return;
      try {
        var ref = lastMsgIdRef.current;
        var data = await apiFetch('chat/conversations/' + convId + '/messages/?after=' + ref);
        if (data && data.length > 0) {
          setMessages(function(prev) { return prev.concat(data); });
          var nid = data[data.length - 1].id;
          setLastMsgId(nid);
          lastMsgIdRef.current = nid;
          setTimeout(scrollToBottom, 50);
          refreshConversations();
        }
      } catch (_) {}
    }, 3000);
  }, [scrollToBottom, refreshConversations]);

  var openConversation = useCallback(async function(convId) {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    setSelectedConvId(convId);
    setMessages([]);
    setLastMsgId(0);
    lastMsgIdRef.current = 0;
    setIsMobileListOpen(false);
    await loadMessages(convId, 0);
    startPolling(convId);
  }, [loadMessages, startPolling]);

  var startDM = useCallback(async function(userId) {
    try {
      var conv = await apiFetch('chat/conversations/', {
        method: 'POST',
        body: JSON.stringify({ recipient_id: userId }),
      });
      await refreshConversations();
      await openConversation(conv.id);
    } catch (e) { console.error('Start DM error:', e); }
  }, [refreshConversations, openConversation]);

  var sendMessage = useCallback(async function() {
    var text = input.trim();
    if (!text || !selectedConvId) return;
    setSending(true);
    setInput('');
    try {
      var msg = await apiFetch('chat/conversations/' + selectedConvId + '/messages/', {
        method: 'POST',
        body: JSON.stringify({ content: text }),
      });
      setMessages(function(prev) { return prev.concat([msg]); });
      setLastMsgId(msg.id);
      lastMsgIdRef.current = msg.id;
      setTimeout(scrollToBottom, 50);
      refreshConversations();
    } catch (e) {
      console.error('Send error:', e);
      setInput(text);
    } finally {
      setSending(false);
    }
  }, [input, selectedConvId, scrollToBottom, refreshConversations]);

  var deleteMessage = useCallback(async function(msgId) {
    if (!selectedConvId) return;
    try {
      await apiFetch('chat/conversations/' + selectedConvId + '/messages/' + msgId + '/', { method: 'DELETE' });
      setMessages(function(prev) { return prev.filter(function(m) { return m.id !== msgId; }); });
    } catch (e) { console.error('Delete error:', e); }
  }, [selectedConvId]);

  // Initial load
  useEffect(function() {
    async function init() {
      try {
        var results = await Promise.all([
          apiFetch('chat/contacts/'),
          apiFetch('chat/conversations/'),
          apiFetch('chat/broadcast/'),
        ]);
        setContacts(results[0] || []);
        setConversations(results[1] || []);
        setBroadcastConv(results[2] || null);
      } catch (e) { console.error('Chat init error:', e); }
      finally { setLoading(false); }
    }
    init();
    sendHeartbeat();
    heartbeatTimerRef.current = setInterval(sendHeartbeat, 30000);
    return function() {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
    };
  }, [sendHeartbeat]);

  // Auto-open focusWithUserId
  useEffect(function() {
    if (!focusWithUserId || loading) return;
    var uid = parseInt(focusWithUserId, 10);
    if (!uid) return;
    var existing = conversations.find(function(c) {
      return !c.is_broadcast && c.other_user && c.other_user.id === uid;
    });
    if (existing) {
      openConversation(existing.id);
    } else {
      startDM(uid);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusWithUserId, loading]);

  // Build combined list
  var convByUserId = {};
  conversations.forEach(function(c) {
    if (!c.is_broadcast && c.other_user) {
      convByUserId[c.other_user.id] = c;
    }
  });

  var filteredContacts = contacts.filter(function(u) {
    if (!search) return true;
    return getDisplayName(u).toLowerCase().includes(search.toLowerCase());
  });

  var selectedConv = conversations.find(function(c) { return c.id === selectedConvId; }) ||
    (broadcastConv && broadcastConv.id === selectedConvId ? broadcastConv : null);
  var selectedUser = selectedConv ? selectedConv.other_user : null;
  var selectedIsBroadcast = selectedConv ? selectedConv.is_broadcast : false;
  var selectedName = selectedIsBroadcast
    ? 'Everyone (broadcast)'
    : selectedUser ? getDisplayName(selectedUser) : '';

  return (
    React.createElement(Box, {
      sx: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: '#f0f4f8',
        borderRadius: embedded ? 0 : 2,
        overflow: 'hidden',
      }
    },
      // Top header
      React.createElement(Box, {
        sx: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1,
          bgcolor: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          flexShrink: 0,
        }
      },
        React.createElement(Typography, { variant: 'h6', fontWeight: 700, sx: { fontSize: 16, color: '#1f2937' } }, 'My Chats'),
        React.createElement(Box, { sx: { display: 'flex', gap: 0.5 } },
          React.createElement(Tooltip, { title: 'Calendar' },
            React.createElement('button', {
              style: {
                display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                border: '1px solid #d1d5db', borderRadius: 6, background: 'white',
                cursor: 'pointer', fontSize: 12, color: '#374151', fontWeight: 500,
              }
            }, React.createElement(CalendarTodayIcon, { sx: { fontSize: 14 } }), 'Calendar')
          ),
          React.createElement(Tooltip, { title: 'Video Meet' },
            React.createElement('button', {
              style: {
                display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                border: '1px solid #d1d5db', borderRadius: 6, background: 'white',
                cursor: 'pointer', fontSize: 12, color: '#374151', fontWeight: 500,
              }
            }, React.createElement(VideoCallIcon, { sx: { fontSize: 14 } }), 'Meet')
          ),
          React.createElement(Tooltip, { title: 'New' },
            React.createElement('button', {
              style: {
                display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                border: '1px solid #1d4ed8', borderRadius: 6, background: '#2563eb',
                cursor: 'pointer', fontSize: 12, color: 'white', fontWeight: 500,
              },
              onClick: function() { setIsMobileListOpen(true); }
            }, React.createElement(AddIcon, { sx: { fontSize: 14 } }), 'New')
          )
        )
      ),

      // Body
      React.createElement(Box, { sx: { display: 'flex', flex: 1, overflow: 'hidden' } },
        // Left panel
        React.createElement(Box, {
          sx: {
            width: 280,
            flexShrink: 0,
            display: { xs: isMobileListOpen ? 'flex' : 'none', sm: 'flex' },
            flexDirection: 'column',
            bgcolor: '#ffffff',
            borderRight: '1px solid #e5e7eb',
            overflow: 'hidden',
          }
        },
          // Search
          React.createElement(Box, { sx: { px: 1.5, pt: 1.5, pb: 1 } },
            React.createElement(TextField, {
              size: 'small',
              placeholder: 'Search people...',
              value: search,
              onChange: function(e) { setSearch(e.target.value); },
              fullWidth: true,
              slotProps: {
                input: {
                  startAdornment: React.createElement(InputAdornment, { position: 'start' },
                    React.createElement(SearchIcon, { sx: { fontSize: 16, color: '#9ca3af' } })
                  ),
                  sx: { fontSize: 13 }
                }
              },
              sx: {
                '& .MuiOutlinedInput-root': {
                  borderRadius: '20px',
                  bgcolor: '#f5f7fa',
                  '& fieldset': { borderColor: 'transparent' },
                  '&:hover fieldset': { borderColor: '#d1d5db' },
                }
              }
            })
          ),

          React.createElement(Typography, { variant: 'caption', sx: { px: 2, pb: 0.5, color: '#9ca3af', fontWeight: 700, fontSize: 10.5, letterSpacing: 0.8 } },
            'CONVERSATIONS'
          ),

          // Scrollable list
          React.createElement(Box, { sx: { flex: 1, overflowY: 'auto' } },
            loading
              ? React.createElement(Box, { sx: { display: 'flex', justifyContent: 'center', pt: 4 } },
                  React.createElement(CircularProgress, { size: 24 })
                )
              : React.createElement(React.Fragment, null,
                  broadcastConv && React.createElement(React.Fragment, null,
                    React.createElement(ContactListItem, {
                      key: 'broadcast',
                      conv: broadcastConv,
                      isSelected: selectedConvId === broadcastConv.id,
                      onClick: function() { openConversation(broadcastConv.id); }
                    }),
                    React.createElement(Divider, { sx: { my: 0.5, mx: 1.5 } })
                  ),
                  filteredContacts.filter(function(u) { return convByUserId[u.id]; }).map(function(u) {
                    var conv = convByUserId[u.id];
                    return React.createElement(ContactListItem, {
                      key: u.id,
                      conv: conv,
                      user: u,
                      isSelected: selectedConvId === conv.id,
                      onClick: function() { openConversation(conv.id); }
                    });
                  }),
                  filteredContacts.filter(function(u) { return !convByUserId[u.id]; }).map(function(u) {
                    return React.createElement(ContactListItem, {
                      key: u.id,
                      conv: null,
                      user: u,
                      isSelected: false,
                      onClick: function() { startDM(u.id); }
                    });
                  }),
                  filteredContacts.length === 0 && React.createElement(Typography, {
                    variant: 'body2', color: 'text.secondary',
                    sx: { px: 2, pt: 2, fontSize: 12 }
                  }, 'No contacts found')
                )
          )
        ),

        // Right panel
        React.createElement(Box, {
          sx: {
            flex: 1,
            display: { xs: !isMobileListOpen ? 'flex' : 'none', sm: 'flex' },
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'relative',
          }
        },
          !selectedConvId
            ? React.createElement(Box, {
                sx: {
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                  color: '#9ca3af',
                }
              },
                React.createElement(ChatIcon, { sx: { fontSize: 56, color: '#cbd5e1' } }),
                React.createElement(Typography, { variant: 'body1', sx: { fontWeight: 500, color: '#6b7280' } },
                  'Select a conversation to start chatting'
                )
              )
            : React.createElement(React.Fragment, null,
                // Thread header
                React.createElement(Box, {
                  sx: {
                    display: 'flex', alignItems: 'center', px: 2, py: 1.25,
                    bgcolor: '#ffffff', borderBottom: '1px solid #e5e7eb', gap: 1.5, flexShrink: 0,
                  }
                },
                  React.createElement(ContactAvatar, { user: selectedUser, isBroadcast: selectedIsBroadcast, size: 38 }),
                  React.createElement(Box, { sx: { flex: 1 } },
                    React.createElement(Typography, { variant: 'body1', fontWeight: 600, sx: { fontSize: 14, color: '#1f2937' } },
                      selectedName
                    ),
                    !selectedIsBroadcast && selectedUser
                      ? React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5 } },
                          React.createElement(OnlineDot, { isOnline: selectedUser.is_online, size: 8 }),
                          React.createElement(Typography, {
                            variant: 'caption',
                            sx: { fontSize: 11, color: selectedUser.is_online ? '#22c55e' : '#9ca3af' }
                          }, selectedUser.is_online ? 'Active' : 'Inactive')
                        )
                      : selectedIsBroadcast && React.createElement(Typography, {
                          variant: 'caption', sx: { fontSize: 11, color: '#9ca3af' }
                        }, 'Broadcast to all members')
                  )
                ),

                // Messages area
                React.createElement(Box, {
                  sx: { flex: 1, overflowY: 'auto', py: 2, bgcolor: '#f0f4f8' }
                },
                  messages.length === 0
                    ? React.createElement(Typography, {
                        variant: 'body2',
                        sx: { textAlign: 'center', color: '#9ca3af', mt: 4, fontSize: 13 }
                      }, 'No messages yet. Say hello!')
                    : messages.map(function(msg) {
                        return React.createElement(MessageBubble, {
                          key: msg.id,
                          msg: msg,
                          onDelete: deleteMessage
                        });
                      }),
                  React.createElement('div', { ref: messagesEndRef })
                ),

                // Input area
                React.createElement(Box, {
                  sx: {
                    display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.25,
                    bgcolor: '#ffffff', borderTop: '1px solid #e5e7eb', flexShrink: 0,
                  }
                },
                  React.createElement(Tooltip, { title: 'Attach file' },
                    React.createElement(IconButton, { size: 'small', sx: { color: '#6b7280' } },
                      React.createElement(AttachFileIcon, { sx: { fontSize: 20 } })
                    )
                  ),
                  React.createElement(TextField, {
                    inputRef: inputRef,
                    size: 'small',
                    placeholder: 'Type a message...',
                    value: input,
                    onChange: function(e) { setInput(e.target.value); },
                    onKeyDown: function(e) {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                    },
                    fullWidth: true,
                    multiline: true,
                    maxRows: 4,
                    sx: {
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '20px', fontSize: 13, bgcolor: '#f5f7fa',
                        '& fieldset': { borderColor: 'transparent' },
                        '&:hover fieldset': { borderColor: '#d1d5db' },
                        '&.Mui-focused fieldset': { borderColor: '#2563eb' },
                      }
                    }
                  }),
                  React.createElement(Tooltip, { title: 'Mark done' },
                    React.createElement(IconButton, { size: 'small', sx: { color: '#6b7280' } },
                      React.createElement(DoneAllIcon, { sx: { fontSize: 20 } })
                    )
                  ),
                  React.createElement('button', {
                    onClick: sendMessage,
                    disabled: sending || !input.trim(),
                    style: {
                      padding: '6px 14px',
                      background: input.trim() ? '#2563eb' : '#d1d5db',
                      color: 'white',
                      border: 'none',
                      borderRadius: 20,
                      cursor: input.trim() ? 'pointer' : 'default',
                      fontWeight: 600,
                      fontSize: 13,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      flexShrink: 0,
                    }
                  },
                    sending
                      ? React.createElement(CircularProgress, { size: 14, sx: { color: 'white' } })
                      : React.createElement(React.Fragment, null,
                          React.createElement(SendIcon, { sx: { fontSize: 14 } }),
                          'Send'
                        )
                  )
                )
              ),

          // FAB
          React.createElement(Box, {
            sx: { position: 'absolute', bottom: 80, right: 16, zIndex: 10 }
          },
            React.createElement(Tooltip, { title: 'New Chat' },
              React.createElement(IconButton, {
                onClick: function() { setIsMobileListOpen(true); },
                sx: {
                  bgcolor: '#2563eb', color: 'white', width: 44, height: 44,
                  boxShadow: '0 4px 12px rgba(37,99,235,0.4)',
                  '&:hover': { bgcolor: '#1d4ed8' },
                }
              }, React.createElement(ChatIcon, { sx: { fontSize: 20 } }))
            )
          )
        )
      )
    )
  );
}
