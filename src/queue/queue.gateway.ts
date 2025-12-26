import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { QueueItem } from './queue.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class QueueGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  // Emit when a new queue is created
  emitQueueCreated(queue: QueueItem) {
    this.server.emit('queueCreated', queue);
  }

  // Emit when queue status is updated
  emitQueueUpdated(queue: QueueItem) {
    this.server.emit('queueUpdated', queue);
  }

  // Emit when a queue is called (moved to serving)
  emitQueueCalled(queue: QueueItem) {
    this.server.emit('queueCalled', queue);
  }

  // Emit when a queue is finished
  emitQueueFinished(queue: QueueItem) {
    this.server.emit('queueFinished', queue);
  }

  // Emit all queues (for initial sync or updates)
  emitAllQueues(queues: QueueItem[]) {
    this.server.emit('allQueues', queues);
  }

  @SubscribeMessage('requestAllQueues')
  handleRequestAllQueues(client: Socket, payload: any) {
    // Client can request all queues - handled by controller/service
    return { event: 'requestReceived', data: 'Request acknowledged' };
  }
}
