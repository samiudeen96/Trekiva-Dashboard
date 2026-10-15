-- AlterTable
ALTER TABLE "CarrierSetting" ADD COLUMN "authHeaderName" TEXT;
ALTER TABLE "CarrierSetting" ADD COLUMN "authScheme" TEXT;
ALTER TABLE "CarrierSetting" ADD COLUMN "endpointUrl" TEXT;

-- CreateTable
CREATE TABLE "TrackingSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "carrier" TEXT NOT NULL,
    "awb" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "syncedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "TrackingSnapshot_shop_carrier_awb_key" ON "TrackingSnapshot"("shop", "carrier", "awb");
