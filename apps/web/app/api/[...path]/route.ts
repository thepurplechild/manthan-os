// apps/web/app/api/proxy/[...path]/route.ts
import { NextRequest, NextResponse } from "next/server";

function joinUrl(base: string, path: string) {
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

async function forward(req: NextRequest, pathParts: string[]) {
  const base =
    process.env.API_BASE || process.env.NEXT_PUBLIC_API_BASE || "";
  if (!base) {
    return NextResponse.json(
      { error: "API_BASE not set on the server" },
      { status: 500 }
    );
  }

  const target = new URL(joinUrl(base, pathParts.join("/")));
  // append original query string
  const qs = req.nextUrl.search;
  if (qs) target.search = qs;

  const init: RequestInit = {
    method: req.method,
    headers: {
      // forward auth/content-type if present
      ...(req.headers.get("authorization")
        ? { authorization: req.headers.get("authorization") as string }
        : {}),
      ...(req.headers.get("content-type")
        ? { "content-type": req.headers.get("content-type") as string }
        : {}),
    },
    cache: "no-store",
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    const body = await req.arrayBuffer();
    init.body = body as any;
  }

  const r = await fetch(target.toString(), init);

  // stream the response back (avoid sending content-encoding from upstream)
  const headers = new Headers();
  r.headers.forEach((v, k) => {
    if (k.toLowerCase() !== "content-encoding") headers.set(k, v);
  });

  return new NextResponse(r.body, {
    status: r.status,
    headers,
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return forward(req, params.path || []);
}
export async function POST(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return forward(req, params.path || []);
}
export async function PUT(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return forward(req, params.path || []);
}
export async function PATCH(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return forward(req, params.path || []);
}
export async function DELETE(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return forward(req, params.path || []);
}
