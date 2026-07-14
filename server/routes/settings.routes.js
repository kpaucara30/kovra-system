function createSettingsRoutes({
  readDb,
  writeDb,
  readJsonBody,
  sendJson,
  requireAuth,
  canManageUsers
}) {
  return function handleSettingsRoutes(req, res) {
    if (req.method === "GET" && req.url === "/api/settings") {
      const user = requireAuth(req, res);
      if (!user) return true;
      const db = readDb();
      sendJson(res, 200, { ok: true, settings: db.settings || {} });
      return true;
    }

    if (req.method === "PUT" && req.url === "/api/settings") {
      const user = requireAuth(req, res);
      if (!user) return true;
      if (!canManageUsers(user)) {
        sendJson(res, 403, { ok: false, error: "Solo el administrador puede cambiar configuracion." });
        return true;
      }

      readJsonBody(req).then((body) => {
        const db = readDb();
        db.settings = {
          companyName: String(body.companyName || "PYME S.A.C.").trim(),
          companyRuc: String(body.companyRuc || "").trim(),
        companyAddress: String(body.companyAddress || "").trim(),
        companyEmail: String(body.companyEmail || "").trim(),
        companyPhone: String(body.companyPhone || "").trim(),
        companyLogo: /^data:image\/(png|jpeg|jpg|svg\+xml|webp);base64,/i.test(String(body.companyLogo || ""))
          ? String(body.companyLogo).trim()
          : "",
        currency: String(body.currency || "PEN").trim(),
          igvRate: Number(body.igvRate) || 18,
          dateFormat: String(body.dateFormat || "DD/MM/YYYY").trim(),
          maxFileSizeMb: Number(body.maxFileSizeMb) || 20,
          allowedFileTypes: Array.isArray(body.allowedFileTypes) ? body.allowedFileTypes.map(String) : ["PDF", "JPG", "PNG"],
          autoBackup: body.autoBackup !== false,
          backupFrequency: String(body.backupFrequency || "Diario").trim(),
          backupTime: String(body.backupTime || "22:00").trim(),
          backupPath: String(body.backupPath || "C:\\FactuIA\\Backups").trim(),
          sessionTimeout: String(body.sessionTimeout || "30 minutos").trim(),
          accountRecovery: body.accountRecovery !== false,
          loginAttempts: Number(body.loginAttempts) || 5,
          autoLock: body.autoLock !== false,
          customRoles: Array.isArray(body.customRoles) ? body.customRoles.map((role) => ({
            name: String(role.name || "").trim(),
            description: String(role.description || "Rol personalizado").trim(),
            permissions: Array.isArray(role.permissions) ? role.permissions.map(String) : []
          })).filter((role) => role.name) : (Array.isArray(db.settings?.customRoles) ? db.settings.customRoles : [])
        };
        writeDb(db);
        sendJson(res, 200, { ok: true, settings: db.settings });
      }).catch((error) => sendJson(res, 400, { ok: false, error: error.message }));
      return true;
    }

    return false;
  };
}

module.exports = { createSettingsRoutes };
