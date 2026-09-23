/* eslint-disable */
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');

function logSync(msg) {
  console.log(msg);
  fs.appendFileSync('mock-gotrue-debug.log', msg + '\n');
}

const SECRET = 'e2e-dummy-jwt-secret-do-not-use-in-prod';
const ALLOWED_USERS = new Set([
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111'
]);

function verifyJWT(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error("malformed");

  const [headerB64, payloadB64, signatureB64] = parts;

  const hmac = crypto.createHmac('sha256', SECRET);
  hmac.update(headerB64 + '.' + payloadB64);
  const expectedSig = hmac.digest('base64url');

  const expectedBuf = Buffer.from(expectedSig);
  const actualBuf = Buffer.from(signatureB64);

  if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
    throw new Error("invalid_signature");
  }

  const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
  if (header.alg !== 'HS256') throw new Error("invalid_alg");

  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));

  if (!payload.sub) throw new Error("no_sub");
  if (!ALLOWED_USERS.has(payload.sub)) throw new Error("unknown_subject");

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) throw new Error("expired");

  return payload;
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, apikey, content-type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/auth/v1/user' && req.method === 'GET') {
    const authHeader = req.headers.authorization || '';
    logSync("Got request for /auth/v1/user with token: " + authHeader.substring(0, 30) + "...");

    if (!authHeader.startsWith('Bearer ')) {
      logSync("Rejecting invalid token header");
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'invalid_token' }));
      return;
    }

    const token = authHeader.replace('Bearer ', '');
    try {
      const payload = verifyJWT(token);
      logSync("Verified JWT successfully for user: " + payload.sub);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        id: payload.sub,
        aud: "authenticated",
        role: "authenticated",
        email: "e2e-" + payload.sub + "@test.local",
        app_metadata: { provider: "email", providers: ["email"] },
        user_metadata: {},
        identities: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
    } catch (e) {
      logSync("JWT Verification failed: " + e.message);
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message || 'bad_jwt', error_code: e.message || 'bad_jwt', code: 401, msg: e.message || 'bad_jwt' }));
    }
    return;
  }

  const allowedMockImages = new Set([
    '/storage/v1/object/public/offer-media/multi/1.jpg',
    '/storage/v1/object/public/offer-media/multi/2.jpg',
    '/storage/v1/object/public/offer-media/multi/3.jpg',
    '/storage/v1/object/public/offer-media/single/1.jpg',
    '/storage/v1/object/public/offer-media/archived/1.jpg'
  ]);

  if (req.method === 'GET' && allowedMockImages.has(req.url)) {
    logSync("Got request for mock image: " + req.url);
    const mockImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='; // 1x1 transparent png
    const imageBuffer = Buffer.from(mockImageBase64, 'base64');
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': imageBuffer.length
    });
    res.end(imageBuffer);
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(54321, '127.0.0.1', () => {
  logSync('Mock GoTrue listening on http://127.0.0.1:54321');
});
