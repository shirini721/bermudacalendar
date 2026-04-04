import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  const correct = process.env.APP_PASSWORD;

  if (!correct) {
    return NextResponse.json({ error: 'APP_PASSWORD not configured' }, { status: 500 });
  }

  if (password !== correct) {
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set('family_auth', '1', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    // 30 days
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete('family_auth');
  return response;
}
