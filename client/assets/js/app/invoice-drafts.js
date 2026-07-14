function buildDraftFromFile(file) {
  const baseName = file.name.replace(/\.[^.]+$/, "").replaceAll("_", " ").replaceAll("-", " ");
  const code = String(Date.now()).slice(-6);
  const batchCompany = document.getElementById("batch-company").value.trim();
  const batchPeriod = document.getElementById("batch-period").value || currentPeriod();

  return {
    id: crypto.randomUUID(),
    company: batchCompany || "Empresa sin asignar",
    period: batchPeriod,
    number: `F001-${code}`,
    provider: baseName || "Proveedor pendiente",
    ruc: "",
    category: "Servicios",
    date: today(),
    subtotal: 0,
    igv: 0,
    total: 0,
    confidence: 72,
    priority: "Normal",
    dueDate: "",
    status: "Pendiente",
    fileName: file.name,
    fileType: file.type || "application/octet-stream",
    fileDataUrl: selectedInvoiceDataUrl,
    createdAt: new Date().toISOString()
  };
}

function buildManualDraft() {
  const code = String(Date.now()).slice(-6);
  const batchCompany = document.getElementById("batch-company").value.trim();
  const batchPeriod = document.getElementById("batch-period").value || currentPeriod();

  return {
    id: crypto.randomUUID(),
    company: batchCompany || "Empresa sin asignar",
    period: batchPeriod,
    number: `MAN-${code}`,
    provider: "",
    ruc: "",
    category: "Servicios",
    date: today(),
    subtotal: 0,
    igv: 0,
    total: 0,
    confidence: 0,
    priority: "Normal",
    dueDate: "",
    status: "Pendiente",
    fileName: "Registro manual",
    fileType: "manual",
    fileDataUrl: "",
    fileUrl: "",
    manual: true,
    createdAt: new Date().toISOString(),
    extractedText: "Registro manual sin archivo adjunto."
  };
}
