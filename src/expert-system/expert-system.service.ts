import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConfigService } from '@nestjs/config';
import {
  DiagnoseRequestDto,
  DiagnoseResponseDto,
} from './dto/diagnose-request.dto';
import { Product } from '../products/entities/product.entity';

interface UserSession {
  collectedSymptoms: string[];
  currentQuestionIndex: number;
  gender?: 'male' | 'female';
}

export interface Rule {
  id: string;
  condition: string[];
  diagnosis?: string;
  diagnosisName?: string;
  productId?: number;
}

export interface SymptomQuestion {
  id: string;
  text: string;
  symptomCode: string;
  symptomName: string;
}

export interface InitializeResponse {
  message: string;
  totalQuestions: number;
  totalRules: number;
}

@Injectable()
export class ExpertSystemService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  // Product IDs sesuai dengan database
  private readonly PRODUCTS = {
    KUNYIT_ASAM: 1,
    BERAS_KENCUR: 2,
    SARI_TEMULAWAK: 3,
    KUKUBIMA_TL: 4,
  };

  private readonly PRODUCT_NAMES: Record<number, string> = {
    1: 'Jamu Kunyit Asam',
    2: 'Jamu Beras Kencur',
    3: 'Sari Temulawak Deli',
    4: 'KukuBima TL Herbal Sidomuncul',
  };

  // Knowledge Base - Rules untuk Forward Chaining
  private readonly RULES: Rule[] = [
    // Aturan Diagnosis untuk Jamu Kunyit Asam (ID1)
    {
      id: 'R1',
      condition: ['G1'],
      diagnosis: 'D1',
      diagnosisName: 'Nyeri Haid',
    },
    {
      id: 'R2',
      condition: ['G2'],
      diagnosis: 'D2',
      diagnosisName: 'Gangguan Pencernaan',
    },
    {
      id: 'R3',
      condition: ['G3'],
      diagnosis: 'D3',
      diagnosisName: 'Perlu Kontrol Gula Darah',
    },
    
    // Aturan Diagnosis untuk Jamu Beras Kencur (ID2)
    {
      id: 'R4',
      condition: ['G4'],
      diagnosis: 'D4',
      diagnosisName: 'Daya Tahan Tubuh Lemah',
    },
    {
      id: 'R5',
      condition: ['G5'],
      diagnosis: 'D5',
      diagnosisName: 'Nafsu Makan Menurun',
    },
    {
      id: 'R6',
      condition: ['G6'],
      diagnosis: 'D6',
      diagnosisName: 'Masalah Pernapasan',
    },
    
    // Aturan Diagnosis untuk Sari Temulawak (ID3)
    {
      id: 'R7',
      condition: ['G7'],
      diagnosis: 'D7',
      diagnosisName: 'Masalah Kesehatan Hati',
    },
    {
      id: 'R8',
      condition: ['G8'],
      diagnosis: 'D8',
      diagnosisName: 'Butuh Perlindungan Antioksidan',
    },
    
    // Aturan Diagnosis untuk KukuBima TL (ID4)
    {
      id: 'R9',
      condition: ['G9'],
      diagnosis: 'D9',
      diagnosisName: 'Stamina Menurun',
    },
    {
      id: 'R10',
      condition: ['G10'],
      diagnosis: 'D10',
      diagnosisName: 'Pegal Linu dan Nyeri Otot',
    },
    
    // Aturan Rekomendasi Produk
    {
      id: 'R11',
      condition: ['D1', 'D2', 'D3'],
      productId: this.PRODUCTS.KUNYIT_ASAM,
    },
    {
      id: 'R12',
      condition: ['D4', 'D5', 'D6'],
      productId: this.PRODUCTS.BERAS_KENCUR,
    },
    {
      id: 'R13',
      condition: ['D7', 'D8'],
      productId: this.PRODUCTS.SARI_TEMULAWAK,
    },
    {
      id: 'R14',
      condition: ['D9', 'D10'],
      productId: this.PRODUCTS.KUKUBIMA_TL,
    },
  ];

  // Static Questions - Pertanyaan berbeda untuk pria dan wanita
  private readonly SYMPTOM_QUESTIONS_FEMALE: SymptomQuestion[] = [
    {
      id: 'QF1',
      text: 'Apakah Anda mengalami nyeri haid?',
      symptomCode: 'G1',
      symptomName: 'Nyeri Haid',
    },
    {
      id: 'QF2',
      text: 'Apakah Anda mengalami masalah pencernaan (seperti sembelit atau kembung)?',
      symptomCode: 'G2',
      symptomName: 'Gangguan Pencernaan',
    },
    {
      id: 'QF3',
      text: 'Apakah Anda perlu mengontrol kadar gula darah?',
      symptomCode: 'G3',
      symptomName: 'Perlu Kontrol Gula Darah',
    },
    {
      id: 'QF4',
      text: 'Apakah daya tahan tubuh Anda sedang lemah?',
      symptomCode: 'G4',
      symptomName: 'Daya Tahan Tubuh Lemah',
    },
    {
      id: 'QF5',
      text: 'Apakah nafsu makan Anda menurun?',
      symptomCode: 'G5',
      symptomName: 'Nafsu Makan Menurun',
    },
    {
      id: 'QF6',
      text: 'Apakah Anda mengalami batuk atau hidung tersumbat?',
      symptomCode: 'G6',
      symptomName: 'Batuk/Hidung Tersumbat',
    },
    {
      id: 'QF7',
      text: 'Apakah Anda memiliki masalah kesehatan hati (liver)?',
      symptomCode: 'G7',
      symptomName: 'Masalah Liver/Hati',
    },
    {
      id: 'QF8',
      text: 'Apakah Anda butuh perlindungan antioksidan untuk melawan radikal bebas?',
      symptomCode: 'G8',
      symptomName: 'Butuh Antioksidan',
    },
  ];

  private readonly SYMPTOM_QUESTIONS_MALE: SymptomQuestion[] = [
    {
      id: 'QM1',
      text: 'Apakah Anda merasa stamina menurun?',
      symptomCode: 'G9',
      symptomName: 'Stamina Menurun',
    },
    {
      id: 'QM2',
      text: 'Apakah Anda mengalami pegal linu atau nyeri otot pinggang?',
      symptomCode: 'G10',
      symptomName: 'Pegal Linu/Nyeri Otot',
    },
    {
      id: 'QM3',
      text: 'Apakah daya tahan tubuh Anda sedang lemah?',
      symptomCode: 'G4',
      symptomName: 'Daya Tahan Tubuh Lemah',
    },
    {
      id: 'QM4',
      text: 'Apakah nafsu makan Anda menurun?',
      symptomCode: 'G5',
      symptomName: 'Nafsu Makan Menurun',
    },
    {
      id: 'QM5',
      text: 'Apakah Anda mengalami batuk atau hidung tersumbat?',
      symptomCode: 'G6',
      symptomName: 'Batuk/Hidung Tersumbat',
    },
    {
      id: 'QM6',
      text: 'Apakah Anda memiliki masalah kesehatan hati (liver)?',
      symptomCode: 'G7',
      symptomName: 'Masalah Liver/Hati',
    },
    {
      id: 'QM7',
      text: 'Apakah Anda butuh perlindungan antioksidan untuk melawan radikal bebas?',
      symptomCode: 'G8',
      symptomName: 'Butuh Antioksidan',
    },
  ];

  private sessions: Map<string, UserSession> = new Map();

  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private configService: ConfigService,
  ) {
    // Initialize Gemini AI
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemma-3-4b-it' });
    }
  }

  async initialize(): Promise<InitializeResponse> {
    const totalQuestions = Math.max(
      this.SYMPTOM_QUESTIONS_FEMALE.length,
      this.SYMPTOM_QUESTIONS_MALE.length
    );
    return { 
      message: 'Expert system ready. Questions and symptoms are loaded in memory.',
      totalQuestions,
      totalRules: this.RULES.length,
    };
  }

  async getInitialQuestion(): Promise<DiagnoseResponseDto> {
    const sessionId = this.generateSessionId();
    this.sessions.set(sessionId, {
      collectedSymptoms: [],
      currentQuestionIndex: -1, // -1 menandakan belum pilih gender
    });
    console.log('✅ Session created:', sessionId);
    console.log('📊 Total active sessions:', this.sessions.size);

    return {
      isComplete: false,
      sessionId,
      nextQuestion: {
        id: 'Q_GENDER',
        text: 'Apa jenis kelamin Anda?',
        options: [
          { id: 'Q_GENDER_male', text: 'Pria' },
          { id: 'Q_GENDER_female', text: 'Wanita' },
        ],
      },
    };
  }

  async diagnose(
    diagnoseRequest: DiagnoseRequestDto,
  ): Promise<DiagnoseResponseDto> {
    const { questionId, selectedOptionId, sessionId } = diagnoseRequest;

    console.log('🔍 Diagnose called with sessionId:', sessionId);
    console.log('📊 Active sessions:', Array.from(this.sessions.keys()));
    console.log('📊 Total sessions:', this.sessions.size);

    if (!sessionId) {
      throw new NotFoundException('Session ID is required');
    }

    const session = this.sessions.get(sessionId);
    if (!session) {
      console.log('❌ Session NOT FOUND:', sessionId);
      console.log('❌ Available sessions:', Array.from(this.sessions.keys()));
      throw new NotFoundException('Session not found. Please start over.');
    }
    console.log('✅ Session found:', sessionId, 'Gender:', session.gender, 'Index:', session.currentQuestionIndex);

    // Handle gender selection
    if (questionId === 'Q_GENDER') {
      session.gender = selectedOptionId === 'Q_GENDER_male' ? 'male' : 'female';
      session.currentQuestionIndex = 0;

      const questions = session.gender === 'female' 
        ? this.SYMPTOM_QUESTIONS_FEMALE 
        : this.SYMPTOM_QUESTIONS_MALE;
      
      const firstQuestion = questions[0];

      return {
        isComplete: false,
        sessionId,
        nextQuestion: {
          id: firstQuestion.id,
          text: firstQuestion.text,
          options: [
            { id: `${firstQuestion.id}_yes`, text: 'Ya' },
            { id: `${firstQuestion.id}_no`, text: 'Tidak' },
          ],
        },
      };
    }

    // Get the appropriate question set based on gender
    const questions = session.gender === 'female' 
      ? this.SYMPTOM_QUESTIONS_FEMALE 
      : this.SYMPTOM_QUESTIONS_MALE;

    const currentQuestion = questions.find(q => q.id === questionId);
    if (!currentQuestion) {
      throw new NotFoundException('Question not found');
    }

    if (selectedOptionId.endsWith('_yes')) {
      session.collectedSymptoms.push(currentQuestion.symptomCode);
    }

    session.currentQuestionIndex++;

    if (session.currentQuestionIndex < questions.length) {
      const nextQ = questions[session.currentQuestionIndex];

      return {
        isComplete: false,
        sessionId,
        nextQuestion: {
          id: nextQ.id,
          text: nextQ.text,
          options: [
            { id: `${nextQ.id}_yes`, text: 'Ya' },
            { id: `${nextQ.id}_no`, text: 'Tidak' },
          ],
        },
      };
    }

    // Semua pertanyaan selesai, jalankan Forward Chaining
    const diagnosis = this.forwardChaining(session.collectedSymptoms);

    // Hapus session setelah selesai
    this.sessions.delete(sessionId);

    if (!diagnosis) {
      return {
        isComplete: true,
        sessionId,
        recommendation: {
          productId: 0,
          productName: 'Tidak Ditemukan',
          alasan: 'Maaf, berdasarkan gejala yang Anda pilih, sistem tidak dapat menemukan rekomendasi produk yang sesuai. Silakan konsultasikan dengan tenaga kesehatan.',
        },
      };
    }

    // Get product details from database
    const product = await this.productRepository.findOne({
      where: { id: diagnosis.productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Generate AI explanation using Gemini
    const aiExplanation = await this.generateAIExplanation(
      diagnosis.symptoms,
      diagnosis.diagnosisName,
      product,
    );

    return {
      isComplete: true,
      sessionId,
      recommendation: {
        productId: diagnosis.productId,
        productName: product.name,
        alasan: aiExplanation,
      },
    };
  }

  private async generateAIExplanation(
    symptoms: string[],
    diagnosis: string,
    product: Product,
  ): Promise<string> {
    try {
      const prompt = `
Anda adalah asisten kesehatan herbal yang profesional dan to-the-point.

PRODUK: ${product.name}
GEJALA: ${symptoms.join(', ')}
DIAGNOSIS: ${diagnosis}

TUGAS: Buat penjelasan SINGKAT (maksimal 150 kata) dengan format:

1. Satu kalimat kenapa produk ini cocok
2. 2-3 manfaat utama (bullet points)
3. 2-3 tips praktis (bullet points)

ATURAN KETAT:
- Langsung to the point, NO sapaan bertele-tele
- NO emoji berlebihan (max 2)
- NO kata "semoga lekas membaik" atau sejenisnya
- Fokus pada fakta dan manfaat
- Bahasa profesional tapi tetap ramah

Contoh format yang benar:
"${product.name} cocok untuk mengatasi ${diagnosis.toLowerCase()} yang Anda alami.

Manfaat utama:
• [manfaat 1]
• [manfaat 2]

Tips penggunaan:
• Konsumsi 2x sehari
• Minum air putih cukup"
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return text.trim();
    } catch (error) {
      console.error('Error generating AI explanation:', error);
      return this.generateFallbackExplanation(symptoms, product);
    }
  }

  private generateFallbackExplanation(
    symptoms: string[],
    product: Product,
  ): string {
    return `${product.name} cocok untuk mengatasi keluhan yang Anda alami.

Manfaat:
• ${product.manfaat.split(',')[0]?.trim() || product.manfaat}

Tips:
• Konsumsi secara teratur
• Istirahat cukup
• Minum air putih minimal 8 gelas/hari`;
  }

  private forwardChaining(symptoms: string[]): {
    productId: number;
    diagnosisName: string;
    symptoms: string[];
  } | null {
    if (symptoms.length === 0) {
      return null;
    }

    const allQuestions = [...this.SYMPTOM_QUESTIONS_FEMALE, ...this.SYMPTOM_QUESTIONS_MALE];

    for (const rule of this.RULES.filter((r) => r.diagnosis)) {
      const isMatch = rule.condition.some((cond) => symptoms.includes(cond));
      if (isMatch && rule.diagnosis && rule.diagnosisName) {
        const productRule = this.RULES.find(
          (r) => r.productId && r.condition.includes(rule.diagnosis as string),
        );
        
        if (productRule && productRule.productId) {
          return {
            productId: productRule.productId,
            diagnosisName: rule.diagnosisName,
            symptoms: symptoms.map(code => 
              allQuestions.find(q => q.symptomCode === code)?.symptomName || code
            ),
          };
        }
      }
    }

    return null;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getAllQuestions(): SymptomQuestion[] {
    return [...this.SYMPTOM_QUESTIONS_FEMALE, ...this.SYMPTOM_QUESTIONS_MALE];
  }

  getAllRules(): Rule[] {
    return this.RULES;
  }
}