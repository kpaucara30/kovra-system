function createInvoiceRoutes({
  readDb,
  writeDb,
  readJsonBody,
  sendJson,
  requireAuth,
  canViewInvoices,
  canEditInvoices,
  findOrCreateProvider
}) {
  return function handleInvoiceRoutes(req, res) {
    if (req.method === "GET" && req.url === "/api/invoices") {
      const user = requireAuth(req, res);
      if (!user) return true;
      if (!canViewInvoices(user)) {
        sendJson(res, 403, { ok: false, error: "Tu rol no permite consultar facturas." });
        return true;
      }
      const db = readDb();
      sendJson(res, 200, { ok: true, invoices: db.invoices });
      return true;
    }

    if (req.method === "PUT" && req.url === "/api/invoices") {
      const user = requireAuth(req, res);
      if (!user) return true;
      if (!canEditInvoices(user)) {
        sendJson(res, 403, { ok: false, error: "Tu rol no permite modificar facturas." });
        return true;
      }

      readJsonBody(req).then((body) => {
        const db = readDb();
        db.invoices = Array.isArray(body.invoices) ? body.invoices.map((invoice) => {
          const provider = findOrCreateProvider(db, invoice);
          return {
            ...invoice,
            providerId: provider?.id || invoice.providerId || "",
            audit: [
              ...(Array.isArray(invoice.audit) ? invoice.audit : []),
              { at: new Date().toISOString(), by: user.email, action: "Guardado" }
            ].slice(-20)
          };
        }) : [];
        writeDb(db);
        sendJson(res, 200, { ok: true, invoices: db.invoices });
      }).catch((error) => sendJson(res, 400, { ok: false, error: error.message }));
      return true;
    }

    return false;
  };
}

module.exports = { createInvoiceRoutes };
