import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ID, Query } from 'node-appwrite';
import { AppwriteService } from '../../shared/appwrite/appwrite.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';

const COLLECTION = process.env.APPWRITE_TEACHER_STUDIO_COLLECTION_ID || 'TeacherStudioProjects';

@Injectable()
export class TeacherStudioService {
  constructor(private readonly appwrite: AppwriteService, private readonly config: ConfigService) {}

  async createCampaign(teacherId: string, dto: CreateCampaignDto) {
    const endpoint = this.config.get<string>('lessonSummary.openRouterEndpoint');
    const apiKey = this.config.get<string>('lessonSummary.openRouterApiKey');
    const model = this.config.get<string>('teacherStudio.model');
    const promptVersion = this.config.get<string>('teacherStudio.promptVersion') || 'teacher-studio-campaign-v1';
    if (!endpoint || !apiKey || !model) throw new ServiceUnavailableException('Teacher Studio AI is not configured');
    const response = await fetch(endpoint, {
      method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, temperature: 0.6, response_format: { type: 'json_object' }, messages: [
        { role: 'system', content: 'You are an Arabic educational marketing assistant. Return only JSON with title, caption, hashtags, youtubeDescription, whatsappMessage, visualBrief. Do not invent claims not supplied by the teacher.' },
        { role: 'user', content: JSON.stringify({ topic: dto.topic, context: dto.context || '', format: dto.format, audience: dto.audience || [] }) },
      ] }),
    });
    const body = await response.json();
    if (!response.ok || typeof body?.choices?.[0]?.message?.content !== 'string') throw new ServiceUnavailableException('Teacher Studio AI did not return a valid response');
    let output: Record<string, unknown>;
    try { output = JSON.parse(body.choices[0].message.content); } catch { throw new ServiceUnavailableException('Teacher Studio AI returned invalid JSON'); }
    const now = new Date().toISOString();
    const saved = await this.appwrite.databases.createDocument(this.appwrite.databaseId, COLLECTION, ID.unique(), {
      teacherId, type: dto.format, topic: dto.topic, promptVersion, payloadJson: JSON.stringify(output), createdAt: now, updatedAt: now,
    });
    return { id: saved.$id, promptVersion, output };
  }

  async projects(teacherId: string) {
    const result = await this.appwrite.databases.listDocuments(this.appwrite.databaseId, COLLECTION, [Query.equal('teacherId', teacherId), Query.orderDesc('updatedAt')]);
    return result.documents.map((document) => ({ id: document.$id, type: document.type, topic: document.topic, promptVersion: document.promptVersion, createdAt: document.createdAt, payload: this.json(document.payloadJson) }));
  }

  private json(value: unknown) { try { return JSON.parse(String(value)); } catch { return null; } }
}
