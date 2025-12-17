import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { MachinesService } from './machines.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('machines')
@UseGuards(JwtAuthGuard)
export class MachinesController {
  constructor(private readonly machinesService: MachinesService) {}

  @Get()
  async findAll() {
    return this.machinesService.findAll();
  }

  @Get('online')
  async getOnlineMachines() {
    return this.machinesService.getOnlineMachines();
  }

  @Get('dashboard')
  @UseGuards(AdminGuard)
  async getDashboard() {
    return this.machinesService.getDashboardStats();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.machinesService.findOne(+id);
  }

  @Get(':id/temperature')
  @UseGuards(AdminGuard)
  async getTemperatureHistory(@Param('id') id: string) {
    return this.machinesService.getTemperatureHistory(+id);
  }
}