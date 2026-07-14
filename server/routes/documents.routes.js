function createDocumentRoutes({
  sendJson,
  requireAuth,
  getPdfPreviewPages
}) {
  return function handleDocumentRoutes(req, res) {
    if (req.method === "GET" && req.url.startsWith("/api/document-pages")) {
      const user = requireAuth(req, res);
      if (!user) return true;

      getPdfPreviewPages(req).then((pages) => {
        sendJson(res, 200, { ok: true, pages });
      }).catch((error) => {
        sendJson(res, error.statusCode || 500, { ok: false, error: error.message });
      });
      return true;
    }

    return false;
  };
}

module.exports = { createDocumentRoutes };
