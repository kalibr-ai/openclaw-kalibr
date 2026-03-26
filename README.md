# @kalibr/openclaw — Cheaper Models, Zero Failures, Automatic Routing

> Your agents keep burning tokens on expensive models. They fail when providers hit rate limits. You find out from a user.

Kalibr fixes this. Connect once. Your agents start routing to the best model automatically — based on what's actually working in your production history.

## What Users Are Asking For (And What This Solves)

| Problem | How Kalibr Fixes It |
|---|---|
| "Use cheaper models automatically" | Routes to lower-cost paths when success rates are equal |
| "Reduce token burn on heartbeat / background tasks" | Learns that lightweight tasks don't need Claude Sonnet |
| "Route to best model automatically" | Thompson Sampling — 90% best path, 10% exploration |
| "Handle model failures automatically" | Detects success rate drops, reroutes before users notice |
| "Avoid rate limits by switching models" | Observes per-model failure patterns and steers around them |
| "Auto select model based on performance" | Every outcome updates routing weights in real time |

## 3-Line Integration

```bash
openclaw plugins install @kalibr/openclaw
openclaw config set plugins.entries.kalibr.config.apiKey "your-api-key"
openclaw gateway restart
```

That's it. Kalibr starts learning from your agent runs immediately.

## Enable Automatic Model Routing

Add one flag to `~/.openclaw/openclaw.json`:

```jsonc
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

Now Kalibr picks the execution path — model + parameters — for each agent run based on real production history.

## OpenClaw-Specific Use Cases

### Heartbeat Token Reduction
OpenClaw heartbeat tasks run constantly. They don't need your most expensive model. Kalibr learns this automatically — lightweight tasks get routed to faster, cheaper models. No config change required.

### Self-Healing Agents
When a provider goes down or hits rate limits, your agents keep running. Kalibr detects the success rate drop and reroutes to the next-best path automatically. No alerts, no manual intervention.

### Autonomous Model Selection
Stop hardcoding models. Kalibr observes which models succeed on which task types in your specific environment and adjusts routing weights continuously.

### Agent Run Observability
Zero-config telemetry — token counts, latency, success/failure — captured automatically from OpenClaw hooks. No code changes.

## How It Works

**Observe** — Hooks into every LLM call and agent run completion. Captures model used, token counts, and success/failure. Reports to Kalibr via `reportOutcome()`.

**Route** — Before each run, calls Kalibr's `decide()` API. Thompson Sampling selects the best execution path from real history. Returns `modelOverride` to OpenClaw.

**Adapt** — As outcomes flow in, routing weights update. Rate limit spike → Kalibr reroutes. Model quality regression → Kalibr detects and shifts traffic.

OpenClaw's `modelOverride` is the steering wheel. Kalibr is the driver.

## Graceful Degradation

If Kalibr is unreachable, the plugin returns `{}` and OpenClaw uses its configured default. **Agent runs are never blocked.**

## Free Tier

1,000 traces/month. No credit card. Get a provisioning token at [dashboard.kalibr.systems/settings](https://dashboard.kalibr.systems/settings).

## Agent Onboarding (Autonomous Setup)

If `KALIBR_PROVISIONING_TOKEN` is set:

```bash
pip install kalibr
kalibr init  # writes KALIBR_API_KEY + KALIBR_TENANT_ID to .env automatically
source .env
openclaw config set plugins.entries.kalibr.config.apiKey "$KALIBR_API_KEY"
openclaw config set plugins.entries.kalibr.config.tenantId "$KALIBR_TENANT_ID"
openclaw gateway restart
```

Zero human action required.

## Verify

```bash
openclaw plugins list    # kalibr should appear
openclaw plugins doctor  # health check
/kalibr                  # slash command shows live status
```

## Configuration Reference

| Option | Default | Description |
|--------|---------|-------------|
| `apiKey` | required | Kalibr API key |
| `tenantId` | optional | Required for routing |
| `enableRouting` | `false` | Let Kalibr override model selection |
| `defaultGoal` | `openclaw_agent_run` | Goal identifier |
| `captureLlmTelemetry` | `true` | Capture token/latency data |
| `captureOutcomes` | `true` | Report success/failure |

## Keywords

model routing · token optimization · cheaper models · reduce token burn · auto model selection · avoid rate limits · handle model failures · self-healing agents · llm routing · openclaw plugin · agent reliability · Thompson Sampling · model failover · cost optimization

## Links

- [Kalibr](https://kalibr.systems) · [Docs](https://kalibr.systems/docs) · [Dashboard](https://dashboard.kalibr.systems)
- [OpenClaw](https://docs.openclaw.ai) · [Plugin Docs](https://docs.openclaw.ai/plugins)
- [ClawHub](https://clawhub.ai/skills/kalibr-router)
- [GitHub](https://github.com/kalibr-ai/openclaw-kalibr)

## License

MIT
