
function renderDashboard() {
  const list = activeInvoices();
  const total = list.reduce((sum, invoice) => sum + (Number(invoice.total) || 0), 0);
  const igv = list.reduce((sum, invoice) => sum + (Number(invoice.igv) || 0), 0);
  const providers = providerTotalsFromInvoices(list).length;

  document.getElementById("dashboard-user-name").textContent = (currentUser?.name || "Admin").split(" ")[0];
  document.getElementById("dashboard-date-range").textContent = new Date().toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
  document.getElementById("metric-total").textContent = `S/ ${formatAmountInputValue(total)}`;
  document.getElementById("metric-count").textContent = list.length;
  document.getElementById("metric-igv").textContent = `S/ ${formatAmountInputValue(igv)}`;
  document.getElementById("metric-providers").textContent = providers;

  renderMonthlyChart();
  renderCategories();
  renderTopProviders();
  renderDashboardRecentInvoices();
}

function renderMonthlyChart() {
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const totals = Array(12).fill(0);
  const range = document.getElementById("dashboard-range")?.value || "Ultimos 6 meses";

  activeInvoices().forEach((invoice) => {
    const month = Number((invoice.date || "").split("-")[1]) - 1;
    if (month >= 0) totals[month] += Number(invoice.total) || 0;
  });

  const currentMonth = new Date().getMonth();
  const visibleIndexes = range === "Todo el año"
    ? months.map((_, index) => index)
    : Array.from({ length: 6 }, (_, index) => (currentMonth - 5 + index + 12) % 12);
  const visibleTotals = visibleIndexes.map((index) => totals[index]);
  const max = Math.max(...visibleTotals, 1);
  document.getElementById("monthly-chart").innerHTML = visibleIndexes.map((monthIndex) => {
    const total = totals[monthIndex];
    const height = total > 0 ? Math.max(14, Math.round((total / max) * 118)) : 7;
    return `<span class="dashboard-month-bar" style="height:${height}px"><i>${money(total)}</i><em>${months[monthIndex]}</em></span>`;
  }).join("");
}

function renderCategories() {
  const total = activeInvoices().reduce((sum, invoice) => sum + (Number(invoice.total) || 0), 0);
  const totals = activeInvoices().reduce((acc, invoice) => {
    const category = typeof invoiceDisplayCategory === "function" ? invoiceDisplayCategory(invoice) : (invoice.category || "Otros");
    acc[category] = (acc[category] || 0) + (Number(invoice.total) || 0);
    return acc;
  }, {});

  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const colors = ["#4f46e5", "#2563eb", "#0dbb83", "#f59e0b", "#ef4444", "#a78bfa"];
  let cursor = 0;
  const gradient = entries.length
    ? entries.map(([, amount], index) => {
      const start = cursor;
      const percent = total ? (amount / total) * 100 : 0;
      cursor += percent;
      return `${colors[index % colors.length]} ${start}% ${cursor}%`;
    }).join(", ")
    : "#e5e7eb 0 100%";
  const donut = document.getElementById("category-donut");
  donut.style.setProperty("--dashboard-donut-gradient", gradient);
  donut.innerHTML = `<span><strong>${money(total)}</strong><small>Total</small></span>`;
  document.getElementById("category-list").innerHTML = entries.length
    ? entries.map(([category, amount], index) => {
      return `
        <div class="dashboard-category-row">
          <i style="background:${colors[index % colors.length]}"></i>
          <span>${escapeHtml(category || "Sin categoria")}</span>
          <strong>${money(amount)}</strong>
        </div>
      `;
    }).join("")
    : `<div><span>Sin categorias registradas</span><strong>${money(0)}</strong></div>`;
}

function renderTopProviders() {
  const entries = providerTotalsFromInvoices(activeInvoices()).slice(0, 5);
  const max = Math.max(...entries.map((item) => item.total), 1);
  document.getElementById("top-providers").innerHTML = entries.length
    ? entries.map((provider) => `
      <article>
        <strong title="${escapeHtml(provider.name)}">${escapeHtml(provider.name)}</strong>
        <span><i style="width:${Math.max(8, Math.round((provider.total / max) * 100))}%"></i></span>
        <em>${money(provider.total)}</em>
      </article>
    `).join("")
    : `<div class="preview-empty compact">Sin empresas proveedoras para mostrar.</div>`;
}

