import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function POST(request) {
  const formData = await request.formData();
  const credential = formData.get('credential');
  const origin = new URL(request.url).origin;

  if (!credential) {
    return NextResponse.redirect(`${origin}/login?error=no_credential`, { status: 303 });
  }

  const redirectUrl = `${origin}/dashboard`;
  const response = NextResponse.redirect(redirectUrl, { status: 303 });

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

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: credential,
  });

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth`, { status: 303 });
  }

  return response;
}
