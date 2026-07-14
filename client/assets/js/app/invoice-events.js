function resetInvoicePageAndRender() {
  invoicePage = 1;
  renderInvoices();
}

document.getElementById("invoice-search").addEventListener("input", resetInvoicePageAndRender);
document.getElementById("invoice-month-filter")?.addEventListener("change", resetInvoicePageAndRender);
document.getElementById("invoice-year-filter")?.addEventListener("change", resetInvoicePageAndRender);
document.getElementById("invoice-category-filter")?.addEventListener("change", resetInvoicePageAndRender);
document.getElementById("invoice-clear-filters")?.addEventListener("click", () => {
  document.getElementById("invoice-search").value = "";
  const monthFilter = document.getElementById("invoice-month-filter");
  if (monthFilter) monthFilter.value = "";
  const yearFilter = document.getElementById("invoice-year-filter");
  if (yearFilter) yearFilter.value = "";
  const categoryFilter = document.getElementById("invoice-category-filter");
  if (categoryFilter) categoryFilter.value = "";
  resetInvoicePageAndRender();
});
document.getElementById("invoice-delete-selected")?.addEventListener("click", () => {
  const ids = selectedInvoiceIds();
  if (!ids.length) return;
  showAppMessage({
    title: "Mover facturas a papelera",
    message: `Se moveran ${ids.length} facturas seleccionadas a la papelera.`,
    icon: "?",
    primaryText: "Si, mover",
    secondaryText: "Cancelar",
    onPrimary: async () => {
      const idSet = new Set(ids);
      const deletedAt = new Date().toISOString();
      invoices = invoices.map((invoice) => {
        if (!idSet.has(invoice.id)) return invoice;
        return {
          ...invoice,
          previousStatus: invoice.status,
          status: "Eliminado",
          deletedAt,
          deletedBy: currentUser?.email || "Sistema",
          audit: [
            ...(Array.isArray(invoice.audit) ? invoice.audit : []),
            { at: deletedAt, by: currentUser?.email || "Sistema", action: "Movida a papelera por seleccion multiple" }
          ].slice(-20)
        };
      });
      await saveInvoices();
      trashCurrentPage = 1;
      renderAll();
    }
  });
});
document.getElementById("invoice-select-all")?.addEventListener("change", (event) => {
  document.querySelectorAll("[data-invoice-select]").forEach((item) => {
    item.checked = event.target.checked;
  });
  updateInvoiceBulkBar();
});
document.getElementById("invoice-table")?.addEventListener("change", (event) => {
  if (!event.target.matches("[data-invoice-select]")) return;
  const checkboxes = [...document.querySelectorAll("[data-invoice-select]")];
  const checked = checkboxes.filter((item) => item.checked);
  const selectAll = document.getElementById("invoice-select-all");
  if (selectAll) {
    selectAll.checked = checkboxes.length > 0 && checked.length === checkboxes.length;
    selectAll.indeterminate = checked.length > 0 && checked.length < checkboxes.length;
  }
  updateInvoiceBulkBar();
});
document.getElementById("invoice-pagination")?.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-invoice-page]");
  if (!button || button.disabled) return;
  invoicePage = Number(button.dataset.invoicePage) || 1;
  renderInvoices();
});
document.querySelector(".invoices-table thead")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-invoice-sort]");
  if (!button) return;
  const key = button.dataset.invoiceSort;
  invoiceSort = {
    key,
    direction: invoiceSort.key === key && invoiceSort.direction === "asc" ? "desc" : "asc"
  };
  invoicePage = 1;
  renderInvoices();
});

document.getElementById("agenda")?.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-agenda-id]");
  if (!button) return;
  const invoice = invoices.find((item) => item.id === button.dataset.agendaId);
  if (!invoice) return;
  fillValidationForm(invoice);
  setView("validate");
});

