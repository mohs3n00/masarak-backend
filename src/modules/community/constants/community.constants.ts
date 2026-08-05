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

/** Community Types */
export const COMMUNITY_TYPES = [
  'DEFAULT_ACADEMIC',
  'TEACHER',
  'STUDENT',
  'OFFICIAL',
  'PRIVATE',
] as const;
export type CommunityType = (typeof COMMUNITY_TYPES)[number];

/** Community Categories */
export const COMMUNITY_CATEGORIES = [
  'SECONDARY_GRADE_1',
  'SECONDARY_GRADE_2',
  'SECONDARY_GRADE_3',
  'EDUCATION',
  'UNIVERSITY',
  'PROGRAMMING',
  'LANGUAGES',
  'CAREER',
  'TECHNOLOGY',
  'GENERAL',
] as const;
export type CommunityCategory = (typeof COMMUNITY_CATEGORIES)[number];

/** Community Post Types */
export const POST_TYPES = [
  'QUESTION',
  'DISCUSSION',
  'RESOURCE',
  'NOTE',
  'ANNOUNCEMENT',
] as const;
export type PostType = (typeof POST_TYPES)[number];

/** Community Visibilities */
export const COMMUNITY_VISIBILITIES = [
  'PUBLIC',
  'PRIVATE',
  'APPROVAL_REQUIRED',
] as const;
export type CommunityVisibility = (typeof COMMUNITY_VISIBILITIES)[number];

/** Community Statuses */
export const COMMUNITY_STATUSES = [
  'PENDING_REVIEW',
  'APPROVED',
  'REJECTED',
  'CHANGES_REQUESTED',
  'SUSPENDED',
  'ARCHIVED',
] as const;
export type CommunityStatus = (typeof COMMUNITY_STATUSES)[number];

/** Hierarchical Default Subject Communities List */
export const DEFAULT_SUBJECT_COMMUNITIES = [
  // Grade 3 Secondary
  { name: 'فيزياء الصف الثالث الثانوي', nameEn: 'Physics Grade 3', slug: 'physics-grade3', category: 'SECONDARY_GRADE_3', gradeLevel: 3, icon: 'Atom' },
  { name: 'كيمياء الصف الثالث الثانوي', nameEn: 'Chemistry Grade 3', slug: 'chemistry-grade3', category: 'SECONDARY_GRADE_3', gradeLevel: 3, icon: 'FlaskConical' },
  { name: 'رياضيات الصف الثالث الثانوي', nameEn: 'Math Grade 3', slug: 'math-grade3', category: 'SECONDARY_GRADE_3', gradeLevel: 3, icon: 'Calculator' },
  { name: 'أحياء الصف الثالث الثانوي', nameEn: 'Biology Grade 3', slug: 'biology-grade3', category: 'SECONDARY_GRADE_3', gradeLevel: 3, icon: 'Dna' },
  { name: 'اللغة العربية - الثانوية العامة', nameEn: 'Arabic Grade 3', slug: 'arabic-grade3', category: 'SECONDARY_GRADE_3', gradeLevel: 3, icon: 'BookOpen' },
  { name: 'اللغة الإنجليزية - الثانوية العامة', nameEn: 'English Grade 3', slug: 'english-grade3', category: 'SECONDARY_GRADE_3', gradeLevel: 3, icon: 'Languages' },

  // Grade 2 Secondary
  { name: 'فيزياء الصف الثاني الثانوي', nameEn: 'Physics Grade 2', slug: 'physics-grade2', category: 'SECONDARY_GRADE_2', gradeLevel: 2, icon: 'Atom' },
  { name: 'كيمياء الصف الثاني الثانوي', nameEn: 'Chemistry Grade 2', slug: 'chemistry-grade2', category: 'SECONDARY_GRADE_2', gradeLevel: 2, icon: 'FlaskConical' },
  { name: 'رياضيات الصف الثاني الثانوي', nameEn: 'Math Grade 2', slug: 'math-grade2', category: 'SECONDARY_GRADE_2', gradeLevel: 2, icon: 'Calculator' },
  { name: 'أحياء الصف الثاني الثانوي', nameEn: 'Biology Grade 2', slug: 'biology-grade2', category: 'SECONDARY_GRADE_2', gradeLevel: 2, icon: 'Dna' },

  // Grade 1 Secondary
  { name: 'علوم الصف الأول الثانوي', nameEn: 'Science Grade 1', slug: 'science-grade1', category: 'SECONDARY_GRADE_1', gradeLevel: 1, icon: 'Atom' },
  { name: 'رياضيات الصف الأول الثانوي', nameEn: 'Math Grade 1', slug: 'math-grade1', category: 'SECONDARY_GRADE_1', gradeLevel: 1, icon: 'Calculator' },

  // Programming & Technology
  { name: 'تطوير التطبيقات بـ Flutter', nameEn: 'Flutter', slug: 'flutter', category: 'PROGRAMMING', icon: 'Smartphone' },
  { name: 'الذكاء الاصطناعي وتعلم الآلة', nameEn: 'Artificial Intelligence', slug: 'ai', category: 'TECHNOLOGY', icon: 'Bot' },
  { name: 'تطوير الويب الشامل', nameEn: 'Web Development', slug: 'web-dev', category: 'PROGRAMMING', icon: 'Code' },
  { name: 'الأمن السيبراني وحماية البيانات', nameEn: 'Cyber Security', slug: 'cyber-security', category: 'TECHNOLOGY', icon: 'ShieldCheck' },
];

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
