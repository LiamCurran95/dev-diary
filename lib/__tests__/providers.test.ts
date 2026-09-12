import { describe, expect, it } from "vitest";

import { chatModels, detectProvider, pickDefaultModel } from "../providers";

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
});

describe("pickDefaultModel", () => {
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
