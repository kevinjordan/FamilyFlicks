// api/claude.js — Vercel Serverless Function
// Proxies requests to the Anthropic Claude API.
// The CLAUDE_API_KEY env var lives only in Vercel's server environment.
// The client-side React app calls /api/claude — it never sees the key.

export const config = {
  runtime: 'edge',
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const apiKey = process.env.CLAUDE_API_KEY
  if (!apiKey) {
    return new Response('Claude API key not configured', { status: 500 })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON body', { status: 400 })
  }

  // Enforce model and token limits — client cannot override these
  const payload = {
    ...body,
    model: 'claude-sonnet-4-20250514',
    max_tokens: body.max_tokens ?? 2000,
  }

  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(payload),
  })

  // Stream the response back to the client as-is
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
