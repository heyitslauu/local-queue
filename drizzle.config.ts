import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: Number(process.env.DATABASE_PORT) || 5432,
    user: process.env.DATABASE_USER || 'queue_user',
    password: process.env.DATABASE_PASSWORD || 'queue_password',
    database: process.env.DATABASE_NAME || 'queue_db',
    ssl: false,
  },
} satisfies Config;
