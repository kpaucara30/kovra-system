function fillValidationForm(invoice) {
  currentDraft = { ...invoice };
  validationRows = [currentDraft];
  document.getElementById("form-company").value = invoice.company || "";
  document.getElementById("form-period").value = invoicePeriod(invoice);
  document.getElementById("form-ruc").value = invoice.ruc || "";
  document.getElementById("form-provider").value = invoice.provider || "";
  document.getElementById("form-number").value = invoice.number || "";
  document.getElementById("form-date").value = invoice.date || "";
  document.getElementById("form-subtotal").value = invoice.subtotal || "";
  document.getElementById("form-igv").value = invoice.igv || "";
  document.getElementById("form-total").value = invoice.total || "";
  document.getElementById("form-category").value = invoice.category || "Servicios";
  document.getElementById("form-priority").value = invoice.priority || "Normal";
  document.getElementById("form-due-date").value = invoice.dueDate || "";
  document.getElementById("validation-confidence").textContent = `Confianza ${invoice.confidence || 0}%`;
  document.getElementById("validation-state").textContent = "Completa o corrige los datos antes de guardar.";
  document.getElementById("ocr-text").value = invoice.extractedText || "";
  renderValidationTable();
}

function validationDemoRows() {
  const rows = (validationRows.length ? validationRows : [collectValidationForm("Pendiente")]).map(normalizeExtractedNumber);
  return rows.map((row, index) => {
    const validationStatus = validationRowStatus(row, index, rows);
    return {
      ...row,
      confidence: validationStatus === "Validado" ? 100 : Number(row.confidence || 0),
      validationStatus,
      priority: row.priority || "Normal"
    };
  });
}

function hasRequiredExtractionIssues(invoice) {
  const rucDigits = String(invoice.ruc || "").replace(/\D/g, "");
  return !invoice.number
    || rucDigits.length !== 11
    || !invoice.provider
    || invoice.provider === "Proveedor sin nombre"
    || !invoice.date
    || !(Number(invoice.total) > 0);
}

function hasAmountIssues(invoice) {
  const hasSubtotal = invoice.subtotal !== "" && invoice.subtotal !== null && invoice.subtotal !== undefined && Number(invoice.subtotal) > 0;
  const hasIgv = invoice.igv !== "" && invoice.igv !== null && invoice.igv !== undefined && Number(invoice.igv) >= 0;
  const hasTotal = invoice.total !== "" && invoice.total !== null && invoice.total !== undefined && Number(invoice.total) > 0;
  const subtotal = Number(invoice.subtotal) || 0;
  const igv = Number(invoice.igv) || 0;
  const total = Number(invoice.total) || 0;

  return !hasSubtotal
    || !hasIgv
    || !hasTotal
    || subtotal < 0
    || igv < 0
    || total < 0
    || Math.abs((subtotal + igv) - total) > 0.05;
}

function hasRawAmount(invoice, field) {
  const rawKey = `raw${field.charAt(0).toUpperCase()}${field.slice(1)}`;
  if (invoice[rawKey] !== undefined) return String(invoice[rawKey]).trim() !== "";
  return invoice[field] !== "" && invoice[field] !== null && invoice[field] !== undefined;
}

function amountProblemDetails(invoice) {
  const subtotal = Number(invoice.subtotal) || 0;
  const igv = Number(invoice.igv) || 0;
  const total = Number(invoice.total) || 0;
  const missing = [];
  const negative = [];

  if (!(subtotal > 0)) missing.push("subtotal");
  if (!(igv >= 0)) missing.push("IGV");
  if (!(total > 0)) missing.push("total");

  if (hasRawAmount(invoice, "subtotal") && subtotal < 0) negative.push("subtotal");
  if (hasRawAmount(invoice, "igv") && igv < 0) negative.push("IGV");
  if (hasRawAmount(invoice, "total") && total < 0) negative.push("total");

  return {
    missing,
    negative,
    canCompare: missing.length === 0 && negative.length === 0,
    expectedTotal: roundMoney(subtotal + igv),
    subtotal,
    igv,
    total
  };
}

function generalProblemDetails(invoice) {
  const rucDigits = String(invoice.ruc || "").replace(/\D/g, "");
  const missing = [];
  if (!String(invoice.number || "").trim()) missing.push("numero");
  if (rucDigits.length !== 11) missing.push("RUC");
  if (!String(invoice.provider || "").trim() || invoice.provider === "Proveedor sin nombre") missing.push("proveedor");
  if (!String(invoice.date || "").trim()) missing.push("fecha");
  return missing;
}

