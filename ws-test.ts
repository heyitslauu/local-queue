import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

socket.on('connect', () => {
  console.log('Connected to WebSocket');
});

socket.on('queueCreated', (data) => {
  console.log('QUEUE CREATED:', JSON.stringify(data, null, 2));
});

socket.on('queueCalled', (data) => {
  console.log('QUEUE CALLED:', JSON.stringify(data, null, 2));
});

socket.on('queueFinished', (data) => {
  console.log('QUEUE FINISHED:', JSON.stringify(data, null, 2));
});

socket.on('queueUpdated', (data) => {
  console.log('QUEUE UPDATED:', JSON.stringify(data, null, 2));
});

socket.on('allQueues', (data) => {
  console.log('ALL QUEUES:', JSON.stringify(data, null, 2));
});

socket.on('disconnect', () => {
  console.log('Disconnected');
});
