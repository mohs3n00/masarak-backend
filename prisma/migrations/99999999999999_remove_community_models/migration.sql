-- DropForeignKey
ALTER TABLE "CommunityPost" DROP CONSTRAINT IF EXISTS "CommunityPost_authorId_fkey";
ALTER TABLE "CommunityComment" DROP CONSTRAINT IF EXISTS "CommunityComment_postId_fkey";
ALTER TABLE "CommunityComment" DROP CONSTRAINT IF EXISTS "CommunityComment_authorId_fkey";
ALTER TABLE "CommunityComment" DROP CONSTRAINT IF EXISTS "CommunityComment_parentId_fkey";
ALTER TABLE "CommunityReaction" DROP CONSTRAINT IF EXISTS "CommunityReaction_userId_fkey";
ALTER TABLE "CommunityReaction" DROP CONSTRAINT IF EXISTS "CommunityReaction_postId_fkey";
ALTER TABLE "CommunityReaction" DROP CONSTRAINT IF EXISTS "CommunityReaction_commentId_fkey";
ALTER TABLE "PostTag" DROP CONSTRAINT IF EXISTS "PostTag_postId_fkey";
ALTER TABLE "PostTag" DROP CONSTRAINT IF EXISTS "PostTag_tagId_fkey";

-- DropTable
DROP TABLE IF EXISTS "PostTag" CASCADE;
DROP TABLE IF EXISTS "CommunityTag" CASCADE;
DROP TABLE IF EXISTS "CommunityReaction" CASCADE;
DROP TABLE IF EXISTS "CommunityComment" CASCADE;
DROP TABLE IF EXISTS "CommunityPost" CASCADE;

-- DropEnum
DROP TYPE IF EXISTS "ReactionType" CASCADE;
DROP TYPE IF EXISTS "PostStatus" CASCADE;
