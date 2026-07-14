const crypto = require("crypto");

function createProviderRoutes({
  readDb,
  writeDb,
  readJsonBody,
  sendJson,
  requireAuth,
  canViewProviders,
  canEditInvoices,
  findOrCreateProvider
}) {
  return function handleProviderRoutes(req, res) {
    if (req.method === "GET" && req.url === "/api/providers") {
      const user = requireAuth(req, res);
      if (!user) return true;
      if (!canViewProviders(user)) {
        sendJson(res, 403, { ok: false, error: "Tu rol no permite consultar proveedores." });
        return true;
      }
      const db = readDb();
      let changed = false;
      for (const invoice of db.invoices) {
        const before = db.providers.length;
        findOrCreateProvider(db, invoice);
        changed = changed || db.providers.length !== before;
      }
      if (changed) writeDb(db);
      sendJson(res, 200, { ok: true, providers: db.providers || [] });
      return true;
    }

    if (req.method === "POST" && req.url === "/api/providers") {
      const user = requireAuth(req, res);
      if (!user) return true;
      if (!canEditInvoices(user)) {
        sendJson(res, 403, { ok: false, error: "Tu rol no permite crear proveedores." });
        return true;
      }

      readJsonBody(req).then((body) => {
        const db = readDb();
        const ruc = String(body.ruc || "").trim();
        if (ruc && db.providers.some((item) => item.ruc === ruc)) {
          sendJson(res, 409, { ok: false, error: "Ya existe un proveedor con ese RUC." });
          return;
        }
        const provider = {
          id: crypto.randomUUID(),
          ruc,
          name: String(body.name || "Proveedor sin nombre").trim(),
          category: String(body.category || "Servicios"),
          contact: String(body.contact || ""),
          phone: String(body.phone || ""),
          email: String(body.email || ""),
          status: String(body.status || "Activo"),
          createdAt: new Date().toISOString()
        };
        db.providers.unshift(provider);
        writeDb(db);
        sendJson(res, 200, { ok: true, provider, providers: db.providers });
      }).catch((error) => sendJson(res, 400, { ok: false, error: error.message }));
      return true;
    }

    const providerMatch = req.url.match(/^\/api\/providers\/([^/]+)$/);
    if (providerMatch && req.method === "PUT") {
      const user = requireAuth(req, res);
      if (!user) return true;
      if (!canEditInvoices(user)) {
        sendJson(res, 403, { ok: false, error: "Tu rol no permite editar proveedores." });
        return true;
      }

      readJsonBody(req).then((body) => {
        const db = readDb();
        const provider = db.providers.find((item) => item.id === providerMatch[1]);
        if (!provider) {
          sendJson(res, 404, { ok: false, error: "Proveedor no encontrado." });
          return;
        }
        provider.ruc = String(body.ruc || provider.ruc || "").trim();
        provider.name = String(body.name || provider.name).trim();
        provider.category = String(body.category || provider.category || "Servicios");
        provider.contact = String(body.contact || "");
        provider.phone = String(body.phone || "");
        provider.email = String(body.email || "");
        provider.status = String(body.status || provider.status || "Activo");
        provider.updatedAt = new Date().toISOString();
        writeDb(db);
        sendJson(res, 200, { ok: true, provider, providers: db.providers });
      }).catch((error) => sendJson(res, 400, { ok: false, error: error.message }));
      return true;
    }

    return false;
  };
}

module.exports = { createProviderRoutes };
