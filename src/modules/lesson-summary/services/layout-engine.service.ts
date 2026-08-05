import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { LayoutEngine } from '../interfaces/lesson-summary.interfaces';
import {
  BlockType,
  DocumentBlock,
  DocumentModel,
  LayoutItem,
  LayoutModel,
  LayoutPage,
} from '../types/lesson-summary.types';
import { LESSON_SUMMARY_MANIFEST_PATH } from '../constants/lesson-summary.constants';

const A4_BODY_HEIGHT = 1020;

const NON_BREAKABLE_BLOCKS: ReadonlySet<BlockType> = new Set([
  'formula',
  'mindmap',
  'image_placeholder',
]);

const PREFER_KEEP_TOGETHER: ReadonlySet<BlockType> = new Set([
  'comparison',
  'table',
]);

@Injectable()
export class LayoutEngineService implements LayoutEngine {
  constructor(private readonly configService: ConfigService) {}

  async buildLayout(lessonId: string, model: DocumentModel): Promise<LayoutModel> {
    const designManifest = await this.loadDesignManifest();
    const pages: LayoutPage[] = [];
    let currentPage: LayoutPage = { pageNumber: 1, items: [] };
    let usedHeight = 0;

    for (const block of model.blocks) {
      const item = this.toLayoutItem(
        block,
        designManifest[block.metadata.type] || 'GenericCard',
      );
      const isNonBreakable = NON_BREAKABLE_BLOCKS.has(item.type) || item.keepTogether;

      if (usedHeight + item.estimatedHeight > A4_BODY_HEIGHT && currentPage.items.length > 0) {
        pages.push(currentPage);
        currentPage = { pageNumber: currentPage.pageNumber + 1, items: [] };
        usedHeight = 0;
      }

      if (!isNonBreakable && item.breakable && item.estimatedHeight > A4_BODY_HEIGHT) {
        const segments = this.splitBreakableItem(item, A4_BODY_HEIGHT);
        for (const segment of segments) {
          if (usedHeight + segment.estimatedHeight > A4_BODY_HEIGHT && currentPage.items.length > 0) {
            pages.push(currentPage);
            currentPage = { pageNumber: currentPage.pageNumber + 1, items: [] };
            usedHeight = 0;
          }
          currentPage.items.push(segment);
          usedHeight += segment.estimatedHeight;
        }
        continue;
      }

      currentPage.items.push(item);
      usedHeight += item.estimatedHeight;
    }

    if (currentPage.items.length) {
      pages.push(currentPage);
    }

    return {
      lessonId,
      lessonTitle: model.lessonTitle,
      pageSize: 'A4',
      pages,
      header: model.lessonTitle,
      footerTemplate: 'Masarak • Page {{page}} / {{pages}}',
    };
  }

  private toLayoutItem(block: DocumentBlock, designComponent: string): LayoutItem {
    const lines = Math.max(1, Math.ceil(block.content.length / 70));
    const itemsCount = block.items?.length || 0;
    const tableRows = block.table?.rows?.length || 0;
    const estimatedHeight = 56 + lines * 20 + itemsCount * 18 + tableRows * 24;

    return {
      blockId: block.id,
      type: block.metadata.type,
      designComponent,
      estimatedHeight,
      breakable: block.metadata.breakable,
      keepTogether:
        block.metadata.keepTogether || PREFER_KEEP_TOGETHER.has(block.metadata.type),
      payload: block,
    };
  }

  private splitBreakableItem(item: LayoutItem, maxHeight: number): LayoutItem[] {
    const lines = item.payload.content.split(/\n+/g);
    if (lines.length <= 1) {
      return [item];
    }

    const lineHeight = 24;
    const maxLinesPerChunk = Math.max(1, Math.floor((maxHeight - 80) / lineHeight));
    const chunks: LayoutItem[] = [];

    for (let i = 0; i < lines.length; i += maxLinesPerChunk) {
      const chunkLines = lines.slice(i, i + maxLinesPerChunk);
      const clone: LayoutItem = {
        ...item,
        blockId: `${item.blockId}__part_${Math.floor(i / maxLinesPerChunk) + 1}`,
        estimatedHeight: 56 + chunkLines.length * lineHeight,
        payload: {
          ...item.payload,
          content: chunkLines.join('\n'),
          items: undefined,
          table: undefined,
        },
      };
      chunks.push(clone);
    }

    return chunks;
  }

  private async loadDesignManifest(): Promise<Record<string, string>> {
    const configuredPath =
      this.configService.get<string>('lessonSummary.manifestPath') ||
      LESSON_SUMMARY_MANIFEST_PATH;
    const manifestPath = join(process.cwd(), configuredPath);
    const raw = await readFile(manifestPath, 'utf8');
    return JSON.parse(raw) as Record<string, string>;
  }
}
