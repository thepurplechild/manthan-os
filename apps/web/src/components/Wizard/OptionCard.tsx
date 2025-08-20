"use client";
import React from "react";

export default function OptionCard({
  title,
  value,
  onChange,
  onChoose,
  chosen,
}: {
  title: string;
  value: string;
  onChange: (v: string) => void;
  onChoose: () => void;
  chosen?: boolean;
}) {
  return (
    <div className="panel" style={{ padding: 16, position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
        <strong>{title}</strong>
        <button className="btn" onClick={onChoose} aria-pressed={chosen}>
          {chosen ? "Chosen ✓" : "Choose"}
        </button>
      </div>
      <textarea
        className="textarea"
        style={{ marginTop: 12, minHeight: 160 }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

