import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SocketService } from './signal.services';
import { forwardRef, Inject } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'webRTC-socket',
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    @Inject(forwardRef(() => SocketService))
    private socketService: SocketService,
  ) {}

  handleConnection(client: Socket) {
    console.log('Client connected:', client.id);
  }

  handleDisconnect(client: Socket) {
    console.log('Client disconnected:', client.id);
  }

  @SubscribeMessage('join-or-create-meeting')
  async joinRoom(
    @MessageBody() data: { meetingId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { meetingId } = data;

    if (!meetingId) {
      console.log('❌ meetingId is missing in payload');
      return;
    }

    await client.join(meetingId);

    console.log(`Client ${client.id} joined room ${meetingId}`);

    client.emit('meeting-joined', { meetingId });

    client.to(meetingId).emit('user-joined', {
      userId: client.id,
      meetingId,
    });
  }

  @SubscribeMessage('leaveRoom')
  async leaveRoom(
    @MessageBody() room: string,
    @ConnectedSocket() client: Socket,
  ) {
    await client.leave(room);

    client.emit('roomLeft', { room });
    console.log(`Client ${client.id} left room ${room}`);
  }

  // -----------------------------
  // SEND MESSAGE TO ROOM
  // -----------------------------
  @SubscribeMessage('sendToRoom')
  async sendToRoom(
    @MessageBody() data: { room: string; message: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.server.to(data.room).emit('roomMessage', {
      message: data.message,
      userId: client.id,
      room: data.room,
    });
  }
}