function providerTotalsFromInvoices(list) {
  const totals = new Map();
  list.forEach((invoice) => {
    const total = Number(invoice.total) || 0;
    if (!total) return;
    const ruc = normalizedProviderRuc(invoice.ruc);
    const name = invoiceProviderName(invoice);
    if (!name) return;
    const key = ruc ? `ruc:${ruc}` : `name:${name.toLowerCase()}`;
    const current = totals.get(key) || {
      key,
      ruc,
      name,
      count: 0,
      total: 0
    };
    if (name && (!current.name || name.length > current.name.length)) {
      current.name = name;
    }
    current.count += 1;
    current.total += total;
    totals.set(key, current);
  });
  return [...totals.values()].sort((a, b) => b.total - a.total);
}

function normalizedProviderRuc(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length === 11 ? digits : "";
}

function invoiceProviderName(invoice) {
  const value = String(invoice?.provider || "").trim().replace(/\s+/g, " ");
  if (!value) return "";
  return cleanProviderName(value);
}

function cleanProviderName(value) {
  const normalized = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const compact = normalized.replace(/[^a-z0-9]/g, "");
  const looksLikeInvoiceNumber = /^[a-z]{0,4}\d{2,}[-\d]*$/i.test(value.replace(/\s/g, ""));
  const looksLikeDocument = /^\d{8,11}$/.test(compact);
  const blockedNames = ["demo", "admin", "usuario", "printticket", "ticket", "kpaucar", "kevinpaucar", "paucar"];
  const hasLetters = /[a-z]/i.test(value);
  const hasCompanySignal = /(s\.?a\.?c?\.?|e\.?i\.?r\.?l\.?|s\.?r\.?l\.?|s\.?a\.?|r\.?u\.?c\.?|negocios|servicios|comercial|corporacion|corp|grupo|empresa|fabrica|textil|tex|industria|excel)/i.test(value);
  if (!hasLetters || looksLikeInvoiceNumber || looksLikeDocument || blockedNames.includes(compact)) return "";
  if (value.length < 4) return "";
  return hasCompanySignal || value.split(/\s+/).length > 1 ? value : "";
}

function renderDashboardAlerts() {
  const list = activeInvoices();
  const duplicated = list.filter((invoice) => invoice.status === "Duplicado").length;
  const badRuc = list.filter((invoice) => invoice.ruc && !validPeruRuc(invoice.ruc)).length;
  const noFile = list.filter((invoice) => !invoice.fileUrl && !invoice.fileDataUrl).length;
  const igvIssues = list.filter((invoice) => Math.abs(((Number(invoice.subtotal) || 0) + (Number(invoice.igv) || 0)) - (Number(invoice.total) || 0)) > 0.05).length;
  const validated = list.length - duplicated;
  const withFile = list.filter((invoice) => invoice.fileUrl || invoice.fileDataUrl).length;
  const issues = duplicated + igvIssues + badRuc + noFile;
  const statusRing = document.getElementById("dashboard-status-ring");
  const alertsList = document.getElementById("dashboard-alerts");
  if (!statusRing || !alertsList) return;
  statusRing.innerHTML = `<span>${list.length}<br />Total</span>`;
  const alerts = [
    { label: `Registradas ${validated} (${list.length ? Math.round((validated / list.length) * 100) : 0}%)`, active: false },
    { label: `Con archivo ${withFile} (${list.length ? Math.round((withFile / list.length) * 100) : 0}%)`, active: noFile > 0 },
    { label: `Incidencias ${issues}`, active: issues > 0 }
  ];

  alertsList.innerHTML = alerts
    .map((alert) => `<li class="${alert.active ? "alert-hot" : ""}">${alert.label}</li>`)
    .join("");
}

