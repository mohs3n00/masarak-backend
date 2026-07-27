-- Bring the exam domain in line with the current Prisma schema.

-- Exam templates
ALTER TABLE "ExamTemplate"
ADD COLUMN IF NOT EXISTS "description" TEXT,
ADD COLUMN IF NOT EXISTS "instructions" TEXT,
ADD COLUMN IF NOT EXISTS "durationMin" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN IF NOT EXISTS "passingScore" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN IF NOT EXISTS "attemptsLimit" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS "rules" JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Exam sessions
ALTER TABLE "ExamSession"
ADD COLUMN IF NOT EXISTS "passingScore" INTEGER;

CREATE INDEX IF NOT EXISTS "ExamSession_examId_studentId_idx"
ON "ExamSession" ("examId", "studentId");

-- Exam answers
ALTER TABLE "ExamAnswer"
ADD COLUMN IF NOT EXISTS "selectedChoiceIds" JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS "ExamAnswer_sessionId_questionId_key"
ON "ExamAnswer" ("sessionId", "questionId");

CREATE INDEX IF NOT EXISTS "ExamAnswer_sessionId_questionId_idx"
ON "ExamAnswer" ("sessionId", "questionId");

-- Question bank revisions
ALTER TABLE "QuestionBankItem"
ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "QuestionBankItem"
ALTER COLUMN "type" SET DEFAULT 'MULTIPLE_CHOICE';

ALTER TABLE "QuestionChoice"
ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "QuestionBankItem_categoryId_isArchived_order_idx"
ON "QuestionBankItem" ("categoryId", "isArchived", "order");

CREATE INDEX IF NOT EXISTS "QuestionChoice_questionId_isArchived_order_idx"
ON "QuestionChoice" ("questionId", "isArchived", "order");