import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { SocketGateway } from './signal.gateway';

@Injectable()
export class SocketService {
  constructor(
    @Inject(forwardRef(() => SocketGateway))
    private gateway: SocketGateway,
  ) {}

  // Send event to a specific room
  sendToRoom(room: string, event: string, data: any) {
    this.gateway.server.to(room).emit(event, data);
  }

  // Send event to all rooms
  broadcast(event: string, data: any) {
    this.gateway.server.emit(event, data);
  }
}
