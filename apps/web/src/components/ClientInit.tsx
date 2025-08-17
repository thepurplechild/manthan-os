"use client";

import { useEffect } from "react";
import { initPH } from "../../src/lib/posthog";

export default function ClientInit() {
  useEffect(() => {
    initPH();
  }, []);
  return null;
}
