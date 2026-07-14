function resetUpload() {
  selectedInvoiceFile = null;
  selectedInvoiceFiles = [];
  selectedInvoiceDataUrl = "";
  currentDraft = null;
  document.getElementById("invoice-file").value = "";
  document.getElementById("folder-file").value = "";
  document.getElementById("batch-company").value = "";
  document.getElementById("batch-period").value = currentPeriod();
  renderSelectedFiles([]);
  document.getElementById("dropzone-title").textContent = "Selecciona facturas o una carpeta";
  document.getElementById("process-state").textContent = "Estado: pendiente";
  document.getElementById("upload-preview").className = "invoice-preview";
  document.getElementById("upload-preview").innerHTML = `
    <strong>FACTURA ELECTRONICA</strong>
    <span>RUC 20481234567</span>
    <hr />
    <p>Proveedor: Servicios Lima SAC</p>
    <p>Fecha: 15/05/2026</p>
    <p>Total: S/ 1,280.00</p>
  `;
}

function allowedInvoiceFile(file) {
  return /\.(pdf|jpe?g|png)$/i.test(file.name) || ["application/pdf", "image/jpeg", "image/png"].includes(file.type);
}

function describeFileSelection(files) {
  if (!files.length) return "Ningun archivo seleccionado.";
  const totalKb = files.reduce((sum, file) => sum + file.size, 0) / 1024;
  if (files.length === 1) return `${files[0].name} - ${totalKb.toFixed(1)} KB`;
  return `${files.length} archivos seleccionados - ${totalKb.toFixed(1)} KB en total`;
}

function renderSelectedFiles(files) {
  const details = document.getElementById("file-details");
  if (!files.length) {
    details.innerHTML = `
      <strong>Sin archivos seleccionados</strong>
      <small>Selecciona una factura o una carpeta para iniciar.</small>
    `;
    return;
  }

  const visibleFiles = files.slice(0, 8);
  const remaining = files.length - visibleFiles.length;
  details.innerHTML = `
    <strong>${files.length} archivo${files.length === 1 ? "" : "s"} seleccionado${files.length === 1 ? "" : "s"}</strong>
    <div class="selected-file-grid">
      ${visibleFiles.map((file) => `<span><i></i>${escapeHtml(file.name)}</span>`).join("")}
      ${remaining > 0 ? `<span><i></i>${remaining} archivo${remaining === 1 ? "" : "s"} mas</span>` : ""}
    </div>
  `;
}

function setProcessProgress(percent, label = "") {
  const bar = document.getElementById("ocr-progress");
  const text = document.getElementById("ocr-progress-label");
  if (bar) bar.style.width = `${percent}%`;
  if (text) text.textContent = label || `${percent}%`;
}

function renderProcessingList(files, activeIndex = -1, doneCount = 0) {
  const list = document.getElementById("ocr-file-list");
  if (!list) return;
  list.innerHTML = files.map((file, index) => {
    const state = index < doneCount ? "Extraido" : index === activeIndex ? "Procesando..." : "Pendiente";
    return `<article><strong>${escapeHtml(file.name)}</strong><span>${state}</span></article>`;
  }).join("");
}

function summaryCards(summary) {
  return `
    <article><strong>${summary.total}</strong><span>Total de facturas</span></article>
    <article><strong>${summary.correct}</strong><span>Correctas</span></article>
    <article><strong>${summary.warnings}</strong><span>Con advertencias</span></article>
    <article><strong>${summary.errors}</strong><span>Con errores</span></article>
  `;
}

function updateFlowSummaries() {
  document.getElementById("save-summary").innerHTML = summaryCards(lastProcessSummary);
  document.getElementById("result-summary").innerHTML = summaryCards(lastProcessSummary);
}

