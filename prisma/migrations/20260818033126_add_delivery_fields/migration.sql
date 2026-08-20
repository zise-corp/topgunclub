-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "ci" TEXT,
ADD COLUMN     "deliveryMethod" TEXT NOT NULL DEFAULT 'pickup',
ADD COLUMN     "email" TEXT,
ADD COLUMN     "locationLat" DOUBLE PRECISION,
ADD COLUMN     "locationLng" DOUBLE PRECISION,
ADD COLUMN     "locationMapsUrl" TEXT,
ADD COLUMN     "region" TEXT;
