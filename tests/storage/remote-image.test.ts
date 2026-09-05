import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { EventEmitter } from "node:events";
import https from "node:https";
import { fetchRemoteImage, isPublicRemoteAddress, parseRemoteImageUrl, remoteImageNetwork, type RemoteImageNetwork, type RemoteResponse } from "../../src/lib/storage/remote-image";
import { uploadOfferMediaCore, MAX_UPLOAD_SIZE, type OfferMediaDependencies } from "../../src/lib/admin/offer-media-core";

const jpeg = Buffer.from([255, 216, 255, 224, 0, 16, 74, 70, 73, 70, 0, 1]);
function response(overrides: Partial<RemoteResponse> = {}): RemoteResponse {
  return { status: 200, body: Readable.from([jpeg]), close() {}, ...overrides };
}
function network(overrides: Partial<RemoteImageNetwork> = {}): RemoteImageNetwork {
  return { resolve: async () => ["93.184.215.14"], request: async () => response(), ...overrides };
}
for (const ip of ["0.0.0.0", "10.1.2.3", "100.64.0.1", "127.0.0.1", "169.254.169.254", "172.16.0.1", "192.168.1.1", "192.0.0.1", "192.0.2.1", "198.18.0.1", "198.51.100.1", "203.0.113.1", "224.0.0.1", "255.255.255.255", "::", "::1", "fc00::1", "fe80::1", "ff02::1", "::ffff:127.0.0.1", "::ffff:93.184.215.14", "64:ff9b::7f00:1", "2001:db8::1", "2002:7f00:1::", "3fff::1"]) {
  test(`blocks special address ${ip}`, () => assert.equal(isPublicRemoteAddress(ip), false));
}
test("accepts global IPv4 and IPv6", () => {
  assert.equal(isPublicRemoteAddress("93.184.215.14"), true);
  assert.equal(isPublicRemoteAddress("2606:4700:4700::1111"), true);
});
for (const url of ["file:///etc/passwd", "ftp://example.com/a", "data:image/jpeg,test", "https://user:password@example.com/a", "http://localhost/a", "http://sub.localhost/a", "http://example.com:22/a"]) {
  test(`rejects unsafe URL ${url.split(":")[0]}`, () => assert.throws(() => parseRemoteImageUrl(url)));
}
for (const url of ["http://127.0.0.1/a", "http://2130706433/a", "http://0x7f000001/a", "http://[::1]/a", "http://[::ffff:127.0.0.1]/a"]) {
  test(`never connects to blocked literal ${url}`, async () => {
    let requests = 0;
    await assert.rejects(fetchRemoteImage(url, network({ request: async () => { requests++; return response(); } })), /REMOTE_HOST_BLOCKED/);
    assert.equal(requests, 0);
  });
}
test("valid HTTPS path pins a validated address", async () => {
  const bytes = await fetchRemoteImage("https://example.com/image?q=1", network({ request: async (url, ip) => {
    assert.equal(url.pathname, "/image"); assert.equal(url.search, "?q=1"); assert.equal(ip, "93.184.215.14"); return response();
  } }));
  assert.deepEqual(bytes, jpeg);
});
test("validates ALL DNS answers before connecting", async () => {
  let connected = false;
  await assert.rejects(fetchRemoteImage("https://example.com/a", network({ resolve: async () => ["93.184.215.14", "10.0.0.1"], request: async () => { connected = true; return response(); } })), /REMOTE_HOST_BLOCKED/);
  assert.equal(connected, false);
});
test("redirects revalidate DNS and block internal destinations", async () => {
  let requests = 0;
  await assert.rejects(fetchRemoteImage("https://example.com/a", network({ resolve: async (host) => host === "example.com" ? ["93.184.215.14"] : ["169.254.169.254"], request: async () => { requests++; return response({ status: 302, location: "http://metadata.example/a" }); } })), /REMOTE_HOST_BLOCKED/);
  assert.equal(requests, 1);
});
test("redirect rejects changed protocol", async () => {
  await assert.rejects(fetchRemoteImage("https://example.com/a", network({ request: async () => response({ status: 302, location: "file:///etc/passwd" }) })), /REMOTE_URL_INVALID/);
});
test("at most three redirects", async () => {
  let requests = 0;
  await assert.rejects(fetchRemoteImage("https://example.com/a", network({ request: async () => { requests++; return response({ status: 302, location: "/again" }); } })), /REMOTE_FETCH_FAILED/);
  assert.equal(requests, 4);
});
test("DNS timeout prevents a later connection", async () => {
  let requests = 0;
  await assert.rejects(fetchRemoteImage("https://example.com/a", network({ resolve: () => new Promise((resolve) => setTimeout(() => resolve(["93.184.215.14"]), 15)), request: async () => { requests++; return response(); } }), 1), /REMOTE_TIMEOUT/);
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(requests, 0);
});
test("request timeout", async () => {
  await assert.rejects(fetchRemoteImage("https://example.com/a", network({ request: () => new Promise(() => {}) }), 1), /REMOTE_TIMEOUT/);
});
for (const options of [
  { length: String(MAX_UPLOAD_SIZE + 1) },
  { body: Readable.from([Buffer.alloc(MAX_UPLOAD_SIZE), Buffer.alloc(1)]) },
]) test("bounds advertised and streamed size", async () => {
  await assert.rejects(fetchRemoteImage("https://example.com/a", network({ request: async () => response(options) })), /FILE_TOO_LARGE/);
});
for (const options of [{ status: 404 }, { encoding: "gzip" }, { length: "invalid" }, { length: "100" }, { body: Readable.from([]) }]) {
  test("rejects invalid HTTP response", async () => {
    await assert.rejects(fetchRemoteImage("https://example.com/a", network({ request: async () => response(options) })), /REMOTE_FETCH_FAILED/);
  });
}
test("transport uses pinned IP, original Host/SNI and fixed headers only", async (t) => {
  let options: Record<string, unknown> | undefined;
  t.mock.method(https, "request", (input: Record<string, unknown>, callback: (response: unknown) => void) => {
    options = input;
    const request = new EventEmitter() as EventEmitter & { end(): void };
    request.end = () => callback(Object.assign(Readable.from([jpeg]), { statusCode: 200, headers: {} }));
    return request;
  });
  const result = await remoteImageNetwork.request(new URL("https://example.com/a"), "93.184.215.14", new AbortController().signal);
  assert.equal(options?.hostname, "93.184.215.14"); assert.equal(options?.servername, "example.com"); assert.equal(options?.agent, false);
  assert.deepEqual(options?.headers, { Host: "example.com", Accept: "image/jpeg,image/png,image/webp,image/avif", "Accept-Encoding": "identity" });
  result.close();
});
test("remote bytes use canonical validation, hash, source URL and duplicate handling", async () => {
  let inserted: Parameters<OfferMediaDependencies["insertMedia"]>[0] | undefined;
  let writes = 0;
  const deps: OfferMediaDependencies = {
    checkOfferExists: async () => true, checkDuplicate: async () => !!inserted, getMediaCount: async () => 0,
    insertMedia: async (data) => { inserted = data; return 7; },
    storage: { put: async (bucket, path, bytes, mime) => { assert.equal(bucket, "offer-media"); assert.match(path, /^offers\/1\/.+\.jpg$/); assert.deepEqual(bytes, jpeg); assert.equal(mime, "image/jpeg"); writes++; return { ok: true }; }, delete: async () => ({ ok: true }) },
  };
  const source = { sourceType: "remote_import" as const, sourceUrl: "https://example.com/source.png" };
  const invalid = await fetchRemoteImage(source.sourceUrl, network({ request: async () => response({ body: Readable.from([Buffer.from("<svg>fake image/jpeg</svg>")]) }) }));
  assert.deepEqual(await uploadOfferMediaCore(1, "", invalid, deps, source), { ok: false, code: "INVALID_MIME_TYPE" });
  assert.equal(writes, 0);
  const bytes = await fetchRemoteImage(source.sourceUrl, network());
  assert.deepEqual(await uploadOfferMediaCore(1, "", bytes, deps, source), { ok: true, mediaId: 7 });
  assert.equal(inserted?.sourceType, "remote_import"); assert.equal(inserted?.sourceUrl, source.sourceUrl);
  assert.match(inserted!.checksumSha256, /^[0-9a-f]{64}$/); assert.equal(inserted?.isPrimary, true);
  assert.deepEqual(await uploadOfferMediaCore(1, "", bytes, deps, source), { ok: false, code: "DUPLICATE_CONTENT" });
  assert.equal(writes, 1);
});
