"use client";

import { Header, HeaderGlobalBar, HeaderName } from "@carbon/react";

import { ThemeSwitcher } from "./ThemeSwitcher";

export function AppHeader() {
  return (
    <Header aria-label="Dev Diary">
      <HeaderName href="/" prefix="">
        Dev Diary
      </HeaderName>
      <HeaderGlobalBar>
        <ThemeSwitcher />
      </HeaderGlobalBar>
    </Header>
  );
}
