import { Module } from '@nestjs/common';
import { SocketGateway } from './signal.gateway';
import { SocketService } from './signal.services';
@Module({
  providers: [SocketGateway, SocketService],
  exports: [SocketService],
})
export class SocketModule {}