function renderDashboardRecentInvoices() {
  const recent = activeInvoices().slice(0, 6);
  const recentTable = document.querySelector(".dashboard-recent-table thead");
  if (recentTable) {
    recentTable.innerHTML = `
      <tr>
        <th>Nro Factura</th>
        <th>Proveedor</th>
        <th>RUC</th>
        <th>Fecha de factura</th>
        <th>Subtotal</th>
        <th>IGV</th>
        <th>Total</th>
        <th>Categoria</th>
      </tr>
    `;
  }

  document.getElementById("dashboard-recent-invoices").innerHTML = recent.length
    ? recent.map((invoice, index) => `
      <tr>
        <td><span class="invoice-number-only">${escapeHtml(invoice.number || "Sin numero")}</span></td>
        <td>${escapeHtml(invoice.provider || "Sin proveedor")}</td>
        <td>${escapeHtml(invoice.ruc || "Sin RUC")}</td>
        <td>${formatDate(invoice.date)}</td>
        <td>${money(invoice.subtotal || 0)}</td>
        <td>${money(invoice.igv || 0)}</td>
        <td>${money(invoice.total || 0)}</td>
        <td><span class="dashboard-category-pill">${escapeHtml(typeof invoiceDisplayCategory === "function" ? invoiceDisplayCategory(invoice) : (invoice.category || "Otros"))}</span></td>
      </tr>
    `).join("")
    : `<tr><td colspan="8">Sin facturas registradas.</td></tr>`;
}

function renderDashboardActivity() {
  const activity = document.getElementById("dashboard-activity");
  if (!activity) return;
  const items = activityItems().slice(0, 4);
  activity.innerHTML = items.length
    ? items.map((item) => `
      <article>
        <span>${escapeHtml(item.type)}</span>
        <div>
          <strong>${escapeHtml(item.title)}</strong>
          <small>${new Date(item.at).toLocaleString("es-PE")}</small>
        </div>
      </article>
    `).join("")
    : `<div class="preview-empty compact">Sin actividad reciente.</div>`;
}

function renderReports() {
  const list = reportInvoices();
  const type = appliedReportFilters.type || "monthly";
  const company = companyProfile();
  const companyLines = companyDetailLines();
  const total = list.reduce((sum, invoice) => sum + (Number(invoice.total) || 0), 0);
  const igv = list.reduce((sum, invoice) => sum + (Number(invoice.igv) || 0), 0);
  const providersCount = providerTotalsFromInvoices(list).length;
  const categoriesCount = new Set(list.map(invoiceDisplayCategory).filter(Boolean)).size;
  const duplicates = list.filter((invoice) => invoice.status === "Duplicado").length;
  const pending = list.filter((invoice) => invoice.status === "Pendiente" || invoice.status === "Observado").length;
  const average = list.length ? total / list.length : 0;

  document.getElementById("report-summary").innerHTML = `
    <div><span>Gasto total</span><strong>${money(total)}</strong><small>Importe acumulado</small></div>
    <div><span>Facturas de gasto</span><strong>${list.length}</strong><small>En el periodo filtrado</small></div>
    <div><span>Proveedores</span><strong>${providersCount}</strong><small>Con facturas registradas</small></div>
    <div><span>IGV usado</span><strong>${money(igv)}</strong><small>Credito fiscal registrado</small></div>
    <div><span>Promedio por factura</span><strong>${money(average)}</strong><small>Gasto medio</small></div>
  `;

  const chartYear = updateReportYearSelector(list);
  renderReportMonthChart(list, chartYear);
  renderReportProviderChart(list, total);
  renderReportTable(list);
  document.getElementById("reports").dataset.reportType = type;
}

function reportFilterLabel() {
  const from = appliedReportFilters.from || "";
  const to = appliedReportFilters.to || "";
  if (from && to) return `${formatDate(from)} - ${formatDate(to)}`;
  if (from) return `Desde ${formatDate(from)}`;
  if (to) return `Hasta ${formatDate(to)}`;
  return "Todas las facturas activas";
}

function renderReportExpenseFocus(list, total, providersCount, categoriesCount, pending, duplicates) {
  const focus = document.getElementById("report-expense-focus");
  if (!focus) return;
  const reviewCount = pending + duplicates;
  const cleanCount = Math.max(0, list.length - reviewCount);
  const reviewText = reviewCount
    ? `${reviewCount} factura(s) necesitan revision antes de cerrar contabilidad.`
    : "Las facturas del periodo estan listas para reporte contable.";
  focus.innerHTML = `
    <div>
      <span>Periodo analizado</span>
      <strong>${escapeHtml(reportFilterLabel())}</strong>
      <small>${providersCount} proveedor(es), ${categoriesCount} categoria(s), ${money(total)} acumulado.</small>
    </div>
    <div>
      <span>Control de revision</span>
      <strong>${cleanCount}/${list.length} listas</strong>
      <small>${escapeHtml(reviewText)}</small>
    </div>
  `;
}

