# Drizzle ORM Migration to Queue Backend

## Summary of Changes

### Removed TypeORM Dependencies

- Uninstalled `typeorm` and `@nestjs/typeorm`
- Deleted `queue.entity.ts`
- Removed TypeORM configuration from `app.module.ts` and `queue.module.ts`

### Added Drizzle ORM

- Installed `drizzle-orm`, `drizzle-kit`, and `postgres`
- Created Drizzle schema at `src/db/schema.ts`
- Created database module at `src/db/database.module.ts`
- Created `drizzle.config.ts` for Drizzle Kit

### Database Schema

The `queues` table includes:

- `uuid` (Primary Key) - UUID
- `id` (Unique) - Queue identifier (e.g., "BILLING-001")
- `counter_type` - Enum: BILLING, LAB, CASHIER
- `status` - Enum: WAITING, SERVING, DONE
- `created_at` - Timestamp
- `updated_at` - Timestamp

### Updated Files

- `src/app.module.ts` - Replaced TypeORM with DatabaseModule
- `src/queue/queue.module.ts` - Removed TypeORM imports
- `src/queue/queue.service.ts` - Refactored to use Drizzle ORM queries
- `package.json` - Added Drizzle scripts
- `.gitignore` - Added `/drizzle` folder
- `DATABASE.md` - Updated with Drizzle instructions

### Quick Start

1. Ensure PostgreSQL is running: `docker-compose up -d`
2. Push schema to database: `npm run db:push`
3. Start the application: `npm run start:dev`

### Useful Commands

- `npm run db:push` - Push schema changes (development)
- `npm run db:generate` - Generate migrations
- `npm run db:migrate` - Run migrations (production)
- `npm run db:studio` - Open Drizzle Studio GUI
- `npx drizzle-kit generate --name custom_migration_name`

All existing API endpoints and WebSocket functionality remain unchanged!
