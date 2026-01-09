import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as mqtt from 'mqtt';
import { Machine, MachineStatus } from '../machines/entities/machine.entity';
import { TemperatureLog } from '../machines/entities/temperature-log.entity';
import { MachinesService } from '../machines/machines.service';
import { MachineGateway } from '../machine.gateway';

interface TemperaturePayload {
  machineCode: string;
  temperature: number;
  humidity: number;
  timestamp: string;
}

interface MachineStatusPayload {
  machineCode: string;
  status: 'online' | 'offline' | 'maintenance';
  timestamp: string;
}

@Injectable()
export class MqttService implements OnModuleInit {
  private client: mqtt.MqttClient;
  private readonly logger = new Logger(MqttService.name);
  private lastSaveTime: Map<number, Date> = new Map();
  private readonly SAVE_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds

  constructor(
    private configService: ConfigService,
    @InjectRepository(Machine)
    private machineRepo: Repository<Machine>,
    @InjectRepository(TemperatureLog)
    private tempLogRepo: Repository<TemperatureLog>,
    private machinesService: MachinesService,
    private machineGateway: MachineGateway,
  ) {}

  async onModuleInit() {
    await this.connectMqtt();
  }

  private async connectMqtt() {
    const brokerUrl = this.configService.get<string>('MQTT_BROKER_URL') || 'mqtt://localhost:1883';
    const username = this.configService.get<string>('MQTT_USERNAME');
    const password = this.configService.get<string>('MQTT_PASSWORD');

    this.logger.log(`Connecting to MQTT broker: ${brokerUrl}`);

    const options: mqtt.IClientOptions = {
      clean: true,
      connectTimeout: 4000,
      reconnectPeriod: 1000,
    };

    if (username && password) {
      options.username = username;
      options.password = password;
    }

    this.client = mqtt.connect(brokerUrl, options);

    this.client.on('connect', () => {
      this.logger.log('✅ Connected to MQTT broker');
      this.subscribeToTopics();
    });

    this.client.on('error', (error) => {
      this.logger.error('❌ MQTT Connection error:', error);
    });

    this.client.on('message', async (topic, message) => {
      await this.handleMessage(topic, message);
    });

    this.client.on('offline', () => {
      this.logger.warn('⚠️ MQTT client offline');
    });

    this.client.on('reconnect', () => {
      this.logger.log('🔄 Reconnecting to MQTT broker...');
    });
  }

  private async subscribeToTopics() {
    const machines = await this.machineRepo.find();

    machines.forEach((machine) => {
      // Subscribe to temperature topic
      const tempTopic = `${machine.mqttTopic}/temperature`;
      this.client.subscribe(tempTopic, (err) => {
        if (err) {
          this.logger.error(`Failed to subscribe to ${tempTopic}:`, err);
        } else {
          this.logger.log(`📡 Subscribed to: ${tempTopic}`);
        }
      });

      // Subscribe to status topic
      const statusTopic = `${machine.mqttTopic}/status`;
      this.client.subscribe(statusTopic, (err) => {
        if (err) {
          this.logger.error(`Failed to subscribe to ${statusTopic}:`, err);
        } else {
          this.logger.log(`📡 Subscribed to: ${statusTopic}`);
        }
      });

      // Subscribe to heartbeat topic
      const heartbeatTopic = `${machine.mqttTopic}/heartbeat`;
      this.client.subscribe(heartbeatTopic, (err) => {
        if (err) {
          this.logger.error(`Failed to subscribe to ${heartbeatTopic}:`, err);
        } else {
          this.logger.log(`📡 Subscribed to: ${heartbeatTopic}`);
        }
      });
    });
  }

  private async handleMessage(topic: string, message: Buffer) {
    try {
      const payload = JSON.parse(message.toString());
      this.logger.log(`📨 Received message on ${topic}:`, payload);

      if (topic.includes('/temperature')) {
        await this.handleTemperatureData(payload);
      } else if (topic.includes('/status')) {
        await this.handleStatusUpdate(payload);
      } else if (topic.includes('/heartbeat')) {
        await this.handleHeartbeat(payload);
      }
    } catch (error) {
      this.logger.error(`Error handling message from ${topic}:`, error);
    }
  }

