function renderAll() {
  safeRender("permisos", applyPermissions);
  safeRender("dashboard", renderDashboard);
  safeRender("facturas", renderInvoices);
  safeRender("reportes", renderReports);
  safeRender("papelera", renderTrash);
  safeRender("proveedores", renderProviders);
  safeRender("usuarios", renderUsers);
  safeRender("configuracion", renderSettings);
  safeRender("resumenes", updateFlowSummaries);
}

function safeRender(name, renderStep) {
  try {
    renderStep();
  } catch (error) {
    console.error(`No se pudo renderizar ${name}:`, error);
    if (name === "usuarios") {
      const table = document.getElementById("user-table");
      if (table && !table.children.length) {
        table.innerHTML = `<tr><td colspan="11">No se pudieron mostrar los usuarios. Actualiza la pagina e intenta otra vez.</td></tr>`;
      }
    }
  }
}

async function renderOcrStatus() {
  const status = document.getElementById("ocr-status");
  if (!status) return;

  try {
    const response = await fetch(`${API_BASE}/api/status`);
    const data = await response.json();
    const tools = data.tools || {};
    if (data.ok) {
      status.textContent = tools.ollama
        ? `OCR + IA local listos: Tesseract, Poppler y ${tools.ollamaModel || "Ollama"} disponibles.`
        : "OCR listo: Tesseract y Poppler disponibles. IA local no conectada.";
    } else {
      status.textContent = `OCR incompleto: Tesseract ${tools.tesseract ? "OK" : "falta"}, pdftotext ${tools.pdftotext ? "OK" : "falta"}, pdftoppm ${tools.pdftoppm ? "OK" : "falta"}.`;
    }
  } catch {
    status.textContent = "Backend OCR no conectado. Abre el sistema en http://localhost:8001/index.html.";
  }
}

function downloadInvoiceFile(invoice) {
  const link = document.createElement("a");
  link.href = invoice.fileUrl || invoice.fileDataUrl;
  if (!link.href) return;
  link.download = invoice.fileName || `${invoice.number}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function openInvoiceViewModal(invoice) {
  invoiceBeingViewed = invoice;
  document.getElementById("invoice-view-title").textContent = "Ver factura";
  document.getElementById("invoice-view-meta").innerHTML = `
    <span><strong>${escapeHtml(invoice.number || "-")}</strong></span>
    <span>${formatDate(invoice.date) || "-"}</span>
  `;
  showPreview("invoice-file-preview", invoice.fileType || "", invoice.fileUrl || invoice.fileDataUrl || "", invoice.fileName || "Factura");
  document.getElementById("invoice-view-modal").classList.remove("hidden");
}

function closeInvoiceViewModal() {
  invoiceBeingViewed = null;
  document.getElementById("invoice-view-modal").classList.add("hidden");
  document.getElementById("invoice-file-preview").innerHTML = "<strong>Factura</strong>";
}

document.querySelectorAll("[data-view], [data-view-target]").forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view || button.dataset.viewTarget));
});

document.getElementById("global-search-button")?.addEventListener("click", openGlobalSearch);
document.getElementById("global-search-input").addEventListener("input", renderGlobalSearch);
document.getElementById("global-search-input").addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeGlobalSearch();
});
document.getElementById("global-search-results").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-search-target]");
  if (!button) return;

  if (button.dataset.searchTarget === "invoice") {
    const invoice = invoices.find((item) => item.id === button.dataset.id);
    if (invoice) {
      fillValidationForm(invoice);
      setView("validate");
    }
  }

  if (button.dataset.searchTarget === "provider") {
    document.getElementById("provider-search").value = providers.find((item) => item.id === button.dataset.id)?.name || "";
    setView("providers");
    renderProviders();
  }

  closeGlobalSearch();
});
