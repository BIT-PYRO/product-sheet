import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { success: false, message: 'Email OTP login has been disabled. Please use Username & Password or Google Sign-In.' },
    { status: 410 }
  );
}
