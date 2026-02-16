import { describe, it, expect } from "vitest";
import { openClawToKalibr, kalibrToOpenClaw } from "./model-mapper.js";

describe("openClawToKalibr", () => {
  it("maps known Anthropic models", () => {
    expect(openClawToKalibr("anthropic/claude-opus-4-6")).toBe("claude-opus-4-6");
    expect(openClawToKalibr("anthropic/claude-sonnet-4-5")).toBe("claude-sonnet-4-5");
  });

  it("maps known OpenAI models", () => {
    expect(openClawToKalibr("openai/gpt-5.2")).toBe("gpt-5.2");
    expect(openClawToKalibr("openai/gpt-5.2-mini")).toBe("gpt-5.2-mini");
    expect(openClawToKalibr("openai/gpt-5.1-codex")).toBe("gpt-5.1-codex");
  });

  it("strips provider prefix for unknown models", () => {
    expect(openClawToKalibr("google/gemini-ultra")).toBe("gemini-ultra");
    expect(openClawToKalibr("mistral/mixtral-8x22b")).toBe("mixtral-8x22b");
  });

  it("handles models with multiple slashes by preserving everything after the first slash", () => {
    expect(openClawToKalibr("custom/org/model-name")).toBe("org/model-name");
  });

  it("returns as-is if no slash present", () => {
    expect(openClawToKalibr("standalone-model")).toBe("standalone-model");
  });

  it("returns as-is for empty string", () => {
    expect(openClawToKalibr("")).toBe("");
  });
});

describe("kalibrToOpenClaw", () => {
  it("maps known Kalibr model IDs back to OpenClaw refs", () => {
    expect(kalibrToOpenClaw("claude-opus-4-6")).toBe("anthropic/claude-opus-4-6");
    expect(kalibrToOpenClaw("claude-sonnet-4-5")).toBe("anthropic/claude-sonnet-4-5");
    expect(kalibrToOpenClaw("gpt-5.2")).toBe("openai/gpt-5.2");
    expect(kalibrToOpenClaw("gpt-5.2-mini")).toBe("openai/gpt-5.2-mini");
    expect(kalibrToOpenClaw("gpt-5.1-codex")).toBe("openai/gpt-5.1-codex");
  });

  it("returns as-is if model ID contains a slash (already in provider/model format)", () => {
    expect(kalibrToOpenClaw("google/gemini-ultra")).toBe("google/gemini-ultra");
  });

  it("returns null for unknown models without slash", () => {
    expect(kalibrToOpenClaw("unknown-model")).toBeNull();
    expect(kalibrToOpenClaw("")).toBeNull();
  });
});
