import { Injectable, Logger } from '@nestjs/common';
import { AppwriteService } from '../../../../shared/appwrite/appwrite.service';
import { ICommunitySpaceRepository, SpaceFilters } from '../../interfaces';
import { CommunitySpaceEntity } from '../../entities';
import { COMMUNITY_COLLECTIONS } from '../../constants/community.constants';
import { Query, ID } from 'node-appwrite';

@Injectable()
export class AppwriteSpaceRepository implements ICommunitySpaceRepository {
  private readonly logger = new Logger(AppwriteSpaceRepository.name);

  private get collectionId() {
    return COMMUNITY_COLLECTIONS.SPACES;
  }

  constructor(private readonly appwrite: AppwriteService) {}

  async create(
    data: Omit<CommunitySpaceEntity, 'id'>,
  ): Promise<CommunitySpaceEntity> {
    const metaObj = {
      communityId: data.communityId,
      category: data.category,
      rules: data.rules,
      visibility: data.visibility,
      status: data.status,
      avatarUrl: data.avatarUrl,
      coverUrl: data.coverUrl,
      gradeLevel: data.gradeLevel,
      subject: data.subject,
      language: data.language,
      school: data.school,
      university: data.university,
      parentSlug: data.parentSlug,
      weeklyActivityScore: 0,
      newMembersWeekly: 0,
      commentsPerPostRatio: 0,
    };

    const fullPayload: any = {
      ...data,
      tags: data.tags || [],
      createdAt: data.createdAt || new Date().toISOString(),
      metadata: JSON.stringify(metaObj),
    };

    try {
      const doc = await this.appwrite.databases.createDocument(
        this.appwrite.databaseId,
        this.collectionId,
        ID.unique(),
        fullPayload,
      );
      return this.mapToEntity(doc);
    } catch (err: any) {
      this.logger.warn(`Appwrite full payload create failed, trying fallback: ${err.message}`);
      const metaObj = {
        communityId: data.communityId,
        category: data.category,
        rules: data.rules,
        visibility: data.visibility,
        status: data.status,
        avatarUrl: data.avatarUrl,
        coverUrl: data.coverUrl,
        gradeLevel: data.gradeLevel,
        subject: data.subject,
        language: data.language,
        school: data.school,
        university: data.university,
        parentSlug: data.parentSlug,
        tags: data.tags || [],
        membersCount: data.membersCount !== undefined && data.membersCount !== null ? data.membersCount : 0,
        postsCount: data.postsCount || 0,
        onlineCount: data.onlineCount || 0,
        createdById: data.createdById || 'SYSTEM',
        createdByName: data.createdByName || 'Masarak Platform',
        weeklyActivityScore: 0,
        newMembersWeekly: 0,
        commentsPerPostRatio: 0,
      };

      const basePayload: any = {
        type: data.type || 'DEFAULT_ACADEMIC',
        referenceId: data.referenceId || null,
        name: data.name,
        description: data.description || '',
        slug: data.slug,
        isArchived: data.isArchived || false,
        createdAt: data.createdAt || new Date().toISOString(),
        metadata: JSON.stringify(metaObj),
      };

      const doc = await this.appwrite.databases.createDocument(
        this.appwrite.databaseId,
        this.collectionId,
        ID.unique(),
        basePayload,
      );
      return this.mapToEntity(doc);
    }
  }

  async findById(id: string): Promise<CommunitySpaceEntity | null> {
    try {
      const doc = await this.appwrite.databases.getDocument(
        this.appwrite.databaseId,
        this.collectionId,
        id,
      );
      return this.mapToEntity(doc);
    } catch {
      const all = await this.findAll();
      return all.find((s) => s.id === id || s.slug === id || s.communityId === id) || null;
    }
  }

  async findBySlug(slug: string): Promise<CommunitySpaceEntity | null> {
    const decoded = decodeURIComponent(slug);
    try {
      const result = await this.appwrite.databases.listDocuments(
        this.appwrite.databaseId,
        this.collectionId,
        [Query.equal('slug', decoded), Query.limit(1)],
      );
      if (result.documents.length > 0) {
        return this.mapToEntity(result.documents[0]);
      }
    } catch (err) {
      this.logger.warn(`Query by slug failed, using in-memory fallback for slug: ${slug}`);
    }

    // In-memory fallback: match slug, decoded slug, id, communityId, or name
    const all = await this.findAll();
    return all.find((s) => 
      s.slug === slug || 
      s.slug === decoded || 
      s.id === slug || 
      s.id === decoded || 
      s.communityId === slug || 
      s.communityId === decoded || 
      s.name === decoded
    ) || null;
  }

