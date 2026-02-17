import { randomUUID } from "crypto";
import { RunStateManager } from "./src/state.js";
import { openClawToKalibr, kalibrToOpenClaw } from "./src/model-mapper.js";

// ── Plugin config shape ────────────────────────────────────

export interface KalibrConfig {
  apiKey: string;
  tenantId?: string;
  apiUrl?: string;
  defaultGoal?: string;
  enabled?: boolean;
  captureOutcomes?: boolean;
  captureLlmTelemetry?: boolean;
  enableRouting?: boolean;
}

// ── Minimal OpenClaw plugin SDK types ──────────────────────
// These mirror the shapes from "openclaw/plugin-sdk" so the plugin
// can be compiled without depending on the full OpenClaw codebase.

interface PluginLogger {
  info?(...args: unknown[]): void;
  warn?(...args: unknown[]): void;
  error?(...args: unknown[]): void;
  debug?(...args: unknown[]): void;
}

interface PluginHookAgentContext {
  agentId?: string;
  sessionKey?: string;
  sessionId?: string;
  workspaceDir?: string;
  messageProvider?: string;
}

interface PluginHookLlmInputEvent {
  runId: string;
  sessionId: string;
  provider: string;
  model: string;
  systemPrompt?: string;
  prompt: string;
  historyMessages: unknown[];
  imagesCount: number;
}

interface PluginHookLlmOutputEvent {
  runId: string;
  sessionId: string;
  provider: string;
  model: string;
  assistantTexts: string[];
  lastAssistant?: unknown;
  usage?: {
    input?: number;
    output?: number;
    cacheRead?: number;
    cacheWrite?: number;
    total?: number;
  };
}

interface PluginHookAgentEndEvent {
  messages: unknown[];
  success: boolean;
  error?: string;
  durationMs?: number;
}

interface CommandHandlerResult {
  text: string;
}

interface CommandContext {
  sessionKey?: string;
}

interface GatewayMethodContext {
  respond(success: boolean, data: unknown): void;
}

interface CliContext {
  program: {
    command(name: string): {
      description(desc: string): { action(fn: () => void): void };
      action(fn: () => void): void;
    };
  };
}

type HookHandler = (event: unknown, ctx?: PluginHookAgentContext) => unknown | Promise<unknown>;

interface OpenClawPluginApi {
  pluginConfig: unknown;
  logger?: PluginLogger;
  on(
    hookName: string,
    handler: HookHandler,
    opts?: { priority?: number },
  ): void;
  registerCommand(opts: {
    name: string;
    description: string;
    handler: (ctx: CommandContext) => CommandHandlerResult;
  }): void;
  registerGatewayMethod(
    name: string,
    handler: (ctx: GatewayMethodContext) => void,
  ): void;
  registerCli(
    fn: (ctx: CliContext) => void,
    opts?: { commands: string[] },
  ): void;
}

// ── Kalibr SDK shim types ──────────────────────────────────
// At runtime these come from @kalibr/sdk; declared here for compilation.

interface KalibrIntelligenceStatic {
  init(opts: { apiKey: string; tenantId?: string; baseUrl?: string }): void;
}

interface ReportOutcomeOptions {
  score?: number;
  failureReason?: string;
  metadata?: Record<string, unknown>;
  toolId?: string;
  executionParams?: Record<string, unknown>;
  modelId?: string;
}

interface OutcomeResponse {
  success: boolean;
  outcome_id?: string;
  message?: string;
}

type ReportOutcomeFn = (
  traceId: string,
  goal: string,
  success: boolean,
  options?: ReportOutcomeOptions,
) => Promise<OutcomeResponse>;

interface DecideResponse {
  model_id: string;
  confidence: number;
  exploration: boolean;
  success_rate: number;
}

type DecideFn = (goal: string, options?: { taskRiskLevel?: string }) => Promise<DecideResponse>;

// ── Dynamic imports resolved at runtime ────────────────────

let _kalibrIntelligence: KalibrIntelligenceStatic | undefined;
let _reportOutcome: ReportOutcomeFn | undefined;
let _decide: DecideFn | undefined;

