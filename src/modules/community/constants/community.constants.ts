/**
 * Community collection identifiers.
 * These are used as Appwrite collection IDs within the community database.
 * The database ID itself comes from AppwriteService.databaseId (env config).
 */
export const COMMUNITY_COLLECTIONS = {
  SPACES: 'spaces',
  POSTS: 'posts',
  COMMENTS: 'comments',
  REACTIONS: 'reactions',
  ATTACHMENTS: 'attachments',
  REPORTS: 'reports',
  NOTIFICATIONS: 'notifications',
} as const;

/** Default pagination */
export const COMMUNITY_DEFAULTS = {
  PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 50,
  MAX_CONTENT_LENGTH: 10000,
  MAX_COMMENT_LENGTH: 5000,
  MAX_TAGS: 10,
  MAX_ATTACHMENTS_PER_POST: 10,
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
} as const;

/** Allowed file MIME types */
export const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  pdf: ['application/pdf'],
  document: [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
  ],
};

/** Roles with moderation privileges */
export const MODERATOR_ROLES = ['ADMIN', 'SUPER_ADMIN'] as const;

/** Roles that can pin posts */
export const PIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'TEACHER'] as const;

/** Roles that can mark Q&A as answered */
export const ANSWER_ROLES = ['ADMIN', 'SUPER_ADMIN', 'TEACHER'] as const;
