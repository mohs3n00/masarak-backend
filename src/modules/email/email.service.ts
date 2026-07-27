import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly resend: Resend;
  private readonly logger = new Logger(EmailService.name);
  private readonly defaultFrom = 'Masarak <noreply@masarak.com>'; // Update with verified domain

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY is not defined. Emails will be logged instead of sent.');
    }
    this.resend = new Resend(apiKey || 'dummy');
  }

  async sendPasswordResetEmail(email: string, code: string) {
    if (!process.env.RESEND_API_KEY) {
      this.logger.log(`[SIMULATED EMAIL] Password reset code for ${email}: ${code}`);
      return;
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.defaultFrom,
        to: [email],
        subject: 'إعادة ضبط كلمة المرور - منصة مسارك',
        html: `
          <div dir="rtl" style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #004D40; margin: 0;">منصة مسارك</h1>
            </div>
            
            <h2 style="color: #222;">طلب استعادة كلمة المرور</h2>
            <p>لقد تلقينا طلباً لإعادة ضبط كلمة المرور الخاصة بحسابك.</p>
            <p>يرجى استخدام كود التحقق التالي لإتمام العملية:</p>
            
            <div style="background-color: #f4f4f5; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <span style="font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #000;">${code}</span>
            </div>
            
            <p style="color: #666; font-size: 14px;">هذا الكود صالح لمدة <strong>5 دقائق</strong> فقط.</p>
            <p style="color: #666; font-size: 14px;">إذا لم تقم بهذا الطلب، يمكنك تجاهل هذه الرسالة بأمان. لن يتم تغيير كلمة المرور الخاصة بك.</p>
            
            <hr style="border: none; border-top: 1px solid #eaeaea; margin: 30px 0;" />
            <div style="text-align: center; color: #999; font-size: 12px;">
              &copy; ${new Date().getFullYear()} منصة مسارك. جميع الحقوق محفوظة.
            </div>
          </div>
        `,
      });

      if (error) {
        this.logger.error(`Failed to send password reset email to ${email}:`, error);
      }
    } catch (err) {
      this.logger.error(`Error sending email to ${email}`, err);
    }
  }
}
