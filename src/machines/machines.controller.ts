import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { MachinesService } from './machines.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CreateMachineDto } from './dto/create-machine.dto';
import { UpdateMachineDto } from './dto/update-machine.dto';

@Controller('machines')
export class MachinesController {
  constructor(private readonly machinesService: MachinesService) {}

  @Get()
  async findAll() {
    return this.machinesService.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createMachineDto: CreateMachineDto) {
    return this.machinesService.createMachine(createMachineDto);
  }

  @Get('online')
  async getOnlineMachines() {
    return this.machinesService.getOnlineMachines();
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getDashboard() {
    return this.machinesService.getDashboardStats();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.machinesService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async update(@Param('id') id: string, @Body() updateMachineDto: UpdateMachineDto) {
    return this.machinesService.updateMachine(+id, updateMachineDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    return this.machinesService.removeMachine(+id);
  }

  @Get(':id/temperature')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getTemperatureHistory(@Param('id') id: string) {
    return this.machinesService.getTemperatureHistory(+id);
  }
}