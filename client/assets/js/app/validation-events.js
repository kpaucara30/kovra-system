document.addEventListener("click", (event) => {
  const panel = document.getElementById("global-search");
  if (panel.classList.contains("hidden")) return;
  if (event.target.closest("#global-search") || event.target.closest("#global-search-button")) return;
  closeGlobalSearch();
});

document.getElementById("pick-files-button").addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  document.getElementById("invoice-file").click();
});

document.getElementById("pick-folder-button").addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  document.getElementById("folder-file").click();
});

document.getElementById("manual-invoice-button")?.addEventListener("click", () => {
  const draft = buildManualDraft();
  fillValidationForm(draft);
  document.getElementById("validation-state").textContent = "Completa los datos del registro manual y guarda.";
  setView("validate");
});

document.getElementById("invoice-file").addEventListener("change", (event) => {
  setSelectedFiles(event.target.files);
});

document.getElementById("folder-file").addEventListener("change", (event) => {
  setSelectedFiles(event.target.files);
});

document.getElementById("validation-search").addEventListener("input", renderValidationTable);
document.getElementById("validation-filter").addEventListener("change", renderValidationTable);

document.getElementById("validation-table-body").addEventListener("click", (event) => {
  const row = event.target.closest("tr");
  if (row) selectValidationRow(row);
  const button = event.target.closest("button[data-validation-action]");
  if (!button) return;
  const index = Number(button.dataset.index);
  const invoice = validationRows[index];

  if (["validate", "correct", "review", "edit"].includes(button.dataset.validationAction)) {
    openValidationModal(index);
  }

  if (button.dataset.validationAction === "delete") {
    pendingDeleteValidationIndex = index;
    openConfirmModal("delete-confirm-modal");
  }
});

document.getElementById("close-validation-modal").addEventListener("click", requestCloseValidationModal);
document.getElementById("cancel-validation-modal").addEventListener("click", requestCloseValidationModal);
document.getElementById("validation-modal").addEventListener("click", (event) => {
  if (event.target.id === "validation-modal") requestCloseValidationModal();
});
document.getElementById("validation-preview").addEventListener("pointerdown", startPreviewDrag);
document.addEventListener("pointermove", movePreviewDrag);
document.addEventListener("pointerup", stopPreviewDrag);
document.addEventListener("pointercancel", stopPreviewDrag);
document.getElementById("validation-preview").addEventListener("wheel", wheelPreviewZoom, { passive: false });
document.getElementById("invoice-file-preview")?.addEventListener("pointerdown", startPreviewDrag);
document.getElementById("invoice-file-preview")?.addEventListener("wheel", wheelPreviewZoom, { passive: false });
document.getElementById("preview-zoom-out").addEventListener("click", () => setPreviewZoom(activePreview.zoom - 25));
document.getElementById("preview-zoom-in").addEventListener("click", () => setPreviewZoom(activePreview.zoom + 25));
document.getElementById("preview-zoom-reset").addEventListener("click", resetPreviewZoom);
document.getElementById("invoice-preview-zoom-out")?.addEventListener("click", () => setPreviewZoom(activePreview.zoom - 25));
document.getElementById("invoice-preview-zoom-in")?.addEventListener("click", () => setPreviewZoom(activePreview.zoom + 25));
document.getElementById("invoice-preview-zoom-reset")?.addEventListener("click", resetPreviewZoom);
document.getElementById("modal-validation-form").addEventListener("input", updateRequiredMarkers);
["modal-subtotal", "modal-igv", "modal-total"].forEach((id) => {
  document.getElementById(id).addEventListener("blur", formatModalMoneyInput);
});
document.getElementById("confirm-validation-modal").addEventListener("click", () => openConfirmModal("save-confirm-modal"));
document.querySelectorAll("[data-confirm-close='close']").forEach((button) => {
  button.addEventListener("click", () => closeConfirmModal("close-confirm-modal"));
});
document.querySelectorAll("[data-confirm-close='save']").forEach((button) => {
  button.addEventListener("click", () => closeConfirmModal("save-confirm-modal"));
});
document.querySelectorAll("[data-confirm-close='delete']").forEach((button) => {
  button.addEventListener("click", () => {
    pendingDeleteValidationIndex = null;
    closeConfirmModal("delete-confirm-modal");
  });
});
document.getElementById("confirm-close-without-save").addEventListener("click", () => {
  closeConfirmModal("close-confirm-modal");
  closeValidationModal();
});
document.getElementById("confirm-save-data").addEventListener("click", () => {
  closeConfirmModal("save-confirm-modal");
  saveValidationModal();
});
document.getElementById("confirm-delete-validation-row").addEventListener("click", () => {
  if (pendingDeleteValidationIndex === null) return;
  validationRows.splice(pendingDeleteValidationIndex, 1);
  pendingDeleteValidationIndex = null;
  refreshValidationRowStatuses();
  if (!validationRows.length) currentDraft = null;
  if (validationRows[0]) syncHiddenValidationFields(validationRows[0]);
  renderValidationTable();
  closeConfirmModal("delete-confirm-modal");
});
document.getElementById("app-message-close").addEventListener("click", closeAppMessageModal);
document.getElementById("app-message-secondary").addEventListener("click", closeAppMessageModal);
document.getElementById("app-message-primary").addEventListener("click", async () => {
  const action = pendingAppMessageAction;
  closeAppMessageModal();
  if (typeof action === "function") {
    try {
      await action();
    } catch (error) {
      showAppMessage({
        title: "No se pudo completar",
        message: error.message || "Ocurrio un problema inesperado. Intenta nuevamente.",
        icon: "!",
        primaryText: "Entendido"
      });
    }
  }
});
document.getElementById("app-message-modal").addEventListener("click", (event) => {
  if (event.target.id === "app-message-modal") closeAppMessageModal();
});
document.getElementById("close-invoice-view-modal").addEventListener("click", closeInvoiceViewModal);
document.getElementById("close-viewed-invoice").addEventListener("click", closeInvoiceViewModal);
document.getElementById("invoice-view-modal").addEventListener("click", (event) => {
  if (event.target.id === "invoice-view-modal") closeInvoiceViewModal();
});
document.getElementById("download-viewed-invoice").addEventListener("click", () => {
  if (invoiceBeingViewed) downloadInvoiceFile(invoiceBeingViewed);
});

