function validPeruRuc(ruc) {
  const value = String(ruc || "").trim();
  if (!/^(10|20)\d{9}$/.test(value)) return false;
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = weights.reduce((total, weight, index) => total + Number(value[index]) * weight, 0);
  const digit = 11 - (sum % 11);
  const check = digit === 10 ? 0 : digit === 11 ? 1 : digit;
  return check === Number(value[10]);
}

function globalSearchResults(query) {
  const value = query.trim().toLowerCase();
  if (!value) return [];

  const invoiceResults = activeInvoices()
    .filter((invoice) => [invoice.number, invoice.provider, invoice.ruc, invoice.company, invoice.category, invoice.status]
      .join(" ")
      .toLowerCase()
      .includes(value))
    .slice(0, 6)
    .map((invoice) => ({
      type: "Factura",
      id: invoice.id,
      title: invoice.number || invoice.provider,
      meta: `${invoice.provider || "Proveedor"} - ${money(invoice.total)} - ${invoice.status}`,
      target: "invoice"
    }));

  return invoiceResults.slice(0, 10);
}

function renderGlobalSearch() {
  const input = document.getElementById("global-search-input");
  const results = document.getElementById("global-search-results");
  const list = globalSearchResults(input.value);

  results.innerHTML = list.length
    ? list.map((item) => `
      <button type="button" data-search-target="${item.target}" data-id="${escapeHtml(item.id)}">
        <span>${escapeHtml(item.type)}</span>
        <strong>${escapeHtml(item.title)}</strong>
        <small>${escapeHtml(item.meta)}</small>
      </button>
    `).join("")
    : `<div class="search-empty">Sin resultados</div>`;
}

function openGlobalSearch() {
  const panel = document.getElementById("global-search");
  panel.classList.remove("hidden");
  document.getElementById("global-search-input").focus();
  renderGlobalSearch();
}

function closeGlobalSearch() {
  document.getElementById("global-search").classList.add("hidden");
  document.getElementById("global-search-input").value = "";
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function cleanExtractedText(value) {
  return String(value || "")
    .replace(/\\([()\\])/g, "$1")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\n")
    .replace(/\\t/g, " ")
    .replace(/[^\S\r\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractTextFromPdf(file) {
  const buffer = await readFileAsArrayBuffer(file);
  const raw = new TextDecoder("latin1").decode(buffer);
  const strings = [...raw.matchAll(/\(([^()]*)\)/g)].map((match) => match[1]);
  const visibleText = strings.length > 12 ? strings.join("\n") : raw;
  return cleanExtractedText(visibleText);
}

function parseAmount(value) {
  if (!value) return 0;
  const cleaned = String(value).replace(/[^\d.,-]/g, "");
  const lastDot = cleaned.lastIndexOf(".");
  const lastComma = cleaned.lastIndexOf(",");
  let normalized = cleaned;

  if (lastDot > -1 && lastComma > -1) {
    const decimal = lastDot > lastComma ? "." : ",";
    const thousands = decimal === "." ? "," : ".";
    normalized = cleaned.replaceAll(thousands, "").replace(decimal, ".");
  } else if (lastComma > -1) {
    const decimals = cleaned.length - lastComma - 1;
    normalized = decimals === 2 ? cleaned.replace(",", ".") : cleaned.replaceAll(",", "");
  }

  return Math.abs(Number(normalized) || 0);
}

function formatAmountInputValue(value) {
  return (Number(value) || 0).toFixed(2);
}

function setMoneyInputValue(id, value) {
  const input = document.getElementById(id);
  if (input) input.value = value === "" || value === null || value === undefined ? "" : formatAmountInputValue(value);
}

function amountLikePattern() {
  return /(?:S\/\.?|PEN|USD|\$)\s*[|_\s-]*-?\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})|-?\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})|-?\d+(?:[.,]\d{2})/gi;
}

