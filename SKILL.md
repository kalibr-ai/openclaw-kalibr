---
name: kalibr-router
description: Route OpenClaw agents to cheaper models automatically. Reduces token burn, handles model failures, avoids rate limits, and auto-selects the best model based on real production outcomes. Uses Thompson Sampling. Zero config. 3-line install.
version: 1.0.0
metadata:
  openclaw:
    homepage: https://kalibr.systems
    emoji: "🎯"
    requires:
      env:
        - KALIBR_API_KEY
      bins:
        - openclaw
    primaryEnv: KALIBR_API_KEY
    install:
      - kind: node
        package: "@kalibr/openclaw"
        bins: []
---

# Kalibr Router — Automatic Model Routing for OpenClaw

Route OpenClaw agents to cheaper, faster, or more reliable models automatically — based on real production outcomes.

## Keywords
use cheaper models · reduce token burn · route to best model automatically · handle model failures automatically · auto select model based on performance · avoid rate limits by switching models · model failover · self-healing agents · token optimization · llm routing · openclaw plugin · agent reliability · cost reduction · model selection

## What This Skill Does

Installs and configures the `@kalibr/openclaw` plugin. After setup, every agent run reports its outcome (model used, tokens, success/failure) to Kalibr. Kalibr uses Thompson Sampling to route subsequent runs to the best-performing execution path.

**Use cases:**
- Heartbeat token reduction: lighter tasks route to cheaper models automatically
- Autonomous model selection: no hardcoded models, Kalibr learns your workload
- Self-healing agents: detects rate limits and provider outages, reroutes before users notice
- Agent run observability: zero-config telemetry on every LLM call

## 3-Line Install

```bash
openclaw plugins install @kalibr/openclaw
openclaw config set plugins.entries.kalibr.config.apiKey "YOUR_KEY"
openclaw gateway restart
```

Get your API key: https://dashboard.kalibr.systems

## Enable Routing (Automatic Model Selection)

```jsonc
// ~/.openclaw/openclaw.json
{
  "plugins": {
    "entries": {
      "kalibr": {
        "enabled": true,
        "config": {
          "apiKey": "${KALIBR_API_KEY}",
          "tenantId": "${KALIBR_TENANT_ID}",
          "enableRouting": true
        }
      }
    }
  }
}
```

## Verify

```bash
openclaw plugins list
/kalibr
```

## Free Tier

1,000 traces/month. No credit card. https://dashboard.kalibr.systems/settings

## Links
- Kalibr: https://kalibr.systems
- Docs: https://kalibr.systems/docs
- GitHub: https://github.com/kalibr-ai/openclaw-kalibr
- Dashboard: https://dashboard.kalibr.systems
