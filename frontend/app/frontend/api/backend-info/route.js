import { NextResponse } from 'next/server';

const DEFAULT_BACKEND_URL = 'https://product-sheet.onrender.com';

function backendBaseUrl() {
  return (process.env.BACKEND_BASE_URL || DEFAULT_BACKEND_URL).replace(/\/$/, '');
}

function backendMode(url) {
  const normalized = String(url || '').toLowerCase();
  if (
    normalized.includes('127.0.0.1') ||
    normalized.includes('localhost') ||
    normalized.includes('0.0.0.0')
  ) {
    return 'LOCAL';
  }
  return 'DEPLOYED';
}

export async function GET() {
  const url = backendBaseUrl();
  return NextResponse.json({
    success: true,
    backendUrl: url,
    backendMode: backendMode(url),
  });
}
