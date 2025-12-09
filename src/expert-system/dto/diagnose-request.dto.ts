export class DiagnoseRequestDto {
  questionId: string;
  selectedOptionId: string;
  sessionId?: string; 
}

export class DiagnoseResponseDto {
  isComplete: boolean;
  sessionId?: string;
  nextQuestion?: {
    id: string;
    text: string;
    options: {
      id: string;
      text: string;
    }[];
  };
  recommendation?: {
    productId: number;
    productName: string;
    alasan: string;
  };
}
