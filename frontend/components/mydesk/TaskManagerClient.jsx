'use client';
import dynamic from 'next/dynamic';

const TaskManager = dynamic(() => import('./TaskManager'), { ssr: false });

export default function TaskManagerClient() {
  return <TaskManager />;
}
