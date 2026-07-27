import { Injectable, Inject } from '@nestjs/common';
import type { SmsProvider } from './sms.interface';
import { SendSmsOptions } from './sms.interface';

@Injectable()
export class SmsService {
  constructor(
    @Inject('SMS_PROVIDER') private readonly smsProvider: SmsProvider,
  ) {}

  async sendSms(options: SendSmsOptions): Promise<void> {
    return this.smsProvider.sendSms(options);
  }

  async sendVerificationCode(to: string, code: string): Promise<void> {
    const message = `Your Masarak verification code is: ${code}`;
    return this.smsProvider.sendSms({ to, message });
  }
}
