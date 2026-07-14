function activityItems() {
  const invoiceItems = invoices.flatMap((invoice) => {
    const audit = Array.isArray(invoice.audit) && invoice.audit.length
      ? invoice.audit
      : [{ at: invoice.createdAt || invoice.date || "", by: "Sistema", action: "Registrada" }];
    return audit.map((item) => ({
      type: "Factura",
      at: item.at || invoice.createdAt || "",
      by: item.by || "Sistema",
      title: invoice.number || invoice.provider || "Factura",
      detail: `${item.action || "Actualizacion"} - ${invoice.provider || "Proveedor"} - ${money(invoice.total)}`
    }));
  });

  const providerItems = providers.map((provider) => ({
    type: "Proveedor",
    at: provider.updatedAt || provider.createdAt || "",
    by: "Sistema",
    title: provider.name,
    detail: `${provider.status || "Activo"} - ${provider.ruc || "Sin RUC"} - ${provider.category || "Sin categoria"}`
  }));

  const userItems = users.map((user) => ({
    type: "Usuario",
    at: user.updatedAt || user.createdAt || "",
    by: "Sistema",
    title: user.name,
    detail: `${user.role} - ${userLoginName(user)} - ${user.status || "Activo"}`
  }));

  return [...invoiceItems, ...providerItems, ...userItems]
    .filter((item) => item.at)
    .sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

function renderActivity() {
  const container = document.getElementById("activity-list");
  if (!container) return;
  const query = (document.getElementById("activity-search")?.value || "").trim().toLowerCase();
  const type = document.getElementById("activity-type")?.value || "Todo";
  const list = activityItems().filter((item) => {
    const matchesType = type === "Todo" || item.type === type;
    const matchesQuery = !query || [item.type, item.title, item.detail, item.by].join(" ").toLowerCase().includes(query);
    return matchesType && matchesQuery;
  }).slice(0, 80);

  container.innerHTML = list.length
    ? list.map((item) => `
      <article>
        <span>${escapeHtml(item.type)}</span>
        <div>
          <strong>${escapeHtml(item.title)}</strong>
          <p>${escapeHtml(item.detail)}</p>
          <small>${new Date(item.at).toLocaleString("es-PE")} - ${escapeHtml(item.by)}</small>
        </div>
      </article>
    `).join("")
    : `<div class="preview-empty">No hay actividad para mostrar.</div>`;
}
