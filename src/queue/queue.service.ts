import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { QueueStatus } from './queue-status.enum';
import { CounterType } from './counter-type.enum';
import { QueueGateway } from './queue.gateway';
import { DisplayState, ServiceStatus } from './display-state.dto';
import { QueueRepository } from './queue.repository';

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
    private readonly queueRepository: QueueRepository,
    @Inject(forwardRef(() => QueueGateway))
    private queueGateway: QueueGateway,
  ) {}

  private async ensureInitialized() {
    if (this.initialized) return;

    // Initialize counter IDs from database
    for (const counterType of Object.values(CounterType)) {
      const latestQueue =
        await this.queueRepository.findLatestByCounterType(counterType);

      if (latestQueue) {
        const match = latestQueue.id.match(/\d+$/);
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

    const saved = await this.queueRepository.create({
      id: queueId,
      counterType: counterType,
      status: 'WAITING',
    });

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
    // Check if THIS SPECIFIC counter is already locked
    const isCounterLocked = this.locks.get(counterType) === true;
    if (isCounterLocked) {
      return null;
    }

    // Check if THIS SPECIFIC counter already has a queue being served
    const alreadyServing =
      await this.queueRepository.findServingByCounterType(counterType);

    if (alreadyServing) {
      return null;
    }

    // Acquire lock for THIS SPECIFIC counter only
    this.locks.set(counterType, true);

    try {
      // Find next waiting queue for THIS SPECIFIC counter type
      const nextItem =
        await this.queueRepository.findNextWaitingByCounterType(counterType);

      if (nextItem) {
        const updated = await this.queueRepository.updateStatus(
          nextItem.uuid,
          QueueStatus.SERVING,
        );

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
    const item = await this.queueRepository.findById(id);

    if (item) {
      const updated = await this.queueRepository.updateStatus(
        item.uuid,
        QueueStatus.DONE,
      );

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
      return this.queueRepository.findByCounterType(counterType);
    }
    return this.queueRepository.findAll();
  }

  async getDisplayState(counterType?: CounterType): Promise<DisplayState> {
    let filteredQueues;
    if (counterType) {
      filteredQueues =
        await this.queueRepository.findByCounterType(counterType);
    } else {
      filteredQueues = await this.queueRepository.findAll();
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
    const queuesList =
      await this.queueRepository.findByCounterType(counterType);

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
