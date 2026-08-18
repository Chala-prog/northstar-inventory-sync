import * as http from "http";
import { StockReading } from "./warehouseApi";
import { SERVER_PORT, TRACKED_SKUS } from "./config";
import { verifySignature } from "./webhookAuth";
import { isValidApiKey } from "./readAuth";
import { saveReading, getReading } from "./db";
import { checkStaleness } from "./staleness";

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

function headerValue(h: string | string[] | undefined): string | undefined {
  return Array.isArray(h) ? h[0] : h;
}

async function handleStockWebhook(
  req: http.IncomingMessage,
  res: http.ServerResponse
): Promise<void> {
  const rawBody = await readRawBody(req);
  const sigHeader = headerValue(req.headers["x-webhook-signature"]);

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

  // Persisted, not just cached in memory — survives a restart.
  saveReading(reading);

  console.log(`[webhook] pushed update: ${reading.sku} -> ${reading.level} units (persisted)`);
  sendJson(res, 202, { status: "accepted", sku: reading.sku });
}

function handleStockQuery(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  sku: string
): void {
  const apiKey = headerValue(req.headers["x-api-key"]);
  if (!isValidApiKey(apiKey)) {
    sendJson(res, 401, { error: "invalid_or_missing_api_key" });
    return;
  }

  const reading = getReading(sku);
  if (!reading) {
    sendJson(res, 404, {
      error: "not_in_cache",
      sku,
      message: `No stored stock reading for "${sku}" yet — waiting on a webhook push.`,
    });
    return;
  }

  sendJson(res, 200, {
    sku: reading.sku,
    level: reading.level,
    checkedAt: reading.checkedAt.toISOString(),
  });
}

export function startServer(): http.Server {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${SERVER_PORT}`);

    if (req.method === "GET" && url.pathname === "/health") {
      const staleness = checkStaleness();
      sendJson(res, 200, {
        status: "ok",
        mode: "webhook-push",
        storage: "sqlite (persistent)",
        trackedSkus: TRACKED_SKUS.length,
        staleSkus: staleness.staleSkus,
        staleThresholdMs: staleness.thresholdMs,
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/webhooks/stock-update") {
      handleStockWebhook(req, res).catch((err) => {
        console.error("[webhook] unhandled error:", err);
        sendJson(res, 500, { error: "internal_error" });
      });
      return;
    }

    const match = url.pathname.match(/^\/stock\/([^/]+)$/);
    if (req.method === "GET" && match) {
      const sku = decodeURIComponent(match[1]);
      handleStockQuery(req, res, sku);
      return;
    }

    sendJson(res, 404, { error: "not_found" });
  });

  server.listen(SERVER_PORT, () => {
    console.log(`[server] listening on http://localhost:${SERVER_PORT} (webhook-push, persistent, auth'd reads)`);
  });

  return server;
}