document.getElementById("process-button").addEventListener("click", () => {
  const state = document.getElementById("process-state");

  if (!selectedInvoiceFiles.length) {
    showAppMessage({
      title: "No has seleccionado facturas",
      message: "Selecciona uno o mas archivos para poder procesar.",
      icon: "!",
      primaryText: "Entendido"
    });
    state.textContent = "No has seleccionado facturas.";
    return;
  }

  const files = [...selectedInvoiceFiles];
  state.textContent = files.length === 1 ? "Estado: procesando factura..." : `Estado: procesando 1 de ${files.length}...`;
  lastProcessSummary = { total: files.length, correct: 0, warnings: 0, errors: 0 };
  renderProcessingList(files, 0, 0);
  setProcessProgress(0);
  setView("processing");

  window.setTimeout(async () => {
    if (files.length === 1) {
      renderProcessingList(files, 0, 0);
      setProcessProgress(55, "55%");
      const extracted = await extractDataFromFile(files[0]);
      const draft = buildDraftFromFile(files[0]);
      draft.fileDataUrl = selectedInvoiceDataUrl;
      Object.assign(draft, extracted);
      if (draft.fileUrl) draft.fileDataUrl = "";
      validationRows = [draft];
      fillValidationForm(draft);
      lastProcessSummary = { total: 1, correct: draft.confidence > 0 ? 1 : 0, warnings: draft.confidence > 0 ? 0 : 1, errors: 0 };
      renderProcessingList(files, -1, 1);
      setProcessProgress(100, "100%");
      state.textContent = draft.confidence > 0
        ? "Estado: datos extraidos. Revisa y guarda la factura."
        : "Estado: no se detecto texto. Requiere OCR real o revision manual.";
      window.setTimeout(() => setView("validate"), 450);
      return;
    }

    let saved = 0;
    let duplicated = 0;
    let warnings = 0;
    const processedDrafts = [];

    for (const [index, file] of files.entries()) {
      state.textContent = `Estado: procesando ${index + 1} de ${files.length}: ${file.name}`;
      renderProcessingList(files, index, index);
      setProcessProgress(Math.round(((index + 1) / files.length) * 75), `${Math.round(((index + 1) / files.length) * 75)}%`);
      selectedInvoiceDataUrl = await readFileAsDataUrl(file);
      const extracted = await extractDataFromFile(file);
      const draft = buildDraftFromFile(file);
      draft.fileDataUrl = selectedInvoiceDataUrl;
      draft.status = "Pendiente";
      Object.assign(draft, extracted);
      if (draft.fileUrl) draft.fileDataUrl = "";
      if (hasAmountIssues(draft) || hasRequiredExtractionIssues(draft)) warnings += 1;
      processedDrafts.push(draft);
      saved += 1;
    }

    lastProcessSummary = {
      total: saved,
      correct: Math.max(saved - warnings - duplicated, 0),
      warnings,
      errors: duplicated
    };
    renderProcessingList(files, -1, files.length);
    setProcessProgress(100, "100%");
    validationRows = processedDrafts;
    refreshValidationRowStatuses();
    currentDraft = processedDrafts[0] || null;
    if (currentDraft) {
      syncHiddenValidationFields(currentDraft);
      renderValidationTable();
    }
    state.textContent = `Estado: lote procesado. ${saved} facturas listas para validar.`;
    window.setTimeout(() => setView("validate"), 450);
  }, 700);
});

