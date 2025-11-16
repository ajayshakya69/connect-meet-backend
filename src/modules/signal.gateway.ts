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

    client.to(meetingId).except(client.id).emit('user-joined', {
      userId: client.id,
      meetingId,
    });
  }

  @SubscribeMessage('webrtc-offer')
  async handleWebRTCOffer(
    @MessageBody() data: { offer: any; to: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { offer, to } = data;

    console.log('offer is here', offer);

    this.server.to(to).except(client.id).emit('webrtc-offer', {
      offer,
      from: client.id,
    });
  }

  @SubscribeMessage('webrtc-answer')
  async handleWebRTCAnswer(
    @MessageBody() data: { answer: any; to: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { answer, to } = data;

    this.server.to(to).except(client.id).emit('webrtc-answer', {
      answer,
      from: client.id,
    });
  }

  @SubscribeMessage('ice-candidate')
  async handleICECandidate(
    @MessageBody() data: { candidate: any; to: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { candidate, to } = data;

    this.server.to(to).except(client.id).emit('ice-candidate', {
      candidate,
      from: client.id,
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
