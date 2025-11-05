export class MidtransNotificationDto {
  transaction_status: string;
  status_code: string;
  transaction_id: string;
  order_id: string;
  gross_amount: string;
  payment_type: string;
  transaction_time: string;
  fraud_status?: string;
  signature_key: string;
}