function findAmount(text, labels, options = {}) {
  const lines = cleanExtractedText(text).split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const excludes = options.excludes || [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const matchingLabel = labels.find((label) => new RegExp(label, "i").test(line));
    if (!matchingLabel) continue;
    if (excludes.some((label) => new RegExp(label, "i").test(line))) continue;
    const labelIndex = line.search(new RegExp(matchingLabel, "i"));
    const amountsAfterLabel = labelIndex >= 0 ? extractAmounts(line.slice(labelIndex)) : [];
    if (amountsAfterLabel.length) return options.preferLast ? amountsAfterLabel[amountsAfterLabel.length - 1] : amountsAfterLabel[0];
    const amountsInLine = extractAmounts(line);
    if (amountsInLine.length) return options.preferLast ? amountsInLine[amountsInLine.length - 1] : amountsInLine[0];
    const nearby = [lines[index + 1] || "", lines[index + 2] || ""].join(" ");
    const amounts = extractAmounts(nearby);
    if (amounts.length) return options.preferLast ? amounts[amounts.length - 1] : amounts[0];
  }

  for (const label of labels) {
    const expression = new RegExp(`${label}[^\\d-]{0,80}((?:S\\/\\.?|PEN|USD|\\$)?\\s*[|_\\s-]*\\d{1,3}(?:[.,]\\d{3})*(?:[.,]\\d{2})|\\d+(?:[.,]\\d{2}))`, "i");
    const match = text.match(expression);
    if (match) {
      const before = text.slice(Math.max(0, match.index - 40), match.index + match[0].length);
      if (!excludes.some((exclude) => new RegExp(exclude, "i").test(before))) return parseAmount(match[1]);
    }
  }
  return 0;
}

function extractAmounts(text) {
  const matches = String(text).match(amountLikePattern()) || [];
  return matches
    .map(parseAmount)
    .filter((amount) => Number.isFinite(amount) && amount > 0 && amount < 1000000);
}

function inferAmounts(text, subtotal, igv, total) {
  if (subtotal && igv && total) return { subtotal, igv, total };
  const amounts = [...new Set(extractAmounts(text))]
    .filter((amount) => amount >= 1)
    .sort((a, b) => b - a);

  if (!total && amounts.length) {
    total = amounts.find((amount) => amount >= 10) || amounts[0];
  }

  if (total && !subtotal) {
    subtotal = amounts.find((amount) => amount < total && Math.abs(amount * 1.18 - total) < 1.5) || 0;
  }

  if (total && subtotal && !igv) {
    igv = Number((total - subtotal).toFixed(2));
  } else if (total && !subtotal && !igv) {
    subtotal = Number((total / 1.18).toFixed(2));
    igv = Number((total - subtotal).toFixed(2));
  }

  return { subtotal, igv, total };
}

function amountsBalance(subtotal, igv, total) {
  return subtotal > 0 && igv >= 0 && total > 0 && Math.abs((subtotal + igv) - total) <= 0.08;
}

function correctAmountMismatch(invoice) {
  const subtotal = Number(invoice?.subtotal) || 0;
  const igv = Number(invoice?.igv) || 0;
  const total = Number(invoice?.total) || 0;
  const calculatedTotal = roundMoney(subtotal + igv);

  if (subtotal > 0 && igv >= 0 && calculatedTotal > 0 && !amountsBalance(subtotal, igv, total)) {
    const totalLooksLikeTax = total > 0 && Math.abs(total - igv) <= 0.08;
    const totalTooSmall = total > 0 && total < subtotal;
    if (!total || totalLooksLikeTax || totalTooSmall) {
      return { ...invoice, subtotal, igv, total: calculatedTotal };
    }
  }

  return invoice;
}

function normalizeInvoiceAmounts(text, subtotal, igv, total) {
  const normalized = cleanExtractedText(text);
  const strictSubtotal = findAmount(normalized, [
    "op\\.?\\s*gravada(?:s)?",
    "operaci[oó]n(?:es)?\\s*gravada(?:s)?",
    "venta\\s*gravada",
    "base\\s*imponible",
    "subtotal",
    "sub\\s*total"
  ], { excludes: ["gratuita", "gratuitas", "inafecta", "exonerada", "exportaci[oó]n", "descuento", "percepci[oó]n"] });
  const strictIgv = findAmount(normalized, [
    "\\bigv\\b",
    "i\\.?g\\.?v\\.?",
    "\\bi[eé]v\\b",
    "impuesto\\s+general"
  ], { excludes: ["icbper"] });
  const strictTotal = findAmount(normalized, [
    "total\\s+a\\s+pagar",
    "importe\\s+total",
    "monto\\s+total",
    "total\\s+venta",
    "precio\\s+total"
  ], { excludes: ["descuento", "gratuita", "gratuitas", "inafecta", "exonerada", "exportaci[oó]n", "percepci[oó]n"], preferLast: true });

  const next = {
    subtotal: strictSubtotal || subtotal || 0,
    igv: strictIgv || igv || 0,
    total: strictTotal || total || 0
  };

  if (!amountsBalance(next.subtotal, next.igv, next.total)) {
    if (next.subtotal > 0 && next.total > 0) {
      const calculatedIgv = Number((next.total - next.subtotal).toFixed(2));
      if (calculatedIgv >= 0 && (!strictIgv || Math.abs(calculatedIgv - strictIgv) <= 0.08)) next.igv = calculatedIgv;
    }
    if (next.subtotal > 0 && next.igv >= 0 && (!next.total || Math.abs((next.subtotal + next.igv) - next.total) > 0.08)) {
      const calculatedTotal = Number((next.subtotal + next.igv).toFixed(2));
      if (!strictTotal || Math.abs(calculatedTotal - strictTotal) <= 0.08) next.total = calculatedTotal;
    }
    if (next.total > 0 && next.igv >= 0 && (!next.subtotal || Math.abs((next.subtotal + next.igv) - next.total) > 0.08)) {
      const calculatedSubtotal = Number((next.total - next.igv).toFixed(2));
      if (calculatedSubtotal > 0 && (!strictSubtotal || Math.abs(calculatedSubtotal - strictSubtotal) <= 0.08)) next.subtotal = calculatedSubtotal;
    }
  }

  return next;
}

