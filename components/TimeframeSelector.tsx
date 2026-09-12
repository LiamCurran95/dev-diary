"use client";

import { GRANULARITIES, type Granularity } from "@/lib/types";

export function TimeframeSelector(props: {
  value: Granularity;
  onChange: (v: Granularity) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Chunk by">
      {GRANULARITIES.map((g) => (
        <button
          key={g.value}
          className={`btn-ghost${g.value === props.value ? " chip" : ""}`}
          disabled={props.disabled}
          aria-pressed={g.value === props.value}
          onClick={() => props.onChange(g.value)}
        >
          {g.label}
        </button>
      ))}
    </div>
  );
}
