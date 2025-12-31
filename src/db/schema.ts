import { pgTable, uuid, varchar, timestamp, pgEnum } from 'drizzle-orm/pg-core';

// Enums
export const queueStatusEnum = pgEnum('queue_status', [
  'WAITING',
  'SERVING',
  'DONE',
]);

export const counterTypeEnum = pgEnum('counter_type', [
  'BILLING',
  'LAB',
  'CASHIER',
]);

// Queues table
export const queues = pgTable('queues', {
  uuid: uuid('uuid').primaryKey().defaultRandom(),
  id: varchar('id', { length: 255 }).notNull().unique(),
  counterType: counterTypeEnum('counter_type').notNull(),
  status: queueStatusEnum('status').notNull().default('WAITING'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Queue = typeof queues.$inferSelect;
export type NewQueue = typeof queues.$inferInsert;
