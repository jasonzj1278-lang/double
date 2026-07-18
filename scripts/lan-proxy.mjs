import http from "node:http";

function forward(req, res, target, path = req.url) {
  const upstream = http.request(
    {
      host: target.host,
      port: target.port,
      path,
      method: req.method,
      headers: req.headers,
    },
    (upstreamResponse) => {
      res.writeHead(upstreamResponse.statusCode || 502, upstreamResponse.headers);
      upstreamResponse.pipe(res);
    },
  );
  upstream.on("error", () => {
    res.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("服务暂时不可用");
  });
  req.pipe(upstream);
}

http
  .createServer((req, res) => {
    if (req.url?.startsWith("/api/")) {
      return forward(req, res, { host: "127.0.0.1", port: 8081 }, req.url.slice(4));
    }
    return forward(req, res, { host: "::1", port: 3000 });
  })
  .listen(8080, "0.0.0.0", () => {
    console.log("LAN room: http://0.0.0.0:8080");
  });
