-- CreateTable
CREATE TABLE "GlossaryTerm" (
    "id" TEXT NOT NULL,
    "termEnglish" TEXT NOT NULL,
    "termKhmer" TEXT NOT NULL,
    "definitionEnglish" TEXT,
    "definitionKhmer" TEXT,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlossaryTerm_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GlossaryTerm_termEnglish_idx" ON "GlossaryTerm"("termEnglish");

-- CreateIndex
CREATE INDEX "GlossaryTerm_termKhmer_idx" ON "GlossaryTerm"("termKhmer");
