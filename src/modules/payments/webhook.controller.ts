import { Controller, Post, Body, Headers, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PaymentsService } from './services/payments.service';

@ApiTags('Webhooks')
@Controller('webhooks/paymob')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Paymob callback webhooks' })
  async handlePaymobWebhook(
    @Headers('hmac') hmacHeader: string,
    @Body() payload: any,
  ) {
    this.logger.log('Received Paymob webhook');
    
    // Sometimes HMAC is passed in query params if it's a GET request, but Paymob webhooks are POST.
    const hmac = hmacHeader || payload.hmac;

    if (!hmac) {
      this.logger.warn('Missing HMAC signature in Paymob webhook');
      // Always return 200 to acknowledge receipt to Paymob, even if invalid, to prevent retries
      return { success: false, message: 'Missing signature' };
    }

    try {
      const result = await this.paymentsService.processWebhook(payload, hmac);
      this.logger.log(`Webhook processing result: ${JSON.stringify(result)}`);
    } catch (error) {
      this.logger.error('Error processing Paymob webhook', error);
    }

    // Always respond with 200 OK so Paymob knows we received it
    return { success: true };
  }
}
