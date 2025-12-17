import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  // Penting: Set ping configuration
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
})
export class MachineGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('MachineGateway');

  afterInit(server: Server) {
    this.logger.log('✅ WebSocket Gateway initialized');
    this.logger.log(`📡 Ping interval: 25s, Ping timeout: 60s`);
  }

  handleConnection(client: Socket) {
    this.logger.log(`🔌 Client connected: ${client.id}`);
    
    // Send welcome message immediately
    client.emit('connected', {
      message: 'Connected to Vending Machine WebSocket',
      clientId: client.id,
      timestamp: new Date().toISOString(),
      serverTime: Date.now(),
    });

    // Setup ping/pong manually (optional, untuk memastikan)
    client.on('ping', () => {
      this.logger.debug(`💓 Ping received from ${client.id}`);
      client.emit('pong');
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`🔌 Client disconnected: ${client.id}`);
  }

  // Send temperature update to all connected clients
  sendTemperatureUpdate(machineId: number, data: any) {
    this.server.emit('temperature-update', {
      machineId,
      ...data,
    });
    this.logger.log(`📤 Temperature update sent for machine ${machineId}`);
  }

  // Send status update to all connected clients
  sendStatusUpdate(machineId: number, status: string) {
    this.server.emit('status-update', {
      machineId,
      status,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`📤 Status update sent for machine ${machineId}`);
  }

  // Send heartbeat to all connected clients
  sendHeartbeat(machineId: number, machineCode: string) {
    this.server.emit('heartbeat', {
      machineId,
      machineCode,
      timestamp: new Date().toISOString(),
    });
    this.logger.debug(`💓 Heartbeat sent for machine ${machineId}`);
  }

  // Send to specific machine room
  sendToMachineRoom(machineId: number, event: string, data: any) {
    this.server.to(`machine-${machineId}`).emit(event, data);
  }

  // Client subscribe to specific machine
  @SubscribeMessage('subscribe-machine')
  handleSubscribeMachine(
    @ConnectedSocket() client: Socket,
    @MessageBody() machineId: number,
  ) {
    client.join(`machine-${machineId}`);
    this.logger.log(`📡 Client ${client.id} subscribed to machine-${machineId}`);
    
    return {
      event: 'subscribed',
      data: {
        success: true,
        message: `Subscribed to machine ${machineId}`,
        machineId,
      },
    };
  }

  // Client unsubscribe from specific machine
  @SubscribeMessage('unsubscribe-machine')
  handleUnsubscribeMachine(
    @ConnectedSocket() client: Socket,
    @MessageBody() machineId: number,
  ) {
    client.leave(`machine-${machineId}`);
    this.logger.log(`📡 Client ${client.id} unsubscribed from machine-${machineId}`);
    
    return {
      event: 'unsubscribed',
      data: {
        success: true,
        message: `Unsubscribed from machine ${machineId}`,
        machineId,
      },
    };
  }

  // Get all machines current status
  @SubscribeMessage('get-all-machines')
  handleGetAllMachines(@ConnectedSocket() client: Socket) {
    this.logger.log(`📊 Client ${client.id} requested all machines`);
    
    return {
      event: 'machines-list',
      data: {
        success: true,
        message: 'Use HTTP API GET /machines for initial data',
        timestamp: new Date().toISOString(),
      },
    };
  }

  // Handle ping from client
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    this.logger.debug(`💓 Manual ping from ${client.id}`);
    return {
      event: 'pong',
      data: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  // Get connected clients count
  getConnectedClientsCount(): number {
    return this.server.sockets.sockets.size;
  }

  // Broadcast to all clients
  broadcast(event: string, data: any) {
    this.server.emit(event, data);
    this.logger.log(`📡 Broadcast: ${event} to ${this.getConnectedClientsCount()} clients`);
  }
}