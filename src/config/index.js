import dotenv from 'dotenv';
dotenv.config();

export const PORT = process.env.PORT || 3006;
export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
export const DATABASE_URL = process.env.DATABASE_URL;
export const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
