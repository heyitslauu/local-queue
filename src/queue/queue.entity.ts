import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { QueueStatus } from './queue-status.enum';
import { CounterType } from './counter-type.enum';

@Entity('queues')
export class QueueEntity {
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @Column({ unique: true })
  id: string; // e.g., "BILLING-001"

  @Column({
    type: 'enum',
    enum: CounterType,
  })
  counterType: CounterType;

  @Column({
    type: 'enum',
    enum: QueueStatus,
    default: QueueStatus.WAITING,
  })
  status: QueueStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