  async findByType(type: string): Promise<CommunitySpaceEntity[]> {
    try {
      const result = await this.appwrite.databases.listDocuments(
        this.appwrite.databaseId,
        this.collectionId,
        [
          Query.equal('type', type),
          Query.equal('isArchived', false),
          Query.limit(100),
        ],
      );
      return result.documents.map((doc) => this.mapToEntity(doc));
    } catch {
      const all = await this.findAll();
      return all.filter((s) => s.type === type);
    }
  }

  async findByReference(
    type: string,
    referenceId: string,
  ): Promise<CommunitySpaceEntity | null> {
    try {
      const result = await this.appwrite.databases.listDocuments(
        this.appwrite.databaseId,
        this.collectionId,
        [
          Query.equal('type', type),
          Query.equal('referenceId', referenceId),
          Query.limit(1),
        ],
      );
      if (result.documents.length > 0) {
        return this.mapToEntity(result.documents[0]);
      }
    } catch {
      const all = await this.findAll();
      return all.find((s) => s.type === type && s.referenceId === referenceId) || null;
    }
    return null;
  }

  async findAll(): Promise<CommunitySpaceEntity[]> {
    try {
      const result = await this.appwrite.databases.listDocuments(
        this.appwrite.databaseId,
        this.collectionId,
        [Query.limit(100)],
      );
      return result.documents.map((doc) => this.mapToEntity(doc));
    } catch {
      return [];
    }
  }

  async findWithFilters(filters: SpaceFilters): Promise<CommunitySpaceEntity[]> {
    const all = await this.findAll();
    let docs = all.filter((d) => !d.isArchived);

    if (filters.type && filters.type !== 'ALL') {
      docs = docs.filter((d) => d.type === filters.type);
    }
    if (filters.category && filters.category !== 'ALL') {
      docs = docs.filter((d) => d.category === filters.category);
    }
    if (filters.status && filters.status !== 'ALL') {
      docs = docs.filter((d) => d.status === filters.status);
    }
    if (filters.search) {
      const s = filters.search.toLowerCase();
      docs = docs.filter(
        (d) =>
          d.name.toLowerCase().includes(s) ||
          (d.description && d.description.toLowerCase().includes(s)) ||
          d.slug.toLowerCase().includes(s) ||
          (d.communityId && d.communityId.toLowerCase().includes(s)) ||
          (d.subject && d.subject.toLowerCase().includes(s)) ||
          (d.tags && d.tags.some(t => t.toLowerCase().includes(s)))
      );
    }

    const limit = filters.limit || 100;
    return docs.slice(0, limit);
  }

  async update(
    id: string,
    data: Partial<CommunitySpaceEntity>,
  ): Promise<CommunitySpaceEntity> {
    const updateData: Record<string, unknown> = { ...data };
    delete updateData.id;

    try {
      const doc = await this.appwrite.databases.updateDocument(
        this.appwrite.databaseId,
        this.collectionId,
        id,
        updateData,
      );
      return this.mapToEntity(doc);
    } catch (err: any) {
      this.logger.warn(`Direct update failed for space ${id}, attempting fallback metadata merge: ${err?.message || err}`);
      try {
        const existingDoc = await this.appwrite.databases.getDocument(
          this.appwrite.databaseId,
          this.collectionId,
          id,
        );
        let parsedMeta: Record<string, any> = {};
        if (existingDoc.metadata) {
          try {
            parsedMeta = typeof existingDoc.metadata === 'string' ? JSON.parse(existingDoc.metadata) : existingDoc.metadata;
          } catch {}
        }
        const newMeta = { ...parsedMeta, ...updateData };
        const fallbackPayload: Record<string, unknown> = {
          metadata: JSON.stringify(newMeta),
        };
        const knownRootKeys = ['type', 'referenceId', 'name', 'description', 'slug', 'isArchived', 'createdAt'];
        for (const key of knownRootKeys) {
          if (key in updateData && updateData[key] !== undefined) {
            fallbackPayload[key] = updateData[key];
          }
        }
        const doc = await this.appwrite.databases.updateDocument(
          this.appwrite.databaseId,
          this.collectionId,
          id,
          fallbackPayload,
        );
        return this.mapToEntity(doc);
      } catch (fallbackErr: any) {
        this.logger.error(`Fallback update failed for space ${id}: ${fallbackErr?.message || fallbackErr}`);
        const existing = await this.findById(id);
        if (!existing) throw new Error('Space not found');
        return existing;
      }
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.appwrite.databases.deleteDocument(
        this.appwrite.databaseId,
        this.collectionId,
        id,
      );
    } catch (err) {
      this.logger.error(`Delete space ${id} failed: ${err}`);
    }
  }

