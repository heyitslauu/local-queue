import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { eq, and, desc, asc } from 'drizzle-orm';
import { QueueStatus } from './queue-status.enum';
import { CounterType } from './counter-type.enum';
import { QueueGateway } from './queue.gateway';
import { DisplayState, ServiceStatus } from './display-state.dto';
import { DATABASE } from '../db/database.module';
import { queues } from '../db/schema';

export interface QueueItem {
  id: string;
  counterType: CounterType;
  status: QueueStatus;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class QueueService {
  private counterIds: Map<CounterType, number> = new Map();
  private locks: Map<CounterType, boolean> = new Map();
  private initialized = false;

  constructor(
    @Inject(DATABASE) private readonly db: any,
    @Inject(forwardRef(() => QueueGateway))
    private queueGateway: QueueGateway,
  ) {}

  private async ensureInitialized() {
    if (this.initialized) return;

    // Initialize counter IDs from database
    for (const counterType of Object.values(CounterType)) {
      const result = await this.db
        .select()
        .from(queues)
        .where(eq(queues.counterType, counterType))
        .orderBy(desc(queues.createdAt))
        .limit(1);

      if (result.length > 0) {
        const match = result[0].id.match(/\d+$/);
        const lastNumber = match ? parseInt(match[0], 10) : 0;
        this.counterIds.set(counterType, lastNumber);
      } else {
        this.counterIds.set(counterType, 0);
      }
    }

    this.initialized = true;
  }

  async createQueue(counterType: CounterType): Promise<QueueItem> {
    await this.ensureInitialized();

    const currentId = this.counterIds.get(counterType) || 0;
    const nextId = currentId + 1;
    this.counterIds.set(counterType, nextId);

    const queueId = `${counterType}-${String(nextId).padStart(3, '0')}`;

    const [saved] = await this.db
      .insert(queues)
      .values({
        id: queueId,
        counterType: counterType,
        status: 'WAITING',
      })
      .returning();

    const queueItem: QueueItem = {
      id: saved.id,
      counterType: saved.counterType as CounterType,
      status: saved.status as QueueStatus,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };

    this.queueGateway.emitQueueCreated(queueItem);
    return queueItem;
  }

  async getNext(counterType: CounterType): Promise<QueueItem | null> {
    // Check if THIS SPECIFIC counter is already locked (another request in progress for this counter)
    const isCounterLocked = this.locks.get(counterType) === true;
    if (isCounterLocked) {
      return null; // This specific counter is busy processing another request
    }

    // Check if THIS SPECIFIC counter already has a queue being served
    const alreadyServing = await this.db
      .select()
      .from(queues)
      .where(
        and(eq(queues.counterType, counterType), eq(queues.status, 'SERVING')),
      )
      .limit(1);

    if (alreadyServing.length > 0) {
      return null; // This counter is already serving someone, must finish first
    }

    // Acquire lock for THIS SPECIFIC counter only
    this.locks.set(counterType, true);

    try {
      // Find next waiting queue for THIS SPECIFIC counter type
      const nextItems = await this.db
        .select()
        .from(queues)
        .where(
          and(
            eq(queues.counterType, counterType),
            eq(queues.status, 'WAITING'),
          ),
        )
        .orderBy(asc(queues.createdAt))
        .limit(1);

      if (nextItems.length > 0) {
        const nextItem = nextItems[0];

        const [updated] = await this.db
          .update(queues)
          .set({
            status: 'SERVING',
            updatedAt: new Date(),
          })
          .where(eq(queues.uuid, nextItem.uuid))
          .returning();

        const queueItem: QueueItem = {
          id: updated.id,
          counterType: updated.counterType as CounterType,
          status: updated.status as QueueStatus,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
        };

        this.queueGateway.emitQueueCalled(queueItem);
        return queueItem;
      }

      return null;
    } finally {
      // Release lock for THIS SPECIFIC counter only
      this.locks.set(counterType, false);
    }
  }

  async finish(id: string): Promise<QueueItem | null> {
    const items = await this.db
      .select()
      .from(queues)
      .where(eq(queues.id, id))
      .limit(1);

    if (items.length > 0) {
      const [updated] = await this.db
        .update(queues)
        .set({
          status: 'DONE',
          updatedAt: new Date(),
        })
        .where(eq(queues.uuid, items[0].uuid))
        .returning();

      const queueItem: QueueItem = {
        id: updated.id,
        counterType: updated.counterType as CounterType,
        status: updated.status as QueueStatus,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      };

      this.queueGateway.emitQueueFinished(queueItem);
      return queueItem;
    }
    return null;
  }

  async getAllQueues(counterType?: CounterType): Promise<any[]> {
    if (counterType) {
      return this.db
        .select()
        .from(queues)
        .where(eq(queues.counterType, counterType));
    }
    return this.db.select().from(queues);
  }

  async getDisplayState(counterType?: CounterType): Promise<DisplayState> {
    let filteredQueues;
    if (counterType) {
      filteredQueues = await this.db
        .select()
        .from(queues)
        .where(eq(queues.counterType, counterType));
    } else {
      filteredQueues = await this.db.select().from(queues);
    }

    const counterTypesToShow = counterType
      ? [counterType]
      : Object.values(CounterType);

    const services: ServiceStatus[] = counterTypesToShow.map((type) => {
      const serving = filteredQueues
        .filter(
          (item: any) => item.counterType === type && item.status === 'SERVING',
        )
        .map((item: any) => item.id);

      return {
        counterType: type,
        serving,
      };
    });

    const waiting = filteredQueues
      .filter((item: any) => item.status === 'WAITING')
      .map((item: any) => item.id);

    return {
      services,
      waiting,
      updatedAt: new Date().toISOString(),
    };
  }

  async getDisplayStateByCounter(
    counterType: CounterType,
  ): Promise<DisplayState> {
    const queuesList = await this.db
      .select()
      .from(queues)
      .where(eq(queues.counterType, counterType));

    const serving = queuesList
      .filter((item: any) => item.status === 'SERVING')
      .map((item: any) => item.id);

    const waiting = queuesList
      .filter((item: any) => item.status === 'WAITING')
      .map((item: any) => item.id);

    return {
      services: [
        {
          counterType,
          serving,
        },
      ],
      waiting,
      updatedAt: new Date().toISOString(),
    };
  }
}
