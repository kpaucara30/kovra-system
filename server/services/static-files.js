const fs = require("fs");
const path = require("path");

function createStaticFileHandler({ clientDir, projectRoot, mimeTypes, send }) {
  return function serveStatic(req, res) {
    const urlPath = req.url === "/" ? "/index.html" : req.url.split("?")[0];
    if (urlPath.startsWith("/data/")) {
      send(res, 403, "No permitido", "text/plain; charset=utf-8");
      return;
    }

    const staticRoot = urlPath.startsWith("/uploads/") ? projectRoot : clientDir;
    const relativePath = urlPath.replace(/^\/+/, "");
    const filePath = path.normalize(path.join(staticRoot, relativePath));

    if (!filePath.startsWith(staticRoot)) {
      send(res, 403, "No permitido", "text/plain; charset=utf-8");
      return;
    }

    fs.readFile(filePath, (error, data) => {
      if (error) {
        send(res, 404, "No encontrado", "text/plain; charset=utf-8");
        return;
      }

      const extension = path.extname(filePath).toLowerCase();
      const type = mimeTypes[extension] || "application/octet-stream";
      const headers = {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "Pragma": "no-cache",
        "Expires": "0"
      };
      if (urlPath.startsWith("/uploads/")) {
        headers["Content-Disposition"] = `inline; filename="${path.basename(filePath).replace(/"/g, "")}"`;
      }
      send(res, 200, data, type, headers);
    });
  };
}

module.exports = { createStaticFileHandler };
