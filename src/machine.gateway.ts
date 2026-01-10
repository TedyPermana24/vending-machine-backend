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
  }

  handleConnection(client: Socket) {
    this.logger.log(`🔌 Client connected: ${client.id}`);
    
    client.emit('connected', {
      message: 'Connected to Vending Machine WebSocket',
      clientId: client.id,
      timestamp: new Date().toISOString(),
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`🔌 Client disconnected: ${client.id}`);
  }

  // Send temperature update dengan event per machine: {machineCode}-temperature
  sendTemperatureUpdate(machineCode: string, data: any) {
    const payload = {
      machineCode,
      ...data,
    };
    
    const eventName = `${machineCode}-temperature`;
    
    this.logger.log(`📤 Broadcasting event: ${eventName}`);
    this.logger.log(`   - Temperature: ${data.temperature}°C`);
    this.logger.log(`   - Humidity: ${data.humidity}%`);
    this.logger.log(`   - Connected clients: ${this.server.sockets.sockets.size}`);
    
    // Emit dengan event name: vm-001-temperature, vm-002-temperature, dst
    this.server.emit(eventName, payload);
  }

  // Send status update dengan event per machine: {machineCode}-status
  sendStatusUpdate(machineCode: string, status: string) {
    const payload = {
      machineCode,
      status,
      timestamp: new Date().toISOString(),
    };
    
    const eventName = `${machineCode}-status`;
    
    this.logger.log(`📤 Broadcasting event: ${eventName}`);
    this.server.emit(eventName, payload);
  }

  // Send heartbeat dengan event per machine: {machineCode}-heartbeat
  sendHeartbeat(machineCode: string) {
    const payload = {
      machineCode,
      timestamp: new Date().toISOString(),
    };
    
    const eventName = `${machineCode}-heartbeat`;
    
    this.server.emit(eventName, payload);
    this.logger.debug(`💓 Broadcasting event: ${eventName}`);
  }

  // Handle ping from client
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    return {
      event: 'pong',
      data: { timestamp: new Date().toISOString() },
    };
  }

  // Get connected clients count
  getConnectedClientsCount(): number {
    return this.server.sockets.sockets.size;
  }
}