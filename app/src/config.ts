// URL of the move normaliser proxy Lambda.
// Set EXPO_PUBLIC_NORMALISER_URL in app/.env after deploying server/template.yaml.
// This is a URL, not a secret — safe to ship in the app bundle.
export const NORMALISER_URL = process.env.EXPO_PUBLIC_NORMALISER_URL ?? '';
