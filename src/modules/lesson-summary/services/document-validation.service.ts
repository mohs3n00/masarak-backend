import { BadRequestException, Injectable } from '@nestjs/common';
import {
  LESSON_SUMMARY_SCHEMA_VERSION,
} from '../constants/lesson-summary.constants';
import type {
  DocumentValidationService,
} from '../interfaces/lesson-summary.interfaces';
import type {
  AnalysisOutput,
  DocumentModel,
  VersionedJsonArtifact,
} from '../types/lesson-summary.types';
import {
  validateAnalysisOutput,
  validateDocumentModel,
} from './lesson-summary.validators';

@Injectable()
export class DocumentValidationServiceImpl implements DocumentValidationService {
  validateAnalysisEnvelope(
    payload: unknown,
  ): payload is VersionedJsonArtifact<AnalysisOutput> {
    const env = payload as VersionedJsonArtifact<AnalysisOutput>;
    return (
      !!env &&
      typeof env === 'object' &&
      env.schemaVersion === LESSON_SUMMARY_SCHEMA_VERSION &&
      typeof env.createdAt === 'string' &&
      typeof env.generatedBy === 'string' &&
      typeof env.model === 'string' &&
      typeof env.promptVersion === 'string' &&
      validateAnalysisOutput(env.data)
    );
  }

  validateDocumentEnvelope(
    payload: unknown,
  ): payload is VersionedJsonArtifact<DocumentModel> {
    const env = payload as VersionedJsonArtifact<DocumentModel>;
    return (
      !!env &&
      typeof env === 'object' &&
      env.schemaVersion === LESSON_SUMMARY_SCHEMA_VERSION &&
      typeof env.createdAt === 'string' &&
      typeof env.generatedBy === 'string' &&
      typeof env.model === 'string' &&
      typeof env.promptVersion === 'string' &&
      validateDocumentModel(env.data)
    );
  }

  ensureNoDuplicateBlocks(model: DocumentModel): void {
    const seen = new Set<string>();

    for (const block of model.blocks) {
      const normalized = `${block.metadata.type}::${block.title || ''}::${block.content.trim()}`;
      if (!block.content.trim()) {
        throw new BadRequestException('Empty block content is not allowed');
      }

      if (seen.has(normalized)) {
        throw new BadRequestException('Duplicate blocks detected');
      }

      seen.add(normalized);
    }
  }
}
