import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QueueStatus } from './queue-status.enum';
import { CounterType } from './counter-type.enum';
import { QueueGateway } from './queue.gateway';
import { DisplayState, ServiceStatus } from './display-state.dto';
import { QueueEntity } from './queue.entity';

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
    @InjectRepository(QueueEntity)
    private queueRepository: Repository<QueueEntity>,
    @Inject(forwardRef(() => QueueGateway))
    private queueGateway: QueueGateway,
  ) {}

  private async ensureInitialized() {
    if (this.initialized) return;

    // Initialize counter IDs from database
    for (const counterType of Object.values(CounterType)) {
      const latestQueue = await this.queueRepository.findOne({
        where: { counterType },
        order: { createdAt: 'DESC' },
      });

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

    const queueEntity = this.queueRepository.create({
      id: `${counterType}-${String(nextId).padStart(3, '0')}`,
      counterType,
      status: QueueStatus.WAITING,
    });

    return this.queueRepository.save(queueEntity).then((saved) => {
      const queueItem: QueueItem = {
        id: saved.id,
        counterType: saved.counterType,
        status: saved.status,
        createdAt: saved.createdAt,
        updatedAt: saved.updatedAt,
      };
      this.queueGateway.emitQueueCreated(queueItem);
      return queueItem;
    });
  }

  async getNext(counterType: CounterType): Promise<QueueItem | null> {
    // Check if THIS SPECIFIC counter is already locked (another request in progress for this counter)
    const isCounterLocked = this.locks.get(counterType) === true;
    if (isCounterLocked) {
      return null; // This specific counter is busy processing another request
    }

    // Check if THIS SPECIFIC counter already has a queue being served
    const alreadyServing = await this.queueRepository.findOne({
      where: {
        counterType,
        status: QueueStatus.SERVING,
      },
    });

    if (alreadyServing) {
      return null; // This counter is already serving someone, must finish first
    }

    // Acquire lock for THIS SPECIFIC counter only
    this.locks.set(counterType, true);

    try {
      // Find next waiting queue for THIS SPECIFIC counter type
      const nextItem = await this.queueRepository.findOne({
        where: {
          counterType,
          status: QueueStatus.WAITING,
        },
        order: {
          createdAt: 'ASC',
        },
      });

      if (nextItem) {
        nextItem.status = QueueStatus.SERVING;
        nextItem.updatedAt = new Date();
        const saved = await this.queueRepository.save(nextItem);

        const queueItem: QueueItem = {
          id: saved.id,
          counterType: saved.counterType,
          status: saved.status,
          createdAt: saved.createdAt,
          updatedAt: saved.updatedAt,
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
    const item = await this.queueRepository.findOne({ where: { id } });
    if (item) {
      item.status = QueueStatus.DONE;
      item.updatedAt = new Date();
      const saved = await this.queueRepository.save(item);

      const queueItem: QueueItem = {
        id: saved.id,
        counterType: saved.counterType,
        status: saved.status,
        createdAt: saved.createdAt,
        updatedAt: saved.updatedAt,
      };
      this.queueGateway.emitQueueFinished(queueItem);
      return queueItem;
    }
    return null;
  }

  async getAllQueues(counterType?: CounterType): Promise<QueueEntity[]> {
    if (counterType) {
      return this.queueRepository.find({ where: { counterType } });
    }
    return this.queueRepository.find();
  }

  async getDisplayState(counterType?: CounterType): Promise<DisplayState> {
    const whereClause = counterType ? { counterType } : {};
    const filteredQueues = await this.queueRepository.find({
      where: whereClause,
    });

    const counterTypesToShow = counterType
      ? [counterType]
      : Object.values(CounterType);

    const services: ServiceStatus[] = counterTypesToShow.map((type) => {
      const serving = filteredQueues
        .filter(
          (item) =>
            item.counterType === type && item.status === QueueStatus.SERVING,
        )
        .map((item) => item.id);

      return {
        counterType: type,
        serving,
      };
    });

    const waiting = filteredQueues
      .filter((item) => item.status === QueueStatus.WAITING)
      .map((item) => item.id);

    return {
      services,
      waiting,
      updatedAt: new Date().toISOString(),
    };
  }

  async getDisplayStateByCounter(
    counterType: CounterType,
  ): Promise<DisplayState> {
    const queues = await this.queueRepository.find({
      where: { counterType },
    });

    const serving = queues
      .filter((item) => item.status === QueueStatus.SERVING)
      .map((item) => item.id);

    const waiting = queues
      .filter((item) => item.status === QueueStatus.WAITING)
      .map((item) => item.id);

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