  private async handleTemperatureData(payload: TemperaturePayload) {
    const { machineCode, temperature, humidity } = payload;

    const machine = await this.machineRepo.findOne({ where: { code: machineCode } });
    if (!machine) {
      this.logger.warn(`Machine with code ${machineCode} not found`);
      return;
    }

    // ALWAYS update current temperature di tabel machines (untuk display current status)
    await this.machineRepo.update(machine.id, {
      currentTemperature: temperature,
      currentHumidity: humidity,
      lastOnline: new Date(),
      status: MachineStatus.ONLINE,
    });

    // ALWAYS send to WebSocket (Real-time to frontend)
    this.machineGateway.sendTemperatureUpdate(machine.id, {
      machineCode,
      machineName: machine.name,
      machineLocation: machine.location,
      temperature,
      humidity,
      timestamp: new Date().toISOString(),
    });

    // Save to temperature_logs ONLY every 1 hour
    const lastSave = this.lastSaveTime.get(machine.id);
    const now = new Date();

    if (!lastSave || (now.getTime() - lastSave.getTime()) >= this.SAVE_INTERVAL) {
      const log = this.tempLogRepo.create({
        machineId: machine.id,
        temperature,
        humidity,
      });
      await this.tempLogRepo.save(log);

      this.lastSaveTime.set(machine.id, now);
      this.logger.log(`💾 Temperature log saved for ${machine.name} (Every 1 hour)`);
    } else {
      const nextSaveIn = Math.ceil((this.SAVE_INTERVAL - (now.getTime() - lastSave.getTime())) / 1000 / 60);
      this.logger.debug(`⏱️ Next save in ${nextSaveIn} minutes for ${machine.name}`);
    }

    this.logger.debug(`🌡️ Temperature updated for ${machine.name}: ${temperature}°C, Humidity: ${humidity}%`);
  }

  private async handleStatusUpdate(payload: MachineStatusPayload) {
    const { machineCode, status } = payload;

    const machine = await this.machineRepo.findOne({ where: { code: machineCode } });
    if (!machine) {
      this.logger.warn(`Machine with code ${machineCode} not found`);
      return;
    }

    const machineStatus = status === 'online' ? MachineStatus.ONLINE :
                          status === 'offline' ? MachineStatus.OFFLINE :
                          MachineStatus.MAINTENANCE;

    await this.machineRepo.update(machine.id, {
      status: machineStatus,
      lastOnline: new Date(),
    });

    // Send status update to frontend via WebSocket
    this.machineGateway.sendStatusUpdate(machine.id, status);

    this.logger.log(`🔄 Status updated for ${machine.name}: ${status}`);
  }

  private async handleHeartbeat(payload: any) {
    const { machineCode } = payload;

    const machine = await this.machineRepo.findOne({ where: { code: machineCode } });
    if (!machine) {
      return;
    }

    await this.machineRepo.update(machine.id, {
      lastOnline: new Date(),
      status: MachineStatus.ONLINE,
    });

    // Send heartbeat to frontend via WebSocket
    this.machineGateway.sendHeartbeat(machine.id, machineCode);

    this.logger.debug(`💓 Heartbeat from ${machine.name}`);
  }

  async publishDispenseCommand(machineCode: string, productId: number, quantity: number) {
    // Topic pattern: vending-machine/{machineCode}/dispense/{productId}
    const topic = `${machineCode}/dispense/${productId}`;
    
    try {
      this.logger.log(`📤 Starting dispense for Product ${productId} on ${machineCode}`);
      
      // Send ON command
      await this.publish(topic, 'ON');
      this.logger.log(`✅ Sent ON to ${topic}`);
      
      // Wait 5 seconds then send OFF
      setTimeout(async () => {
        try {
          await this.publish(topic, 'OFF');
          this.logger.log(`✅ Sent OFF to ${topic} after 5 seconds`);
        } catch (error) {
          this.logger.error(`❌ Failed to send OFF to ${topic}:`, error);
        }
      }, 5000);
      
      return true;
    } catch (error) {
      this.logger.error(`❌ Failed to publish dispense command to ${machineCode}:`, error);
      throw error;
    }
  }

  publish(topic: string, message: any) {
    return new Promise((resolve, reject) => {
      // If message is already a string, use it directly, otherwise stringify
      const payload = typeof message === 'string' ? message : JSON.stringify(message);
      
      this.client.publish(topic, payload, { qos: 1 }, (error) => {
        if (error) {
          this.logger.error(`Failed to publish to ${topic}:`, error);
          reject(error);
        } else {
          this.logger.log(`📤 Published to ${topic}:`, message);
          resolve(true);
        }
      });
    });
  }

  subscribe(topic: string) {
    return new Promise((resolve, reject) => {
      this.client.subscribe(topic, (error) => {
        if (error) {
          this.logger.error(`Failed to subscribe to ${topic}:`, error);
          reject(error);
        } else {
          this.logger.log(`📡 Subscribed to: ${topic}`);
          resolve(true);
        }
      });
    });
  }

  unsubscribe(topic: string) {
    return new Promise((resolve, reject) => {
      this.client.unsubscribe(topic, (error) => {
        if (error) {
          this.logger.error(`Failed to unsubscribe from ${topic}:`, error);
          reject(error);
        } else {
          this.logger.log(`📡 Unsubscribed from: ${topic}`);
          resolve(true);
        }
      });
    });
  }

  isConnected(): boolean {
    return this.client && this.client.connected;
  }
}