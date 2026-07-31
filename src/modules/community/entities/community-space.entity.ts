/** Community space entity — framework-agnostic domain object */
export class CommunitySpaceEntity {
  id: string;
  type: 'global' | 'course' | 'lesson' | 'teacher';
  referenceId: string | null;
  name: string;
  description: string | null;
  slug: string;
  isArchived: boolean;
  createdAt: string;
  metadata: string | null;

  constructor(partial: Partial<CommunitySpaceEntity>) {
    Object.assign(this, partial);
  }
}
