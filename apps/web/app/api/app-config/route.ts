// apps/web/app/api/app-config/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    API_BASE: process.env.NEXT_PUBLIC_API_BASE || "",
  });
}
