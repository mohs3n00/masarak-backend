const fs = require('fs');
const path = require('path');
const replaceInFile = (file, search, replace) => {
  const p = path.resolve(__dirname, '..', file);
  let content = fs.readFileSync(p, 'utf8');
  content = content.replace(search, replace);
  fs.writeFileSync(p, content);
};

// 1. Appwrite Attachment Repository
replaceInFile(
  'src/modules/community/repositories/appwrite/appwrite-attachment.repository.ts',
  import { Query, ID, InputFile } from 'node-appwrite';,
  import { Query, ID } from 'node-appwrite';\nimport { InputFile } from 'node-appwrite/file';
);

// 2. Services imports
const services = [
  { f: 'community-attachment.service.ts', i: 'ICommunityAttachmentRepository' },
  { f: 'community-comment.service.ts', i: 'ICommunityCommentRepository' },
  { f: 'community-notification.service.ts', i: 'ICommunityNotificationRepository' },
  { f: 'community-post.service.ts', i: 'ICommunityPostRepository' },
  { f: 'community-reaction.service.ts', i: 'ICommunityReactionRepository' },
  { f: 'community-search.service.ts', i: 'ICommunityPostRepository' },
  { f: 'community-space.service.ts', i: 'ICommunitySpaceRepository' },
];

for (const s of services) {
  replaceInFile(
    'src/modules/community/services/' + s.f,
    new RegExp(\import { \\\, ([A-Z_]+) } from '../interfaces';\),
    \import { type \,  } from '../interfaces';\
  );
}

// 3. Space service type error
replaceInFile(
  'src/modules/community/services/community-space.service.ts',
  ...dto,,
  ...dto,\n      type: dto.type as any,
);

// 4. Appwrite service string | undefined
replaceInFile(
  'src/shared/appwrite/appwrite.service.ts',
  	his.client.setEndpoint(endpoint).setProject(projectId).setKey(apiKey);,
  	his.client.setEndpoint(endpoint || '').setProject(projectId || '').setKey(apiKey || '');
);
replaceInFile(
  'src/shared/appwrite/appwrite.service.ts',
  	his._databaseId = this.configService.get<string>('appwrite.databaseId');,
  	his._databaseId = this.configService.get<string>('appwrite.databaseId') || '';
);
replaceInFile(
  'src/shared/appwrite/appwrite.service.ts',
  	his._bucketId = this.configService.get<string>('appwrite.bucketId');,
  	his._bucketId = this.configService.get<string>('appwrite.bucketId') || '';
);