function joinProblemList(items) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

function duplicateKey(invoice) {
  return [
    String(invoice.number || "").trim().toUpperCase(),
    String(invoice.ruc || "").trim(),
    String(invoice.date || "").trim(),
    String(Number(invoice.total) || 0)
  ].join("|");
}

function hasDuplicateInValidationRows(invoice, index, rows) {
  const key = duplicateKey(invoice);
  if (key.includes("||") || key.endsWith("|0")) return false;
  return rows.some((item, itemIndex) => itemIndex !== index && duplicateKey(item) === key);
}

function hasDuplicateInSavedInvoices(invoice) {
  const key = duplicateKey(invoice);
  if (key.includes("||") || key.endsWith("|0")) return false;
  return invoices.some((item) => item.id !== invoice.id && !isTrashedInvoice(item) && duplicateKey(item) === key);
}

function validationRowStatus(row, index, rows) {
  if (row.status === "Validado") return "Validado";
  if (hasDuplicateInValidationRows(row, index, rows)) return "Duplicado";
  if (hasAmountIssues(row)) return "Observado";
  if (hasRequiredExtractionIssues(row)) return "Observado";
  return "Pendiente";
}

function analyzeValidationInvoice(invoice, index) {
  const rows = validationRows.length ? validationRows : validationDemoRows();
  const amountProblems = amountProblemDetails(invoice);
  const missingGeneral = generalProblemDetails(invoice);

  if (hasDuplicateInValidationRows(invoice, index, rows) || hasDuplicateInSavedInvoices(invoice)) {
    return { level: "error", title: "Posible duplicado", message: "Ya existe una factura con los mismos datos clave." };
  }

  if (amountProblems.negative.length) {
    return {
      level: "error",
      title: "Montos invalidos",
      message: `No se puede validar: ${joinProblemList(amountProblems.negative)} tiene valor negativo.`
    };
  }

  if (missingGeneral.length && amountProblems.missing.length) {
    return {
      level: "error",
      title: "Datos e importes incompletos",
      message: `Faltan ${joinProblemList([...missingGeneral, ...amountProblems.missing])}.`
    };
  }

  if (amountProblems.missing.length) {
    return {
      level: "error",
      title: "Importes incompletos",
      message: `Faltan ${joinProblemList(amountProblems.missing)}.`
    };
  }

  if (amountProblems.canCompare && Math.abs(amountProblems.total - amountProblems.expectedTotal) > 0.05) {
    return { level: "error", title: "Montos no cuadran", message: "Subtotal + IGV no coincide con el total." };
  }

  if (missingGeneral.length) {
    return {
      level: "warning",
      title: "Datos incompletos",
      message: `Faltan ${joinProblemList(missingGeneral)}.`
    };
  }
  return { level: "ok", title: "Lista para validar", message: "Los campos principales estan completos." };
}

function modalInvoiceDraft() {
  const subtotalValue = document.getElementById("modal-subtotal").value;
  const igvValue = document.getElementById("modal-igv").value;
  const totalValue = document.getElementById("modal-total").value;
  let subtotal = parseAmount(subtotalValue);
  let igv = parseAmount(igvValue);
  const total = parseAmount(totalValue);

  if (total > 0 && subtotal === 0 && igv === 0) {
    subtotal = roundMoney(total / (1 + igvRate()));
    igv = roundMoney(total - subtotal);
  }

  return correctAmountMismatch({
    ...(validationRows[validationModalIndex] || currentDraft || {}),
    number: document.getElementById("modal-number").value.trim(),
    provider: document.getElementById("modal-provider").value.trim(),
    ruc: document.getElementById("modal-ruc").value.trim(),
    date: document.getElementById("modal-date").value,
    rawSubtotal: subtotalValue,
    rawIgv: igvValue,
    rawTotal: totalValue,
    subtotal,
    igv,
    total,
    status: "Pendiente"
  });
}

function updateValidationAssistant(invoice = modalInvoiceDraft(), index = validationModalIndex) {
  const hint = document.getElementById("validation-hint");
  const title = document.getElementById("validation-hint-title");
  const text = document.getElementById("validation-hint-text");
  if (!hint || !title || !text) return;
  const analysis = analyzeValidationInvoice(invoice, index);
  hint.className = `validation-hint ${analysis.level}`;
  title.textContent = analysis.title;
  text.textContent = analysis.message;
  hint.classList.remove("hidden");
  return analysis;
}

