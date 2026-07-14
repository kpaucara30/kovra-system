function createBackupRoutes({
  readDb,
  writeDb,
  readJsonBody,
  sendJson,
  requireAuth,
  canViewReports,
  canManageUsers
}) {
  return function handleBackupRoutes(req, res) {
    if (req.method === "GET" && req.url === "/api/backup") {
      const user = requireAuth(req, res);
      if (!user) return true;
      if (!canViewReports(user)) {
        sendJson(res, 403, { ok: false, error: "Tu rol no permite exportar backup." });
        return true;
      }

      const db = readDb();
      sendJson(res, 200, {
        ok: true,
        exportedAt: new Date().toISOString(),
        version: 1,
        data: db
      }, {
        "Content-Disposition": "attachment; filename=facturasmart-backup.json"
      });
      return true;
    }

    if (req.method === "POST" && req.url === "/api/backup/restore") {
      const user = requireAuth(req, res);
      if (!user) return true;
      if (!canManageUsers(user)) {
        sendJson(res, 403, { ok: false, error: "Solo el administrador puede restaurar backup." });
        return true;
      }

      readJsonBody(req).then((body) => {
        const restored = body.data || body;
        if (!Array.isArray(restored.invoices) || !Array.isArray(restored.users)) {
          sendJson(res, 400, { ok: false, error: "Backup invalido." });
          return;
        }
        writeDb({
          invoices: restored.invoices,
          providers: Array.isArray(restored.providers) ? restored.providers : [],
          users: restored.users,
          settings: restored.settings || {}
        });
        sendJson(res, 200, { ok: true });
      }).catch((error) => sendJson(res, 400, { ok: false, error: error.message }));
      return true;
    }

    return false;
  };
}

module.exports = { createBackupRoutes };
