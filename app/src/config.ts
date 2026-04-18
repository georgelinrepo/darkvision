// Base URL of the DarkVision Lambda API.
// Set EXPO_PUBLIC_API_URL in app/.env after deploying server/template.yaml.
// This is a URL, not a secret — safe to ship in the app bundle.
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