document.getElementById("invoice-table").addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const invoice = invoices.find((item) => item.id === button.dataset.id);
  if (!invoice) return;

  if (button.dataset.action === "menu") {
    const menu = [...document.querySelectorAll(".action-menu")].find((item) => item.dataset.invoiceMenuFor === invoice.id);
    const isHidden = menu?.classList.contains("hidden");
    closeActionMenus();
    if (menu && isHidden) {
      positionActionMenu(menu, button);
      menu.classList.remove("hidden");
      button.setAttribute("aria-expanded", "true");
    }
    return;
  }

  closeActionMenus();

  if (button.dataset.action === "view") {
    openInvoiceViewModal(invoice);
  }

  if (button.dataset.action === "download") {
    if (invoice.fileUrl) {
      const link = document.createElement("a");
      link.href = invoice.fileUrl;
      link.download = invoiceFileName(invoice);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } else {
      openInvoiceViewModal(invoice);
    }
  }

  if (button.dataset.action === "edit") {
    editingInvoiceId = invoice.id;
    validationRows = [{ ...invoice }];
    currentDraft = validationRows[0];
    renderValidationTable();
    openValidationModal(0);
  }

  if (button.dataset.action === "delete") {
    showAppMessage({
      title: "¿Mover a papelera?",
      message: `Se movera la factura ${invoice.number || invoice.provider} a la papelera.`,
      icon: "?",
      primaryText: "Si, mover",
      secondaryText: "No, cancelar",
      onPrimary: async () => {
        const deletedAt = new Date().toISOString();
        invoices = invoices.map((item) => {
          if (item.id !== invoice.id) return item;
          const deletedBy = currentUser?.email || "Sistema";
          return {
            ...item,
            previousStatus: item.status,
            status: "Eliminado",
            deletedAt,
            deletedBy,
            audit: [
              ...(Array.isArray(item.audit) ? item.audit : []),
              { at: deletedAt, by: deletedBy, action: "Movida a papelera" }
            ].slice(-20)
          };
        });
        await saveInvoices();
        trashCurrentPage = 1;
        renderAll();
      }
    });
  }
});

document.getElementById("trash-table").addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-trash-action]");
  if (!button) return;

  if (button.dataset.trashAction === "menu") {
    const menu = document.querySelector(`[data-trash-menu-for="${CSS.escape(button.dataset.id)}"]`);
    const shouldOpen = menu?.classList.contains("hidden");
    closeTrashRowMenus();
    if (menu && shouldOpen) {
      menu.classList.remove("hidden");
    }
    return;
  }

  const invoice = invoices.find((item) => item.id === button.dataset.id);
  if (!invoice) return;

  if (button.dataset.trashAction === "view-file") {
    closeTrashRowMenus();
    if (invoice.fileUrl || invoice.fileDataUrl) {
      openInvoiceViewModal(invoice);
    } else {
      showAppMessage({
        title: "Archivo no disponible",
        message: `La factura ${invoice.number || "Sin numero"} no tiene un archivo guardado para visualizar.`,
        icon: "!",
        primaryText: "Entendido"
      });
    }
    return;
  }

  if (button.dataset.trashAction === "restore") {
    const duplicate = invoices.find((item) => (
      item.id !== invoice.id
      && !isTrashedInvoice(item)
      && String(item.ruc || "").trim() === String(invoice.ruc || "").trim()
      && String(item.number || "").trim().toLowerCase() === String(invoice.number || "").trim().toLowerCase()
    ));
    if (duplicate) {
      showAppMessage({
        title: "Factura duplicada",
        message: `Ya existe una factura activa con el mismo RUC y numero (${invoice.number || "Sin numero"}). No se puede restaurar para evitar duplicados.`,
        icon: "!",
        primaryText: "Entendido"
      });
      return;
    }

    showAppMessage({
      title: "¿Restaurar factura?",
      message: `La factura ${invoice.number || "Sin numero"} volvera a la lista de facturas registradas.`,
      icon: "?",
      primaryText: "Restaurar",
      secondaryText: "Cancelar",
      onPrimary: async () => {
        invoice.status = invoice.previousStatus || "Pendiente";
        invoice.restoredAt = new Date().toISOString();
        invoice.audit = [
          ...(Array.isArray(invoice.audit) ? invoice.audit : []),
          { at: invoice.restoredAt, by: currentUser?.email || "Sistema", action: "Restaurada desde papelera" }
        ].slice(-20);
        delete invoice.deletedAt;
        delete invoice.deletedBy;
        delete invoice.previousStatus;
        await saveInvoices();
        renderAll();
      }
    });
    return;
  }

  if (button.dataset.trashAction === "destroy") {
    showAppMessage({
      title: "¿Eliminar definitivamente?",
      message: `Esta accion borrara la factura ${invoice.number || invoice.provider} de forma permanente.`,
      icon: "!",
      primaryText: "Si, eliminar",
      secondaryText: "No, cancelar",
      onPrimary: async () => {
        localStorage.setItem("factuia_destroyed_trash_count", String(Number(localStorage.getItem("factuia_destroyed_trash_count") || 0) + 1));
        invoices = invoices.filter((item) => item.id !== invoice.id);
        await saveInvoices();
        trashCurrentPage = 1;
        renderAll();
      }
    });
  }
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".trash-actions")) closeTrashRowMenus();
});

function closeTrashRowMenus() {
  document.querySelectorAll(".trash-row-menu").forEach((menu) => menu.classList.add("hidden"));
}
