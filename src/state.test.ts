import { describe, it, expect, vi, beforeEach } from "vitest";
import { RunStateManager } from "./state.js";
import type { LlmInputRecord, LlmOutputRecord } from "./state.js";

function makeInput(overrides?: Partial<LlmInputRecord>): LlmInputRecord {
  return {
    runId: "run-1",
    provider: "anthropic",
    model: "anthropic/claude-sonnet-4-5",
    timestamp: Date.now(),
    ...overrides,
  };
}

function makeOutput(overrides?: Partial<LlmOutputRecord>): LlmOutputRecord {
  return {
    runId: "run-1",
    provider: "anthropic",
    model: "anthropic/claude-sonnet-4-5",
    inputTokens: 100,
    outputTokens: 50,
    cacheReadTokens: 10,
    cacheWriteTokens: 5,
    totalTokens: 150,
    timestamp: Date.now(),
    ...overrides,
  };
}

describe("RunStateManager", () => {
  let manager: RunStateManager;

  beforeEach(() => {
    manager = new RunStateManager();
  });

  describe("recordLlmInput", () => {
    it("creates a new run state on first input", () => {
      manager.recordLlmInput("session-1", makeInput());
      expect(manager.size).toBe(1);
    });

    it("appends to existing run state", () => {
      manager.recordLlmInput("session-1", makeInput({ runId: "run-1" }));
      manager.recordLlmInput("session-1", makeInput({ runId: "run-2" }));
      const data = manager.getAndClear("session-1");
      expect(data).not.toBeNull();
      expect(data!.inputs).toHaveLength(2);
    });

    it("generates a traceId (UUID format)", () => {
      manager.recordLlmInput("session-1", makeInput());
      const data = manager.getAndClear("session-1");
      expect(data!.traceId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    it("tracks separate sessions independently", () => {
      manager.recordLlmInput("session-1", makeInput({ provider: "anthropic" }));
      manager.recordLlmInput("session-2", makeInput({ provider: "openai" }));
      expect(manager.size).toBe(2);

      const data1 = manager.getAndClear("session-1");
      const data2 = manager.getAndClear("session-2");
      expect(data1!.primaryProvider).toBe("anthropic");
      expect(data2!.primaryProvider).toBe("openai");
    });
  });

  describe("recordLlmOutput", () => {
    it("creates a new run state if no input was recorded first", () => {
      manager.recordLlmOutput("session-1", makeOutput());
      expect(manager.size).toBe(1);
    });

    it("appends outputs to existing run state", () => {
      manager.recordLlmInput("session-1", makeInput());
      manager.recordLlmOutput("session-1", makeOutput());
      manager.recordLlmOutput("session-1", makeOutput());
      const data = manager.getAndClear("session-1");
      expect(data!.outputs).toHaveLength(2);
    });
  });

  describe("getAndClear", () => {
    it("returns null for unknown session", () => {
      expect(manager.getAndClear("nonexistent")).toBeNull();
    });

    it("removes the session after retrieval", () => {
      manager.recordLlmInput("session-1", makeInput());
      manager.getAndClear("session-1");
      expect(manager.size).toBe(0);
      expect(manager.getAndClear("session-1")).toBeNull();
    });

    it("aggregates token counts from multiple outputs", () => {
      manager.recordLlmInput("session-1", makeInput());
      manager.recordLlmOutput("session-1", makeOutput({
        inputTokens: 100,
        outputTokens: 50,
        cacheReadTokens: 10,
        cacheWriteTokens: 5,
        totalTokens: 150,
      }));
      manager.recordLlmOutput("session-1", makeOutput({
        inputTokens: 200,
        outputTokens: 100,
        cacheReadTokens: 20,
        cacheWriteTokens: 10,
        totalTokens: 300,
      }));

      const data = manager.getAndClear("session-1")!;
      expect(data.llmCallCount).toBe(2);
      expect(data.totalInputTokens).toBe(300);
      expect(data.totalOutputTokens).toBe(150);
      expect(data.totalCacheReadTokens).toBe(30);
      expect(data.totalCacheWriteTokens).toBe(15);
      expect(data.totalTokens).toBe(450);
    });

    it("returns primaryModel and primaryProvider from first input", () => {
      manager.recordLlmInput("session-1", makeInput({
        model: "anthropic/claude-sonnet-4-5",
        provider: "anthropic",
      }));
      manager.recordLlmInput("session-1", makeInput({
        model: "openai/gpt-5.2",
        provider: "openai",
      }));

      const data = manager.getAndClear("session-1")!;
      expect(data.primaryModel).toBe("anthropic/claude-sonnet-4-5");
      expect(data.primaryProvider).toBe("anthropic");
    });

    it("returns undefined for primaryModel/primaryProvider if no inputs recorded", () => {
      manager.recordLlmOutput("session-1", makeOutput());
      const data = manager.getAndClear("session-1")!;
      expect(data.primaryModel).toBeUndefined();
      expect(data.primaryProvider).toBeUndefined();
    });

    it("returns zero aggregates when no outputs recorded", () => {
      manager.recordLlmInput("session-1", makeInput());
      const data = manager.getAndClear("session-1")!;
      expect(data.llmCallCount).toBe(0);
      expect(data.totalInputTokens).toBe(0);
      expect(data.totalOutputTokens).toBe(0);
      expect(data.totalTokens).toBe(0);
      expect(data.totalCacheReadTokens).toBe(0);
      expect(data.totalCacheWriteTokens).toBe(0);
    });
  });

  describe("stale eviction", () => {
    it("evicts runs older than TTL on next recordLlmInput call", () => {
      // Record a run with a very old timestamp
      manager.recordLlmInput("old-session", makeInput({
        timestamp: Date.now() - 11 * 60 * 1000, // 11 min ago
      }));
      expect(manager.size).toBe(1);

      // Trigger eviction via new recordLlmInput
      manager.recordLlmInput("new-session", makeInput());
      expect(manager.size).toBe(1); // old evicted, new added
      expect(manager.getAndClear("old-session")).toBeNull();
    });
  });
});
