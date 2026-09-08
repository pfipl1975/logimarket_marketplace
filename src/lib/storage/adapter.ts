import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "@/lib/supabase/env";
export interface OfferMediaStorage {
  put(bucket: string, path: string, body: Buffer, mimeType: string): Promise<{ ok: true; path: string } | { ok: false; error: string }>;
  delete(bucket: string, path: string): Promise<{ ok: true } | { ok: false; error: string }>;
  getPublicUrl(bucket: string, path: string): string;
}
export class SupabaseOfferMediaStorage implements OfferMediaStorage {
  async createSignedUpload(path: string) {
    const { data, error } = await this.getClient().storage.from("offer-media-staging").createSignedUploadUrl(path, { upsert: false });
    if (error || !data) throw new Error("STORAGE_ERROR");
    return data;
  }
  async download(bucket: string, path: string): Promise<Buffer> {
    // Only server-owned paths reach this adapter. Stream within the canonical limit.
    const { data, error } = await this.getClient().storage.from(bucket).createSignedUrl(path, 60);
    if (error || !data) throw new Error("STORAGE_ERROR");
    const response = await fetch(data.signedUrl, { signal: AbortSignal.timeout(15_000), cache: "no-store", redirect: "error" });
    if (!response.ok || !response.body) throw new Error("STORAGE_ERROR");
    const reader = response.body.getReader();
    try {
      const max = 10 * 1024 * 1024;
      if (Number(response.headers.get("content-length")) > max) throw new Error("FILE_TOO_LARGE");
      let size = 0;
      const chunks: Buffer[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > max) throw new Error("FILE_TOO_LARGE");
        chunks.push(Buffer.from(value));
      }
      return Buffer.concat(chunks, size);
    } finally { await reader.cancel().catch(() => {}); }
  }
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
export function getCanonicalOfferMediaPublicUrl(bucket: string, path: string): string {
  const config = getSupabasePublicConfig();
  if (!config) return "";
  return `${config.url}/storage/v1/object/public/${bucket}/${path}`;
}
