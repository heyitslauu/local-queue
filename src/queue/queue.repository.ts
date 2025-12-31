import { Injectable, Inject } from '@nestjs/common';
import { eq, and, desc, asc } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../config/database.config';
import { queues, Queue, NewQueue } from '../db/schema';
import { CounterType } from './counter-type.enum';
import { QueueStatus } from './queue-status.enum';

@Injectable()
export class QueueRepository {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: any) {}

  async create(data: NewQueue): Promise<Queue> {
    const [created] = await this.db.insert(queues).values(data).returning();
    return created;
  }

  async findById(id: string): Promise<Queue | null> {
    const results = await this.db
      .select()
      .from(queues)
      .where(eq(queues.id, id))
      .limit(1);

    return results.length > 0 ? results[0] : null;
  }

  async findByUuid(uuid: string): Promise<Queue | null> {
    const results = await this.db
      .select()
      .from(queues)
      .where(eq(queues.uuid, uuid))
      .limit(1);

    return results.length > 0 ? results[0] : null;
  }

  async findLatestByCounterType(
    counterType: CounterType,
  ): Promise<Queue | null> {
    const results = await this.db
      .select()
      .from(queues)
      .where(eq(queues.counterType, counterType))
      .orderBy(desc(queues.createdAt))
      .limit(1);

    return results.length > 0 ? results[0] : null;
  }

  async findServingByCounterType(
    counterType: CounterType,
  ): Promise<Queue | null> {
    const results = await this.db
      .select()
      .from(queues)
      .where(
        and(eq(queues.counterType, counterType), eq(queues.status, 'SERVING')),
      )
      .limit(1);

    return results.length > 0 ? results[0] : null;
  }

  async findNextWaitingByCounterType(
    counterType: CounterType,
  ): Promise<Queue | null> {
    const results = await this.db
      .select()
      .from(queues)
      .where(
        and(eq(queues.counterType, counterType), eq(queues.status, 'WAITING')),
      )
      .orderBy(asc(queues.createdAt))
      .limit(1);

    return results.length > 0 ? results[0] : null;
  }

  async updateStatus(uuid: string, status: QueueStatus): Promise<Queue> {
    const [updated] = await this.db
      .update(queues)
      .set({
        status: status,
        updatedAt: new Date(),
      })
      .where(eq(queues.uuid, uuid))
      .returning();

    return updated;
  }

  async findAll(): Promise<Queue[]> {
    return this.db.select().from(queues);
  }

  async findByCounterType(counterType: CounterType): Promise<Queue[]> {
    return this.db
      .select()
      .from(queues)
      .where(eq(queues.counterType, counterType));
  }

  async findByStatus(status: QueueStatus): Promise<Queue[]> {
    return this.db.select().from(queues).where(eq(queues.status, status));
  }

  async findByCounterTypeAndStatus(
    counterType: CounterType,
    status: QueueStatus,
  ): Promise<Queue[]> {
    return this.db
      .select()
      .from(queues)
      .where(
        and(eq(queues.counterType, counterType), eq(queues.status, status)),
      );
  }
}
