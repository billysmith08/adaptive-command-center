import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  // Google sent an error instead of a code
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=google_${error}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  // Exchange authorization code for tokens with Google
  let tokens;
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: '441997407140-mj3cvi0pme8f3llhg52pq8uf5rmp3rpc.apps.googleusercontent.com',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: `${origin}/api/auth/google-one-tap`,
        grant_type: 'authorization_code',
      }),
    });
    tokens = await tokenRes.json();
  } catch (e) {
    return NextResponse.redirect(`${origin}/login?error=token_fetch_failed`);
  }

  if (!tokens.id_token) {
    const msg = tokens.error || 'no_id_token';
    return NextResponse.redirect(`${origin}/login?error=token_${msg}`);
  }

  // Use the ID token to sign in with Supabase
  const response = NextResponse.redirect(`${origin}/dashboard`, { status: 303 });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { error: supaError } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: tokens.id_token,
  });

  if (supaError) {
    return NextResponse.redirect(`${origin}/login?error=supabase_${encodeURIComponent(supaError.message)}`);
  }

  return response;
}
