import { Controller, Post, Body, Get } from '@nestjs/common';
import { ExpertSystemService, SymptomQuestion, Rule, InitializeResponse } from './expert-system.service';
import {
  DiagnoseRequestDto,
  DiagnoseResponseDto,
} from './dto/diagnose-request.dto';

@Controller('expert-system')
export class ExpertSystemController {
  constructor(private readonly expertSystemService: ExpertSystemService) {}

  @Post('initialize')
  async initialize(): Promise<InitializeResponse> {
    return await this.expertSystemService.initialize();
  }

  @Get('start')
  async startDiagnosis(): Promise<DiagnoseResponseDto> {
    return await this.expertSystemService.getInitialQuestion();
  }

  @Post('diagnose')
  async diagnose(
    @Body() diagnoseRequest: DiagnoseRequestDto,
  ): Promise<DiagnoseResponseDto> {
    console.log('🔍 Diagnose endpoint called with:', JSON.stringify(diagnoseRequest));
    return await this.expertSystemService.diagnose(diagnoseRequest);
  }

  @Get('questions')
  async getAllQuestions(): Promise<SymptomQuestion[]> {
    return this.expertSystemService.getAllQuestions();
  }

  @Get('rules')
  async getAllRules(): Promise<Rule[]> {
    return this.expertSystemService.getAllRules();
  }
}
