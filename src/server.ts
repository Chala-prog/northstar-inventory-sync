import * as http from "http";
import { StockCache } from "./stockCache";
import { StockReading } from "./warehouseApi";
import { SERVER_PORT, TRACKED_SKUS } from "./config";
import { verifySignature } from "./webhookAuth";

function sendJson(res: http.ServerResponse, status: number, body: unknown) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(payload);
}

function readRawBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

interface WebhookPayload {
  sku: string;
  level: number;
}

function isWebhookPayload(value: unknown): value is WebhookPayload {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.sku === "string" && typeof v.level === "number";
}

async function handleStockWebhook(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  cache: StockCache
): Promise<void> {
  const rawBody = await readRawBody(req);
  const signature = req.headers["x-webhook-signature"];
  const sigHeader = Array.isArray(signature) ? signature[0] : signature;

  if (!verifySignature(rawBody, sigHeader)) {
    console.warn("[webhook] rejected: invalid or missing signature");
    sendJson(res, 401, { error: "invalid_signature" });
    return;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    sendJson(res, 400, { error: "invalid_json" });
    return;
  }

  if (!isWebhookPayload(parsed)) {
    sendJson(res, 400, {
      error: "invalid_payload",
      message: "Expected { sku: string, level: number }",
    });
    return;
  }

  if (!TRACKED_SKUS.includes(parsed.sku)) {
    console.warn(`[webhook] update for untracked SKU "${parsed.sku}" — accepted anyway`);
  }

  const reading: StockReading = {
    sku: parsed.sku,
    level: parsed.level,
    checkedAt: new Date(),
  };
  cache.set(reading);

  console.log(`[webhook] pushed update: ${reading.sku} -> ${reading.level} units`);
  sendJson(res, 202, { status: "accepted", sku: reading.sku });
}

export function startServer(cache: StockCache): http.Server {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${SERVER_PORT}`);

    if (req.method === "GET" && url.pathname === "/health") {
      sendJson(res, 200, {
        status: "ok",
        mode: "webhook-push",
        trackedSkus: TRACKED_SKUS.length,
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/webhooks/stock-update") {
      handleStockWebhook(req, res, cache).catch((err) => {
        console.error("[webhook] unhandled error:", err);
        sendJson(res, 500, { error: "internal_error" });
      });
      return;
    }

    const match = url.pathname.match(/^\/stock\/([^/]+)$/);
    if (req.method === "GET" && match) {
      const sku = decodeURIComponent(match[1]);
      const reading = cache.get(sku);

      if (!reading) {
        sendJson(res, 404, {
          error: "not_in_cache",
          sku,
          message: `No cached stock reading for "${sku}" yet — waiting on a webhook push.`,
        });
        return;
      }

      sendJson(res, 200, {
        sku: reading.sku,
        level: reading.level,
        checkedAt: reading.checkedAt.toISOString(),
      });
      return;
    }

    sendJson(res, 404, { error: "not_found" });
  });

  server.listen(SERVER_PORT, () => {
    console.log(`[server] listening on http://localhost:${SERVER_PORT} (webhook-push mode)`);
  });

  return server;
}
