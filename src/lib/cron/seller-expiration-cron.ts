export function createSellerExpirationCronHandler(
  runBatch: (limit: number) => Promise<{ ok: boolean; count?: number; error?: string }>
) {
  return async function GET(request: Request) {
    const authHeader = request.headers.get("Authorization");
    const expectedSecret = process.env.CRON_SECRET;
    
    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    const isProduction = process.env.VERCEL_ENV === "production";
    const isEnabled = process.env.SELLER_EXPIRATION_CRON_ENABLED === "true";

    if (!isProduction || !isEnabled) {
      return new Response(JSON.stringify({ ok: true, status: "disabled_by_gate" }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    const result = await runBatch(100);
    
    if (!result.ok) {
      return new Response(JSON.stringify({ error: "SYSTEM_ERROR" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
  }
}
