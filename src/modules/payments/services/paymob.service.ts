import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class PaymobService {
  private readonly logger = new Logger(PaymobService.name);
  private readonly secretKey = process.env.PAYMOB_SECRET_KEY;
  private readonly hmacSecret = process.env.PAYMOB_HMAC;

  async createIntention(
    amount: number,
    currency: string,
    specialReference: string,
    billingData: {
      first_name: string;
      last_name: string;
      email: string;
      phone_number: string;
    },
  ): Promise<string> {
    if (!this.secretKey) {
      this.logger.error('PAYMOB_SECRET_KEY is not defined.');
      throw new InternalServerErrorException('Payment gateway misconfigured.');
    }

    const payload = {
      amount: Math.round(amount * 100), // NextGen expects exact amount in cents/piasters depending on API.
      currency,
      payment_methods: ['card', 'wallet', 'kiosk'],
      items: [],
      billing_data: {
        ...billingData,
        apartment: 'NA',
        floor: 'NA',
        street: 'NA',
        building: 'NA',
        city: 'NA',
        country: 'EG',
      },
      special_reference: specialReference,
    };

    try {
      const response = await fetch('https://next.paymob.com/v1/intention/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${this.secretKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.text();
        this.logger.error(`Paymob intention creation failed: ${errorData}`);
        throw new InternalServerErrorException('Failed to initialize payment.');
      }

      const data = await response.json();
      return data.client_secret;
    } catch (error) {
      this.logger.error('Error communicating with Paymob:', error);
      throw new InternalServerErrorException('Payment gateway error.');
    }
  }

  verifyWebhookHmac(payload: any, signature: string): boolean {
    if (!this.hmacSecret) {
      this.logger.error('PAYMOB_HMAC is not defined.');
      return false;
    }

    const obj = payload.obj || payload;

    // NextGen Webhook signature usually hashes the string payload or specific fields.
    // Let's implement the classic transaction webhook HMAC verification just in case it falls back to it.
    const classicString = [
      obj.amount_cents,
      obj.created_at,
      obj.currency,
      obj.error_occured,
      obj.has_parent_transaction,
      obj.id,
      obj.integration_id,
      obj.is_3d_secure,
      obj.is_auth,
      obj.is_capture,
      obj.is_refunded,
      obj.is_standalone_payment,
      obj.is_voided,
      obj.order?.id,
      obj.owner,
      obj.pending,
      obj.source_data?.pan,
      obj.source_data?.sub_type,
      obj.source_data?.type,
      obj.success,
    ].join('');

    const classicHmac = crypto
      .createHmac('sha512', this.hmacSecret)
      .update(classicString)
      .digest('hex');
      
    // Intention NextGen Webhook: HMAC of raw payload string
    const stringifiedHmac = crypto
      .createHmac('sha512', this.hmacSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (signature === classicHmac || signature === stringifiedHmac) {
      return true;
    }
    
    // Check if HMAC is matching using lowercase/uppercase (sometimes paymob sends lower, sometimes upper)
    if (signature.toLowerCase() === classicHmac.toLowerCase() || signature.toLowerCase() === stringifiedHmac.toLowerCase()) {
      return true;
    }

    return false;
  }
}
