import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { password } = body;

  const appPassword = process.env.APP_PASSWORD;
  if (!appPassword) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  if (password !== appPassword) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set('cal_auth', '1', {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set('cal_auth', '', {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  return response;
}
