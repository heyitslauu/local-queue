import { Module } from '@nestjs/common';
import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';
import { QueueGateway } from './queue.gateway';
import { QueueRepository } from './queue.repository';
import { DatabaseModule } from '../db/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [QueueController],
  providers: [QueueService, QueueGateway, QueueRepository],
})
export class QueueModule {}
