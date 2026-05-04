'use client';
import React from 'react';
import { Box } from '@mui/material';
import TeamChat from '../../taskmanager/TeamChat';
import { useSearchParams } from 'next/navigation';

export default function MyChatsSection() {
    const searchParams = useSearchParams();
    const params = searchParams;
    const focusMessageId = (params.get('messageId') || '').trim();
    const focusWithUserId = (params.get('withUserId') || '').trim();

    return (
        <Box sx={{ height: '100%', minHeight: 0 }}>
            <TeamChat
                isOpen
                onClose={() => { }}
                embedded
                title="My Chats"
                showCloseButton={false}
                focusMessageId={focusMessageId}
                focusWithUserId={focusWithUserId}
            />
        </Box>
    );
}
