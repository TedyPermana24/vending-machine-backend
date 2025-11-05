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

  // Static Questions - Tidak perlu database
  private readonly SYMPTOM_QUESTIONS: SymptomQuestion[] = [
    {
      id: 'Q1',
      text: 'Apakah Anda mengalami nyeri haid?',
      symptomCode: 'G1',
      symptomName: 'Nyeri Haid',
    },
    {
      id: 'Q2',
      text: 'Apakah Anda mengalami masalah pencernaan (seperti sembelit atau kembung)?',
      symptomCode: 'G2',
      symptomName: 'Gangguan Pencernaan',
    },
    {
      id: 'Q3',
      text: 'Apakah Anda perlu mengontrol kadar gula darah?',
      symptomCode: 'G3',
      symptomName: 'Perlu Kontrol Gula Darah',
    },
    {
      id: 'Q4',
      text: 'Apakah daya tahan tubuh Anda sedang lemah?',
      symptomCode: 'G4',
      symptomName: 'Daya Tahan Tubuh Lemah',
    },
    {
      id: 'Q5',
      text: 'Apakah nafsu makan Anda menurun?',
      symptomCode: 'G5',
      symptomName: 'Nafsu Makan Menurun',
    },
    {
      id: 'Q6',
      text: 'Apakah Anda mengalami batuk atau hidung tersumbat?',
      symptomCode: 'G6',
      symptomName: 'Batuk/Hidung Tersumbat',
    },
    {
      id: 'Q7',
      text: 'Apakah Anda memiliki masalah kesehatan hati (liver)?',
      symptomCode: 'G7',
      symptomName: 'Masalah Liver/Hati',
    },
    {
      id: 'Q8',
      text: 'Apakah Anda butuh perlindungan antioksidan untuk melawan radikal bebas?',
      symptomCode: 'G8',
      symptomName: 'Butuh Antioksidan',
    },
    {
      id: 'Q9',
      text: 'Apakah Anda (pria) merasa stamina menurun?',
      symptomCode: 'G9',
      symptomName: 'Stamina Menurun (Pria)',
    },
    {
      id: 'Q10',
      text: 'Apakah Anda mengalami pegal linu atau nyeri otot pinggang?',
      symptomCode: 'G10',
      symptomName: 'Pegal Linu/Nyeri Otot',
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
    return { 
      message: 'Expert system ready. Questions and symptoms are loaded in memory.',
      totalQuestions: this.SYMPTOM_QUESTIONS.length,
      totalRules: this.RULES.length,
    };
  }

  async getInitialQuestion(): Promise<DiagnoseResponseDto> {
    const sessionId = this.generateSessionId();
    this.sessions.set(sessionId, {
      collectedSymptoms: [],
      currentQuestionIndex: 0,
    });

    const firstQuestion = this.SYMPTOM_QUESTIONS[0];

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

  async diagnose(
    diagnoseRequest: DiagnoseRequestDto,
  ): Promise<DiagnoseResponseDto> {
    const { questionId, selectedOptionId, sessionId } = diagnoseRequest;

    if (!sessionId) {
      throw new NotFoundException('Session ID is required');
    }

    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found. Please start over.');
    }

    const currentQuestion = this.SYMPTOM_QUESTIONS.find(q => q.id === questionId);
    if (!currentQuestion) {
      throw new NotFoundException('Question not found');
    }

    if (selectedOptionId.endsWith('_yes')) {
      session.collectedSymptoms.push(currentQuestion.symptomCode);
    }

    session.currentQuestionIndex++;

    if (session.currentQuestionIndex < this.SYMPTOM_QUESTIONS.length) {
      const nextQ = this.SYMPTOM_QUESTIONS[session.currentQuestionIndex];

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
        productName: product.nama,
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
Anda adalah asisten kesehatan herbal yang ramah dan informatif.

INFORMASI PRODUK:
- Nama: ${product.nama}
- Deskripsi: ${product.deskripsi}
- Manfaat: ${product.manfaat}
- Harga: Rp ${product.harga.toLocaleString('id-ID')}

KONDISI PENGGUNA:
- Gejala yang dialami: ${symptoms.join(', ')}
- Diagnosis: ${diagnosis}

TUGAS ANDA:
Buatlah penjelasan yang ramah, personal, dan informatif dengan struktur berikut:

1. Sapaan empati tentang kondisi mereka
2. Penjelasan singkat mengapa produk ini cocok untuk gejala mereka
3. Manfaat utama produk untuk mengatasi keluhan
4. Tips/saran praktis untuk mempercepat pemulihan (3-5 poin)
5. Penutup yang encouraging

ATURAN:
- Gunakan bahasa Indonesia yang natural dan ramah
- Maksimal 250 kata
- Fokus pada manfaat produk sesuai database
- Berikan tips kesehatan yang umum dan aman
- Jangan buat klaim medis yang berlebihan
- Gunakan paragraf yang mudah dibaca

Berikan penjelasan sekarang:
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return text.trim();
    } catch (error) {
      console.error('Error generating AI explanation:', error);
      // Fallback jika AI gagal
      return this.generateFallbackExplanation(symptoms, diagnosis, product);
    }
  }

  private generateFallbackExplanation(
    symptoms: string[],
    diagnosis: string,
    product: Product,
  ): string {
    return `Berdasarkan gejala yang Anda alami (${symptoms.join(', ')}), kami mendiagnosis kondisi Anda sebagai ${diagnosis}.

Kami merekomendasikan ${product.nama} karena produk ini memiliki manfaat:
${product.manfaat}

${product.deskripsi}

Tips untuk mempercepat pemulihan:
• Konsumsi produk secara teratur sesuai anjuran
• Istirahat yang cukup
• Minum air putih minimal 8 gelas per hari
• Konsumsi makanan bergizi seimbang
• Jika gejala berlanjut lebih dari 3 hari, konsultasikan dengan dokter

Semoga lekas membaik! 🌿`;
  }

  private forwardChaining(symptoms: string[]): {
    productId: number;
    diagnosisName: string;
    symptoms: string[];
  } | null {
    if (symptoms.length === 0) {
      return null;
    }

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
              this.SYMPTOM_QUESTIONS.find(q => q.symptomCode === code)?.symptomName || code
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
    return this.SYMPTOM_QUESTIONS;
  }

  getAllRules(): Rule[] {
    return this.RULES;
  }
}