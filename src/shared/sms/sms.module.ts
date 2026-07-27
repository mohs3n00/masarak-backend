import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsService } from './sms.service';
import { TwilioProvider } from './providers/twilio.provider';
// import { UnifonicProvider } from './providers/unifonic.provider';
// import { InfobipProvider } from './providers/infobip.provider';

@Global()
@Module({
  providers: [
    {
      provide: 'SMS_PROVIDER',
      useFactory: (configService: ConfigService) => {
        // Here we can use an environment variable (e.g. SMS_DRIVER) to pick the active provider dynamically.
        // For now, we default to Twilio Provider.
        return new TwilioProvider(configService);
      },
      inject: [ConfigService],
    },
    SmsService,
  ],
  exports: [SmsService],
})
export class SmsModule {}
