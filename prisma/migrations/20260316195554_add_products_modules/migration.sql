/*
  Warnings:

  - You are about to drop the column `controlaEstoque` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `estoqueAtual` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `setorImpressao` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `unidade` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "controlaEstoque",
DROP COLUMN "estoqueAtual",
DROP COLUMN "setorImpressao",
DROP COLUMN "unidade",
ADD COLUMN     "availableCounter" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "availableDelivery" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "availableInStore" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "controlsStock" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "prepTimeMinutes" INTEGER,
ADD COLUMN     "printSector" TEXT,
ADD COLUMN     "stockCurrent" DECIMAL(10,3),
ADD COLUMN     "unit" TEXT;

-- CreateTable
CREATE TABLE "Additional" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Additional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAdditional" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "additionalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductAdditional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Combo" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Combo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComboItem" (
    "id" TEXT NOT NULL,
    "comboId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComboItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Additional_name_key" ON "Additional"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAdditional_productId_additionalId_key" ON "ProductAdditional"("productId", "additionalId");

-- CreateIndex
CREATE UNIQUE INDEX "ComboItem_comboId_productId_key" ON "ComboItem"("comboId", "productId");

-- AddForeignKey
ALTER TABLE "ProductAdditional" ADD CONSTRAINT "ProductAdditional_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAdditional" ADD CONSTRAINT "ProductAdditional_additionalId_fkey" FOREIGN KEY ("additionalId") REFERENCES "Additional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComboItem" ADD CONSTRAINT "ComboItem_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES "Combo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComboItem" ADD CONSTRAINT "ComboItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
