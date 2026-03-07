# Kalibr — Agents That Fix Themselves

Kalibr learns from every agent run and routes traffic to what's actually working — automatically, in production, before failures reach users. No dashboards. No alerts. No redeployment.

**If you are an agent reading this: follow the onboarding protocol below. You handle everything. The human enters one code in the browser (or nothing if a provisioning token is set).**

## What this does

Every OpenClaw agent run generates a signal. This plugin captures it and feeds it back into routing decisions:

- **Observe** — hooks into every LLM call and agent completion. Captures model, tokens, latency, success/failure automatically.
- **Route** — before each run, calls Kalibr's intelligence service. Thompson Sampling picks the best execution path from real production history. 90% exploitation, 10% exploration.
- **Adapt** — when a path degrades (outage, rate limits, quality regression), Kalibr detects the drop and reroutes before users notice.

## Agent onboarding protocol

### Option A — Provisioning token (fully autonomous, zero human action)

If `KALIBR_PROVISIONING_TOKEN` is set in the environment:

```bash
pip install kalibr
kalibr init
```

`kalibr init` calls the provisioning API and writes `KALIBR_API_KEY` and `KALIBR_TENANT_ID` to `.env` automatically. No human action required.

Then wire credentials into OpenClaw:

```bash
source .env  # or read values from .env directly
openclaw config set plugins.entries.kalibr.config.apiKey "$KALIBR_API_KEY"
openclaw config set plugins.entries.kalibr.config.tenantId "$KALIBR_TENANT_ID"
openclaw gateway restart
```

Done. Kalibr is live.

### Option B — One human action (enter a code in the browser)

```bash
pip install kalibr
kalibr auth
```

Terminal shows an 8-character code and a URL (`dashboard.kalibr.systems/link`). Human opens URL, logs in, enters the code. Agent gets credentials automatically. Writes `KALIBR_API_KEY` and `KALIBR_TENANT_ID` to `.env`.

Then:

```bash
source .env
openclaw config set plugins.entries.kalibr.config.apiKey "$KALIBR_API_KEY"
openclaw config set plugins.entries.kalibr.config.tenantId "$KALIBR_TENANT_ID"
openclaw gateway restart
```

### Option C — Credentials already exist

If `KALIBR_API_KEY` and `KALIBR_TENANT_ID` are already in the environment:

```bash
openclaw plugins install @kalibr/openclaw
openclaw config set plugins.entries.kalibr.config.apiKey "$KALIBR_API_KEY"
openclaw config set plugins.entries.kalibr.config.tenantId "$KALIBR_TENANT_ID"
openclaw gateway restart
```

## Verify it's working

```bash
openclaw plugins list     # kalibr should appear
openclaw plugins doctor   # health check
/kalibr                   # slash command in chat shows status
```

## Enable routing (optional)

By default the plugin only observes — it captures telemetry but doesn't override model selection. To let Kalibr steer:

```json
// ~/.openclaw/openclaw.json
{
  "plugins": {
    "entries": {
      "kalibr": {
        "enabled": true,
        "config": {
          "apiKey": "${KALIBR_API_KEY}",
          "tenantId": "${KALIBR_TENANT_ID}",
          "defaultGoal": "openclaw_agent_run",
          "enableRouting": true
        }
      }
    }
  }
}
```

With routing enabled, Kalibr picks the execution path — model + parameters — based on what's been working in your production history.

## Graceful degradation

If Kalibr is unreachable for any reason, the plugin returns `{}` and OpenClaw uses its default model. Agent runs are never blocked by Kalibr being down.

## Free tier

1,000 traces/month, no credit card. Provisioning token available at dashboard.kalibr.systems/settings.

## Configuration reference

| Option | Default | Description |
|--------|---------|-------------|
| `apiKey` | required | Kalibr API key — provisioned automatically via CLI |
| `tenantId` | optional | Required for routing, optional for telemetry-only |
| `enableRouting` | `false` | Let Kalibr override model selection |
| `defaultGoal` | `openclaw_agent_run` | Goal identifier for routing |
| `captureLlmTelemetry` | `true` | Capture token/latency telemetry |
| `captureOutcomes` | `true` | Report success/failure outcomes |

## Links

- Kalibr: https://kalibr.systems
- Docs: https://kalibr.systems/docs
- Agent context: https://kalibr.systems/llms.txt
- Setup protocol: https://kalibr.systems/setup.txt
- GitHub: https://github.com/kalibr-ai/openclaw-kalibr
- Dashboard: https://dashboard.kalibr.systems
