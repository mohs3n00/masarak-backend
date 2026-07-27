-- Add missing media/text columns used by the teacher exam builder.
ALTER TABLE "QuestionBankItem"
ADD COLUMN IF NOT EXISTS "imageUrl" TEXT,
ADD COLUMN IF NOT EXISTS "explanation" TEXT;

ALTER TABLE "QuestionChoice"
ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;