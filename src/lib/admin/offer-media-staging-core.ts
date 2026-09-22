export async function finalizeStagedImage(path: string, deps: {
  download(path: string): Promise<Buffer>;
  persist(bytes: Buffer): Promise<{ ok: true; mediaId: number } | { ok: false; code: string }>;
  remove(path: string): Promise<{ ok: boolean }>;
}) {
  let result: { ok: true; mediaId: number } | { ok: false; code: string };
  try { result = await deps.persist(await deps.download(path)); }
  catch { result = { ok: false, code: "STORAGE_ERROR" }; }
  try {
    if (!(await deps.remove(path)).ok) return { ok: false as const, code: "STAGING_CLEANUP_FAILED" };
  } catch { return { ok: false as const, code: "STAGING_CLEANUP_FAILED" }; }
  return result;
}
