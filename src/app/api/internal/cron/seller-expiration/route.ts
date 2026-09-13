import { expireDueSellerOrders } from "@/lib/seller-order/seller-order-workflow";
import { createSellerExpirationCronHandler } from "@/lib/cron/seller-expiration-cron";

export const GET = createSellerExpirationCronHandler(expireDueSellerOrders);
