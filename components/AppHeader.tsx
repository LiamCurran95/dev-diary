"use client";

import { Header, HeaderName } from "@carbon/react";

export function AppHeader() {
  return (
    <Header aria-label="Dev Diary">
      <HeaderName href="/" prefix="">
        Dev Diary
      </HeaderName>
    </Header>
  );
}
