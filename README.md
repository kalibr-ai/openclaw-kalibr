# @kalibr/openclaw

Kalibr routing intelligence plugin for [OpenClaw](https://docs.openclaw.ai).

## Overview

This plugin integrates [Kalibr](https://kalibr.systems) with OpenClaw to capture LLM telemetry and report agent run outcomes. Kalibr learns from these outcomes to improve model routing decisions.

### v0.1 — Observe + Report

- Captures every LLM call via `llm_input` / `llm_output` hooks
- Reports aggregated outcomes via `agent_end` hook using `reportOutcome()`
- Provides slash command (`/kalibr`), CLI command, and Gateway RPC for status
- OpenClaw controls model selection; Kalibr learns from outcomes

## Installation

```bash
openclaw plugins install @kalibr/openclaw
openclaw config set plugins.entries.kalibr.enabled true
openclaw config set plugins.entries.kalibr.config.apiKey "your-api-key"
openclaw gateway restart
```

## Configuration

```json5
// ~/.openclaw/openclaw.json
{
  plugins: {
    entries: {
      kalibr: {
        enabled: true,
        config: {
          apiKey: "${KALIBR_API_KEY}",
          tenantId: "your-tenant-id",
          apiUrl: "https://kalibr-intelligence.fly.dev",
          defaultGoal: "openclaw_agent_run",
          captureLlmTelemetry: true,
          captureOutcomes: true,
        },
      },
    },
  },
}
```

### Config Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | string | *required* | Kalibr API key |
| `tenantId` | string | — | Kalibr tenant ID |
| `apiUrl` | string | `https://kalibr-intelligence.fly.dev` | Intelligence service URL |
| `defaultGoal` | string | `openclaw_agent_run` | Goal identifier for outcome reporting |
| `enabled` | boolean | `true` | Enable/disable the plugin |
| `captureLlmTelemetry` | boolean | `true` | Capture LLM input/output telemetry |
| `captureOutcomes` | boolean | `true` | Report agent run outcomes |

## Verification

```bash
openclaw plugins list
openclaw plugins doctor
openclaw kalibr
/kalibr
```

## Roadmap

- **v0.1** — Observe + Report (current)
- **v0.2** — Routing via Provider Proxy (`kalibr/auto` model ref)
- **v0.3** — Native Routing (upstream PR to add `model?` to hook result)

## License

MIT