  async incrementMembersCount(id: string): Promise<void> {
    const space = await this.findById(id);
    if (!space) return;
    
    await this.update(id, { membersCount: (space.membersCount || 0) + 1 });
  }

  async decrementMembersCount(id: string): Promise<void> {
    const space = await this.findById(id);
    if (!space) return;
    
    const count = (space.membersCount || 0) - 1;
    await this.update(id, { membersCount: count > 0 ? count : 0 });
  }

  private mapToEntity(doc: any): CommunitySpaceEntity {
    let parsedMeta: any = {};
    if (doc.metadata) {
      try {
        parsedMeta = typeof doc.metadata === 'string' ? JSON.parse(doc.metadata) : doc.metadata;
      } catch {}
    }

    let membersCount = doc.membersCount ?? parsedMeta.membersCount ?? 0;
    if (typeof membersCount !== 'number') membersCount = parseInt(membersCount, 10) || 0;
    const createdById = doc.createdById || parsedMeta.createdById || null;
    const type = doc.type || parsedMeta.type || 'DEFAULT_ACADEMIC';
    if ((createdById === 'SYSTEM' || type === 'DEFAULT_ACADEMIC') && membersCount === 1) {
      membersCount = 0;
    }

    const entity = new CommunitySpaceEntity({
      id: doc.$id,
      communityId: doc.communityId || parsedMeta.communityId || `MSC-${doc.$id.substring(0, 5).toUpperCase()}`,
      type,
      category: doc.category || parsedMeta.category || 'EDUCATION',
      parentSlug: doc.parentSlug || parsedMeta.parentSlug || null,
      gradeLevel: doc.gradeLevel || parsedMeta.gradeLevel || null,
      subject: doc.subject || parsedMeta.subject || null,
      language: doc.language || parsedMeta.language || null,
      school: doc.school || parsedMeta.school || null,
      university: doc.university || parsedMeta.university || null,
      courseId: doc.courseId || parsedMeta.courseId || null,
      referenceId: doc.referenceId || null,
      name: doc.name,
      description: doc.description || null,
      slug: doc.slug,
      avatarUrl: doc.avatarUrl || parsedMeta.avatarUrl || null,
      coverUrl: doc.coverUrl || parsedMeta.coverUrl || null,
      tags: doc.tags || parsedMeta.tags || [],
      rules: doc.rules || parsedMeta.rules || null,
      visibility: doc.visibility || parsedMeta.visibility || 'PUBLIC',
      status: doc.status || parsedMeta.status || 'APPROVED',
      isArchived: doc.isArchived || false,
      membersCount,
      postsCount: doc.postsCount ?? parsedMeta.postsCount ?? 0,
      onlineCount: doc.onlineCount ?? parsedMeta.onlineCount ?? 0,
      createdById,
      createdByName: doc.createdByName || parsedMeta.createdByName || null,
      createdAt: doc.createdAt || doc.$createdAt,
      metadata: doc.metadata || null,
    });
    
    // Inject the parsed stats dynamically to the entity if needed. They are stored in metadata.
    (entity as any).weeklyActivityScore = parsedMeta.weeklyActivityScore || 0;
    (entity as any).newMembersWeekly = parsedMeta.newMembersWeekly || 0;
    (entity as any).commentsPerPostRatio = parsedMeta.commentsPerPostRatio || 0;
    
    return entity;
  }
}