function reportInvoiceYears(list) {
  return [...new Set(list
    .map((invoice) => String(invoice.date || "").slice(0, 4))
    .filter((year) => /^\d{4}$/.test(year)))]
    .sort((a, b) => Number(b) - Number(a));
}

function updateReportYearSelector(list) {
  const select = document.getElementById("report-chart-year");
  if (!select) return String(new Date().getFullYear());
  const years = reportInvoiceYears(list);
  const fallback = years[0] || String(new Date().getFullYear());
  const selected = years.includes(select.value) ? select.value : fallback;
  select.innerHTML = years.length
    ? years.map((year) => `<option value="${year}"${year === selected ? " selected" : ""}>${year}</option>`).join("")
    : `<option value="${fallback}" selected>${fallback}</option>`;
  return selected;
}

function renderReportMonthChart(list, year) {
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const totals = Array(12).fill(0);
  const chartYear = year || String(new Date().getFullYear());
  list.filter((invoice) => String(invoice.date || "").slice(0, 4) === chartYear).forEach((invoice) => {
    const month = Number((invoice.date || "").split("-")[1]) - 1;
    if (month >= 0) totals[month] += Number(invoice.total) || 0;
  });
  const max = Math.max(...totals, 1);
  document.getElementById("report-month-chart").innerHTML = months.map((month, index) => {
    const total = totals[index];
    const height = total > 0 ? Math.max(16, Math.round((total / max) * 82)) : 3;
    return `<span class="${total > 0 ? "" : "is-empty"}" style="height:${height}%"><i>${money(total)}</i><em>${month}</em></span>`;
  }).join("");
}

function renderReportProviderChart(list, total) {
  const entries = providerTotalsFromInvoices(list).slice(0, 5);
  document.getElementById("report-provider-donut").innerHTML = `<span>Total<br />${money(total)}</span>`;
  document.getElementById("report-provider-legend").innerHTML = entries.length
    ? entries.map((provider, index) => `<div><i class="legend-dot c${index}"></i><span>${escapeHtml(provider.name)}</span><strong>${money(provider.total)}</strong></div>`).join("")
    : `<div><span>Sin empresas proveedoras</span><strong>${money(0)}</strong></div>`;
}

function renderReportTable(list) {
  const rows = list.slice(0, 7);
  document.getElementById("report-table").innerHTML = rows.length
    ? rows.map((invoice) => `
      <tr>
        <td>${formatDate(invoice.date)}</td>
        <td>${escapeHtml(invoice.number || "Sin numero")}</td>
        <td>${escapeHtml(invoice.provider || "Sin proveedor")}</td>
        <td>${escapeHtml(typeof invoiceDisplayCategory === "function" ? invoiceDisplayCategory(invoice) : (invoice.category || "Otros"))}</td>
        <td>${money(invoice.total || 0)}</td>
        <td><span class="badge ${statusClass[invoice.status] || "pending"}">${escapeHtml(invoice.status === "Validado" ? "Validada" : invoice.status)}</span></td>
        <td><button class="ghost-button small" data-report-action="view" data-id="${escapeHtml(invoice.id)}">Ver</button></td>
      </tr>
    `).join("")
    : `<tr><td colspan="7">No hay facturas para el reporte.</td></tr>`;
}

function renderReportStatusSummary(list) {
  const statusRing = document.getElementById("report-status-ring");
  const statusLegend = document.getElementById("report-status-legend");
  if (!statusRing || !statusLegend) return;
  const total = list.length;
  const valid = list.filter((invoice) => invoice.status === "Validado").length;
  const observed = list.filter((invoice) => invoice.status === "Observado" || invoice.status === "Pendiente").length;
  const duplicates = list.filter((invoice) => invoice.status === "Duplicado").length;
  statusRing.innerHTML = `<span>${total}<br />Total</span>`;
  statusLegend.innerHTML = `
    <div><span>Validada</span><strong>${valid} (${total ? Math.round((valid / total) * 100) : 0}%)</strong></div>
    <div><span>Observada</span><strong>${observed} (${total ? Math.round((observed / total) * 100) : 0}%)</strong></div>
    <div><span>Anulada</span><strong>${duplicates} (${total ? Math.round((duplicates / total) * 100) : 0}%)</strong></div>
  `;
  document.getElementById("report-note").textContent = pendingReportNote(observed, duplicates);
}

