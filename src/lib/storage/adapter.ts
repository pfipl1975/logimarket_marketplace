import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "@/lib/supabase/env";

export interface OfferMediaStorage {
  put(bucket: string, path: string, body: Buffer, mimeType: string): Promise<{ ok: true; path: string } | { ok: false; error: string }>;
  delete(bucket: string, path: string): Promise<{ ok: true } | { ok: false; error: string }>;
  getPublicUrl(bucket: string, path: string): string;
}

export class SupabaseOfferMediaStorage implements OfferMediaStorage {
  private getClient() {
    const config = getSupabasePublicConfig();
    if (!config) {
      throw new Error("Supabase is not configured");
    }
    // We must use service role key to bypass RLS for server-side uploads
    // since we do not want to rely on passing user session context to the admin action
    // and rely on storage RLS (as per requirement: Any required server credential must remain server-only).
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing");
    }
    return createClient(config.url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      }
    });
  }

  async put(bucket: string, path: string, body: Buffer, mimeType: string) {
    try {
      const client = this.getClient();
      const { data, error } = await client.storage.from(bucket).upload(path, body, {
        contentType: mimeType,
        upsert: false,
      });

      if (error) {
        return { ok: false as const, error: error.message };
      }
      return { ok: true as const, path: data.path };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Unknown storage error" };
    }
  }

  async delete(bucket: string, path: string) {
    try {
      const client = this.getClient();
      const { error } = await client.storage.from(bucket).remove([path]);
      if (error) {
        return { ok: false as const, error: error.message };
      }
      return { ok: true as const };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Unknown storage error" };
    }
  }

  getPublicUrl(bucket: string, path: string): string {
    const config = getSupabasePublicConfig();
    if (!config) return "";
    const client = createClient(config.url, config.publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const { data } = client.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }
}
