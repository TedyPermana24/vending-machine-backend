import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Machine, MachineStatus } from './entities/machine.entity';
import { TemperatureLog } from './entities/temperature-log.entity';

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