async function setSelectedFiles(fileList) {
  const files = Array.from(fileList || []).filter(allowedInvoiceFile);
  const details = document.getElementById("file-details");
  const dropzoneTitle = document.getElementById("dropzone-title");
  const state = document.getElementById("process-state");

  if (selectedInvoiceObjectUrl) {
    URL.revokeObjectURL(selectedInvoiceObjectUrl);
    selectedInvoiceObjectUrl = "";
  }

  selectedInvoiceFiles = files;
  selectedInvoiceFile = files[0] || null;
  selectedInvoiceDataUrl = "";

  if (!selectedInvoiceFile) {
    resetUpload();
    state.textContent = "Estado: selecciona PDF, JPG o PNG.";
    return;
  }

  selectedInvoiceObjectUrl = URL.createObjectURL(selectedInvoiceFile);
  selectedInvoiceDataUrl = await readFileAsDataUrl(selectedInvoiceFile);
  renderSelectedFiles(files);
  dropzoneTitle.textContent = files.length === 1 ? "Factura seleccionada" : "Lote de facturas seleccionado";
  state.textContent = files.length === 1
    ? "Estado: archivo cargado. Listo para procesar."
    : `Estado: ${files.length} archivos cargados. Listos para procesar en lote.`;
  showPreview("upload-preview", selectedInvoiceFile.type, selectedInvoiceObjectUrl, selectedInvoiceFile.name);
}

function showPreview(containerId, fileType, source, fileName) {
  const preview = document.getElementById(containerId);
  resetPreviewPan(preview);
  if (["validation-preview", "invoice-file-preview"].includes(containerId)) {
    activePreview = { containerId, type: fileType || "", source: source || "", fileName: fileName || "Factura", zoom: 100, fitMode: "width", pageCount: 0 };
    updatePreviewZoomLabel();
    updatePreviewPageCount(0);
  }

  if (!source) {
    preview.className = "preview-empty";
    preview.textContent = "Selecciona una factura para visualizarla.";
    return;
  }

  if (fileType === "application/pdf") {
    preview.className = "modal-preview document-viewer-preview";
    preview.innerHTML = documentViewerMarkup([], "Preparando PDF para vista uniforme...");
    loadPdfViewerPages(preview, source, fileName);
    centerPreviewAtTop(preview);
    return;
  }

  if (fileType.startsWith("image/")) {
    preview.className = "modal-preview document-viewer-preview";
    preview.innerHTML = documentViewerMarkup([], "Preparando imagen para vista uniforme...");
    renderImageViewerPage(preview, source, fileName);
    centerPreviewAtTop(preview);
    return;
  }

  if (fileType === "manual") {
    preview.className = "preview-empty";
    preview.textContent = "Registro manual sin archivo adjunto.";
    return;
  }

  preview.className = "preview-empty";
  preview.textContent = "El formato seleccionado no tiene vista previa disponible.";
}

function resetPreviewPan(preview = document.getElementById("validation-preview")) {
  if (!preview) return;
  preview.scrollLeft = 0;
  preview.scrollTop = 0;
  preview.querySelector(".document-viewer-stage, .preview-canvas")?.style.setProperty("--preview-zoom", "1");
  preview.classList.remove("dragging");
}

function centerPreviewAtTop(preview = document.getElementById("validation-preview")) {
  window.setTimeout(() => {
    if (!preview) return;
    preview.scrollTop = 0;
    preview.scrollLeft = Math.max(0, (preview.scrollWidth - preview.clientWidth) / 2);
  }, 120);
}

function buildPdfPreviewSource(source, zoom) {
  const [baseSource] = String(source).split("#");
  const params = new URLSearchParams({
    toolbar: "1",
    navpanes: "0",
    scrollbar: "1",
    zoom: String(zoom)
  });
  return `${baseSource}#${params.toString()}`;
}

function documentViewerMarkup(pages, loadingText = "") {
  if (!pages.length && loadingText) {
    return `
      <div class="document-viewer-loading">
        <strong>${escapeHtml(loadingText)}</strong>
        <span>Unificando el documento para que todos se vean igual.</span>
      </div>
    `;
  }

  return `
    <div class="document-viewer-stage" style="--preview-zoom: ${activePreview.zoom / 100}; --viewer-page-width: 720px">
      ${pages.map((page, index) => `
        <figure class="document-page">
          <img src="${escapeHtml(page.src)}" alt="${escapeHtml(page.label || `Pagina ${index + 1}`)}" />
          ${pages.length > 1 ? `<figcaption>Pagina ${index + 1}</figcaption>` : ""}
        </figure>
      `).join("")}
    </div>
  `;
}