async function loadKalibrSdk(): Promise<{
  KalibrIntelligence: KalibrIntelligenceStatic;
  reportOutcome: ReportOutcomeFn;
}> {
  if (_kalibrIntelligence && _reportOutcome) {
    return { KalibrIntelligence: _kalibrIntelligence, reportOutcome: _reportOutcome };
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sdk = await import("@kalibr/sdk");
  _kalibrIntelligence = sdk.KalibrIntelligence;
  _reportOutcome = sdk.reportOutcome;
  return { KalibrIntelligence: _kalibrIntelligence!, reportOutcome: _reportOutcome! };
}

// ── Provider inference ─────────────────────────────────────

function inferProvider(modelId: string): string | null {
  if (modelId.startsWith("claude")) return "anthropic";
  if (modelId.startsWith("gpt")) return "openai";
  if (modelId.startsWith("gemini")) return "google";
  if (modelId.startsWith("mistral") || modelId.startsWith("codestral")) return "mistral";
  if (modelId.startsWith("llama")) return "meta";
  if (modelId.startsWith("command")) return "cohere";
  if (modelId.startsWith("deepseek")) return "deepseek";
  return null;
}

// ── Plugin ─────────────────────────────────────────────────

const plugin = {
  id: "kalibr" as const,
  name: "Kalibr Intelligence" as const,
  configSchema: {},

  register(api: OpenClawPluginApi) {
    const cfg = api.pluginConfig as KalibrConfig;
    if (cfg?.enabled === false) return;

    const runs = new RunStateManager();
    const goal = cfg.defaultGoal || "openclaw_agent_run";

    // Eagerly attempt SDK init — errors are non-fatal, reported at outcome time
    loadKalibrSdk()
      .then(({ KalibrIntelligence }) => {
        KalibrIntelligence.init({
          apiKey: cfg.apiKey,
          ...(cfg.tenantId && { tenantId: cfg.tenantId }),
          ...(cfg.apiUrl && { baseUrl: cfg.apiUrl }),
        });
        api.logger?.info?.("[kalibr] SDK initialized");
      })
      .catch((err) => {
        api.logger?.warn?.("[kalibr] SDK init deferred: " + String(err));
      });

    // ── Routing hook (sequential, returns overrides) ─────

    if (cfg.enableRouting) {
      api.on("before_agent_start", async (_event: unknown) => {
        try {
          if (!_decide) {
            const sdk = await import("@kalibr/sdk");
            _decide = sdk.decide as DecideFn;
          }
          const response = await _decide(goal);
          const openClawRef = kalibrToOpenClaw(response.model_id);
          if (openClawRef) {
            const [provider] = openClawRef.split("/");
            return { modelOverride: openClawRef, providerOverride: provider };
          }
          const provider = inferProvider(response.model_id);
          if (provider) {
            return {
              modelOverride: `${provider}/${response.model_id}`,
              providerOverride: provider,
            };
          }
          return {};
        } catch {
          return {};
        }
      });
    }

    // ── Hooks (fire-and-forget, parallel) ──────────────

    if (cfg.captureLlmTelemetry !== false) {
      api.on("llm_input", async (event: unknown, ctx?: PluginHookAgentContext) => {
        const e = event as PluginHookLlmInputEvent;
        const sessionKey = ctx?.sessionKey;
        if (!sessionKey) return;

        runs.recordLlmInput(sessionKey, {
          runId: e.runId,
          provider: e.provider,
          model: e.model,
          timestamp: Date.now(),
        });
      });

      api.on("llm_output", async (event: unknown, ctx?: PluginHookAgentContext) => {
        const e = event as PluginHookLlmOutputEvent;
        const sessionKey = ctx?.sessionKey;
        if (!sessionKey) return;

        runs.recordLlmOutput(sessionKey, {
          runId: e.runId,
          provider: e.provider,
          model: e.model,
          inputTokens: e.usage?.input ?? 0,
          outputTokens: e.usage?.output ?? 0,
          cacheReadTokens: e.usage?.cacheRead ?? 0,
          cacheWriteTokens: e.usage?.cacheWrite ?? 0,
          totalTokens: e.usage?.total ?? 0,
          timestamp: Date.now(),
        });
      });
    }

    // Report outcome after agent run completes
    if (cfg.captureOutcomes !== false) {
      api.on("agent_end", async (event: unknown, ctx?: PluginHookAgentContext) => {
        const e = event as PluginHookAgentEndEvent;
        const sessionKey = ctx?.sessionKey;
        if (!sessionKey) return;

        const runData = runs.getAndClear(sessionKey);
        if (!runData) return;

        try {
          const { reportOutcome } = await loadKalibrSdk();
          await reportOutcome(
            runData.traceId,
            goal,
            e.success,
            {
              modelId: runData.primaryModel
                ? openClawToKalibr(runData.primaryModel)
                : undefined,
              metadata: {
                provider: runData.primaryProvider,
                agentId: ctx?.agentId,
                sessionKey,
                durationMs: e.durationMs,
                llmCalls: runData.llmCallCount,
                totalInputTokens: runData.totalInputTokens,
                totalOutputTokens: runData.totalOutputTokens,
                totalTokens: runData.totalTokens,
                cacheReadTokens: runData.totalCacheReadTokens,
                cacheWriteTokens: runData.totalCacheWriteTokens,
              },
              ...(e.error && { failureReason: e.error }),
            },
          );
        } catch (err) {
          api.logger?.error?.("[kalibr] Outcome report failed: " + String(err));
        }
      });
    }

    // ── Slash Command ──────────────────────────────────────

    api.registerCommand({
      name: "kalibr",
      description: "Show Kalibr plugin status",
      handler: () => ({
        text: [
          "Kalibr: active",
          "Goal: " + goal,
          "Routing: " + (cfg.enableRouting ? "on" : "off"),
          "Telemetry: " + (cfg.captureLlmTelemetry !== false ? "on" : "off"),
          "Outcomes: " + (cfg.captureOutcomes !== false ? "on" : "off"),
        ].join("\n"),
      }),
    });

    // ── Gateway RPC ────────────────────────────────────────

    api.registerGatewayMethod("kalibr.status", ({ respond }) => {
      respond(true, {
        enabled: true,
        goal,
        telemetry: cfg.captureLlmTelemetry !== false,
        outcomes: cfg.captureOutcomes !== false,
      });
    });

    // ── CLI ────────────────────────────────────────────────

    api.registerCli(
      ({ program }) => {
        program.command("kalibr").action(() => {
          console.log("Kalibr: active");
          console.log("Goal: " + goal);
          console.log("Routing: " + (cfg.enableRouting ? "on" : "off"));
          console.log("Telemetry: " + (cfg.captureLlmTelemetry !== false ? "on" : "off"));
          console.log("Outcomes: " + (cfg.captureOutcomes !== false ? "on" : "off"));
        });
      },
      { commands: ["kalibr"] },
    );

    api.logger?.info?.("[kalibr] Plugin registered");
  },
};

export default plugin;

// Named exports for testing
export { RunStateManager } from "./src/state.js";
export { openClawToKalibr, kalibrToOpenClaw } from "./src/model-mapper.js";
