'use client';
import React, { useEffect, useRef, useState } from 'react';
import {
    Box,
    Button,
    Chip,
    Divider,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
    Tooltip,
} from '@mui/material';
import { usePagePermissions } from '../../../utils/rbac';
import {
    Delete as DeleteIcon,
    Download as DownloadIcon,
    Edit as EditIcon,
    FileUpload as FileUploadIcon,
    Send as SendIcon,
    Visibility as VisibilityIcon,
} from '@mui/icons-material';
import {
    createMyDeskExpense,
    deleteMyDeskExpense,
    listMyDeskExpenses,
    sendMyDeskExpensesToHr,
    updateMyDeskExpense,
} from '../mydeskService';
import { useSearchParams } from 'next/navigation';

export default function ExpensesSection() {
    const { canViewAmounts, canExport } = usePagePermissions();
    const searchParams = useSearchParams();
    const expenseRowRefs = useRef({});
    const handledDeepLinkRef = useRef('');
    const [form, setForm] = useState({
        transactionType: 'expense',
        category: 'travel',
        customCategory: '',
        amount: '',
        date: new Date().toISOString().slice(0, 10),
        notes: '',
        receipt: null,
    });
    const [expenses, setExpenses] = useState([]);
    const [timeline, setTimeline] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [sortBy, setSortBy] = useState('spent_on');
    const [sortOrder, setSortOrder] = useState('desc');
    const [editingExpenseId, setEditingExpenseId] = useState(null);
    const [highlightExpenseId, setHighlightExpenseId] = useState(null);
    const [sendingToHr, setSendingToHr] = useState(false);

    const resetForm = () => {
        setForm({
            transactionType: 'expense',
            category: 'travel',
            customCategory: '',
            amount: '',
            date: new Date().toISOString().slice(0, 10),
            notes: '',
            receipt: null,
        });
        setEditingExpenseId(null);
    };

    const parseNotesAndCustomCategory = (rawNotes) => {
        const notes = (rawNotes || '').split('\n').map((line) => line.trim());
        let customCategory = '';
        const remainingNotes = [];

        notes.forEach((line) => {
            if (line.startsWith('custom_category:')) {
                customCategory = line.replace('custom_category:', '').trim();
            } else if (line && line !== 'No notes') {
                remainingNotes.push(line);
            }
        });

        return {
            customCategory,
            notes: remainingNotes.join(' '),
        };
    };

    useEffect(() => {
        let mounted = true;
        const filters = {
            timeline,
            sort_by: sortBy,
            sort_order: sortOrder,
        };
        if (timeline === 'custom') {
            filters.start_date = startDate;
            filters.end_date = endDate;
        }

        listMyDeskExpenses(filters)
            .then((data) => {
                if (!mounted) return;
                setExpenses(Array.isArray(data) ? data : []);
            })
            .catch(() => { });

        return () => {
            mounted = false;
        };
    }, [timeline, startDate, endDate, sortBy, sortOrder]);

    const totalSpent = expenses
        .filter((item) => (item.transaction_type || 'expense') === 'expense')
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const totalReceived = expenses
        .filter((item) => (item.transaction_type || 'expense') === 'income')
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const netTotal = totalReceived - totalSpent;

    const sendToHrEligibleIds = expenses
        .filter((item) => {
            const status = String(item?.status || 'Draft').trim();
            return status === 'Draft' || status === 'Rejected';
        })
        .map((item) => Number(item.id));

    const formatSignedAmount = (item) => {
        if (!canViewAmounts) return "₹ ****";
        const amount = Number(item.amount || 0).toLocaleString();
        return (item.transaction_type || 'expense') === 'income' ? `+₹${amount}` : `-₹${amount}`;
    };

    const buildExpenseLabel = (item) => {
        const notes = (item.notes || '').trim();
        const customPrefix = 'custom_category:';
        if (notes.startsWith(customPrefix)) {
            const [customLine] = notes.split('\n');
            const customValue = customLine.slice(customPrefix.length).trim();
            if (customValue) return customValue;
        }
        return item.category;
    };

    const buildNotesText = (item) => {
        const notes = (item.notes || '').trim();
        const lines = notes
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line && !line.startsWith('custom_category:'));

        if (lines.length === 0) return 'No notes';

        return lines
            .map((line) => {
                if (line.startsWith('transaction:')) return line.replace('transaction:', '').trim();
                if (line.startsWith('note:')) return line.replace('note:', '').trim();
                return line;
            })
            .join(' • ');
    };

    const addExpense = async () => {
        if (!form.amount) return;
        const payload = new FormData();
        payload.append('transaction_type', form.transactionType);
        payload.append('category', form.category === 'misc' ? 'misc' : form.category);
        payload.append('amount', String(form.amount));
        payload.append('spent_on', form.date);
        const notesParts = [];
        if (form.category === 'misc' && form.customCategory.trim()) {
            notesParts.push(`custom_category:${form.customCategory.trim()}`);
        }
        if (form.notes.trim()) {
            notesParts.push(form.notes.trim());
        }
        payload.append('notes', notesParts.join('\n'));
        if (form.receipt) payload.append('receipt', form.receipt);

        try {
            if (editingExpenseId) {
                const updated = await updateMyDeskExpense(editingExpenseId, payload);
                setExpenses((prev) => prev.map((item) => (item.id === editingExpenseId ? updated : item)));
            } else {
                const created = await createMyDeskExpense(payload);
                setExpenses((previous) => [created, ...previous]);
            }
        } catch {
            return;
        }

        resetForm();
    };

    const handleEdit = (item) => {
        const parsed = parseNotesAndCustomCategory(item.notes);
        setForm({
            transactionType: item.transaction_type || 'expense',
            category: item.category || 'misc',
            customCategory: parsed.customCategory,
            amount: String(item.amount || ''),
            date: item.spent_on || new Date().toISOString().slice(0, 10),
            notes: parsed.notes,
            receipt: null,
        });
        setEditingExpenseId(item.id);
    };

    useEffect(() => {
        const params = searchParams;
        const expenseId = (params.get('expenseId') || '').trim();
        if (!expenseId) return;

        if (timeline !== 'all') {
            setTimeline('all');
            return;
        }

        if (handledDeepLinkRef.current === expenseId) return;
        const target = expenses.find((item) => String(item.id) === String(expenseId));
        if (!target) return;

        handledDeepLinkRef.current = expenseId;
        handleEdit(target);
        setHighlightExpenseId(target.id);

        window.setTimeout(() => {
            expenseRowRefs.current[target.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 120);
        window.setTimeout(() => setHighlightExpenseId(null), 5000);
    }, [searchParams, expenses, timeline]);

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this entry?')) return;
        try {
            await deleteMyDeskExpense(id);
            setExpenses((prev) => prev.filter((item) => item.id !== id));
            if (editingExpenseId === id) resetForm();
        } catch {
            // swallow
        }
    };

    const handleViewReceipt = (item) => {
        const receiptUrl = String(item?.receipt_url || '').trim();
        if (!receiptUrl) return;
        window.open(receiptUrl, '_blank', 'noopener,noreferrer');
    };

    const handleSendToHr = async () => {
        if (sendingToHr || sendToHrEligibleIds.length === 0) return;

        setSendingToHr(true);
        try {
            const response = await sendMyDeskExpensesToHr({ expense_ids: sendToHrEligibleIds });
            const updatedIdSet = new Set(
                Array.isArray(response?.updated_ids)
                    ? response.updated_ids.map((value) => Number(value))
                    : []
            );

            setExpenses((previous) => previous.map((item) => {
                if (updatedIdSet.size > 0) {
                    return updatedIdSet.has(Number(item.id))
                        ? { ...item, status: 'Submitted' }
                        : item;
                }

                const currentStatus = String(item?.status || 'Draft').trim();
                if (currentStatus === 'Draft' || currentStatus === 'Rejected') {
                    return { ...item, status: 'Submitted' };
                }
                return item;
            }));
        } catch {
            // handled by shared mutation layer
        } finally {
            setSendingToHr(false);
        }
    };

    const exportCSV = () => {
        const header = 'Type,Category,Amount,Date,Notes,Receipt\n';
        const rows = expenses.map((item) => `${item.transaction_type || 'expense'},${buildExpenseLabel(item)},${item.amount},${item.spent_on},${buildNotesText(item)},${item.receipt_url || ''}`).join('\n');
        const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'expenses.csv';
        link.click();
        URL.revokeObjectURL(url);
    };

    const escapeHtml = (value) => String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const exportTransactionsPdf = () => {
        const rows = expenses.map((item, index) => {
            const type = escapeHtml((item.transaction_type || 'expense') === 'income' ? 'Received' : 'Spent');
            const category = escapeHtml(buildExpenseLabel(item));
            const amount = escapeHtml(Number(item.amount || 0).toLocaleString());
            const date = escapeHtml(item.spent_on || '-');
            const notes = escapeHtml(buildNotesText(item));
            const receipt = escapeHtml(item.receipt_url ? item.receipt_url.split('/').pop() : 'No receipt');

            return `
                <tr>
                    <td>${index + 1}</td>
                    <td>${type}</td>
                    <td>${category}</td>
                    <td>₹${amount}</td>
                    <td>${date}</td>
                    <td>${notes}</td>
                    <td>${receipt}</td>
                </tr>
            `;
        }).join('');

        const html = `
            <html>
                <head>
                    <title>Transactions Sheet</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 24px; color: #111; }
                        h1 { margin: 0 0 6px; font-size: 20px; }
                        .meta { margin: 0 0 16px; font-size: 12px; color: #444; }
                        table { width: 100%; border-collapse: collapse; font-size: 12px; }
                        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; vertical-align: top; }
                        th { background: #f4f4f4; font-weight: 700; }
                        .summary { margin-bottom: 12px; font-size: 13px; font-weight: 700; }
                        @page { size: A4 portrait; margin: 12mm; }
                    </style>
                </head>
                <body>
                    <h1>Transactions Sheet</h1>
                    <p class="meta">Generated on ${escapeHtml(new Date().toLocaleString())}</p>
                    <div class="summary">Spent: ₹${escapeHtml(totalSpent.toLocaleString())} • Received: ₹${escapeHtml(totalReceived.toLocaleString())} • Net: ₹${escapeHtml(netTotal.toLocaleString())}</div>
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Type</th>
                                <th>Category</th>
                                <th>Amount</th>
                                <th>Date</th>
                                <th>Notes</th>
                                <th>Receipt</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows || '<tr><td colspan="7">No transactions found</td></tr>'}
                        </tbody>
                    </table>
                </body>
            </html>
        `;

        const printWindow = window.open('', '_blank', 'width=900,height=700');
        if (!printWindow) return;

        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    };

    return (
        <Stack spacing={1}>
            <Paper variant="outlined" sx={{ borderRadius: 2 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, px: 2.5, py: 1 }} spacing={1}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>New Entry</Typography>
                    <Stack direction="row" spacing={1}>
                        <Button size="small" variant={form.transactionType === 'expense' ? 'contained' : 'outlined'} onClick={() => setForm({ ...form, transactionType: 'expense' })}>↑ Spent</Button>
                        <Button size="small" variant={form.transactionType === 'income' ? 'contained' : 'outlined'} onClick={() => setForm({ ...form, transactionType: 'income' })}>↓ Received</Button>
                    </Stack>
                </Stack>
                <Stack sx={{ py: 2, px: 2.5 }} spacing={1.25}>
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
                        <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 170 } }}>
                            <InputLabel>Category</InputLabel>
                            <Select label="Category" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
                                <MenuItem value="travel">Travel</MenuItem>
                                <MenuItem value="food">Food</MenuItem>
                                <MenuItem value="equipment">Equipment</MenuItem>
                                <MenuItem value="misc">Misc</MenuItem>
                            </Select>
                        </FormControl>


                        <TextField
                            size="small"
                            label="Amount"
                            value={form.amount}
                            onChange={(event) => setForm({ ...form, amount: event.target.value })}
                            sx={{ minWidth: { xs: '100%', sm: 150 } }}
                        />
                        <TextField
                            size="small"
                            label="Notes"
                            value={form.notes}
                            onChange={(event) => setForm({ ...form, notes: event.target.value })}
                            sx={{ flex: 1, minWidth: { xs: '100%', sm: 150 } }}
                        />
                        <TextField
                            type="date"
                            size="small"
                            label="Date"
                            slotProps={{ inputLabel: { shrink: true } }}
                            value={form.date}
                            onChange={(event) => setForm({ ...form, date: event.target.value })}
                            sx={{ width: 160, flexShrink: 0, minWidth: { xs: '100%', sm: 160 } }}
                        />
                        <Button component="label" variant="outlined" startIcon={<FileUploadIcon />}>Receipt
                            <input hidden type="file" accept="image/*,.pdf" onChange={(event) => setForm({ ...form, receipt: event.target.files?.[0] || null })} />
                        </Button>
                        <Button variant="contained" onClick={addExpense} sx={{ minWidth: 130 }}>
                            {editingExpenseId ? 'Save Changes' : 'Add Entry'}
                        </Button>
                        {editingExpenseId && (
                            <Button variant="text" onClick={resetForm}>
                                Cancel
                            </Button>
                        )}
                    </Stack>
                </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ borderRadius: 2 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, px: 2.5, py: 2 }} spacing={1}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        <Box component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>
                            Spent <Box component="span" sx={{ color: 'error.main', fontWeight: 700 }}>{canViewAmounts ? `₹${totalSpent.toLocaleString()}` : "₹ ****"}</Box>
                        </Box>
                        <Box component="span" sx={{ color: 'text.secondary', mx: 1 }}>•</Box>
                        <Box component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>
                            Received <Box component="span" sx={{ color: 'success.main', fontWeight: 700 }}>{canViewAmounts ? `₹${totalReceived.toLocaleString()}` : "₹ ****"}</Box>
                        </Box>
                        <Box component="span" sx={{ color: 'text.secondary', mx: 1 }}>•</Box>
                        <Box component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>
                            Net <Box component="span" sx={{ color: 'info.main', fontWeight: 700 }}>{canViewAmounts ? `₹${netTotal.toLocaleString()}` : "₹ ****"}</Box>
                        </Box>
                    </Typography>
                    <Stack direction="row" spacing={1}>
                        <Tooltip title={sendToHrEligibleIds.length === 0 ? 'No draft entries pending submission.' : ''}>
                            <span>
                                <Button
                                    variant="contained"
                                    startIcon={<SendIcon />}
                                    onClick={handleSendToHr}
                                    disabled={sendingToHr || sendToHrEligibleIds.length === 0}
                                >
                                    {sendingToHr ? 'Sending...' : 'Send To HR'}
                                </Button>
                            </span>
                        </Tooltip>
                        <Tooltip title={!canExport ? "Permission Required" : ""}>
                            <span>
                                <Button
                                    variant="outlined"
                                    startIcon={<DownloadIcon />}
                                    onClick={exportTransactionsPdf}
                                    disabled={!canExport}
                                >
                                    Export PDF
                                </Button>
                            </span>
                        </Tooltip>
                    </Stack>
                </Stack>
                <Divider />

                <Stack sx={{ p: 2.5, overflowX: 'auto' }} spacing={1.25}>
                    <Stack direction="row" spacing={1} sx={{ minWidth: 'max-content', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                            <FormControl size="small" sx={{ minWidth: 130 }}>
                                <InputLabel>Timeline</InputLabel>
                                <Select label="Timeline" value={timeline} onChange={(event) => setTimeline(event.target.value)}>
                                    <MenuItem value="all">All</MenuItem>
                                    <MenuItem value="today">Today</MenuItem>
                                    <MenuItem value="7d">Last 7 Days</MenuItem>
                                    <MenuItem value="30d">Last 30 Days</MenuItem>
                                    <MenuItem value="this_month">This Month</MenuItem>
                                    <MenuItem value="last_month">Last Month</MenuItem>
                                    <MenuItem value="custom">Custom Range</MenuItem>
                                </Select>
                            </FormControl>

                            {timeline === 'custom' && (
                                <>
                                    <TextField
                                        type="date"
                                        size="small"
                                        label="From"
                                        slotProps={{ inputLabel: { shrink: true } }}
                                        value={startDate}
                                        onChange={(event) => setStartDate(event.target.value)}
                                    />
                                    <TextField
                                        type="date"
                                        size="small"
                                        label="To"
                                        slotProps={{ inputLabel: { shrink: true } }}
                                        value={endDate}
                                        onChange={(event) => setEndDate(event.target.value)}
                                    />
                                </>
                            )}

                            <FormControl size="small" sx={{ minWidth: 120 }}>
                                <InputLabel>Sort By</InputLabel>
                                <Select label="Sort By" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                                    <MenuItem value="spent_on">Date</MenuItem>
                                    <MenuItem value="amount">Amount</MenuItem>
                                    <MenuItem value="created_at">Created</MenuItem>
                                    <MenuItem value="category">Category</MenuItem>
                                    <MenuItem value="transaction_type">Type</MenuItem>
                                </Select>
                            </FormControl>

                            <FormControl size="small" sx={{ minWidth: 130 }}>
                                <InputLabel>Order</InputLabel>
                                <Select label="Order" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
                                    <MenuItem value="desc">Descending</MenuItem>
                                    <MenuItem value="asc">Ascending</MenuItem>
                                </Select>
                            </FormControl>
                        </Stack>

                        <Typography variant="body2" color="text.secondary">{expenses.length} entries</Typography>
                    </Stack>

                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Type</TableCell>
                                    <TableCell>Category</TableCell>
                                    <TableCell>Amount</TableCell>
                                    <TableCell>Date</TableCell>
                                    <TableCell>Notes</TableCell>
                                    <TableCell >Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {expenses.map((item) => (
                                    <TableRow
                                        key={item.id}
                                        ref={(element) => {
                                            if (element) expenseRowRefs.current[item.id] = element;
                                            else delete expenseRowRefs.current[item.id];
                                        }}
                                        hover
                                        sx={{
                                            bgcolor: highlightExpenseId === item.id ? 'rgba(25,118,210,0.08)' : 'transparent',
                                            transition: 'background-color 0.2s ease',
                                        }}
                                    >
                                        <TableCell>
                                            <Chip
                                                size="small"
                                                label={(item.transaction_type || 'expense') === 'income' ? '↓ Received' : '↑ Spent'}
                                                color={(item.transaction_type || 'expense') === 'income' ? 'success' : 'error'}
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell>{buildExpenseLabel(item)}</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: (item.transaction_type || 'expense') === 'income' ? 'success.main' : 'error.main' }}>
                                            {formatSignedAmount(item)}
                                        </TableCell>
                                        <TableCell>{item.spent_on}</TableCell>
                                        <TableCell>{buildNotesText(item)}</TableCell>
                                        <TableCell>
                                            <Tooltip title={item?.receipt_url ? 'View receipt' : 'No receipt uploaded'}>
                                                <span>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleViewReceipt(item)}
                                                        disabled={!item?.receipt_url}
                                                    >
                                                        <VisibilityIcon fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                            <IconButton size="small" onClick={() => handleEdit(item)}>
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton size="small" onClick={() => handleDelete(item.id)}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {expenses.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6}>
                                            <Typography variant="body2" color="text.secondary">No entries yet.</Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>

                </Stack>
            </Paper>
        </Stack>
    );
}
