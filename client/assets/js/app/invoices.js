function invoiceStatusText(invoice) {
  return "Validado";
}

function invoiceFileName(invoice) {
  const source = invoice.fileName || invoice.fileUrl || invoice.filePath || `${invoice.number || "factura"}.pdf`;
  const name = String(source).split(/[\\/]/).pop().split(/[?#]/)[0];
  if (/\.[a-z0-9]+$/i.test(name)) return name;
  return `${invoice.number || "factura"}.pdf`;
}

function invoiceFileType(invoice) {
  const extension = invoiceFileName(invoice).split(".").pop().toUpperCase();
  return ["PDF", "JPG", "JPEG", "PNG"].includes(extension) ? (extension === "JPEG" ? "JPG" : extension) : "PDF";
}

function invoiceFileSize(invoice) {
  const fallback = Math.max(90, Math.min(1250, Math.round((Number(invoice.total) || 240) * 1.3)));
  if (invoice.fileSizeKb) return `${Number(invoice.fileSizeKb).toFixed(0)} KB`;
  if (invoice.fileSizeMb) return `${Number(invoice.fileSizeMb).toFixed(1)} MB`;
  return fallback >= 1000 ? `${(fallback / 1000).toFixed(1)} MB` : `${fallback} KB`;
}

function extractedMoney(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? money(number) : "-";
}

function invoiceCategoryCatalog() {
  return ["Compra", "Servicios", "Alquiler", "Transporte", "Mantenimiento", "Otros"];
}

function invoiceDisplayCategory(invoice) {
  const category = String(invoice.category || "Compra").trim();
  const normalized = category.toLowerCase();
  if (/^compras?$/.test(normalized)) return "Compra";
  if (/movilidad|combustible|transporte/.test(normalized)) return "Transporte";
  if (/mantenimiento|reparacion/.test(normalized)) return "Mantenimiento";
  if (/servicio/.test(normalized)) return "Servicios";
  if (/alquiler/.test(normalized)) return "Alquiler";
  return invoiceCategoryCatalog().includes(category) ? category : "Otros";
}

function invoiceMatchesPeriod(invoice, month, year) {
  const period = String(invoice.date || "").slice(0, 7) || invoicePeriod(invoice);
  if (!period) return !month && !year;
  const [invoiceYear, invoiceMonth] = period.split("-");
  if (month && invoiceMonth !== month) return false;
  if (year && invoiceYear !== year) return false;
  return true;
}

function invoiceSortValue(invoice, key) {
  if (key === "date") return String(invoice.date || "");
  if (["subtotal", "igv", "total"].includes(key)) return Number(invoice[key]) || 0;
  if (key === "category") return invoiceDisplayCategory(invoice);
  return String(invoice[key] || "").toLowerCase();
}

function sortInvoices(list) {
  const { key, direction } = invoiceSort;
  const modifier = direction === "asc" ? 1 : -1;
  return [...list].sort((a, b) => {
    const valueA = invoiceSortValue(a, key);
    const valueB = invoiceSortValue(b, key);
    if (typeof valueA === "number" || typeof valueB === "number") {
      return ((Number(valueA) || 0) - (Number(valueB) || 0)) * modifier;
    }
    return String(valueA).localeCompare(String(valueB), "es", { numeric: true, sensitivity: "base" }) * modifier;
  });
}

function invoiceCategoryClass(category) {
  const value = String(category || "Otros").toLowerCase();
  if (/compra/.test(value)) return "purchase";
  if (/servicio/.test(value)) return "services";
  if (/alquiler/.test(value)) return "rent";
  if (/transporte/.test(value)) return "transport";
  if (/mantenimiento/.test(value)) return "maintenance";
  return "other";
}

function invoiceRow(invoice, includeRuc = false) {
  const statusText = invoice.status === "Validado" ? "Validada" : invoice.status;
  const badge = `<span class="badge ${statusClass[invoice.status] || "pending"}">${escapeHtml(statusText)}</span>`;
  const priority = invoice.priority || "Normal";
  const priorityBadge = `<span class="priority ${priority.toLowerCase()}">${escapeHtml(priority)}</span>`;
  const rucValue = invoice.ruc || "Sin RUC";
  const rucBadge = invoice.ruc
    ? `<span class="ruc-status ${validPeruRuc(invoice.ruc) ? "ok" : "bad"}">${validPeruRuc(invoice.ruc) ? "OK" : "Revisar"}</span>`
    : "";

  if (includeRuc) {
    return `
      <tr>
        <td>${escapeHtml(invoice.provider)}</td>
        <td>${escapeHtml(rucValue)} ${rucBadge}</td>
        <td>${formatDate(invoice.date)}</td>
        <td>${escapeHtml(invoice.category)}</td>
        <td>${money(invoice.total)}</td>
        <td>${badge} ${priorityBadge}</td>
      </tr>
    `;
  }

  return `
    <tr>
      <td><input type="checkbox" data-invoice-select="${escapeHtml(invoice.id)}" aria-label="Seleccionar factura" /></td>
      <td><span class="invoice-number-only">${escapeHtml(invoice.number || "Sin numero")}</span></td>
      <td>${escapeHtml(invoice.provider || "Sin proveedor")}</td>
      <td>${escapeHtml(invoice.ruc || "Sin RUC")}</td>
      <td>${formatDate(invoice.date)}</td>
      <td>${extractedMoney(invoice.subtotal)}</td>
      <td>${extractedMoney(invoice.igv)}</td>
      <td>${money(invoice.total)}</td>
      <td><span class="category-pill ${invoiceCategoryClass(invoiceDisplayCategory(invoice))}">${escapeHtml(invoiceDisplayCategory(invoice))}</span></td>
      <td>
        <div class="invoice-actions">
          <button class="invoice-icon-button" data-action="view" data-id="${escapeHtml(invoice.id)}" title="Ver" aria-label="Ver factura">
            <img src="assets/img/ver.png" alt="" />
          </button>
          <button class="invoice-icon-button" data-action="download" data-id="${escapeHtml(invoice.id)}" title="Descargar" aria-label="Descargar factura">
            <img src="assets/img/descargar.png" alt="" />
          </button>
          <div class="action-menu-wrap">
            <button class="invoice-icon-button menu-trigger" data-action="menu" data-id="${escapeHtml(invoice.id)}" aria-haspopup="true" aria-expanded="false" title="Mas opciones">...</button>
            <div class="action-menu hidden" data-invoice-menu-for="${escapeHtml(invoice.id)}">
              <button type="button" data-action="edit" data-id="${escapeHtml(invoice.id)}">Editar</button>
              <button type="button" class="danger-menu-action" data-action="delete" data-id="${escapeHtml(invoice.id)}">Eliminar</button>
            </div>
          </div>
        </div>
      </td>
    </tr>
  `;
}

function currentFilteredInvoices() {
  const query = document.getElementById("invoice-search").value.trim().toLowerCase();
  const month = document.getElementById("invoice-month-filter")?.value || "";
  const year = document.getElementById("invoice-year-filter")?.value || "";
  const category = document.getElementById("invoice-category-filter")?.value || "";

  return sortInvoices(activeInvoices().filter((invoice) => {
    const matchesQuery = [invoice.company, invoice.provider, invoice.ruc, invoice.number, invoice.category, invoice.status, invoicePeriod(invoice), invoiceFileName(invoice)]
      .join(" ")
      .toLowerCase()
      .includes(query);
    const matchesPeriod = invoiceMatchesPeriod(invoice, month, year);
    const matchesCategory = !category || invoiceDisplayCategory(invoice) === category;
    return matchesQuery && matchesPeriod && matchesCategory;
  }));
}

function normalizedInvoiceStatus(invoice) {
  return String(invoice?.status || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isTrashedInvoice(invoice) {
  return normalizedInvoiceStatus(invoice) === "eliminado" || Boolean(invoice?.deletedAt);
}

function activeInvoices() {
  return invoices.filter((invoice) => !isTrashedInvoice(invoice));
}

function trashedInvoices() {
  return invoices.filter(isTrashedInvoice);
}

function renderInvoiceMetrics(list) {
  const month = today().slice(0, 7);
  const total = list.reduce((sum, invoice) => sum + (Number(invoice.total) || 0), 0);
  const monthCount = list.filter((invoice) => String(invoice.date || "").slice(0, 7) === month || invoicePeriod(invoice) === month).length;
  const providerCount = new Set(list.map((invoice) => invoice.ruc || invoice.provider).filter(Boolean)).size;

  document.getElementById("invoice-total-count").textContent = String(list.length);
  document.getElementById("invoice-total-amount").textContent = money(total);
  document.getElementById("invoice-month-count").textContent = String(monthCount);
  document.getElementById("invoice-provider-count").textContent = String(providerCount);
}

function populateInvoiceYearFilter(list) {
  const yearSelect = document.getElementById("invoice-year-filter");
  if (!yearSelect) return;
  const current = yearSelect.value || "";
  const years = [...new Set(list.map((invoice) => String(invoice.date || "").slice(0, 4)).filter(Boolean))].sort((a, b) => b.localeCompare(a));
  yearSelect.innerHTML = `<option value="">Todos</option>${years.map((year) => (
    `<option value="${escapeHtml(year)}">${escapeHtml(year)}</option>`
  )).join("")}`;
  yearSelect.value = years.includes(current) ? current : "";
}

function populateInvoiceCategoryFilter(list) {
  const categorySelect = document.getElementById("invoice-category-filter");
  if (!categorySelect) return;
  const current = categorySelect.value || "";
  const categories = invoiceCategoryCatalog();
  categorySelect.innerHTML = `<option value="">Todas</option>${categories.map((category) => (
    `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`
  )).join("")}`;
  categorySelect.value = categories.includes(current) ? current : "";
}

function selectedInvoiceIds() {
  return [...document.querySelectorAll("[data-invoice-select]:checked")].map((item) => item.dataset.invoiceSelect);
}

function selectedInvoices() {
  const ids = new Set(selectedInvoiceIds());
  return invoices.filter((invoice) => ids.has(invoice.id));
}

function updateInvoiceBulkBar() {
  const selected = selectedInvoiceIds();
  const button = document.getElementById("invoice-delete-selected");
  if (!button) return;
  button.disabled = selected.length === 0;
  button.classList.toggle("danger", selected.length > 0);
  const label = selected.length
    ? `Eliminar seleccionadas (${selected.length})`
    : "Eliminar seleccionadas";
  button.innerHTML = `<img class="invoice-button-icon" src="assets/img/eliminar.png" alt="" /><span>${label}</span>`;
}

function renderInvoicePagination(total) {
  const pagination = document.getElementById("invoice-pagination");
  if (!pagination) return;
  const pageCount = Math.max(1, Math.ceil(total / invoicePageSize));
  invoicePage = Math.min(Math.max(1, invoicePage), pageCount);
  const buttons = [];
  buttons.push(`<button type="button" data-invoice-page="${invoicePage - 1}" ${invoicePage === 1 ? "disabled" : ""}>&lt;</button>`);
  for (let page = 1; page <= pageCount; page += 1) {
    const shouldShow = pageCount <= 5 || page <= 2 || page === pageCount || Math.abs(page - invoicePage) <= 1;
    if (!shouldShow) {
      if (!buttons[buttons.length - 1]?.includes("invoice-page-gap")) {
        buttons.push(`<button class="invoice-page-gap" type="button" disabled>...</button>`);
      }
      continue;
    }
    buttons.push(`<button class="${page === invoicePage ? "active" : ""}" type="button" data-invoice-page="${page}">${page}</button>`);
  }
  buttons.push(`<button type="button" data-invoice-page="${invoicePage + 1}" ${invoicePage === pageCount ? "disabled" : ""}>&gt;</button>`);
  pagination.innerHTML = buttons.join("");
}

function updateInvoiceSortButtons() {
  document.querySelectorAll("[data-invoice-sort]").forEach((button) => {
    const active = button.dataset.invoiceSort === invoiceSort.key;
    button.classList.toggle("active", active);
    button.dataset.direction = active ? invoiceSort.direction : "";
  });
}

function renderInvoices() {
  const all = activeInvoices();
  populateInvoiceYearFilter(all);
  populateInvoiceCategoryFilter(all);
  renderInvoiceMetrics(all);
  const list = currentFilteredInvoices();
  const pageCount = Math.max(1, Math.ceil(list.length / invoicePageSize));
  invoicePage = Math.min(Math.max(1, invoicePage), pageCount);
  const start = (invoicePage - 1) * invoicePageSize;
  const visibleRows = list.slice(start, start + invoicePageSize);

  document.getElementById("invoice-table").innerHTML = visibleRows.length
    ? visibleRows.map((item) => invoiceRow(item)).join("")
    : `<tr><td colspan="10">No hay facturas con esos filtros.</td></tr>`;

  const resultCount = document.getElementById("invoice-result-count");
  if (resultCount) {
    resultCount.textContent = list.length
      ? `Mostrando ${start + 1} a ${start + visibleRows.length} de ${list.length} resultados`
      : "Mostrando 0 resultados";
  }
  renderInvoicePagination(list.length);
  updateInvoiceSortButtons();
  const selectAll = document.getElementById("invoice-select-all");
  if (selectAll) {
    selectAll.checked = false;
    selectAll.indeterminate = false;
  }
  updateInvoiceBulkBar();

  const recent = activeInvoices();
  const recentTable = document.getElementById("recent-invoices");
  if (recentTable) {
    recentTable.innerHTML = recent.length
      ? recent.slice(0, 5).map((item) => invoiceRow(item, true)).join("")
      : `<tr><td colspan="6">Aun no hay facturas registradas.</td></tr>`;
  }
}

function exportInvoicesCsv(rows = currentFilteredInvoices(), fileSuffix = "") {
  const header = ["Factura", "Proveedor", "RUC", "Fecha", "Subtotal", "IGV", "Total", "Categoria"];
  const lines = rows.map((invoice) => [
    invoice.number || "",
    invoice.provider || "",
    invoice.ruc || "",
    formatDate(invoice.date),
    String(Number(invoice.subtotal) || 0),
    String(Number(invoice.igv) || 0),
    String(Number(invoice.total) || 0),
    invoiceDisplayCategory(invoice)
  ]);
  const csv = [header, ...lines]
    .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `facturas${fileSuffix}-${today()}.csv`;
  document.body.appendChild(link);
  link.click();
  URL.revokeObjectURL(link.href);
  link.remove();
}
