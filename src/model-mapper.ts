/**
 * OpenClaw format: "provider/model" (slash delimiter)
 * Kalibr format: model_id used in decide() / reportOutcome()
 */

const OPENCLAW_TO_KALIBR: Record<string, string> = {
  "anthropic/claude-opus-4-6": "claude-opus-4-6",
  "anthropic/claude-sonnet-4-5": "claude-sonnet-4-5",
  "openai/gpt-5.2": "gpt-5.2",
  "openai/gpt-5.2-mini": "gpt-5.2-mini",
  "openai/gpt-5.1-codex": "gpt-5.1-codex",
};

const KALIBR_TO_OPENCLAW = Object.fromEntries(
  Object.entries(OPENCLAW_TO_KALIBR).map(([k, v]) => [v, k]),
);

/**
 * Convert an OpenClaw model reference ("provider/model") to a Kalibr model ID.
 * Known models are mapped explicitly; unknown models strip the provider prefix.
 */
export function openClawToKalibr(openClawRef: string): string {
  if (OPENCLAW_TO_KALIBR[openClawRef]) return OPENCLAW_TO_KALIBR[openClawRef];
  const parts = openClawRef.split("/");
  return parts.length > 1 ? parts.slice(1).join("/") : openClawRef;
}

/**
 * Convert a Kalibr model ID to an OpenClaw model reference ("provider/model").
 * Returns null if no reverse mapping exists and the ID doesn't contain a slash.
 */
export function kalibrToOpenClaw(kalibrModelId: string): string | null {
  if (KALIBR_TO_OPENCLAW[kalibrModelId]) return KALIBR_TO_OPENCLAW[kalibrModelId];
  if (kalibrModelId.includes("/")) return kalibrModelId;
  return null;
}
