import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Machine, MachineStatus } from './entities/machine.entity';
import { TemperatureLog } from './entities/temperature-log.entity';
import { CreateMachineDto } from './dto/create-machine.dto';
import { UpdateMachineDto } from './dto/update-machine.dto';

@Injectable()
export class MachinesService {
  constructor(
    @InjectRepository(Machine)
    private machineRepo: Repository<Machine>,
    @InjectRepository(TemperatureLog)
    private tempLogRepo: Repository<TemperatureLog>,
  ) {}

  async findAll() {
    return this.machineRepo.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number) {
    const machine = await this.machineRepo.findOne({ where: { id } });
    if (!machine) {
      throw new NotFoundException(`Machine with ID ${id} not found`);
    }
    return machine;
  }

  async findByCode(code: string) {
    return this.machineRepo.findOne({ where: { code } });
  }

  async create(data: Partial<Machine>) {
    const machine = this.machineRepo.create(data);
    return this.machineRepo.save(machine);
  }

  async createMachine(createMachineDto: CreateMachineDto) {
    // Check if code already exists
    const existingByCode = await this.machineRepo.findOne({ 
      where: { code: createMachineDto.code } 
    });
    if (existingByCode) {
      throw new ConflictException(`Machine with code "${createMachineDto.code}" already exists`);
    }

    // Check if mqttTopic already exists
    const existingByTopic = await this.machineRepo.findOne({ 
      where: { mqttTopic: createMachineDto.mqttTopic } 
    });
    if (existingByTopic) {
      throw new ConflictException(`Machine with MQTT topic "${createMachineDto.mqttTopic}" already exists`);
    }

    const machine = this.machineRepo.create({
      ...createMachineDto,
      status: createMachineDto.status || MachineStatus.OFFLINE,
    });
    return this.machineRepo.save(machine);
  }

  async updateMachine(id: number, updateMachineDto: UpdateMachineDto) {
    const machine = await this.findOne(id);

    // Check if code is being updated and already exists
    if (updateMachineDto.code && updateMachineDto.code !== machine.code) {
      const existingByCode = await this.machineRepo.findOne({ 
        where: { code: updateMachineDto.code } 
      });
      if (existingByCode) {
        throw new ConflictException(`Machine with code "${updateMachineDto.code}" already exists`);
      }
    }

    // Check if mqttTopic is being updated and already exists
    if (updateMachineDto.mqttTopic && updateMachineDto.mqttTopic !== machine.mqttTopic) {
      const existingByTopic = await this.machineRepo.findOne({ 
        where: { mqttTopic: updateMachineDto.mqttTopic } 
      });
      if (existingByTopic) {
        throw new ConflictException(`Machine with MQTT topic "${updateMachineDto.mqttTopic}" already exists`);
      }
    }

    Object.assign(machine, updateMachineDto);
    return this.machineRepo.save(machine);
  }

  async removeMachine(id: number) {
    const machine = await this.findOne(id);
    await this.machineRepo.remove(machine);
  }

  async updateStatus(id: number, status: MachineStatus) {
    await this.machineRepo.update(id, {
      status,
      lastOnline: new Date(),
    });
    return this.findOne(id);
  }

  async updateTemperature(machineId: number, temperature: number, humidity?: number) {
    await this.machineRepo.update(machineId, {
      currentTemperature: temperature,
      currentHumidity: humidity,
      lastOnline: new Date(),
      status: MachineStatus.ONLINE,
    });

    const log = this.tempLogRepo.create({
      machineId,
      temperature,
      humidity,
    });
    return this.tempLogRepo.save(log);
  }

  async getTemperatureHistory(machineId: number, limit = 100) {
    return this.tempLogRepo.find({
      where: { machineId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getOnlineMachines() {
    return this.machineRepo.find({
      where: { status: MachineStatus.ONLINE },
    });
  }

  async getDashboardStats() {
    const total = await this.machineRepo.count();
    const online = await this.machineRepo.count({ where: { status: MachineStatus.ONLINE } });
    const offline = await this.machineRepo.count({ where: { status: MachineStatus.OFFLINE } });
    const maintenance = await this.machineRepo.count({ where: { status: MachineStatus.MAINTENANCE } });

    return {
      total,
      online,
      offline,
      maintenance,
    };
  }
}