function refreshValidationRowStatuses() {
  validationRows = validationRows.map((row, index, rows) => {
    const normalizedRow = normalizeExtractedNumber(row);
    const normalizedRows = rows.map(normalizeExtractedNumber);
    const nextStatus = validationRowStatus({ ...normalizedRow, status: row.status === "Validado" ? "Validado" : "Pendiente" }, index, normalizedRows);
    return {
      ...normalizedRow,
      status: nextStatus
    };
  });
}

function validationIcon(status) {
  if (status === "Advertencia") return `<span class="validation-status warning">!</span>`;
  if (status === "Error") return `<span class="validation-status error">!</span>`;
  return `<span class="validation-status ok">✓</span>`;
}

function filteredValidationRows() {
  const query = document.getElementById("validation-search")?.value.trim().toLowerCase() || "";
  const filter = document.getElementById("validation-filter")?.value || "Todos";

  return validationDemoRows()
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => {
      const matchesStatus = filter === "Todos" || row.validationStatus === filter;
      const haystack = [row.ruc, row.provider, row.number].join(" ").toLowerCase();
      return matchesStatus && (!query || haystack.includes(query));
    });
}

function renderValidationTable() {
  const body = document.getElementById("validation-table-body");
  if (!body) return;
  const rows = filteredValidationRows();
  document.getElementById("validation-count").textContent = `(${rows.length})`;
  body.innerHTML = rows.length ? rows.map(({ row, index }, visibleIndex) => `
    ${(() => {
      const actionByStatus = {
        Pendiente: ["validate", "Validar"],
        Observado: ["correct", "Validar"],
        Duplicado: ["review", "Revisar"],
        Validado: ["edit", "Editar"]
      };
      const [mainAction, mainLabel] = actionByStatus[row.validationStatus] || actionByStatus.Pendiente;
      return `
    <tr class="${visibleIndex === 0 ? "selected" : ""}" data-validation-row="${index}">
      <td>${escapeHtml(row.number || "Sin numero")}</td>
      <td>${escapeHtml(row.ruc || "Sin RUC")}</td>
      <td>${escapeHtml(row.provider || "Proveedor sin nombre")}</td>
      <td>${formatDate(row.date || today())}</td>
      <td>${money(row.subtotal || 0)}</td>
      <td>${money(row.igv || 0)}</td>
      <td>${money(row.total || 0)}</td>
      <td><span class="confidence-pill ${Number(row.confidence || 0) >= 70 ? "ok" : "low"}">${Number(row.confidence || 0)}%</span></td>
      <td>
        <span class="badge ${statusClass[row.validationStatus] || "duplicate"}">${escapeHtml(row.validationStatus || "Pendiente")}</span>
      </td>
      <td>
        <div class="row-actions">
          <button class="small ghost-button" type="button" data-validation-action="${mainAction}" data-index="${index}">${mainLabel}</button>
          <button class="small ghost-button danger" type="button" data-validation-action="delete" data-index="${index}">Eliminar</button>
        </div>
      </td>
    </tr>
      `;
    })()}
  `).join("") : `
    <tr>
      <td colspan="10">
        <div class="preview-empty">No se encontraron facturas con ese RUC, proveedor o numero.</div>
      </td>
    </tr>
  `;
}

function selectValidationRow(row) {
  document.querySelectorAll("#validation-table-body tr").forEach((item) => {
    item.classList.toggle("selected", item === row);
  });
}

function syncHiddenValidationFields(invoice) {
  currentDraft = { ...invoice };
  document.getElementById("form-company").value = invoice.company || "";
  document.getElementById("form-period").value = invoicePeriod(invoice);
  document.getElementById("form-ruc").value = invoice.ruc || "";
  document.getElementById("form-provider").value = invoice.provider || "";
  document.getElementById("form-number").value = invoice.number || "";
  document.getElementById("form-date").value = invoice.date || "";
  document.getElementById("form-subtotal").value = invoice.subtotal || "";
  document.getElementById("form-igv").value = invoice.igv || "";
  document.getElementById("form-total").value = invoice.total || "";
  document.getElementById("form-category").value = invoice.category || "Servicios";
  document.getElementById("form-priority").value = invoice.priority || "Normal";
  document.getElementById("form-due-date").value = invoice.dueDate || "";
}

