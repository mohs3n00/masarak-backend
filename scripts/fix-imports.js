const fs = require('fs');
const path = require('path');
const services = [
  { f: 'community-attachment.service.ts', r: 'ICommunityAttachmentRepository', c: 'COMMUNITY_ATTACHMENT_REPOSITORY' },
  { f: 'community-comment.service.ts', r: 'ICommunityCommentRepository', c: 'COMMUNITY_COMMENT_REPOSITORY' },
  { f: 'community-notification.service.ts', r: 'ICommunityNotificationRepository', c: 'COMMUNITY_NOTIFICATION_REPOSITORY' },
  { f: 'community-reaction.service.ts', r: 'ICommunityReactionRepository', c: 'COMMUNITY_REACTION_REPOSITORY' },
  { f: 'community-search.service.ts', r: 'ICommunityPostRepository', c: 'COMMUNITY_POST_REPOSITORY' },
  { f: 'community-space.service.ts', r: 'ICommunitySpaceRepository', c: 'COMMUNITY_SPACE_REPOSITORY' }
];

services.forEach(s => {
  const p = path.join(__dirname, '../src/modules/community/services', s.f);
  let content = fs.readFileSync(p, 'utf8');
  content = content.replace(/import \{ type ,  \} from '\.\.\/interfaces';/, \import { type \, \ } from '../interfaces';\);
  fs.writeFileSync(p, content);
});
