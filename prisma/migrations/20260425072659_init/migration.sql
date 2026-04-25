-- CreateEnum
CREATE TYPE "HeiType" AS ENUM ('PUBLIC', 'PRIVATE', 'INTERNATIONAL');

-- CreateEnum
CREATE TYPE "DegreeLevel" AS ENUM ('MASTERS', 'PHD');

-- CreateEnum
CREATE TYPE "ThesisLanguage" AS ENUM ('ENGLISH', 'KHMER', 'OTHER');

-- CreateEnum
CREATE TYPE "ThesisStatus" AS ENUM ('DRAFT', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ReleasePolicy" AS ENUM ('IMMEDIATE', 'DELAY_6M', 'DELAY_1Y', 'DELAY_2Y', 'DELAY_3Y', 'DELAY_5Y');

-- CreateEnum
CREATE TYPE "ReleaseReason" AS ENUM ('PATENT', 'PUBLICATION', 'COMMERCIAL', 'SENSITIVE', 'OTHER');

-- CreateEnum
CREATE TYPE "License" AS ENUM ('ALL_RIGHTS_RESERVED', 'CC_BY', 'CC_BY_NC', 'CC_BY_NC_ND');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PUBLIC', 'METADATA_ONLY', 'HIDDEN');

-- CreateTable
CREATE TABLE "HEI" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKhmer" TEXT,
    "shortCode" TEXT NOT NULL,
    "type" "HeiType" NOT NULL,
    "city" TEXT,
    "contactEmail" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HEI_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Thesis" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleKhmer" TEXT,
    "abstract" TEXT NOT NULL,
    "abstractKhmer" TEXT,
    "keywords" TEXT[],
    "language" "ThesisLanguage" NOT NULL,
    "pageCount" INTEGER,
    "authorFirstName" TEXT NOT NULL,
    "authorLastName" TEXT NOT NULL,
    "authorEmail" TEXT,
    "degreeLevel" "DegreeLevel" NOT NULL,
    "fieldOfStudy" TEXT NOT NULL,
    "defenseYear" INTEGER NOT NULL,
    "supervisorName" TEXT NOT NULL,
    "coSupervisorNames" TEXT[],
    "heiId" TEXT NOT NULL,
    "status" "ThesisStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "releasePolicy" "ReleasePolicy" NOT NULL,
    "releaseReason" "ReleaseReason",
    "releaseJustification" TEXT,
    "publicReleaseAt" TIMESTAMP(3),
    "license" "License" NOT NULL,
    "licenseAcknowledged" BOOLEAN NOT NULL DEFAULT false,
    "authorshipConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "visibility" "Visibility" NOT NULL DEFAULT 'METADATA_ONLY',
    "pdfFileKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Thesis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HEI_shortCode_key" ON "HEI"("shortCode");

-- AddForeignKey
ALTER TABLE "Thesis" ADD CONSTRAINT "Thesis_heiId_fkey" FOREIGN KEY ("heiId") REFERENCES "HEI"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