function pendingReportNote(observed, duplicates) {
  if (observed || duplicates) return "Hay facturas que requieren revision antes de cerrar el reporte.";
  return "Todas las facturas del periodo seleccionado estan validadas.";
}

function renderReportComparison(list, total) {
  const previousList = previousPeriodInvoices();
  const previousTotal = previousList.reduce((sum, invoice) => sum + (Number(invoice.total) || 0), 0);
  const diff = total - previousTotal;
  const percent = previousTotal ? Math.round((diff / previousTotal) * 100) : (total > 0 ? 100 : 0);
  const direction = diff >= 0 ? "mas" : "menos";
  document.getElementById("report-comparison").innerHTML = `
    <strong>${Math.abs(percent)}% ${direction}</strong>
    <span>Periodo actual: ${money(total)}</span>
    <span>Periodo anterior: ${money(previousTotal)}</span>
  `;
}

function previousPeriodInvoices() {
  const from = appliedReportFilters.from || "";
  const to = appliedReportFilters.to || "";
  if (!from || !to) return [];
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  const days = Math.max(1, Math.round((end - start) / 86400000) + 1);
  const previousEnd = new Date(start);
  previousEnd.setDate(previousEnd.getDate() - 1);
  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousStart.getDate() - days + 1);
  const previousFrom = previousStart.toISOString().slice(0, 10);
  const previousTo = previousEnd.toISOString().slice(0, 10);
  return invoices.filter((invoice) => {
    const date = invoice.date || "";
    return !isTrashedInvoice(invoice) && date >= previousFrom && date <= previousTo;
  });
}

function renderReportCategoryList(list, total) {
  const target = document.getElementById("report-category-list");
  if (!target) return;
  const totals = list.reduce((acc, invoice) => {
    const category = invoiceDisplayCategory(invoice);
    if (!acc[category]) acc[category] = { count: 0, total: 0 };
    acc[category].count += 1;
    acc[category].total += Number(invoice.total) || 0;
    return acc;
  }, {});
  const entries = Object.entries(totals).sort((a, b) => b[1].total - a[1].total);
  target.innerHTML = entries.length
    ? entries.map(([category, data]) => {
      const percent = total ? Math.round((data.total / total) * 100) : 0;
      return `
        <article>
          <div>
            <strong>${escapeHtml(category)}</strong>
            <span>${data.count} factura(s)</span>
          </div>
          <em>${money(data.total)}</em>
          <i style="width:${Math.max(percent, 3)}%"></i>
        </article>
      `;
    }).join("")
    : `<div class="preview-empty compact">Sin categorias para mostrar.</div>`;
}

function renderReportQuality(list) {
  const validated = list.filter((invoice) => invoice.status === "Validado").length;
  const observed = list.filter((invoice) => invoice.status === "Observado" || invoice.status === "Pendiente").length;
  const duplicates = list.filter((invoice) => invoice.status === "Duplicado").length;
  const noFile = list.filter((invoice) => !invoice.fileUrl && !invoice.fileDataUrl).length;
  const amountIssues = list.filter((invoice) => Math.abs(((Number(invoice.subtotal) || 0) + (Number(invoice.igv) || 0)) - (Number(invoice.total) || 0)) > 0.05).length;
  document.getElementById("report-quality").innerHTML = `
    <article><span>Validadas</span><strong>${validated}</strong></article>
    <article><span>Observadas</span><strong>${observed}</strong></article>
    <article><span>Duplicadas</span><strong>${duplicates}</strong></article>
    <article><span>Sin archivo</span><strong>${noFile}</strong></article>
    <article><span>Montos no cuadran</span><strong>${amountIssues}</strong></article>
  `;
}

function renderReportTopProviders(list) {
  const entries = providerTotalsFromInvoices(list).slice(0, 5);
  document.getElementById("report-top-providers").innerHTML = entries.length
    ? entries.map((provider, index) => `
      <article>
        <strong>${index + 1}. ${escapeHtml(provider.name)}</strong>
        <span>${provider.count} facturas</span>
        <em>${money(provider.total)}</em>
      </article>
    `).join("")
    : `<div class="preview-empty compact">Sin empresas proveedoras para mostrar.</div>`;
}