async function saveValidatedRows() {
  const statuses = validationDemoRows().map((row) => row.validationStatus);
  const validationState = document.getElementById("validation-state");
  const observed = statuses.filter((status) => status === "Observado").length;
  const duplicated = statuses.filter((status) => status === "Duplicado").length;
  const pending = statuses.filter((status) => status === "Pendiente").length;
  const valid = statuses.filter((status) => status === "Validado").length;
  const allValidated = statuses.length > 0 && statuses.every((status) => status === "Validado");

  if (!allValidated) {
    showValidationRequiredMessage({ total: statuses.length, valid, observed, duplicated, pending });
    validationState.textContent = `Todas las facturas tienen que estar validadas para poder guardar los datos. Validadas: ${valid}. Observadas: ${observed}. Duplicadas: ${duplicated}.`;
    return;
  }

  lastProcessSummary = {
    total: validationRows.length,
    correct: valid,
    warnings: observed,
    errors: duplicated
  };
  validationState.textContent = "Todas las facturas estan validadas. Guardando datos.";
  updateFlowSummaries();
  validationRows.forEach((invoice) => {
    const index = invoices.findIndex((item) => item.id === invoice.id);
    if (index >= 0) {
      invoices[index] = invoice;
    } else {
      invoices.unshift(invoice);
    }
  });
  try {
    await saveInvoices();
    renderAll();
    setView("result");
  } catch (error) {
    validationState.textContent = "No se pudieron guardar los datos.";
    showAppMessage({
      title: "No se pudo guardar",
      message: error.message || "Revisa que el servidor este encendido y vuelve a intentar.",
      icon: "!",
      primaryText: "Entendido"
    });
  }
}

document.getElementById("save-invoice").addEventListener("click", () => {
  const statuses = validationDemoRows().map((row) => row.validationStatus);
  const observed = statuses.filter((status) => status === "Observado").length;
  const duplicated = statuses.filter((status) => status === "Duplicado").length;
  const pending = statuses.filter((status) => status === "Pendiente").length;
  const valid = statuses.filter((status) => status === "Validado").length;
  const allValidated = statuses.length > 0 && statuses.every((status) => status === "Validado");

  if (!allValidated) {
    document.getElementById("validation-state").textContent = "Todas las facturas tienen que estar validadas para poder guardar los datos.";
    showValidationRequiredMessage({ total: statuses.length, valid, observed, duplicated, pending });
    return;
  }

  showAppMessage({
    title: "Estas seguro?",
    message: "Se guardaran las facturas validadas y quedaran disponibles en la seccion Facturas.",
    icon: "?",
    primaryText: "Si, guardar",
    secondaryText: "No, cancelar",
    onPrimary: saveValidatedRows
  });
});
document.getElementById("final-save-button").addEventListener("click", () => {
  const rows = validationDemoRows();
  const invalidRows = rows.filter((row) => row.validationStatus !== "Validado");
  if (invalidRows.length || !rows.length) {
    document.getElementById("validation-state").textContent = "No se guardo nada: todas las facturas deben estar validadas antes de registrar informacion limpia.";
    setView("validate");
    return;
  }

  validationRows.forEach((invoice) => {
    const index = invoices.findIndex((item) => item.id === invoice.id);
    if (index >= 0) {
      invoices[index] = invoice;
    } else {
      invoices.unshift(invoice);
    }
  });

  saveInvoices().then(() => {
    renderAll();
    setView("result");
  });
});
document.getElementById("observe-invoice")?.addEventListener("click", () => upsertInvoice("Observado"));
