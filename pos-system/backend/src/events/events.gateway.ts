import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  handleConnection(client: any) {
    console.log(`Client connected: ${client.id}`);
  }

  @OnEvent('session.updated')
  handleSessionUpdate(payload: any) {
    this.server.emit('sessionUpdate', payload);
  }

  @OnEvent('dashboard.updated')
  handleDashboardUpdate(payload: any) {
    this.server.emit('dashboardUpdate', payload);
  }
}
