import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { QueueStatus } from './queue-status.enum';
import { CounterType } from './counter-type.enum';
import { QueueGateway } from './queue.gateway';
import { DisplayState, ServiceStatus } from './display-state.dto';

export interface QueueItem {
  id: string;
  counterType: CounterType;
  status: QueueStatus;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class QueueService {
  private queue: QueueItem[] = [];
  private counterIds: Map<CounterType, number> = new Map();

  constructor(
    @Inject(forwardRef(() => QueueGateway))
    private queueGateway: QueueGateway,
  ) {}

  createQueue(counterType: CounterType): QueueItem {
    const currentId = this.counterIds.get(counterType) || 0;
    const nextId = currentId + 1;
    this.counterIds.set(counterType, nextId);

    const queueItem: QueueItem = {
      id: `${counterType}-${String(nextId).padStart(3, '0')}`,
      counterType,
      status: QueueStatus.WAITING,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.queue.push(queueItem);
    this.queueGateway.emitQueueCreated(queueItem);
    return queueItem;
  }

  getNext(counterType: CounterType): QueueItem | null {
    const nextItem = this.queue.find(
      (item) =>
        item.counterType === counterType && item.status === QueueStatus.WAITING,
    );
    if (nextItem) {
      nextItem.status = QueueStatus.SERVING;
      nextItem.updatedAt = new Date();
      this.queueGateway.emitQueueCalled(nextItem);
    }
    return nextItem || null;
  }

  finish(id: string): QueueItem | null {
    const item = this.queue.find((item) => item.id === id);
    if (item) {
      item.status = QueueStatus.DONE;
      item.updatedAt = new Date();
      this.queueGateway.emitQueueFinished(item);
    }
    return item || null;
  }

  getAllQueues(counterType?: CounterType): QueueItem[] {
    if (counterType) {
      return this.queue.filter((item) => item.counterType === counterType);
    }
    return this.queue;
  }

  getDisplayState(counterType?: CounterType): DisplayState {
    const filteredQueues = counterType
      ? this.queue.filter((item) => item.counterType === counterType)
      : this.queue;

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

    const waitingCount = filteredQueues.filter(
      (item) => item.status === QueueStatus.WAITING,
    ).length;

    return {
      services,
      waitingCount,
      updatedAt: new Date().toISOString(),
    };
  }

  getDisplayStateByCounter(counterType: CounterType): DisplayState {
    const queues = this.queue.filter(
      (item) => item.counterType === counterType,
    );

    const serving = queues
      .filter((item) => item.status === QueueStatus.SERVING)
      .map((item) => item.id);

    const waitingCount = queues.filter(
      (item) => item.status === QueueStatus.WAITING,
    ).length;

    return {
      services: [
        {
          counterType,
          serving,
        },
      ],
      waitingCount,
      updatedAt: new Date().toISOString(),
    };
  }
}
