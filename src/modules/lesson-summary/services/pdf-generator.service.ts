import { Injectable, Logger } from '@nestjs/common';
import { chromium } from 'playwright';
import { PdfGenerator } from '../interfaces/lesson-summary.interfaces';

@Injectable()
export class PdfGeneratorService implements PdfGenerator {
  private readonly logger = new Logger(PdfGeneratorService.name);

  async generate(html: string): Promise<Buffer> {
    const browser = await chromium.launch({ headless: true });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '12mm',
          right: '12mm',
          bottom: '12mm',
          left: '12mm',
        },
        preferCSSPageSize: true,
      });

      return Buffer.from(pdf);
    } catch (error) {
      this.logger.error('Failed to generate PDF', error as Error);
      throw error;
    } finally {
      await browser.close();
    }
  }
}
