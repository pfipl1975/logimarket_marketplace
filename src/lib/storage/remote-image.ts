import "server-only";
import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import http from "node:http";
import https from "node:https";
import { MAX_UPLOAD_SIZE } from "@/lib/admin/offer-media-core";

export const REMOTE_TIMEOUT_MS = 15_000;
export const MAX_REDIRECTS = 3;
export class RemoteImageError extends Error {
  constructor(public readonly code: "REMOTE_URL_INVALID" | "REMOTE_HOST_BLOCKED" | "REMOTE_FETCH_FAILED" | "REMOTE_TIMEOUT" | "FILE_TOO_LARGE") {
    super(code);
  }
}

const blocked = new BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
  ["192.31.196.0", 24], ["192.52.193.0", 24], ["192.88.99.0", 24], ["192.168.0.0", 16],
  ["192.175.48.0", 24], ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24],
  ["224.0.0.0", 3],
] as const) blocked.addSubnet(address, prefix, "ipv4");
const globalV6 = new BlockList();
globalV6.addSubnet("2000::", 3, "ipv6");
for (const [address, prefix] of [["2001::", 23], ["2001:db8::", 32], ["2002::", 16], ["3fff::", 20], ["2620:4f:8000::", 48]] as const) {
  blocked.addSubnet(address, prefix, "ipv6");
}

export function isPublicRemoteAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return !blocked.check(address, "ipv4");
  // Allow only global unicast. This also excludes mapped IPv4, NAT64 and zone IDs.
  return family === 6 && !address.includes("%") && globalV6.check(address, "ipv6") && !blocked.check(address, "ipv6");
}

export function parseRemoteImageUrl(value: string): URL {
  try {
    if (typeof value !== "string" || value.length > 2048) throw new Error();
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.hash) throw new Error();
    if (url.port && !["80", "443"].includes(url.port)) throw new Error();
    const host = url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase();
    if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) throw new RemoteImageError("REMOTE_HOST_BLOCKED");
    return url;
  } catch (error) {
    if (error instanceof RemoteImageError) throw error;
    throw new RemoteImageError("REMOTE_URL_INVALID");
  }
}

export interface RemoteResponse {
  status: number;
  location?: string;
  length?: string;
  encoding?: string;
  body: AsyncIterable<Uint8Array>;
  close(): void;
}
export interface RemoteImageNetwork {
  resolve(host: string): Promise<string[]>;
  request(url: URL, address: string, signal: AbortSignal): Promise<RemoteResponse>;
}

export const remoteImageNetwork: RemoteImageNetwork = {
  resolve: async (host) => (await lookup(host, { all: true, verbatim: true })).map((entry) => entry.address),
  request: (url, address, signal) => new Promise((resolve, reject) => {
    // Connect to the already validated IP, never resolve the hostname again.
    // Host and TLS SNI retain the original name; certificate validation remains enabled.
    const request = (url.protocol === "https:" ? https : http).request({
      protocol: url.protocol, hostname: address, port: url.port || undefined,
      servername: isIP(url.hostname.replace(/^\[|\]$/g, "")) ? undefined : url.hostname,
      path: `${url.pathname}${url.search}`, method: "GET", agent: false, signal,
      maxHeaderSize: 16 * 1024,
      headers: { Host: url.host, Accept: "image/jpeg,image/png,image/webp,image/avif", "Accept-Encoding": "identity" },
    }, (response) => resolve({
      status: response.statusCode ?? 0, location: response.headers.location,
      length: response.headers["content-length"], encoding: response.headers["content-encoding"],
      body: response, close: () => response.destroy(),
    }));
    request.on("error", reject);
    request.end();
  }),
};

export async function fetchRemoteImage(
  source: string, network = remoteImageNetwork, timeoutMs = REMOTE_TIMEOUT_MS,
): Promise<Buffer> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new RemoteImageError("REMOTE_TIMEOUT")); }, timeoutMs);
  });
  const run = async () => {
    let url = parseRemoteImageUrl(source);
    for (let redirects = 0; ; redirects++) {
      const host = url.hostname.replace(/^\[|\]$/g, "");
      const addresses = isIP(host) ? [host] : await network.resolve(host);
      if (controller.signal.aborted) throw new RemoteImageError("REMOTE_TIMEOUT");
      if (!addresses.length || addresses.some((address) => !isPublicRemoteAddress(address))) throw new RemoteImageError("REMOTE_HOST_BLOCKED");
      const response = await network.request(url, addresses[0], controller.signal);
      try {
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          if (redirects >= MAX_REDIRECTS || !response.location) throw new RemoteImageError("REMOTE_FETCH_FAILED");
          url = parseRemoteImageUrl(new URL(response.location, url).href);
          continue;
        }
        if (response.status !== 200 || (response.encoding && response.encoding !== "identity")) throw new RemoteImageError("REMOTE_FETCH_FAILED");
        if (response.length !== undefined) {
          if (!/^\d+$/.test(response.length)) throw new RemoteImageError("REMOTE_FETCH_FAILED");
          if (Number(response.length) > MAX_UPLOAD_SIZE) throw new RemoteImageError("FILE_TOO_LARGE");
        }
        let size = 0;
        const chunks: Buffer[] = [];
        for await (const chunk of response.body) {
          if (controller.signal.aborted) throw new RemoteImageError("REMOTE_TIMEOUT");
          size += chunk.byteLength;
          if (size > MAX_UPLOAD_SIZE) throw new RemoteImageError("FILE_TOO_LARGE");
          chunks.push(Buffer.from(chunk));
        }
        if (!size || (response.length !== undefined && Number(response.length) !== size)) throw new RemoteImageError("REMOTE_FETCH_FAILED");
        return Buffer.concat(chunks, size);
      } finally { response.close(); }
    }
  };
  try { return await Promise.race([run(), timeout]); }
  catch (error) {
    if (error instanceof RemoteImageError) throw error;
    throw new RemoteImageError(controller.signal.aborted ? "REMOTE_TIMEOUT" : "REMOTE_FETCH_FAILED");
  } finally { clearTimeout(timer!); controller.abort(); }
}
