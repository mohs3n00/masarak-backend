import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsProvider, SendSmsOptions } from '../sms.interface';
import { SmsException } from '../exceptions/sms.exception';

@Injectable()
export class UnifonicProvider implements SmsProvider {
  private readonly logger = new Logger(UnifonicProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async sendSms(options: SendSmsOptions): Promise<void> {
    const appSid = this.configService.get<string>('sms.unifonic.appSid');
    const senderId = this.configService.get<string>('sms.unifonic.senderId');

    if (!appSid || !senderId) {
      throw new SmsException('Unifonic configuration is missing');
    }

    try {
      // TODO: Replace with actual HTTP call to Unifonic API
      // await axios.post('https://el.cloud.unifonic.com/rest/SMS/messages', {
      //   AppSid: appSid,
      //   SenderID: senderId,
      //   Body: options.message,
      //   Recipient: options.to,
      // });

      this.logger.debug(
        `[MOCK] Unifonic SMS sent to ${options.to}: ${options.message}`,
      );
    } catch (error: any) {
      this.logger.error(`Failed to send SMS via Unifonic: ${error.message}`);
      throw new SmsException('Failed to send SMS via Unifonic', error);
    }
  }
}
