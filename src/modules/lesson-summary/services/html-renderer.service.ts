import { Injectable } from '@nestjs/common';
import { HtmlRenderer } from '../interfaces/lesson-summary.interfaces';
import { LayoutModel } from '../types/lesson-summary.types';

@Injectable()
export class HtmlRendererService implements HtmlRenderer {
  async render(layout: LayoutModel): Promise<string> {
    const pages = layout.pages
      .map((page) => {
        const blocks = page.items
          .map((item) => this.renderBlock(item.payload, page.pageNumber, layout.pages.length))
          .join('');

        return `
          <section class="page" data-page="${page.pageNumber}">
            <header class="page-header">${this.escapeHtml(layout.header)}</header>
            <main class="page-content">${blocks}</main>
            <footer class="page-footer">${this.escapeHtml(
              layout.footerTemplate
                .replace('{{page}}', String(page.pageNumber))
                .replace('{{pages}}', String(layout.pages.length)),
            )}</footer>
          </section>
        `;
      })
      .join('');

    return `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${this.escapeHtml(layout.lessonTitle)}</title>
    <style>
      @page { size: A4; margin: 12mm; }
      :root {
        --brand-primary: #0b3a53;
        --brand-surface: #f5f8fa;
        --brand-border: #c8d5df;
        --brand-text: #13232f;
        --brand-muted: #51616d;
        --radius: 10px;
        --spacing: 12px;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        color: var(--brand-text);
        font-family: "Cairo", "Noto Kufi Arabic", "Tahoma", sans-serif;
        background: #fff;
      }
      .page {
        width: 100%;
        min-height: 272mm;
        display: flex;
        flex-direction: column;
        gap: var(--spacing);
        page-break-after: always;
      }
      .page:last-child { page-break-after: auto; }
      .page-header {
        font-size: 14px;
        color: var(--brand-primary);
        border-bottom: 1px solid var(--brand-border);
        padding-bottom: 8px;
        font-weight: 700;
      }
      .page-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .page-footer {
        font-size: 11px;
        color: var(--brand-muted);
        border-top: 1px solid var(--brand-border);
        padding-top: 8px;
        text-align: center;
      }
      .card {
        border: 1px solid var(--brand-border);
        background: var(--brand-surface);
        border-radius: var(--radius);
        padding: 10px 12px;
        break-inside: avoid;
      }
      .card-title { margin: 0 0 6px; font-size: 15px; color: var(--brand-primary); }
      .card-content { margin: 0; line-height: 1.7; font-size: 13px; }
      .card-list { margin: 8px 0 0; padding: 0 16px 0 0; }
      .card-list li { margin: 4px 0; line-height: 1.7; font-size: 13px; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; background: #fff; }
      th, td { border: 1px solid var(--brand-border); padding: 6px; text-align: right; }
      th { background: #e9f0f5; color: var(--brand-primary); }
      .badge {
        display: inline-block;
        border-radius: 999px;
        background: #e9f0f5;
        color: var(--brand-primary);
        padding: 2px 8px;
        font-size: 11px;
        margin-bottom: 6px;
      }
      .warning { border-right: 4px solid #bb3a1a; }
      .important { border-right: 4px solid #0d6e48; }
      .formula { border-right: 4px solid #274c9b; font-family: "Noto Naskh Arabic", serif; }
    </style>
  </head>
  <body>${pages}</body>
</html>`;
  }

  private renderBlock(block: any, pageNumber: number, totalPages: number): string {
    const title = block.title || this.translateType(block.metadata.type);
    const typeClass = block.metadata.type;
    const content = this.escapeHtml(block.content).replace(/\n/g, '<br/>');
    const items = Array.isArray(block.items)
      ? `<ul class="card-list">${block.items
          .map((item: string) => `<li>${this.escapeHtml(item)}</li>`)
          .join('')}</ul>`
      : '';

    const table = block.table
      ? `<table><thead><tr>${block.table.headers
          .map((header: string) => `<th>${this.escapeHtml(header)}</th>`)
          .join('')}</tr></thead><tbody>${block.table.rows
          .map(
            (row: string[]) =>
              `<tr>${row.map((cell) => `<td>${this.escapeHtml(cell)}</td>`).join('')}</tr>`,
          )
          .join('')}</tbody></table>`
      : '';

    return `
      <article class="card ${this.escapeHtml(typeClass)}">
        <span class="badge">${this.escapeHtml(this.translateType(block.metadata.type))}</span>
        <h3 class="card-title">${this.escapeHtml(title)}</h3>
        <p class="card-content">${content}</p>
        ${items}
        ${table}
      </article>
    `;
  }

  private translateType(type: string): string {
    const map: Record<string, string> = {
      summary: 'ملخص',
      heading: 'عنوان رئيسي',
      subheading: 'عنوان فرعي',
      definition: 'تعريف',
      law: 'قانون',
      formula: 'معادلة',
      example: 'مثال',
      important: 'مهم',
      warning: 'تحذير',
      note: 'ملاحظة',
      exercise: 'تمرين',
      mcq: 'سؤال اختيار من متعدد',
      table: 'جدول',
      comparison: 'مقارنة',
      mindmap: 'خريطة ذهنية',
      timeline: 'تسلسل زمني',
      steps: 'خطوات',
      tip: 'نصيحة',
      image_placeholder: 'صورة توضيحية',
      quote: 'اقتباس',
      reference: 'مرجع',
    };

    return map[type] || 'محتوى';
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
