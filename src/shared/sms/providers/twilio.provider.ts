import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsProvider, SendSmsOptions } from '../sms.interface';
import { SmsException } from '../exceptions/sms.exception';

@Injectable()
export class TwilioProvider implements SmsProvider {
  private readonly logger = new Logger(TwilioProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async sendSms(options: SendSmsOptions): Promise<void> {
    const accountSid = this.configService.get<string>('sms.twilio.accountSid');
    const authToken = this.configService.get<string>('sms.twilio.authToken');
    const from = this.configService.get<string>('sms.twilio.phoneNumber');

    if (!accountSid || !authToken || !from) {
      this.logger.warn('Twilio configuration is missing. Mocking SMS sending.');
    }

    try {
      // TODO: Replace with official `twilio` SDK implementation when ready
      // const client = require('twilio')(accountSid, authToken);
      // await client.messages.create({ body: options.message, from, to: options.to });

      this.logger.debug(
        `[MOCK] Twilio SMS sent to ${options.to}: ${options.message}`,
      );
    } catch (error: any) {
      this.logger.error(`Failed to send SMS via Twilio: ${error.message}`);
      throw new SmsException('Failed to send SMS via Twilio', error);
    }
  }
}