function openValidationModal(index) {
  validationModalIndex = index;
  const invoice = correctAmountMismatch(validationDemoRows()[index] || validationDemoRows()[0]);
  if (!invoice) return;
  if (validationRows[index]) validationRows[index] = invoice;
  syncHiddenValidationFields(invoice);
  document.getElementById("modal-number").value = invoice.number || "";
  document.getElementById("modal-provider").value = invoice.provider || "";
  document.getElementById("modal-ruc").value = invoice.ruc || "";
  document.getElementById("modal-date").value = invoice.date || "";
  setMoneyInputValue("modal-subtotal", invoice.subtotal || "");
  setMoneyInputValue("modal-igv", invoice.igv || "");
  setMoneyInputValue("modal-total", invoice.total || "");
  showPreview("validation-preview", invoice.fileType || "", invoice.fileUrl || invoice.fileDataUrl || "", invoice.fileName || "Factura");
  updateRequiredMarkers();
  updateValidationAssistant(invoice, index);
  validationModalInitialData = modalDataSnapshot();
  document.querySelector(".validation-modal-card")?.classList.add("preview-expanded");
  document.getElementById("validation-modal").classList.remove("hidden");
  centerPreviewAtTop();
}

function closeValidationModal() {
  document.getElementById("validation-modal").classList.add("hidden");
  document.querySelector(".validation-modal-card")?.classList.remove("preview-expanded");
  document.getElementById("validation-hint")?.classList.add("hidden");
  editingInvoiceId = null;
}

function modalDataSnapshot() {
  return JSON.stringify({
    number: document.getElementById("modal-number").value.trim(),
    provider: document.getElementById("modal-provider").value.trim(),
    ruc: document.getElementById("modal-ruc").value.trim(),
    date: document.getElementById("modal-date").value,
    subtotal: document.getElementById("modal-subtotal").value,
    igv: document.getElementById("modal-igv").value,
    total: document.getElementById("modal-total").value
  });
}

function modalHasChanges() {
  return modalDataSnapshot() !== validationModalInitialData;
}

function openConfirmModal(id) {
  document.getElementById(id).classList.remove("hidden");
}

function closeConfirmModal(id) {
  document.getElementById(id).classList.add("hidden");
}

function closeAppMessageModal() {
  document.getElementById("app-message-modal").classList.add("hidden");
  pendingAppMessageAction = null;
}

function showAppMessage({
  title,
  message,
  icon = "?",
  primaryText = "Aceptar",
  secondaryText = "",
  onPrimary = null
}) {
  const modal = document.getElementById("app-message-modal");
  const secondary = document.getElementById("app-message-secondary");
  document.getElementById("app-message-icon").textContent = icon;
  document.getElementById("app-message-title").textContent = title;
  document.getElementById("app-message-text").textContent = message;
  document.getElementById("app-message-primary").textContent = primaryText;
  secondary.textContent = secondaryText;
  secondary.classList.toggle("hidden", !secondaryText);
  pendingAppMessageAction = onPrimary;
  modal.classList.remove("hidden");
}

function showValidationRequiredMessage(statusCounts = {}) {
  const detail = statusCounts.total
    ? `Validadas: ${statusCounts.valid || 0}. Observadas: ${statusCounts.observed || 0}. Duplicadas: ${statusCounts.duplicated || 0}. Pendientes: ${statusCounts.pending || 0}.`
    : "Primero valida cada factura de la lista.";
  showAppMessage({
    title: "No se puede guardar",
    message: `Todas las facturas tienen que estar validadas para poder guardar los datos. ${detail}`,
    icon: "!",
    primaryText: "Entendido"
  });
}

function requestCloseValidationModal() {
  if (modalHasChanges()) {
    openConfirmModal("close-confirm-modal");
    return;
  }
  closeValidationModal();
}

