import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function stripApiOriginSuffix(s: string): string {
  let out = s.trim().replace(/\/+$/, '')
  for (let i = 0; i < 4; i++) {
    const before = out
    if (out.endsWith('/api/v1')) out = out.slice(0, -7).replace(/\/+$/, '')
    else if (out.endsWith('/api')) out = out.slice(0, -4).replace(/\/+$/, '')
    if (out === before) break
  }
  return out
}

/** Prefer server-only `API_PROXY_TARGET` so the backend URL is not build-inlined. */
function getBackendOrigin(): string | null {
  const raw =
    process.env.API_PROXY_TARGET ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    (process.env.NODE_ENV !== 'production' ? 'http://127.0.0.1:3001' : '')
  const o = stripApiOriginSuffix(raw)
  return o || null
}

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
])

function buildUpstreamHeaders(req: NextRequest): Headers {
  const out = new Headers()
  req.headers.forEach((value, key) => {
    if (HOP_BY_HOP.has(key.toLowerCase())) return
    out.set(key, value)
  })
  return out
}

async function proxy(req: NextRequest, pathSegments: string[]): Promise<NextResponse> {
  const origin = getBackendOrigin()
  if (!origin) {
    return NextResponse.json(
      {
        error: 'API_NOT_CONFIGURED',
        message: 'Set NEXT_PUBLIC_API_URL (or API_PROXY_TARGET) to the unified API origin.',
      },
      { status: 502 }
    )
  }

  const sub = pathSegments.length ? pathSegments.join('/') : ''
  const target = `${origin}/api/v1/${sub}${req.nextUrl.search}`

  const hasBody = !['GET', 'HEAD', 'OPTIONS'].includes(req.method)
  const res = await fetch(target, {
    method: req.method,
    headers: buildUpstreamHeaders(req),
    body: hasBody ? await req.arrayBuffer() : undefined,
  })

  const headers = new Headers(res.headers)
  headers.delete('transfer-encoding')
  return new NextResponse(res.body, { status: res.status, statusText: res.statusText, headers })
}

type RouteParams = { params: { path?: string[] } }

export async function GET(req: NextRequest, { params }: RouteParams) {
  return proxy(req, params.path ?? [])
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  return proxy(req, params.path ?? [])
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  return proxy(req, params.path ?? [])
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  return proxy(req, params.path ?? [])
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  return proxy(req, params.path ?? [])
}

export async function OPTIONS(req: NextRequest, { params }: RouteParams) {
  return proxy(req, params.path ?? [])
}
