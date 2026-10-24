"use client";

import { ContentSwitcher, Switch } from "@carbon/react";

import { GRANULARITIES, type Granularity } from "@/lib/types";

export function TimeframeSelector(props: {
  value: Granularity;
  onChange: (v: Granularity) => void;
  disabled: boolean;
}) {
  const selectedIndex = GRANULARITIES.findIndex((g) => g.value === props.value);

  return (
    <ContentSwitcher
      selectedIndex={selectedIndex < 0 ? 0 : selectedIndex}
      onChange={({ index }) => {
        if (typeof index === "number" && GRANULARITIES[index]) {
          props.onChange(GRANULARITIES[index].value);
        }
      }}
    >
      {GRANULARITIES.map((g) => (
        <Switch key={g.value} name={g.value} text={g.label} disabled={props.disabled} />
      ))}
    </ContentSwitcher>
  );
}
