-- CreateTable
CREATE TABLE "WishlistItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "WishlistItem_shop_customerId_idx" ON "WishlistItem"("shop", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "WishlistItem_shop_customerId_productId_key" ON "WishlistItem"("shop", "customerId", "productId");
