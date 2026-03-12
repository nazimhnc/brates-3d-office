// useAvatarAppearance — returns a default appearance object per agent.

import type { HumanAvatarAppearance } from "../components/humans/HumanAvatar";

const ROLE_APPEARANCES: Record<string, Partial<HumanAvatarAppearance>> = {
  architect: { shirtColor: "#1a3a5c", bodyType: "male", height: 1.05 },
  "design-authority": { shirtColor: "#e05590", bodyType: "female", height: 0.95 },
  "web-engineer": { shirtColor: "#7c5cbf", bodyType: "male", height: 1.0 },
  "backend-engineer": { shirtColor: "#2ecc71", bodyType: "male", height: 1.02 },
  "ai-engineer": { shirtColor: "#d4933a", bodyType: "female", height: 0.97 },
  tester: { shirtColor: "#c0392b", bodyType: "female", height: 0.96 },
  researcher: { shirtColor: "#2980b9", bodyType: "female", height: 0.98 },
  devsecops: { shirtColor: "#34495e", bodyType: "male", height: 1.04 },
  "mobile-wrapper": { shirtColor: "#16a085", bodyType: "male", height: 0.99 },
};

const SKIN_TONES = ["#f5e0c8", "#e8c8a0", "#d4a574", "#c08050", "#a67c52", "#8a6038"];

export function getAgentAppearance(
  agentId: string,
  category?: string,
): Partial<HumanAvatarAppearance> {
  const roleKey = (category ?? "").toLowerCase();
  const roleDefaults = ROLE_APPEARANCES[roleKey] ?? {};
  // Deterministic skin tone from agentId hash
  let hash = 0;
  for (let i = 0; i < agentId.length; i++) {
    hash = (hash * 31 + agentId.charCodeAt(i)) | 0;
  }
  const skinTone = SKIN_TONES[Math.abs(hash) % SKIN_TONES.length];
  return { skinTone, ...roleDefaults };
}
