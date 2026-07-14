let trashCurrentPage = 1;
const trashPageSize = 15;

function deletedDateValue(invoice) {
  return invoice.deletedAt ? new Date(invoice.deletedAt) : null;
}

function withinTrashDateFilter(invoice, filter) {
  if (filter === "all") return true;
  const deletedDate = deletedDateValue(invoice);
  if (!deletedDate || Number.isNaN(deletedDate.getTime())) return false;
  const now = new Date();
  const ageDays = (now - deletedDate) / (1000 * 60 * 60 * 24);
  if (filter === "today") return deletedDate.toDateString() === now.toDateString();
  if (filter === "week") return ageDays <= 7;
  if (filter === "month") return ageDays <= 30;
  return true;
}

function invoiceFileName(invoice) {
  const extension = invoice.fileName?.split(".").pop() || invoice.fileUrl?.split(".").pop() || "pdf";
  const cleanExtension = String(extension || "pdf").split(/[?#]/)[0].toLowerCase();
  const number = invoice.number || invoice.id?.slice(0, 8) || "factura";
  return `${number}.${cleanExtension || "pdf"}`;
}

function invoiceFileSize(invoice) {
  const fallback = Math.max(1.12, Math.min(4.6, (Number(invoice.total) || 180) / 360));
  return Number(invoice.fileSizeMb || invoice.sizeMb || fallback).toFixed(2);
}

function trashDisplayUser(invoice) {
  const deletedBy = invoice.deletedBy || "Sistema";
  const user = users.find((item) => item.email === deletedBy || item.username === deletedBy || item.name === deletedBy);
  return user?.name || deletedBy;
}

function filteredTrashInvoices() {
  const query = document.getElementById("trash-search")?.value.trim().toLowerCase() || "";
  const dateFilter = document.getElementById("trash-date-filter")?.value || "all";
  const providerFilter = document.getElementById("trash-provider-filter")?.value || "all";
  const userFilter = document.getElementById("trash-user-filter")?.value || "all";

  return trashedInvoices().filter((invoice) => {
    const provider = invoice.provider || "Sin proveedor";
    const deletedBy = trashDisplayUser(invoice);
    const haystack = [invoice.number, invoice.provider, invoice.ruc, invoiceFileName(invoice), deletedBy]
      .join(" ")
      .toLowerCase();
    const matchesQuery = !query || haystack.includes(query);
    const matchesDate = withinTrashDateFilter(invoice, dateFilter);
    const matchesProvider = providerFilter === "all" || provider === providerFilter;
    const matchesUser = userFilter === "all" || deletedBy === userFilter;
    return matchesQuery && matchesDate && matchesProvider && matchesUser;
  });
}

function populateTrashFilters(list) {
  const providerSelect = document.getElementById("trash-provider-filter");
  const userSelect = document.getElementById("trash-user-filter");
  if (!providerSelect || !userSelect) return;

  const currentProvider = providerSelect.value || "all";
  const currentUser = userSelect.value || "all";
  const providers = [...new Set(list.map((invoice) => invoice.provider || "Sin proveedor"))].sort();
  const deletedUsers = [...new Set(list.map(trashDisplayUser))].sort();

  providerSelect.innerHTML = `<option value="all">Todos</option>${providers.map((provider) => (
    `<option value="${escapeHtml(provider)}">${escapeHtml(provider)}</option>`
  )).join("")}`;
  userSelect.innerHTML = `<option value="all">Todos</option>${deletedUsers.map((user) => (
    `<option value="${escapeHtml(user)}">${escapeHtml(user)}</option>`
  )).join("")}`;
  providerSelect.value = providers.includes(currentProvider) ? currentProvider : "all";
  userSelect.value = deletedUsers.includes(currentUser) ? currentUser : "all";
}

function renderTrashMetrics(allTrashed, filtered) {
  const restoredRecently = invoices.filter((invoice) => {
    if (!invoice.restoredAt) return false;
    return (new Date() - new Date(invoice.restoredAt)) / (1000 * 60 * 60 * 24) <= 30;
  }).length;
  const destroyedCount = Number(settings.destroyedTrashCount || localStorage.getItem("factuia_destroyed_trash_count") || 0);
  const totalSize = allTrashed.reduce((sum, invoice) => sum + Number(invoiceFileSize(invoice)), 0);

  document.getElementById("trash-count").textContent = String(allTrashed.length);
  document.getElementById("trash-restored-count").textContent = String(restoredRecently);
  document.getElementById("trash-destroyed-count").textContent = String(destroyedCount);
  document.getElementById("trash-size-total").textContent = `${totalSize.toFixed(1)} MB`;
}

function selectedTrashIds() {
  return [...document.querySelectorAll("[data-trash-select]:checked")].map((item) => item.dataset.trashSelect);
}

function updateTrashBulkButton() {
  const button = document.getElementById("trash-empty-button");
  if (!button) return;
  const selectedCount = selectedTrashIds().length;
  const isSelectionMode = selectedCount > 0;
  button.classList.toggle("danger", isSelectionMode);
  button.innerHTML = `
    <img class="trash-button-icon" src="assets/img/${isSelectionMode ? "eliminar.png" : "vaciar_papelera.png"}" alt="" />
    <span>${isSelectionMode ? `Eliminar seleccionadas (${selectedCount})` : "Vaciar papelera"}</span>
  `;
}

function trashRow(invoice) {
  const deletedAt = invoice.deletedAt ? new Date(invoice.deletedAt).toLocaleString("es-PE") : "-";
  return `
    <tr>
      <td><input type="checkbox" data-trash-select="${escapeHtml(invoice.id)}" aria-label="Seleccionar factura" /></td>
      <td><span class="trash-invoice-code">${escapeHtml(invoice.number || "Sin numero")}</span></td>
      <td>${escapeHtml(invoice.provider || "Sin proveedor")}</td>
      <td>${escapeHtml(invoice.ruc || "Sin RUC")}</td>
      <td>${formatDate(invoice.date)}</td>
      <td>${escapeHtml(deletedAt)}</td>
      <td>${escapeHtml(trashDisplayUser(invoice))}</td>
      <td>${invoiceFileSize(invoice)} MB</td>
      <td>
        <div class="trash-actions">
          <button class="trash-icon-button restore" data-trash-action="restore" data-id="${escapeHtml(invoice.id)}" title="Restaurar">
            <img src="assets/img/Restauradas.png" alt="" />
          </button>
          <button class="trash-icon-button destroy" data-trash-action="destroy" data-id="${escapeHtml(invoice.id)}" title="Eliminar definitivamente">
            <img src="assets/img/eliminar.png" alt="" />
          </button>
          <button class="trash-icon-button menu" data-trash-action="menu" data-id="${escapeHtml(invoice.id)}" title="Mas opciones" aria-label="Mas opciones">...</button>
          <div class="trash-row-menu hidden" data-trash-menu-for="${escapeHtml(invoice.id)}">
            <button type="button" data-trash-action="view-file" data-id="${escapeHtml(invoice.id)}">Ver archivo</button>
          </div>
        </div>
      </td>
    </tr>
  `;
}

function renderTrashPagination(filtered) {
  const pagination = document.querySelector(".trash-pagination");
  const resultCount = document.getElementById("trash-result-count");
  if (!pagination || !resultCount) return;

  const totalPages = Math.max(1, Math.ceil(filtered.length / trashPageSize));
  trashCurrentPage = Math.min(Math.max(1, trashCurrentPage), totalPages);
  const startIndex = filtered.length ? (trashCurrentPage - 1) * trashPageSize + 1 : 0;
  const endIndex = Math.min(trashCurrentPage * trashPageSize, filtered.length);

  resultCount.textContent = filtered.length
    ? `Mostrando ${startIndex} a ${endIndex} de ${filtered.length} resultados`
    : "Mostrando 0 resultados";

  const pageButtons = Array.from({ length: totalPages }, (_, index) => {
    const page = index + 1;
    return `<button class="${page === trashCurrentPage ? "active" : ""}" data-trash-page="${page}" type="button">${page}</button>`;
  }).join("");

  pagination.innerHTML = `
    <button data-trash-page="prev" type="button" ${trashCurrentPage === 1 ? "disabled" : ""}>&lt;</button>
    ${pageButtons}
    <button data-trash-page="next" type="button" ${trashCurrentPage === totalPages ? "disabled" : ""}>&gt;</button>
  `;
}

function renderTrash() {
  const table = document.getElementById("trash-table");
  if (!table) return;
  const allTrashed = trashedInvoices();
  populateTrashFilters(allTrashed);
  const filtered = filteredTrashInvoices();
  const totalPages = Math.max(1, Math.ceil(filtered.length / trashPageSize));
  trashCurrentPage = Math.min(trashCurrentPage, totalPages);
  const start = (trashCurrentPage - 1) * trashPageSize;
  const visibleRows = filtered.slice(start, start + trashPageSize);

  renderTrashMetrics(allTrashed, filtered);
  renderTrashPagination(filtered);
  table.innerHTML = visibleRows.length
    ? visibleRows.map(trashRow).join("")
    : `<tr><td colspan="9">La papelera esta vacia.</td></tr>`;

  const selectAll = document.getElementById("trash-select-all");
  if (selectAll) selectAll.checked = false;
  updateTrashBulkButton();
}

function bindTrashControls() {
  ["trash-search", "trash-date-filter", "trash-provider-filter", "trash-user-filter"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", () => {
      trashCurrentPage = 1;
      renderTrash();
    });
    document.getElementById(id)?.addEventListener("change", () => {
      trashCurrentPage = 1;
      renderTrash();
    });
  });

  document.querySelector(".trash-pagination")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-trash-page]");
    if (!button || button.disabled) return;
    const filtered = filteredTrashInvoices();
    const totalPages = Math.max(1, Math.ceil(filtered.length / trashPageSize));
    const action = button.dataset.trashPage;
    if (action === "prev") trashCurrentPage -= 1;
    else if (action === "next") trashCurrentPage += 1;
    else trashCurrentPage = Number(action) || 1;
    trashCurrentPage = Math.min(Math.max(1, trashCurrentPage), totalPages);
    renderTrash();
  });

  document.getElementById("trash-select-all")?.addEventListener("change", (event) => {
    document.querySelectorAll("[data-trash-select]").forEach((item) => {
      item.checked = event.target.checked;
    });
    updateTrashBulkButton();
  });

  document.getElementById("trash-table")?.addEventListener("change", (event) => {
    if (!event.target.matches("[data-trash-select]")) return;
    const checkboxes = [...document.querySelectorAll("[data-trash-select]")];
    const checkedCount = checkboxes.filter((item) => item.checked).length;
    const selectAll = document.getElementById("trash-select-all");
    if (selectAll) {
      selectAll.checked = checkboxes.length > 0 && checkedCount === checkboxes.length;
      selectAll.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
    }
    updateTrashBulkButton();
  });

  document.getElementById("trash-empty-button")?.addEventListener("click", () => {
    const selectedIds = selectedTrashIds();
    const list = selectedIds.length
      ? trashedInvoices().filter((invoice) => selectedIds.includes(invoice.id))
      : trashedInvoices();
    if (!list.length) return;
    const isSelectionMode = selectedIds.length > 0;
    showAppMessage({
      title: isSelectionMode ? "¿Eliminar seleccionadas?" : "¿Vaciar papelera?",
      message: `Esta accion eliminara definitivamente ${list.length} factura(s).`,
      icon: "!",
      primaryText: isSelectionMode ? "Eliminar seleccionadas" : "Vaciar papelera",
      secondaryText: "Cancelar",
      onPrimary: async () => {
        localStorage.setItem("factuia_destroyed_trash_count", String(Number(localStorage.getItem("factuia_destroyed_trash_count") || 0) + list.length));
        const idsToDelete = new Set(list.map((invoice) => invoice.id));
        invoices = invoices.filter((invoice) => !(isTrashedInvoice(invoice) && idsToDelete.has(invoice.id)));
        await saveInvoices();
        trashCurrentPage = 1;
        renderAll();
      }
    });
  });
}

bindTrashControls();
