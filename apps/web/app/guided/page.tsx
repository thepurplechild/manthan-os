// apps/web/app/guided/page.tsx
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { Suspense } from "react";
import GuidedClient from "./GuidedClient";

export default function GuidedPage() {
  return (
    <Suspense fallback={<div style={{ padding: 16, opacity: 0.7 }}>Loading…</div>}>
      <GuidedClient />
    </Suspense>
  );
}

