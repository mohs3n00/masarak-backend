import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsProvider, SendSmsOptions } from '../sms.interface';
import { SmsException } from '../exceptions/sms.exception';

@Injectable()
export class InfobipProvider implements SmsProvider {
  private readonly logger = new Logger(InfobipProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async sendSms(options: SendSmsOptions): Promise<void> {
    const baseUrl = this.configService.get<string>('sms.infobip.baseUrl');
    const apiKey = this.configService.get<string>('sms.infobip.apiKey');
    const sender = this.configService.get<string>('sms.infobip.sender');

    if (!baseUrl || !apiKey || !sender) {
      throw new SmsException('Infobip configuration is missing');
    }

    try {
      // TODO: Replace with actual HTTP call to Infobip API
      // await axios.post(`${baseUrl}/sms/2/text/advanced`, {
      //   messages: [
      //     {
      //       from: sender,
      //       destinations: [{ to: options.to }],
      //       text: options.message,
      //     },
      //   ],
      // }, { headers: { Authorization: `App ${apiKey}` } });

      this.logger.debug(
        `[MOCK] Infobip SMS sent to ${options.to}: ${options.message}`,
      );
    } catch (error: any) {
      this.logger.error(`Failed to send SMS via Infobip: ${error.message}`);
      throw new SmsException('Failed to send SMS via Infobip', error);
    }
  }
}
