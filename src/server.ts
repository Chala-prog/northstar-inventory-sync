import * as http from "http";
import { StockCache } from "./stockCache";
import { SERVER_PORT, TRACKED_SKUS } from "./config";

function sendJson(res: http.ServerResponse, status: number, body: unknown) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(payload);
}

export function startServer(cache: StockCache): http.Server {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${SERVER_PORT}`);

    if (req.method === "GET" && url.pathname === "/health") {
      sendJson(res, 200, { status: "ok", trackedSkus: TRACKED_SKUS.length });
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
          message: `No cached stock reading for "${sku}" yet.`,
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
    console.log(`[server] listening on http://localhost:${SERVER_PORT}`);
  });

  return server;
}
