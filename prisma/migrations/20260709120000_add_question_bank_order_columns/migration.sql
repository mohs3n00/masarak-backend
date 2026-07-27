-- Add missing ordering columns used by the question bank models.
ALTER TABLE "QuestionBankItem"
ADD COLUMN IF NOT EXISTS "order" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "QuestionChoice"
ADD COLUMN IF NOT EXISTS "order" INTEGER NOT NULL DEFAULT 0;