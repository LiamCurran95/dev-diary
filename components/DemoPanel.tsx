"use client";

import { Button, Tag, Tile } from "@carbon/react";

export function DemoPanel(props: { onExit: () => void }) {
  return (
    <Tile className="panel">
      <div className="row row--between">
        <div className="grow">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.5rem",
            }}
          >
            <p className="section-label" style={{ margin: 0 }}>
              Demo mode
            </p>
            <Tag type="purple">Sample data</Tag>
          </div>
          <p className="muted" style={{ fontSize: "0.875rem", lineHeight: 1.5, margin: 0 }}>
            Pull requests from a fictional team, with entries written in the browser by a stand-in
            for the model. No GitHub sign-in or API key is used, and nothing leaves this page.
          </p>
        </div>
        <Button kind="tertiary" onClick={props.onExit}>
          Exit demo
        </Button>
      </div>
    </Tile>
  );
}
