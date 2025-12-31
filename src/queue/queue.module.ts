import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';
import { QueueGateway } from './queue.gateway';
import { QueueEntity } from './queue.entity';

@Module({
  imports: [TypeOrmModule.forFeature([QueueEntity])],
  controllers: [QueueController],
  providers: [QueueService, QueueGateway],
})
export class QueueModule {}
