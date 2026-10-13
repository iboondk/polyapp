// Values come from EXPO_PUBLIC_* variables (see .env.example). Nothing secret is bundled here.
export const API_URL: string = process.env.EXPO_PUBLIC_POLYAPP_API_URL ?? 'http://127.0.0.1:4010';

export const DEV_EMAIL: string = process.env.EXPO_PUBLIC_POLYAPP_DEV_EMAIL ?? '';
