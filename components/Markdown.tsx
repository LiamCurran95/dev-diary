"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: (anchorProps) => <a {...anchorProps} target="_blank" rel="noreferrer" />,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
