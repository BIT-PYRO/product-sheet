'use client';
import React, { useEffect, useRef, useState } from 'react';
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogContent,
    DialogTitle,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import {
    AttachFile as AttachFileIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    PushPin as PushPinIcon,
    Share as ShareIcon,
    Search as SearchIcon,
} from '@mui/icons-material';
import { useUser } from '../../../contexts/UserContext';
import { useSearchParams } from 'next/navigation';
import {
    listMyDeskNotes,
    createMyDeskNote,
    updateMyDeskNote,
    deleteMyDeskNote,
    deleteMyDeskNoteAttachment,
} from '../mydeskService';

export default function NotesSection({ members = [] }) {
    const searchParams = useSearchParams();
    const PRIVATE_LABEL = 'visibility:private';
    const SHARED_MEMBER_PREFIX = 'shared:member:';
    const OWNER_MEMBER_PREFIX = 'owner:member:';

    const getMemberId = (member) => member?.id ?? member?.user_id ?? member?.value ?? null;

    const getMemberName = (member) => {
        const fullName = [member?.first_name, member?.last_name].filter(Boolean).join(' ').trim();
        return member?.full_name || member?.name || fullName || member?.username || member?.email || 'Member';
    };

    const editorRef = useRef(null);
    const noteCardRefs = useRef({});
    const handledDeepLinkRef = useRef('');
    const { user } = useUser();
    const currentUserId = String(user?.id ?? user?.user_id ?? '');
    const [notes, setNotes] = useState([]);
    const [selectedNote, setSelectedNote] = useState(null);
    const [isEditingSelectedNote, setIsEditingSelectedNote] = useState(false);
    const [selectedEditTitle, setSelectedEditTitle] = useState('');
    const [selectedEditContent, setSelectedEditContent] = useState('');
    const [selectedEditAttachments, setSelectedEditAttachments] = useState([]);
    const [notesLoading, setNotesLoading] = useState(true);
    const [noteError, setNoteError] = useState('');
    const [search, setSearch] = useState('');
    const [label, setLabel] = useState('work');
    const [draftTitle, setDraftTitle] = useState('Quick note');
    const [attachments, setAttachments] = useState([]);
    const [draftVersions, setDraftVersions] = useState([]);
    const [lastAutoSavedAt, setLastAutoSavedAt] = useState('');
    const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
    const [shareMemberIds, setShareMemberIds] = useState([]);
    const [isSharing, setIsSharing] = useState(false);
    const [highlightNoteId, setHighlightNoteId] = useState(null);

    useEffect(() => {
        let mounted = true;
        listMyDeskNotes()
            .then((data) => {
                if (!mounted) return;
                setNotes(Array.isArray(data) ? data : []);
            })
            .catch((error) => {
                if (!mounted) return;
                setNoteError(error.message || 'Failed to load notes');
            })
            .finally(() => {
                if (mounted) setNotesLoading(false);
            });

        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        const onCreated = (event) => {
            const createdNote = event?.detail;
            if (!createdNote || !createdNote.id) return;
            setNotes((previous) => {
                const exists = previous.some((item) => String(item.id) === String(createdNote.id));
                if (exists) return previous;
                return [createdNote, ...previous];
            });
        };

        const onDeleted = (event) => {
            const deletedId = event?.detail?.id;
            if (!deletedId) return;
            setNotes((previous) => previous.filter((item) => String(item.id) !== String(deletedId)));
        };

        window.addEventListener('mydesk-note-created', onCreated);
        window.addEventListener('mydesk-note-deleted', onDeleted);

        return () => {
            window.removeEventListener('mydesk-note-created', onCreated);
            window.removeEventListener('mydesk-note-deleted', onDeleted);
        };
    }, []);

    useEffect(() => {
        const saved = localStorage.getItem('mydesk-notes-draft');
        if (!saved) return;
        try {
            const parsed = JSON.parse(saved);
            setDraftTitle(parsed.title || 'Quick note');
            if (editorRef.current) editorRef.current.innerHTML = parsed.html || '';
            setLastAutoSavedAt(parsed.savedAt || '');
            setDraftVersions(Array.isArray(parsed.versions) ? parsed.versions : []);
        } catch {
        }
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            const html = editorRef.current?.innerHTML || '';
            const now = new Date().toISOString();
            const nextVersions = [...draftVersions, { time: now, html }].slice(-8);
            localStorage.setItem('mydesk-notes-draft', JSON.stringify({
                title: draftTitle,
                html,
                savedAt: now,
                versions: nextVersions,
            }));
            setDraftVersions(nextVersions);
            setLastAutoSavedAt(now);
        }, 5000);

        return () => clearInterval(interval);
    }, [draftTitle, draftVersions]);

    const parseSharedMemberIds = (labelsValue) => {
        if (!Array.isArray(labelsValue)) return [];
        return labelsValue
            .filter((entry) => typeof entry === 'string' && entry.startsWith(SHARED_MEMBER_PREFIX))
            .map((entry) => entry.slice(SHARED_MEMBER_PREFIX.length))
            .filter(Boolean);
    };

    const parseOwnerMemberId = (labelsValue) => {
        if (!Array.isArray(labelsValue)) return '';
        const ownerLabel = labelsValue.find((entry) => typeof entry === 'string' && entry.startsWith(OWNER_MEMBER_PREFIX));
        return ownerLabel ? ownerLabel.slice(OWNER_MEMBER_PREFIX.length) : '';
    };

    const getPrimaryLabel = (labelsValue) => {
        const cleaned = (Array.isArray(labelsValue) ? labelsValue : []).filter((entry) => (
            typeof entry === 'string'
            && entry !== PRIVATE_LABEL
            && !entry.startsWith(OWNER_MEMBER_PREFIX)
            && !entry.startsWith(SHARED_MEMBER_PREFIX)
        ));
        return cleaned[0] || 'work';
    };

    const getSharedWithLabel = (labelsValue) => {
        const sharedIds = parseSharedMemberIds(labelsValue);
        if (sharedIds.length === 0) return '';

        const sharedNames = sharedIds
            .map((memberId) => {
                const matched = (Array.isArray(members) ? members : []).find((member) => String(getMemberId(member)) === String(memberId));
                return matched ? getMemberName(matched) : '';
            })
            .filter(Boolean);

        if (sharedNames.length === 0) {
            return sharedIds.length === 1 ? 'Shared with 1 member' : `Shared with ${sharedIds.length} members`;
        }
        if (sharedNames.length === 1) return `Shared with ${sharedNames[0]}`;
        if (sharedNames.length === 2) return `Shared with ${sharedNames[0]}, ${sharedNames[1]}`;
        return `Shared with ${sharedNames[0]} +${sharedNames.length - 1}`;
    };

    const createNote = async () => {
        const html = editorRef.current?.innerHTML || '';
        if (!draftTitle.trim() && !html.replace(/<[^>]+>/g, '').trim()) return;

        try {
            const created = await createMyDeskNote({
                title: draftTitle || 'Untitled note',
                content_html: html,
                tags: [],
                labels: [label, PRIVATE_LABEL, ...(currentUserId ? [`${OWNER_MEMBER_PREFIX}${currentUserId}`] : [])],
                attachments: attachments.map((file) => file.name),
                drive_links: [],
            }, attachments);
            setNotes((previous) => [created, ...previous]);
            setNoteError('');
        } catch (error) {
            setNoteError(error.message || 'Failed to save note');
            return;
        }

        setDraftTitle('Quick note');
        setAttachments([]);
        setDraftVersions([]);
        if (editorRef.current) editorRef.current.innerHTML = '';
    };

    const handleAddAttachments = (event) => {
        const selectedFiles = Array.from(event.target.files || []);
        if (selectedFiles.length === 0) return;

        setAttachments((previous) => {
            const existingKeys = new Set(previous.map((file) => `${file.name}-${file.size}-${file.lastModified}`));
            const next = [...previous];

            selectedFiles.forEach((file) => {
                const key = `${file.name}-${file.size}-${file.lastModified}`;
                if (!existingKeys.has(key)) {
                    next.push(file);
                    existingKeys.add(key);
                }
            });

            return next;
        });

        event.target.value = '';
    };

    const handleRemoveAttachment = (fileToRemove) => {
        setAttachments((previous) => previous.filter((file) => (
            `${file.name}-${file.size}-${file.lastModified}`
            !== `${fileToRemove.name}-${fileToRemove.size}-${fileToRemove.lastModified}`
        )));
    };

    const filteredNotes = notes.filter((note) => {
        const noteLabels = Array.isArray(note.labels) ? note.labels : [];
        const isPrivate = noteLabels.includes(PRIVATE_LABEL);
        if (isPrivate) {
            const ownerId = parseOwnerMemberId(noteLabels);
            const sharedIds = parseSharedMemberIds(noteLabels);
            const hasVisibilityMeta = Boolean(ownerId) || sharedIds.length > 0;
            if (hasVisibilityMeta && ![ownerId, ...sharedIds].includes(currentUserId)) {
                return false;
            }
        }

        const tags = Array.isArray(note.tags) ? note.tags.join(' ') : '';
        const labels = noteLabels.join(' ');
        const text = `${note.title || ''} ${tags} ${labels}`.toLowerCase();
        return text.includes(search.toLowerCase());
    });

    const toPlainText = (html) => String(html || '')
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<\/p>/gi, ' ')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim();

    const plainTextToHtml = (text) => String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br />');

    const handleDeleteNote = async (noteId) => {
        try {
            await deleteMyDeskNote(noteId);
            setNotes((previous) => previous.filter((item) => item.id !== noteId));
            setSelectedNote((previous) => (previous?.id === noteId ? null : previous));
            setNoteError('');
            window.dispatchEvent(new CustomEvent('mydesk-note-deleted', { detail: { id: String(noteId) } }));
        } catch (error) {
            setNoteError(error.message || 'Failed to delete note');
        }
    };

    const handleDeleteAttachment = async (attachmentId) => {
        if (!selectedNote) return;
        try {
            await deleteMyDeskNoteAttachment(attachmentId);
            setSelectedNote((previous) => {
                if (!previous) return previous;
                return {
                    ...previous,
                    file_attachments: (previous.file_attachments || []).filter((attachment) => attachment.id !== attachmentId),
                };
            });
            setNotes((previous) => previous.map((note) => (
                note.id === selectedNote.id
                    ? {
                        ...note,
                        file_attachments: (note.file_attachments || []).filter((attachment) => attachment.id !== attachmentId),
                    }
                    : note
            )));
            setNoteError('');
        } catch (error) {
            setNoteError(error.message || 'Failed to delete attachment');
        }
    };

    const startEditingSelectedNote = () => {
        if (!selectedNote) return;
        setSelectedEditTitle(selectedNote.title || '');
        setSelectedEditContent(toPlainText(selectedNote.content_html || ''));
        setSelectedEditAttachments([]);
        setIsEditingSelectedNote(true);
    };

    const handleAddEditAttachments = (event) => {
        const selectedFiles = Array.from(event.target.files || []);
        if (selectedFiles.length === 0) return;

        setSelectedEditAttachments((previous) => {
            const existingKeys = new Set(previous.map((file) => `${file.name}-${file.size}-${file.lastModified}`));
            const next = [...previous];

            selectedFiles.forEach((file) => {
                const key = `${file.name}-${file.size}-${file.lastModified}`;
                if (!existingKeys.has(key)) {
                    next.push(file);
                    existingKeys.add(key);
                }
            });

            return next;
        });

        event.target.value = '';
    };

    const handleRemoveEditAttachment = (fileToRemove) => {
        setSelectedEditAttachments((previous) => previous.filter((file) => (
            `${file.name}-${file.size}-${file.lastModified}`
            !== `${fileToRemove.name}-${fileToRemove.size}-${fileToRemove.lastModified}`
        )));
    };

    const handleSaveSelectedNoteEdits = async () => {
        if (!selectedNote) return;
        try {
            const nextTitle = selectedEditTitle;
            const nextContentHtml = plainTextToHtml(selectedEditContent);
            const hasFiles = Array.isArray(selectedEditAttachments) && selectedEditAttachments.length > 0;
            const payload = hasFiles
                ? (() => {
                    const formData = new FormData();
                    formData.append('title', nextTitle);
                    formData.append('content_html', nextContentHtml);
                    selectedEditAttachments.forEach((file) => formData.append('files', file));
                    return formData;
                })()
                : {
                    title: nextTitle,
                    content_html: nextContentHtml,
                };

            const updated = await updateMyDeskNote(selectedNote.id, payload);
            setSelectedNote(updated);
            setNotes((previous) => previous.map((note) => (note.id === updated.id ? updated : note)));
            setIsEditingSelectedNote(false);
            setSelectedEditAttachments([]);
            setNoteError('');
        } catch (error) {
            setNoteError(error.message || 'Failed to update note');
        }
    };

    const startSharingSelectedNote = () => {
        if (!selectedNote) return;
        const existingShared = parseSharedMemberIds(selectedNote.labels || []);
        setShareMemberIds(existingShared);
        setIsShareDialogOpen(true);
    };

    const toggleSharedMember = (memberId) => {
        const id = String(memberId);
        setShareMemberIds((previous) => (
            previous.includes(id)
                ? previous.filter((entry) => entry !== id)
                : [...previous, id]
        ));
    };

    const handleSaveSharing = async () => {
        if (!selectedNote) return;
        setIsSharing(true);
        try {
            const originalLabels = Array.isArray(selectedNote.labels) ? selectedNote.labels : [];
            const ownerId = parseOwnerMemberId(originalLabels) || currentUserId;
            const preservedLabels = originalLabels.filter((entry) => (
                typeof entry === 'string'
                && entry !== PRIVATE_LABEL
                && !entry.startsWith(OWNER_MEMBER_PREFIX)
                && !entry.startsWith(SHARED_MEMBER_PREFIX)
            ));

            const labels = [
                ...preservedLabels,
                PRIVATE_LABEL,
                ...(ownerId ? [`${OWNER_MEMBER_PREFIX}${ownerId}`] : []),
                ...shareMemberIds.map((id) => `${SHARED_MEMBER_PREFIX}${id}`),
            ];

            const updated = await updateMyDeskNote(selectedNote.id, { labels });
            setSelectedNote(updated);
            setNotes((previous) => previous.map((note) => (note.id === updated.id ? updated : note)));
            setIsShareDialogOpen(false);
            setNoteError('');
        } catch (error) {
            setNoteError(error.message || 'Failed to update sharing');
        } finally {
            setIsSharing(false);
        }
    };

    useEffect(() => {
        const params = searchParams;
        const noteId = (params.get('noteId') || '').trim();
        if (!noteId) return;

        const key = noteId;
        if (handledDeepLinkRef.current === key) return;

        const target = notes.find((note) => String(note.id) === String(noteId));
        if (!target) return;

        handledDeepLinkRef.current = key;
        setSelectedNote(target);
        setIsEditingSelectedNote(false);
        setHighlightNoteId(target.id);

        window.setTimeout(() => {
            noteCardRefs.current[target.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 120);
        window.setTimeout(() => setHighlightNoteId(null), 5000);
    }, [searchParams, notes]);

    return (
        <Box sx={{ position: 'relative' }}>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { xs: 'stretch', md: 'center' } }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <TextField
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search and filter notes"
                            size="small"
                            fullWidth
                            slotProps={{ input: { startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} /> } }}
                        />
                    </Box>

                </Stack>

                <Paper variant="outlined" sx={{ mt: 2, p: 2, borderRadius: 2 }}>
                    <Stack spacing={1.25}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <TextField
                                label="Note title"
                                value={draftTitle}
                                onChange={(event) => setDraftTitle(event.target.value)}
                                size="small"
                                sx={{ mr: 1, color: 'text.secondary' }}
                            />
                            <FormControl size="small" sx={{ minWidth: 160 }}>
                                <InputLabel>Label</InputLabel>
                                <Select value={label} label="Label" onChange={(event) => setLabel(event.target.value)}>
                                    <MenuItem value="work">Work</MenuItem>
                                    <MenuItem value="planning">Planning</MenuItem>
                                    <MenuItem value="personal">Personal</MenuItem>
                                    <MenuItem value="ideas">Ideas</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>


                        <Box
                            ref={editorRef}
                            contentEditable
                            suppressContentEditableWarning
                            sx={{
                                border: 1,
                                borderColor: 'divider',
                                borderRadius: 1.5,
                                p: 1.5,
                                minHeight: 120,
                                '&:focus': { outline: 'none', borderColor: 'primary.main' },
                            }}
                        />

                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
                            <Button component="label" variant="outlined" startIcon={<AttachFileIcon />}>
                                Attach
                                <input hidden multiple type="file" onChange={handleAddAttachments} />
                            </Button>
                        </Stack>

                        {attachments.length > 0 && (
                            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                                {attachments.map((file) => (
                                    <Chip
                                        key={`${file.name}-${file.size}-${file.lastModified}`}
                                        label={file.name}
                                        size="small"
                                        variant="outlined"
                                        onDelete={() => handleRemoveAttachment(file)}
                                    />
                                ))}
                            </Stack>
                        )}

                        <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" color="text.secondary">
                                Auto-saved {lastAutoSavedAt ? new Date(lastAutoSavedAt).toLocaleTimeString() : '—'}
                            </Typography>
                            <Button variant="contained" onClick={createNote}>Save Note</Button>
                        </Stack>
                    </Stack>
                </Paper>

                {noteError && (
                    <Typography variant="caption" color="error" sx={{ mt: 1.5, display: 'block' }}>
                        {noteError}
                    </Typography>
                )}

                <Stack spacing={1.25} sx={{ mt: 2 }}>
                    {notesLoading && (
                        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                            <Typography variant="body2" color="text.secondary">Loading notes…</Typography>
                        </Paper>
                    )}
                    {filteredNotes.map((note) => (
                        <Paper
                            key={note.id}
                            ref={(element) => {
                                if (element) noteCardRefs.current[note.id] = element;
                                else delete noteCardRefs.current[note.id];
                            }}
                            variant="outlined"
                            sx={{
                                p: 1.5,
                                borderRadius: 2,
                                cursor: 'pointer',
                                borderColor: highlightNoteId === note.id ? 'primary.main' : 'divider',
                                boxShadow: highlightNoteId === note.id ? '0 0 0 2px rgba(25,118,210,0.16)' : 'none',
                                transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
                            }}
                            onClick={() => setSelectedNote(note)}
                        >
                            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flex: 1, minWidth: 0 }}>
                                    <Typography noWrap variant="subtitle2" sx={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis' }}>{note.title}</Typography>
                                    <Chip label={getPrimaryLabel(note.labels)} size="small" variant="outlined" />
                                </Stack>
                                <IconButton
                                    size="small"
                                    onClick={async (event) => {
                                        event.stopPropagation();
                                        try {
                                            const updated = await updateMyDeskNote(note.id, { is_pinned: !note.is_pinned });
                                            setNotes((previous) => previous.map((item) => (item.id === note.id ? updated : item)));
                                            setSelectedNote((previous) => (previous?.id === note.id ? updated : previous));
                                        } catch (error) {
                                            setNoteError(error.message || 'Failed to update note');
                                        }
                                    }}
                                >
                                    {note.is_pinned ? <PushPinIcon fontSize="small" color="primary" /> : <PushPinIcon fontSize="small" />}
                                </IconButton>
                            </Stack>
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                    mt: 1,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                }}
                            >
                                {toPlainText(note.content_html || '') || '—'}
                            </Typography>
                            <Stack direction="row" spacing={0.75} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.75 }}>
                                {parseSharedMemberIds(note.labels).length > 0 && (
                                    <Chip label={getSharedWithLabel(note.labels)} size="small" variant="outlined" />
                                )}
                            </Stack>
                        </Paper>
                    ))}
                    {!notesLoading && filteredNotes.length === 0 && (
                        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                            <Typography variant="body2" color="text.secondary">No notes found.</Typography>
                        </Paper>
                    )}
                </Stack>
            </Paper>

            <Dialog
                open={Boolean(selectedNote)}
                onClose={() => {
                    setSelectedNote(null);
                    setIsEditingSelectedNote(false);
                    setSelectedEditAttachments([]);
                }}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                {selectedNote?.title || 'Note'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {selectedNote ? new Date(selectedNote.created_at || selectedNote.updated_at || new Date().toISOString()).toLocaleString() : ''}
                            </Typography>
                        </Box>
                        {selectedNote && (
                            <Stack direction="row" spacing={1}>
                                {isEditingSelectedNote ? (
                                    <>
                                        <Button
                                            onClick={() => {
                                                setIsEditingSelectedNote(false);
                                                setSelectedEditAttachments([]);
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                        <Button variant="contained" onClick={handleSaveSelectedNoteEdits}>Save</Button>
                                    </>
                                ) : (
                                    <>
                                        <IconButton size="small" onClick={startSharingSelectedNote} aria-label="share note">
                                            <ShareIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton size="small" onClick={startEditingSelectedNote} aria-label="edit note">
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                    </>
                                )}
                                <IconButton color="error" size="small" onClick={() => handleDeleteNote(selectedNote.id)} aria-label="delete note">
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </Stack>
                        )}
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    {isEditingSelectedNote ? (
                        <Stack spacing={1.25} sx={{ mt: 0.5 }}>
                            <TextField
                                size="small"
                                label="Note title"
                                value={selectedEditTitle}
                                onChange={(event) => setSelectedEditTitle(event.target.value)}
                                fullWidth
                            />
                            <TextField
                                label="Note"
                                value={selectedEditContent}
                                onChange={(event) => setSelectedEditContent(event.target.value)}
                                fullWidth
                                multiline
                                minRows={8}
                            />
                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
                                <Button component="label" variant="outlined" startIcon={<AttachFileIcon />}>
                                    Attach Files
                                    <input hidden multiple type="file" onChange={handleAddEditAttachments} />
                                </Button>
                            </Stack>
                            {selectedEditAttachments.length > 0 && (
                                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                                    {selectedEditAttachments.map((file) => (
                                        <Chip
                                            key={`${file.name}-${file.size}-${file.lastModified}`}
                                            label={file.name}
                                            size="small"
                                            variant="outlined"
                                            onDelete={() => handleRemoveEditAttachment(file)}
                                        />
                                    ))}
                                </Stack>
                            )}
                        </Stack>
                    ) : (
                        <Box
                            sx={{
                                mt: 0.5,
                                maxHeight: '60vh',
                                overflowY: 'auto',
                                overflowX: 'hidden',
                                wordBreak: 'break-word',
                                '& *': {
                                    maxWidth: '100%',
                                },
                                '& footer, & .footer, & [id*="footer" i], & [class*="footer" i]': {
                                    display: 'none !important',
                                },
                                '& [style*="position: fixed" i], & [style*="position:sticky" i]': {
                                    position: 'static !important',
                                },
                                '& > :last-child': {
                                    marginBottom: '0 !important',
                                    paddingBottom: '0 !important',
                                },
                            }}
                            dangerouslySetInnerHTML={{ __html: selectedNote?.content_html || '' }}
                        />
                    )}
                    {(selectedNote?.file_attachments || []).length > 0 && (
                        <Stack spacing={0.75} sx={{ mt: 1.5 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Attachments</Typography>
                            {(selectedNote.file_attachments || []).map((attachment) => (
                                <Stack key={attachment.id} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                    <Button
                                        component="a"
                                        href={attachment.file_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        variant="outlined"
                                        size="small"
                                        sx={{ justifyContent: 'flex-start', flex: 1 }}
                                    >
                                        {attachment.original_name || 'Attachment'}
                                    </Button>
                                    <IconButton
                                        color="error"
                                        size="small"
                                        onClick={() => handleDeleteAttachment(attachment.id)}
                                        aria-label="delete note attachment"
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Stack>
                            ))}
                        </Stack>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={isShareDialogOpen} onClose={() => setIsShareDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Share Note</DialogTitle>
                <DialogContent>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.25 }}>
                        This note remains private by default. Choose members who can access it.
                    </Typography>
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                        {(Array.isArray(members) ? members : []).map((member) => {
                            const memberId = getMemberId(member);
                            if (memberId === null || memberId === undefined) return null;
                            const memberIdText = String(memberId);
                            const selected = shareMemberIds.includes(memberIdText);
                            return (
                                <Chip
                                    key={memberIdText}
                                    label={getMemberName(member)}
                                    color={selected ? 'primary' : 'default'}
                                    variant={selected ? 'filled' : 'outlined'}
                                    onClick={() => toggleSharedMember(memberIdText)}
                                />
                            );
                        })}
                    </Stack>
                    {(!Array.isArray(members) || members.length === 0) && (
                        <Typography variant="body2" color="text.secondary">
                            No members available to share.
                        </Typography>
                    )}
                </DialogContent>
                <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', px: 3, pb: 2 }}>
                    <Button onClick={() => setIsShareDialogOpen(false)} disabled={isSharing}>Cancel</Button>
                    <Button variant="contained" onClick={handleSaveSharing} disabled={isSharing}>
                        {isSharing ? 'Saving…' : 'Save'}
                    </Button>
                </Stack>
            </Dialog>
        </Box>
    );
}
