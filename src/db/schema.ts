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

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  counterType: counterTypeEnum('counter_type').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

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