async function renderImageViewerPage(preview, source, fileName) {
  const currentSource = source;
  const currentContainer = preview.id;
  const pageSource = await cropDarkImageMargins(source).catch(() => source);
  if (activePreview.source !== currentSource || activePreview.containerId !== currentContainer) return;
  preview.innerHTML = documentViewerMarkup([{ src: pageSource, label: fileName || "Imagen" }]);
  bindDocumentViewer(preview, 1);
  centerPreviewAtTop(preview);
}

function loadPreviewImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

async function cropDarkImageMargins(source) {
  const image = await loadPreviewImage(source);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  if (!width || !height) return source;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  const { data } = context.getImageData(0, 0, width, height);

  const brightPixel = (x, y) => {
    const index = (y * width + x) * 4;
    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];
    return (r + g + b) / 3 > 170;
  };

  const columnBrightRatio = (x) => {
    let bright = 0;
    let samples = 0;
    const step = Math.max(1, Math.floor(height / 260));
    for (let y = 0; y < height; y += step) {
      samples += 1;
      if (brightPixel(x, y)) bright += 1;
    }
    return bright / samples;
  };

  const rowBrightRatio = (y) => {
    let bright = 0;
    let samples = 0;
    const step = Math.max(1, Math.floor(width / 260));
    for (let x = 0; x < width; x += step) {
      samples += 1;
      if (brightPixel(x, y)) bright += 1;
    }
    return bright / samples;
  };

  const threshold = 0.38;
  let left = 0;
  let right = width - 1;
  let top = 0;
  let bottom = height - 1;

  while (left < right && columnBrightRatio(left) < threshold) left += 1;
  while (right > left && columnBrightRatio(right) < threshold) right -= 1;
  while (top < bottom && rowBrightRatio(top) < threshold) top += 1;
  while (bottom > top && rowBrightRatio(bottom) < threshold) bottom -= 1;

  const pad = 8;
  left = Math.max(0, left - pad);
  top = Math.max(0, top - pad);
  right = Math.min(width - 1, right + pad);
  bottom = Math.min(height - 1, bottom + pad);

  const cropWidth = right - left + 1;
  const cropHeight = bottom - top + 1;
  const removedWidth = width - cropWidth;
  const removedHeight = height - cropHeight;
  if (removedWidth < width * 0.08 && removedHeight < height * 0.08) return source;

  const output = document.createElement("canvas");
  output.width = cropWidth;
  output.height = cropHeight;
  output.getContext("2d").drawImage(canvas, left, top, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
  return output.toDataURL("image/png");
}

async function loadPdfViewerPages(preview, source, fileName) {
  try {
    const response = await fetch(`${API_BASE}/api/document-pages?file=${encodeURIComponent(source)}`, {
      credentials: "same-origin"
    });
    const data = await response.json();
    if (!response.ok || !data.ok || !Array.isArray(data.pages) || !data.pages.length) {
      throw new Error(data.error || "No se pudo preparar el PDF.");
    }
    if (activePreview.source !== source || activePreview.containerId !== preview.id) return;
    preview.innerHTML = documentViewerMarkup(data.pages.map((page, index) => ({
      src: page,
      label: `${fileName || "Factura"} pagina ${index + 1}`
    })));
    bindDocumentViewer(preview, data.pages.length);
    centerPreviewAtTop(preview);
  } catch (error) {
    preview.className = "preview-empty preview-error";
    preview.innerHTML = `
      <div>
        <strong>No se pudo preparar el visor uniforme.</strong>
        <span>${escapeHtml(error.message || "Abre el archivo original para revisarlo.")}</span>
        <a class="ghost-button small" href="${escapeHtml(source)}" target="_blank" rel="noopener">Abrir PDF</a>
      </div>
    `;
  }
}

function bindDocumentViewer(preview, pageCount) {
  activePreview.pageCount = pageCount;
  updatePreviewPageCount(pageCount);
  const images = preview.querySelectorAll(".document-page img");
  images.forEach((image) => {
    image.addEventListener("load", () => applyPreviewFit(activePreview.fitMode), { once: true });
  });
  window.setTimeout(() => applyPreviewFit(activePreview.fitMode), 60);
}

function updatePreviewZoomLabel() {
  [
    document.getElementById("preview-zoom-label"),
    document.getElementById("invoice-preview-zoom-label")
  ].forEach((label) => {
    if (label) label.textContent = `${activePreview.zoom}%`;
  });
}