function extractRuc(text) {
  const direct = String(text).match(/\b(?:10|20)\d{9}\b/);
  if (direct) return direct[0];

  const labeled = String(text).match(/R\.?\s*U\.?\s*C\.?[^0-9]{0,20}((?:\d[\s.-]*){11})/i);
  if (labeled) {
    const digits = labeled[1].replace(/\D/g, "");
    if (/^(10|20)\d{9}$/.test(digits)) return digits;
  }

  return "";
}

function normalizeInvoiceNumber(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[Oo]/g, "0")
    .replace(/[Il]/g, "1")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\s+/g, "");
}

function repairInvoiceNumberFromText(number, text) {
  const normalizedNumber = normalizeInvoiceNumber(number);
  const value = String(text || "")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\b([FEB])OO(?=\d)/gi, "$100");
  const candidates = [
    ...value.matchAll(/\b([FEB]\s*[O0I1l\d]{3})\s*-\s*([O0I1l\d]{1,10})\b/gi),
    ...value.matchAll(/\b([FEB]\s*[O0I1l\d]{3})([O0I1l\d]{3,10})\b/gi)
  ].map((match) => normalizeInvoiceNumber(`${match[1]}-${match[2]}`));

  if (!normalizedNumber) return candidates[0] || "";
  const numeric = normalizedNumber.replace(/^[A-Z]+/, "");
  const repaired = candidates.find((candidate) => candidate.endsWith(numeric));
  return repaired || normalizedNumber;
}

function extractNumber(text) {
  const value = String(text || "").replace(/[\u2013\u2014]/g, "-");
  const patterns = [
    /\b((?:F|E|B)\s*[O0I1l\d]{3}\s*-\s*[O0I1l\d]{1,10})\b/i,
    /\b((?:F|E|B)\s*[O0I1l\d]{3}\s*[O0I1l\d]{3,10})\b/i,
    /(?:FACTURA|BOLETA|COMPROBANTE|DOCUMENTO|ELECTRONICA|ELECTRONICA)[^\n]{0,100}?((?:F|E|B)?\s*[O0I1l\d]{3,4}\s*-\s*[O0I1l\d]{1,10})/i,
    /\b(\d{3,4}\s*-\s*\d{3,10})\b/
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match) return repairInvoiceNumberFromText(match[1] || match[0], value);
  }

  return "";
}

function normalizeExtractedNumber(invoice) {
  if (!invoice || !invoice.extractedText) return invoice;
  const number = repairInvoiceNumberFromText(invoice.number, invoice.extractedText) || extractNumber(invoice.extractedText);
  return number ? { ...invoice, number } : invoice;
}
function extractDate(text) {
  const value = String(text || "");
  const iso = value.match(/\b(20\d{2})[/-](\d{2})[/-](\d{2})\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const local = value.match(/\b(\d{2})[/-](\d{2})[/-](20\d{2})\b/);
  if (local) return `${local[3]}-${local[2]}-${local[1]}`;

  return "";
}

function extractProvider(lines, ruc, originalName) {
  const normalizeProviderName = (value) => /wisphu/i.test(value) ? "Wisphub" : value;

  if (ruc) {
    const rucLine = lines.find((line) => line.includes(ruc));
    if (rucLine) {
      const beforeRuc = rucLine
        .replace(new RegExp(`R\\.?\\s*U\\.?\\s*C\\.?\\s*${ruc}`, "i"), "")
        .replace(ruc, "")
        .replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, "")
        .replace(/^[eE]\s+/, "")
        .trim();
      if (beforeRuc.length > 3 && !/cliente|fecha|direcci[oó]n/i.test(beforeRuc)) return normalizeProviderName(beforeRuc);
    }
  }

  const stopWords = /factura|boleta|cliente|fecha|direcci[oó]n|orden|cantidad|unidad|descripci[oó]n|total|igv|ruc|tel[eé]fono|correo|mail/i;
  const candidate = lines.find((line) => line.length > 3 && !/\d{6,}/.test(line) && !stopWords.test(line));
  return normalizeProviderName(candidate || originalName.replace(/\.[^.]+$/, ""));
}

