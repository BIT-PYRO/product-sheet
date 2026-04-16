import { NextResponse } from 'next/server';

const DEFAULT_BACKEND_URL = process.env.NODE_ENV === 'production' ? 'https://product-sheet.onrender.com' : 'http://127.0.0.1:8000';

function backendBaseUrl() {
  const url = (process.env.BACKEND_BASE_URL || DEFAULT_BACKEND_URL).replace(/\/$/, '');
  if (process.env.NODE_ENV !== 'production') {
    const normalized = String(url).toLowerCase();
    const isLocal = normalized.includes('127.0.0.1') || normalized.includes('localhost') || normalized.includes('0.0.0.0');
    if (!isLocal) {
      throw new Error(`Unsafe BACKEND_BASE_URL in development: ${url}. Use a local backend URL only.`);
    }
  }
  return url;
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