function updatePreviewPageCount(count = activePreview.pageCount) {
  const text = count > 1 ? `${count} paginas` : count === 1 ? "1 pagina" : "Visor unico";
  [
    document.getElementById("preview-page-count"),
    document.getElementById("invoice-preview-page-count")
  ].forEach((label) => {
    if (label) label.textContent = text;
  });
}

function activePreviewElement() {
  return document.getElementById(activePreview.containerId || "validation-preview");
}

function applyPreviewFit(mode = "width") {
  const preview = activePreviewElement();
  const stage = preview?.querySelector(".document-viewer-stage");
  if (!preview || !stage) return;

  const firstPage = stage.querySelector(".document-page img");
  const availableWidth = Math.max(360, preview.clientWidth - 58);
  const maxPageWidth = preview.id === "invoice-file-preview" ? 620 : 760;
  let width = Math.min(maxPageWidth, availableWidth);

  if (mode === "page" && firstPage?.naturalWidth && firstPage?.naturalHeight) {
    const availableHeight = Math.max(340, preview.clientHeight - 58);
    const pageWidthForHeight = Math.round((availableHeight * firstPage.naturalWidth) / firstPage.naturalHeight);
    width = Math.max(320, Math.min(maxPageWidth, availableWidth, pageWidthForHeight));
  }

  activePreview.fitMode = mode;
  stage.style.setProperty("--viewer-page-width", `${Math.round(width)}px`);
}

function setPreviewZoom(nextZoom, resetPosition = true) {
  const preview = activePreviewElement();
  if (!preview || !activePreview.source) return;
  activePreview.zoom = Math.min(250, Math.max(75, nextZoom));
  updatePreviewZoomLabel();

  const stage = preview.querySelector(".document-viewer-stage, .preview-canvas");
  if (stage) stage.style.setProperty("--preview-zoom", String(activePreview.zoom / 100));

  if (activePreview.type === "application/pdf") {
    if (resetPosition) centerPreviewAtTop(preview);
    return;
  }

  if (resetPosition) centerPreviewAtTop(preview);
}

function resetPreviewZoom() {
  const preview = activePreviewElement();
  activePreview.zoom = 100;
  activePreview.fitMode = "width";
  updatePreviewZoomLabel();
  applyPreviewFit("width");
  const stage = preview?.querySelector(".document-viewer-stage, .preview-canvas");
  if (stage) stage.style.setProperty("--preview-zoom", "1");
  centerPreviewAtTop(preview);
}

function wheelPreviewZoom(event) {
  const preview = event.currentTarget;
  if (!preview?.classList.contains("document-viewer-preview") || !activePreview.source) return;
  activePreview.containerId = preview.id;
  event.preventDefault();
  setPreviewZoom(activePreview.zoom + (event.deltaY < 0 ? 10 : -10), false);
}

function startPreviewDrag(event) {
  const preview = event.currentTarget;
  if (!preview?.classList.contains("document-viewer-preview") || event.button !== 0) return;
  if (!event.target.closest(".document-page")) return;
  previewDrag = {
    active: true,
    containerId: preview.id,
    startX: event.clientX,
    startY: event.clientY,
    scrollLeft: preview.scrollLeft,
    scrollTop: preview.scrollTop
  };
  preview.classList.add("dragging");
  preview.setPointerCapture?.(event.pointerId);
  event.preventDefault();
}

function movePreviewDrag(event) {
  if (!previewDrag.active) return;
  const preview = document.getElementById(previewDrag.containerId || activePreview.containerId || "validation-preview");
  if (!preview) return;
  preview.scrollLeft = previewDrag.scrollLeft - (event.clientX - previewDrag.startX);
  preview.scrollTop = previewDrag.scrollTop - (event.clientY - previewDrag.startY);
}

function stopPreviewDrag(event) {
  if (!previewDrag.active) return;
  previewDrag.active = false;
  const preview = document.getElementById(previewDrag.containerId || activePreview.containerId || "validation-preview");
  preview?.classList.remove("dragging");
  preview?.releasePointerCapture?.(event.pointerId);
  previewDrag.containerId = "";
}
