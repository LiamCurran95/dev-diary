import { afterEach, describe, expect, it, vi } from "vitest";

import {
  TRUNCATION_NOTE,
  chatModels,
  complete,
  detectProvider,
  pickDefaultModel,
} from "../providers";

describe("detectProvider", () => {
  it("recognises Anthropic keys by their longer prefix", () => {
    expect(detectProvider("sk-ant-api03-abc123")).toBe("anthropic");
  });

  it("recognises OpenAI user, project and service-account keys", () => {
    expect(detectProvider("sk-abc123")).toBe("openai");
    expect(detectProvider("sk-proj-abc123")).toBe("openai");
    expect(detectProvider("sk-svcacct-abc123")).toBe("openai");
  });

  it("does not mistake an Anthropic key for an OpenAI one", () => {
    // Both start "sk-", so ordering of the checks is what makes this correct.
    expect(detectProvider("sk-ant-api03-abc")).not.toBe("openai");
  });

  it("tolerates surrounding whitespace from a paste", () => {
    expect(detectProvider("  sk-ant-abc  ")).toBe("anthropic");
  });

  it("returns null for anything unrecognised", () => {
    expect(detectProvider("")).toBeNull();
    expect(detectProvider("ghp_notanaikey")).toBeNull();
    expect(detectProvider("Bearer sk-abc")).toBeNull();
  });
});

describe("chatModels", () => {
  it("keeps text models from both providers", () => {
    const kept = chatModels(["gpt-4.1-mini", "claude-sonnet-4-5", "o3-mini"]);
    expect(kept).toContain("gpt-4.1-mini");
    expect(kept).toContain("claude-sonnet-4-5");
    expect(kept).toContain("o3-mini");
  });

  it("drops models this app cannot use", () => {
    const kept = chatModels([
      "text-embedding-3-small",
      "dall-e-3",
      "whisper-1",
      "gpt-4o-audio-preview",
      "gpt-image-1",
      "omni-moderation-latest",
    ]);
    expect(kept).toEqual([]);
  });

  it("sorts the result so the dropdown is stable", () => {
    expect(chatModels(["gpt-4o", "claude-haiku-4-5"])).toEqual(["claude-haiku-4-5", "gpt-4o"]);
  });

  it("puts the newest models first", () => {
    const kept = chatModels([
      { id: "gpt-4o", created: 1_000 },
      { id: "gpt-5", created: 3_000 },
      { id: "gpt-4.1", created: 2_000 },
    ]);
    expect(kept).toEqual(["gpt-5", "gpt-4.1", "gpt-4o"]);
  });

  it("drops legacy generations", () => {
    const kept = chatModels([
      "gpt-3.5-turbo",
      "gpt-4",
      "gpt-4-0613",
      "gpt-4-turbo",
      "o1-preview",
      "claude-2.1",
      "claude-3-5-sonnet-20241022",
      "gpt-4o",
      "gpt-4.1",
      "claude-sonnet-4-5-20250929",
    ]);
    expect(kept).toEqual(["claude-sonnet-4-5-20250929", "gpt-4.1", "gpt-4o"]);
  });

  it("drops codex models, which Chat Completions cannot serve", () => {
    expect(chatModels(["gpt-5.1-codex", "gpt-5.1-codex-mini", "gpt-5.2-codex", "gpt-5.2"])).toEqual([
      "gpt-5.2",
    ]);
  });

  it("drops dated snapshots only when their alias is listed", () => {
    const kept = chatModels(["gpt-4o", "gpt-4o-2024-08-06", "gpt-4o-mini-2024-07-18"]);
    expect(kept).toEqual(["gpt-4o", "gpt-4o-mini-2024-07-18"]);
  });
});

describe("pickDefaultModel", () => {
  it("prefers a current model over a deprecated one", () => {
    expect(pickDefaultModel("openai", ["gpt-4.1-mini", "gpt-4o-mini", "gpt-5.2"], "")).toBe(
      "gpt-5.2",
    );
    expect(pickDefaultModel("openai", ["gpt-5.2", "gpt-5.2-mini", "gpt-5-pro"], "")).toBe(
      "gpt-5.2-mini",
    );
  });

  it("falls back to a deprecated model when nothing newer is allowed", () => {
    expect(pickDefaultModel("openai", ["gpt-4.1", "gpt-4o-mini"], "")).toBe("gpt-4o-mini");
  });

  it("keeps the current model when the key can still use it", () => {
    expect(pickDefaultModel("openai", ["gpt-4o", "gpt-4.1"], "gpt-4o")).toBe("gpt-4o");
  });

  it("falls back to a cheap model when the current one is unavailable", () => {
    // The case that prompted this: a project with no access to the hardcoded default.
    expect(pickDefaultModel("openai", ["gpt-4o-mini", "gpt-4o"], "gpt-4.1-mini")).toBe(
      "gpt-4o-mini",
    );
  });

  it("prefers Haiku over Sonnet for Anthropic", () => {
    expect(
      pickDefaultModel("anthropic", ["claude-opus-4-1", "claude-sonnet-4-5", "claude-haiku-4-5"], ""),
    ).toBe("claude-haiku-4-5");
  });

  it("takes the first available when nothing is preferred", () => {
    expect(pickDefaultModel("openai", ["some-other-model"], "gpt-4.1-mini")).toBe(
      "some-other-model",
    );
  });

  it("returns empty when the key has no models at all", () => {
    expect(pickDefaultModel("openai", [], "gpt-4.1-mini")).toBe("");
  });
});

describe("complete", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function respondWith(body: unknown) {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(body)));
  }

  const args = { apiKey: "test", model: "m", system: "s", prompt: "p" };

  it("returns the text unchanged when the model finished normally", async () => {
    respondWith({ content: [{ type: "text", text: " Entry " }], stop_reason: "end_turn" });
    expect(await complete({ ...args, provider: "anthropic" })).toBe("Entry");
  });

  it("flags an Anthropic entry cut off at the token cap", async () => {
    respondWith({ content: [{ type: "text", text: "Entry" }], stop_reason: "max_tokens" });
    expect(await complete({ ...args, provider: "anthropic" })).toBe(`Entry\n\n${TRUNCATION_NOTE}`);
  });

  it("retries without temperature when a model only accepts the default", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json(
          { error: { message: "Unsupported value: 'temperature' does not support 0.3" } },
          { status: 400 },
        ),
      )
      .mockResolvedValueOnce(Response.json({ choices: [{ message: { content: "Entry" } }] }));
    vi.stubGlobal("fetch", fetchMock);

    expect(await complete({ ...args, provider: "openai" })).toBe("Entry");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toHaveProperty("temperature");
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).not.toHaveProperty("temperature");
  });

  it("does not retry other bad requests", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ error: { message: "Invalid model" } }, { status: 400 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(complete({ ...args, provider: "openai" })).rejects.toThrow("Invalid model");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("flags an OpenAI entry cut off at the length limit", async () => {
    respondWith({ choices: [{ message: { content: "Entry" }, finish_reason: "length" }] });
    expect(await complete({ ...args, provider: "openai" })).toBe(`Entry\n\n${TRUNCATION_NOTE}`);
  });
});
