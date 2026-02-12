import { NextResponse } from 'next/server';

// Server-side proxy for Todoist API calls
// Todoist doesn't allow browser CORS, so we proxy through our Next.js server
export async function POST(request) {
  try {
    const { endpoint, method, headers: clientHeaders, body, apiKey } = await request.json();
    
    if (!endpoint || !apiKey) {
      return NextResponse.json({ error: 'Missing endpoint or apiKey' }, { status: 400 });
    }

    // Build the full Todoist URL
    const url = endpoint.startsWith('http') ? endpoint : `https://api.todoist.com${endpoint}`;
    
    // Only allow todoist.com domains
    if (!url.includes('api.todoist.com')) {
      return NextResponse.json({ error: 'Invalid endpoint' }, { status: 400 });
    }

    const fetchOptions = {
      method: method || 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        ...(clientHeaders || {}),
      },
    };

    // Add body for non-GET requests
    if (body && method !== 'GET') {
      if (typeof body === 'string') {
        fetchOptions.body = body;
      } else {
        fetchOptions.body = JSON.stringify(body);
        if (!fetchOptions.headers['Content-Type']) {
          fetchOptions.headers['Content-Type'] = 'application/json';
        }
      }
    }

    const res = await fetch(url, fetchOptions);
    
    // Handle empty responses (204 No Content for close/delete)
    if (res.status === 204) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const contentType = res.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    } else {
      const text = await res.text();
      return NextResponse.json({ text, status: res.status }, { status: res.status });
    }
  } catch (e) {
    console.error('Todoist proxy error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