function extractInvoiceData(text, file) {
  const normalized = cleanExtractedText(text);
  const lines = normalized.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const ruc = extractRuc(normalized);
  const number = extractNumber(normalized);
  const date = extractDate(normalized) || today();
  let subtotal = findAmount(normalized, ["subtotal", "sub total", "op\\.?\\s*gravada", "operaci[oó]n gravada", "op\\.?\\s*gravadas", "valor venta", "venta gravada", "base imponible"], { excludes: ["gratuita", "gratuitas", "inafecta", "exonerada", "exportaci[oó]n", "descuento", "percepci[oó]n"] });
  let igv = findAmount(normalized, ["i\\.?g\\.?v\\.?", "\\bigv\\b", "\\bi[eé]v\\b", "igv\\s*18", "impuesto general"], { excludes: ["icbper"] });
  let total = findAmount(normalized, ["importe total", "total a pagar", "monto total", "total venta", "precio total"], { excludes: ["descuento", "gratuita", "gratuitas", "inafecta", "exonerada", "exportaci[oó]n", "percepci[oó]n"], preferLast: true });

  ({ subtotal, igv, total } = inferAmounts(normalized, subtotal, igv, total));
  ({ subtotal, igv, total } = normalizeInvoiceAmounts(normalized, subtotal, igv, total));

  if (total && !subtotal && !igv) {
    subtotal = Number((total / 1.18).toFixed(2));
    igv = Number((total - subtotal).toFixed(2));
  } else if (total && subtotal && !igv) {
    igv = Number((total - subtotal).toFixed(2));
  } else if (total && igv && !subtotal) {
    subtotal = Number((total - igv).toFixed(2));
  } else if (!total && subtotal && igv) {
    total = Number((subtotal + igv).toFixed(2));
  }

  const provider = extractProvider(lines, ruc, file.name);
  const confidence = [ruc, number, subtotal, igv, total].filter(Boolean).length * 18;

  return {
    ruc,
    number,
    provider,
    date,
    subtotal,
    igv,
    total,
    confidence: Math.min(confidence, 95),
    extractedText: normalized
  };
}

async function extractDataFromFile(file) {
  try {
    const formData = new FormData();
    formData.append("invoice", file);

    const response = await fetch(`${API_BASE}/api/process-invoice`, {
      method: "POST",
      body: formData
    });
    const result = await response.json();

    if (result.data) {
      return normalizeExtractedNumber({
        ruc: result.data.ruc || "",
        number: result.data.number || "",
        provider: result.data.provider || file.name.replace(/\.[^.]+$/, ""),
        date: result.data.date || "",
        subtotal: parseAmount(result.data.subtotal),
        igv: parseAmount(result.data.igv),
        total: parseAmount(result.data.total),
        confidence: result.data.confidence || 0,
        fileUrl: result.data.fileUrl || "",
        filePath: result.data.filePath || "",
        extractedText: result.ok
          ? result.data.extractedText || ""
          : `Backend OCR: ${result.error || "No se pudo procesar."}`
      });
    }
  } catch (error) {
    // Keep the browser-only fallback available when the backend is not running.
  }

  if (file.type === "application/pdf") {
    const text = await extractTextFromPdf(file);
    return extractInvoiceData(text, file);
  }

  return {
    ruc: "",
    number: "",
    provider: file.name.replace(/\.[^.]+$/, ""),
    date: today(),
    subtotal: 0,
    igv: 0,
    total: 0,
    confidence: 0,
    extractedText: "No se pudo aplicar OCR real a esta imagen porque el motor OCR no esta instalado/conectado. Para imagenes escaneadas se debe integrar Tesseract, Google Vision, Azure Document Intelligence u OpenAI Vision desde un backend."
  };
}
