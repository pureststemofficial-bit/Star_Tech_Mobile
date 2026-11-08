import path from 'node:path';

const ROOT = process.cwd();

export const isProd = process.env.NODE_ENV === 'production';
export const dataDir = process.env.DATA_DIR || path.join(ROOT, 'data');
export const dbFile = process.env.DB_FILE || path.join(dataDir, 'store.db');
// Uploads live outside /public: Next.js only serves public files that existed at build time.
export const uploadDir = path.join(dataDir, 'uploads');
// Number of reverse proxies in front of the app (1 behind Nginx/Cloudflare); used to find the client IP.
export const trustProxy = Number(process.env.TRUST_PROXY) || 0;
