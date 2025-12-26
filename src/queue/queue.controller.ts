import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { QueueService } from './queue.service';
import { CounterType } from './counter-type.enum';

@Controller('queue')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Post()
  createQueue(@Body('counterType') counterType: CounterType) {
    if (!counterType || !Object.values(CounterType).includes(counterType)) {
      throw new HttpException(
        'Valid counterType is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.queueService.createQueue(counterType);
  }

  @Get()
  getAllQueues(@Query('counterType') counterType?: CounterType) {
    return this.queueService.getAllQueues(counterType);
  }

  @Get('next')
  getNext(@Query('counterType') counterType: CounterType) {
    if (!counterType || !Object.values(CounterType).includes(counterType)) {
      throw new HttpException(
        'Valid counterType is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    const next = this.queueService.getNext(counterType);
    if (!next) {
      throw new HttpException(
        `No waiting queues available for ${counterType}`,
        HttpStatus.NOT_FOUND,
      );
    }
    return next;
  }

  @Patch(':id/finish')
  finish(@Param('id') id: string) {
    const finished = this.queueService.finish(id);
    if (!finished) {
      throw new HttpException('Queue not found', HttpStatus.NOT_FOUND);
    }
    return finished;
  }
}