async function saveValidationModal() {
  const analysis = updateValidationAssistant();
  if (analysis && analysis.level !== "ok") {
    showAppMessage({
      title: analysis.title || "No se pudo validar",
      message: analysis.message || "Revisa los datos extraidos antes de guardar esta factura.",
      icon: "!",
      primaryText: "Entendido"
    });
    return;
  }

  const draft = modalInvoiceDraft();
  const editId = editingInvoiceId;
  const invoice = {
    ...(validationRows[validationModalIndex] || currentDraft || {}),
    number: draft.number,
    company: (validationRows[validationModalIndex] || currentDraft || {}).company || "Empresa sin asignar",
    provider: draft.provider,
    ruc: draft.ruc,
    category: "Compra",
    period: draft.date ? String(draft.date).slice(0, 7) : currentPeriod(),
    date: draft.date,
    subtotal: draft.subtotal,
    igv: draft.igv,
    total: draft.total,
    status: "Validado",
    confidence: 100
  };
  if (invoice.total > 0 && !invoice.subtotal && !invoice.igv) {
    invoice.subtotal = roundMoney(invoice.total / (1 + igvRate()));
    invoice.igv = roundMoney(invoice.total - invoice.subtotal);
  }
  setMoneyInputValue("modal-subtotal", invoice.subtotal || "");
  setMoneyInputValue("modal-igv", invoice.igv || "");
  setMoneyInputValue("modal-total", invoice.total || "");
  const otherRows = validationRows.map((row, index) => index === validationModalIndex ? invoice : row);
  if (hasDuplicateInValidationRows(invoice, validationModalIndex, otherRows)) {
    invoice.status = "Duplicado";
  } else if (hasAmountIssues(invoice) || hasRequiredExtractionIssues(invoice)) {
    invoice.status = "Observado";
  } else {
    invoice.status = "Validado";
    invoice.confidence = 100;
  }

  if (editId) {
    const duplicate = invoices.find((item) => (
      item.id !== editId
      && !isTrashedInvoice(item)
      && String(item.ruc || "").trim() === String(invoice.ruc || "").trim()
      && String(item.number || "").trim().toUpperCase() === String(invoice.number || "").trim().toUpperCase()
    ));
    if (duplicate) {
      showAppMessage({
        title: "Factura duplicada",
        message: `Ya existe una factura activa con el mismo RUC y numero (${invoice.number || "Sin numero"}).`,
        icon: "!",
        primaryText: "Entendido"
      });
      return;
    }

    const index = invoices.findIndex((item) => item.id === editId);
    if (index >= 0) {
      const updatedAt = new Date().toISOString();
      invoices[index] = {
        ...invoices[index],
        ...invoice,
        id: editId,
        status: "Validado",
        category: "Compra",
        updatedAt,
        audit: [
          ...(Array.isArray(invoices[index].audit) ? invoices[index].audit : []),
          { at: updatedAt, by: currentUser?.email || "Sistema", action: "Factura corregida desde Facturas" }
        ].slice(-20)
      };
      await saveInvoices();
      closeValidationModal();
      validationRows = [];
      currentDraft = null;
      renderAll();
      setView("invoices");
      showAppMessage({
        title: "Factura actualizada",
        message: `La factura ${invoice.number || "Sin numero"} fue corregida correctamente.`,
        icon: "OK",
        primaryText: "Entendido"
      });
      return;
    }
  }

  validationRows[validationModalIndex] = invoice;
  refreshValidationRowStatuses();
  syncHiddenValidationFields(invoice);
  closeValidationModal();
  renderValidationTable();
  document.getElementById("validation-state").textContent = invoice.status === "Validado"
    ? "Factura validada. Puedes continuar con el guardado."
    : `Factura guardada como ${invoice.status}. Revisa o corrige antes de continuar.`;
}

function updateRequiredMarkers() {
  document.querySelectorAll("[data-required-field]").forEach((label) => {
    const input = document.getElementById(label.dataset.requiredField);
    const marker = label.querySelector(".required");
    if (!input || !marker) return;
    marker.classList.toggle("hidden", Boolean(input.value.trim()));
  });
  updateValidationAssistant();
}

function formatModalMoneyInput(event) {
  const input = event.target;
  input.value = formatAmountInputValue(parseAmount(input.value));
  updateValidationAssistant();
}

