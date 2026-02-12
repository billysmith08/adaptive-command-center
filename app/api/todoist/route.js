import { NextResponse } from 'next/server';

// Health check — verifies route is deployed
export async function GET() {
  return NextResponse.json({ status: 'ok', route: '/api/todoist', method: 'GET', timestamp: new Date().toISOString() });
}

// Server-side proxy for Todoist API calls
// Todoist doesn't allow browser CORS, so we proxy through our Next.js server
export async function POST(request) {
  try {
    const body = await request.json();
    const { endpoint, method, headers: clientHeaders, body: reqBody, apiKey } = body;
    
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
    if (reqBody && method !== 'GET') {
      if (typeof reqBody === 'string') {
        fetchOptions.body = reqBody;
      } else {
        fetchOptions.body = JSON.stringify(reqBody);
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