function renderReportFinalSummary(list, total, pending, duplicates, company, companyLines) {
  const validated = list.filter((invoice) => invoice.status === "Validado").length;
  const qualityText = pending || duplicates
    ? `Hay ${pending + duplicates} factura(s) que requieren revision.`
    : "No se encontraron errores pendientes.";
  document.getElementById("report-final-summary").innerHTML = `
    <h3>Cierre del reporte de gastos</h3>
    <p><strong>${escapeHtml(company.name)}</strong>${companyLines.length ? ` | ${companyLines.map(escapeHtml).join(" | ")}` : ""}</p>
    <p>Durante este periodo se registraron ${validated} facturas validadas de gastos por un total de ${money(total)}. ${qualityText}</p>
  `;
}

function reportInvoices() {
  const from = appliedReportFilters.from || "";
  const to = appliedReportFilters.to || "";
  const provider = (appliedReportFilters.provider || "").trim().toLowerCase();
  const category = appliedReportFilters.category || "";
  const search = (appliedReportFilters.search || "").trim().toLowerCase();
  const status = appliedReportFilters.status || "Todos";

  return invoices.filter((invoice) => {
    const date = invoice.date || "";
    const matchesFrom = !from || date >= from;
    const matchesTo = !to || date <= to;
    const matchesProvider = !provider || String(invoice.provider || "").toLowerCase().includes(provider) || String(invoice.ruc || "").includes(provider);
    const matchesCategory = !category || invoiceDisplayCategory(invoice) === category;
    const matchesSearch = !search || [invoice.number, invoice.provider, invoice.ruc, invoice.category, invoice.status, invoice.date]
      .join(" ")
      .toLowerCase()
      .includes(search);
    const matchesStatus = status === "Todos" || status === "Todos los estados"
      ? !isTrashedInvoice(invoice)
      : invoice.status === status;
    return matchesFrom && matchesTo && matchesProvider && matchesCategory && matchesSearch && matchesStatus;
  });
}

function readReportFilterInputs() {
  return {
    from: document.getElementById("report-from")?.value || "",
    to: document.getElementById("report-to")?.value || "",
    provider: document.getElementById("report-provider")?.value || "",
    category: document.getElementById("report-category")?.value || "",
    search: document.getElementById("report-search")?.value || "",
    status: document.getElementById("report-status")?.value || "Todos",
    type: document.getElementById("report-type")?.value || "monthly"
  };
}

function applyReportFilters() {
  appliedReportFilters = readReportFilterInputs();
  renderReports();
}




function setReportTab(tabName) {
  const showExport = tabName === "export";
  document.querySelectorAll("[data-report-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.reportTab === tabName);
  });
  document.getElementById("report-summary-panel")?.classList.toggle("hidden", showExport);
  document.getElementById("report-export-panel")?.classList.toggle("hidden", !showExport);
  renderReports();
}


function applyPermissions() {
  document.querySelectorAll(".nav-item[data-view]").forEach((item) => {
    const allowed = canAccessView(item.dataset.view);
    item.disabled = !allowed;
    item.hidden = !allowed;
    item.classList.toggle("disabled", !allowed);
    item.setAttribute("aria-hidden", String(!allowed));
  });

  document.querySelectorAll("[data-view-target]").forEach((button) => {
    const allowed = canAccessView(button.dataset.viewTarget);
    button.disabled = !allowed;
    button.hidden = !allowed;
  });
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("hidden", !canAccessView(view.id));
  });
  if (!canAccessView(document.body.dataset.view || "dashboard")) {
    const fallback = firstAllowedView();
    document.body.dataset.view = fallback;
    document.querySelectorAll(".view").forEach((view) => {
      view.classList.toggle("active-view", view.id === fallback);
    });
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.classList.toggle("active", item.dataset.view === fallback);
    });
    document.getElementById("page-title").textContent = titles[fallback] || "FactuIA";
  }

  document.getElementById("process-button").disabled = !canEditInvoices();
  document.getElementById("save-invoice").disabled = !canEditInvoices();
  if (document.getElementById("observe-invoice")) {
    document.getElementById("observe-invoice").disabled = !canEditInvoices();
  }
}