function collectValidationForm(status) {
  let subtotal = parseAmount(document.getElementById("form-subtotal").value);
  let igv = parseAmount(document.getElementById("form-igv").value);
  const total = parseAmount(document.getElementById("form-total").value) || subtotal + igv;

  if (total > 0 && subtotal === 0 && igv === 0) {
    subtotal = roundMoney(total / (1 + igvRate()));
    igv = roundMoney(total - subtotal);
  }

  return {
    ...(currentDraft || {}),
    company: document.getElementById("form-company").value.trim() || "Empresa sin asignar",
    period: document.getElementById("form-period").value || currentPeriod(),
    ruc: document.getElementById("form-ruc").value.trim(),
    provider: document.getElementById("form-provider").value.trim() || "Proveedor sin nombre",
    number: document.getElementById("form-number").value.trim() || `F001-${String(Date.now()).slice(-6)}`,
    date: document.getElementById("form-date").value || today(),
    subtotal,
    igv,
    total,
    category: document.getElementById("form-category").value,
    priority: document.getElementById("form-priority").value,
    dueDate: document.getElementById("form-due-date").value,
    extractedText: document.getElementById("ocr-text").value,
    status
  };
}

function recalculateAmounts(source) {
  const subtotalInput = document.getElementById("form-subtotal");
  const igvInput = document.getElementById("form-igv");
  const totalInput = document.getElementById("form-total");
  const subtotal = parseAmount(subtotalInput.value);
  const igv = parseAmount(igvInput.value);
  const total = parseAmount(totalInput.value);
  const rate = igvRate();

  if (source === "subtotal" && subtotal > 0) {
    const nextIgv = roundMoney(subtotal * rate);
    igvInput.value = nextIgv || "";
    totalInput.value = roundMoney(subtotal + nextIgv) || "";
    return;
  }

  if (source === "total" && total > 0) {
    const nextSubtotal = roundMoney(total / (1 + rate));
    const nextIgv = roundMoney(total - nextSubtotal);
    subtotalInput.value = nextSubtotal || "";
    igvInput.value = nextIgv || "";
    return;
  }

  if (source === "igv" && subtotal > 0) {
    totalInput.value = roundMoney(subtotal + igv) || "";
  }
}

function isDuplicate(invoice) {
  return invoices.some((item) => {
    return item.id !== invoice.id
      && item.ruc === invoice.ruc
      && item.number === invoice.number
      && item.date === invoice.date
      && Number(item.total) === Number(invoice.total);
  });
}

function invoiceIssues(invoice) {
  const issues = [];
  if (!validPeruRuc(invoice.ruc)) issues.push("RUC invalido o incompleto.");
  if (!invoice.provider || invoice.provider === "Proveedor sin nombre") issues.push("Falta razon social del proveedor.");
  if (!invoice.number) issues.push("Falta numero de comprobante.");
  if (!invoice.date) issues.push("Falta fecha.");
  if (!(Number(invoice.total) > 0)) issues.push("El total debe ser mayor a cero.");

  const subtotal = Number(invoice.subtotal) || 0;
  const igv = Number(invoice.igv) || 0;
  const total = Number(invoice.total) || 0;
  if ((subtotal > 0 || igv > 0) && Math.abs((subtotal + igv) - total) > 0.05) {
    issues.push("Subtotal + IGV no coincide con el total.");
  }

  return issues;
}

async function upsertInvoice(status) {
  const invoice = collectValidationForm(status);

  if (!invoice.fileDataUrl && !invoice.fileUrl && !invoice.manual) {
    document.getElementById("validation-state").textContent = "No hay archivo cargado para guardar.";
    return;
  }

  if (isDuplicate(invoice)) {
    invoice.status = "Duplicado";
  }

  const issues = invoiceIssues(invoice);
  if (issues.length && status === "Validado") {
    document.getElementById("validation-state").textContent = `No se puede validar: ${issues.join(" ")}`;
    return;
  }
  if (issues.length) {
    invoice.status = "Observado";
    invoice.issues = issues;
  } else {
    invoice.issues = [];
  }

  const index = invoices.findIndex((item) => item.id === invoice.id);
  if (index >= 0) {
    invoices[index] = invoice;
  } else {
    invoices.unshift(invoice);
  }

  await saveInvoices();
  resetUpload();
  renderAll();
  document.getElementById("validation-state").textContent = `Factura guardada como ${invoice.status}.`;
  lastProcessSummary = {
    total: Math.max(lastProcessSummary.total, 1),
    correct: invoice.status === "Validado" ? 1 : 0,
    warnings: invoice.status === "Observado" ? 1 : lastProcessSummary.warnings,
    errors: invoice.status === "Duplicado" ? 1 : lastProcessSummary.errors
  };
  updateFlowSummaries();
  setView("result");
}
