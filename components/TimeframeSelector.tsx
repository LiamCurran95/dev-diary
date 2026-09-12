"use client";

import { GRANULARITIES, type Granularity } from "@/lib/types";

export function TimeframeSelector(props: {
  value: Granularity;
  onChange: (v: Granularity) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {GRANULARITIES.map((g) => {
        const active = g.value === props.value;
        return (
          <button
            key={g.value}
            className="btn-ghost"
            disabled={props.disabled}
            onClick={() => props.onChange(g.value)}
            style={
              active
                ? { background: "var(--accent-soft)", borderColor: "var(--accent)", color: "var(--accent)" }
                : undefined
            }
          >
            {g.label}
          </button>
        );
      })}
    </div>
  );
}
