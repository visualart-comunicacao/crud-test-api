/*
  Warnings:

  - You are about to drop the column `category` on the `CashMovement` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `CashMovement` table. All the data in the column will be lost.
  - You are about to drop the column `paymentMethod` on the `CashMovement` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `CashMovement` table. All the data in the column will be lost.
  - You are about to drop the column `closingNotes` on the `CashRegister` table. All the data in the column will be lost.
  - You are about to drop the column `openingNotes` on the `CashRegister` table. All the data in the column will be lost.
  - You are about to drop the column `printSector` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the `Additional` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Combo` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ComboItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductAdditional` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Setting` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "OrderOrigin" AS ENUM ('LOCAL', 'DELIVERY', 'RETIRADA');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('RECEBIDO', 'PREPARANDO', 'ROTA', 'ENTREGUE', 'CANCELADO');

-- CreateEnum
CREATE TYPE "DriverStatus" AS ENUM ('DISPONIVEL', 'EM_ROTA', 'INATIVO');

-- DropForeignKey
ALTER TABLE "CashMovement" DROP CONSTRAINT "CashMovement_cashRegisterId_fkey";

-- DropForeignKey
ALTER TABLE "ComboItem" DROP CONSTRAINT "ComboItem_comboId_fkey";

-- DropForeignKey
ALTER TABLE "ComboItem" DROP CONSTRAINT "ComboItem_productId_fkey";

-- DropForeignKey
ALTER TABLE "ProductAdditional" DROP CONSTRAINT "ProductAdditional_additionalId_fkey";

-- DropForeignKey
ALTER TABLE "ProductAdditional" DROP CONSTRAINT "ProductAdditional_productId_fkey";

-- DropIndex
DROP INDEX "CashMovement_cashRegisterId_idx";

-- DropIndex
DROP INDEX "CashMovement_orderId_idx";

-- DropIndex
DROP INDEX "CashMovement_type_idx";

-- DropIndex
DROP INDEX "CashRegister_status_idx";

-- DropIndex
DROP INDEX "Order_status_idx";

-- DropIndex
DROP INDEX "Order_tableId_idx";

-- DropIndex
DROP INDEX "Payment_cashRegisterId_idx";

-- DropIndex
DROP INDEX "Payment_orderId_idx";

-- AlterTable
ALTER TABLE "CashMovement" DROP COLUMN "category",
DROP COLUMN "description",
DROP COLUMN "paymentMethod",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "CashRegister" DROP COLUMN "closingNotes",
DROP COLUMN "openingNotes";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "changeFor" DECIMAL(10,2),
ADD COLUMN     "customerId" TEXT,
ADD COLUMN     "customerPhone" TEXT,
ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "deliveryAddress" TEXT,
ADD COLUMN     "deliveryChannel" TEXT,
ADD COLUMN     "deliveryNeighborhood" TEXT,
ADD COLUMN     "deliveryReference" TEXT,
ADD COLUMN     "deliveryStatus" "DeliveryStatus" NOT NULL DEFAULT 'RECEBIDO',
ADD COLUMN     "dispatchedAt" TIMESTAMP(3),
ADD COLUMN     "driverId" TEXT,
ADD COLUMN     "estimatedMinutes" INTEGER,
ADD COLUMN     "origin" "OrderOrigin" DEFAULT 'LOCAL',
ADD COLUMN     "priority" TEXT;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "printSector",
DROP COLUMN "unit";

-- DropTable
DROP TABLE "Additional";

-- DropTable
DROP TABLE "Combo";

-- DropTable
DROP TABLE "ComboItem";

-- DropTable
DROP TABLE "ProductAdditional";

-- DropTable
DROP TABLE "Setting";

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "neighborhood" TEXT,
    "reference" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Driver" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "status" "DriverStatus" NOT NULL DEFAULT 'DISPONIVEL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Order_origin_idx" ON "Order"("origin");

-- CreateIndex
CREATE INDEX "Order_deliveryStatus_idx" ON "Order"("deliveryStatus");

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

-- CreateIndex
CREATE INDEX "Order_driverId_idx" ON "Order"("driverId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_cashRegisterId_fkey" FOREIGN KEY ("cashRegisterId") REFERENCES "CashRegister"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
