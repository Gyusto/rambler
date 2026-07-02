// Custom Next server that proxies BOTH the REST API (/api) and the chat
// WebSocket through to the .NET backend, so the browser only ever talks to
// this origin (:5001). Everything else is handled by Next.
const { createServer, request: httpRequest } = require("node:http");
const { parse } = require("node:url");
const next = require("next");
const httpProxy = require("http-proxy");

const dev = process.env.NODE_ENV !== "production";
const port = Number.parseInt(process.env.PORT || "5001", 10);
const backend = process.env.BACKEND_URL || "http://localhost:5000";
const backendUrl = new URL(backend);

const app = next({ dev });
const handle = app.getRequestHandler();

// Plain HTTP proxy for the REST API.
const apiProxy = httpProxy.createProxyServer({ target: backend, changeOrigin: true });
apiProxy.on("error", (err, _req, res) => {
  if (res && typeof res.writeHead === "function") {
    res.writeHead(502);
    res.end("Backend unavailable");
  }
});

app.prepare().then(() => {
  const server = createServer((req, res) => {
    if (req.url?.startsWith("/api")) {
      apiProxy.web(req, res);
      return;
    }
    handle(req, res, parse(req.url, true));
  });

  // WebSocket upgrades: keep Next's HMR socket, hand-proxy everything else to
  // the backend (relaying the upgrade headers and piping both directions).
  server.on("upgrade", (req, clientSocket, head) => {
    if (req.url?.startsWith("/_next")) {
      app.getUpgradeHandler()(req, clientSocket, head);
      return;
    }

    const proxyReq = httpRequest({
      hostname: backendUrl.hostname,
      port: backendUrl.port,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: backendUrl.host },
    });

    proxyReq.on("upgrade", (proxyRes, proxySocket, proxyHead) => {
      const statusLine = `HTTP/1.1 ${proxyRes.statusCode} ${proxyRes.statusMessage}\r\n`;
      const headers = Object.entries(proxyRes.headers)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\r\n");
      clientSocket.write(`${statusLine}${headers}\r\n\r\n`);

      if (proxyHead?.length) proxySocket.unshift(proxyHead);
      proxySocket.pipe(clientSocket).pipe(proxySocket);

      proxySocket.on("error", () => clientSocket.destroy());
      clientSocket.on("error", () => proxySocket.destroy());
    });

    proxyReq.on("response", (proxyRes) => {
      console.error("[ws] backend responded non-upgrade:", proxyRes.statusCode);
      clientSocket.destroy();
    });
    proxyReq.on("error", (err) => {
      console.error("[ws] proxyReq error:", err.message);
      clientSocket.destroy();
    });
    proxyReq.end();
  });

  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port} (proxying /api + ws -> ${backend})`);
  });
});
