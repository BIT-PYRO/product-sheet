/**
 * HR Section API Proxy — catch-all route for /api/hr/* → /api/hr/*
 * Handles all HR module API calls (attendance, payroll, leaves, expenses, tasks, meetings)
 */
import { NextResponse } from 'next/server';
import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

const METHODS_WITH_BODY = ['POST', 'PUT', 'PATCH'];

export async function GET(request, { params }) {
  const slug = (await params).slug || [];
  const url = new URL(request.url);
  const qs = url.search || '';
  const basePath = `/api/hr/${slug.join('/')}/`;
  const backendPath = qs ? `${basePath}${qs}` : basePath;
  return proxyAuthenticatedRequest(request, backendPath);
}

export async function POST(request, { params }) {
  const slug = (await params).slug || [];
  const contentType = request.headers.get('content-type') || '';
  
  if (contentType.includes('multipart/form-data')) {
    // Parse and rebuild FormData to avoid stream issues
    const incomingForm = await request.formData();
    const outgoingForm = new FormData();
    for (const [key, value] of incomingForm.entries()) {
      outgoingForm.append(key, value);
    }
    return proxyAuthenticatedRequest(request, `/api/hr/${slug.join('/')}/`, {
      method: 'POST',
      body: outgoingForm,
    });
  }

  const body = await request.text();
  return proxyAuthenticatedRequest(request, `/api/hr/${slug.join('/')}/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

export async function PUT(request, { params }) {
  const slug = (await params).slug || [];
  const contentType = request.headers.get('content-type') || '';
  
  if (contentType.includes('multipart/form-data')) {
    const incomingForm = await request.formData();
    const outgoingForm = new FormData();
    for (const [key, value] of incomingForm.entries()) {
      outgoingForm.append(key, value);
    }
    return proxyAuthenticatedRequest(request, `/api/hr/${slug.join('/')}/`, {
      method: 'PUT',
      body: outgoingForm,
    });
  }

  const body = await request.text();
  return proxyAuthenticatedRequest(request, `/api/hr/${slug.join('/')}/`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

export async function PATCH(request, { params }) {
  const slug = (await params).slug || [];
  const contentType = request.headers.get('content-type') || '';
  
  if (contentType.includes('multipart/form-data')) {
    const incomingForm = await request.formData();
    const outgoingForm = new FormData();
    for (const [key, value] of incomingForm.entries()) {
      outgoingForm.append(key, value);
    }
    return proxyAuthenticatedRequest(request, `/api/hr/${slug.join('/')}/`, {
      method: 'PATCH',
      body: outgoingForm,
    });
  }

  const body = await request.text();
  return proxyAuthenticatedRequest(request, `/api/hr/${slug.join('/')}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

export async function DELETE(request, { params }) {
  const slug = (await params).slug || [];
  return proxyAuthenticatedRequest(request, `/api/hr/${slug.join('/')}/`, {
    method: 'DELETE',
  });
}
