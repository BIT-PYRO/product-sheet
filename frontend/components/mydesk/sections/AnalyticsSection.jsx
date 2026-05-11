'use client';
import React, { useMemo, useState } from 'react';
import { Box, LinearProgress, Paper, Stack, Typography } from '@mui/material';

export default function AnalyticsSection() {
    const [productivity] = useState({ completed: 18, created: 22 });
    const heatmap = useMemo(
        () => Array.from({ length: 7 }, () => Array.from({ length: 8 }, () => Math.floor(Math.random() * 4))),
        []
    );

    const trend90 = [10, 12, 15, 14, 18, 21, 23, 25, 28];

    return (
        <Stack spacing={2}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3,1fr)' }, gap: 1.25 }}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Productivity Score</Typography>
                    <Typography variant="h5" sx={{ mt: 1 }}>{Math.round((productivity.completed / productivity.created) * 100)}%</Typography>
                    <Typography variant="caption" color="text.secondary">{productivity.completed} completed / {productivity.created} created</Typography>
                    <LinearProgress sx={{ mt: 1 }} value={(productivity.completed / productivity.created) * 100} variant="determinate" />
                </Paper>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Leave Utilization</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Taken: 6 • Balance: 12</Typography>
                    <LinearProgress sx={{ mt: 1 }} value={33} variant="determinate" />
                </Paper>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Expense Summary</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>₹42,200 spent this month</Typography>
                    <Typography variant="caption" color="text.secondary">Trend: +8% vs last month</Typography>
                </Paper>
            </Box>

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Time-on-task Heatmap</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 0.6 }}>
                    {heatmap.flatMap((row, rowIndex) => row.map((cell, colIndex) => (
                        <Box
                            key={`${rowIndex}-${colIndex}`}
                            sx={{
                                height: 20,
                                borderRadius: 0.75,
                                bgcolor: cell === 0 ? 'action.hover' : cell === 1 ? 'info.light' : cell === 2 ? 'info.main' : 'info.dark',
                            }}
                        />
                    )))}
                </Box>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Task Completion Trend (30/60/90 days)</Typography>
                <Stack direction="row" spacing={0.75} alignItems="flex-end" sx={{ mt: 1.5, minHeight: 140 }}>
                    {trend90.map((value, index) => (
                        <Box key={index} sx={{ flex: 1, textAlign: 'center' }}>
                            <Box sx={{ height: `${value * 3}px`, bgcolor: 'primary.main', borderRadius: 1 }} />
                            <Typography variant="caption" color="text.secondary">W{index + 1}</Typography>
                        </Box>
                    ))}
                </Stack>
                <Typography variant="caption" color="text.secondary">Notes activity: 14 notes this week</Typography>
            </Paper>
        </Stack>
    );
}
