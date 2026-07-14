function cleanText(value) {
  return String(value || "")
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[^\S\r\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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

  return Number(normalized) || 0;
}

function normalizeInvoiceNumber(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[Oo]/g, "0")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\s+/g, "");
}

function looksLikeInvoiceNumber(value) {
  const number = normalizeInvoiceNumber(value);
  return /^[A-Z]{1,3}\d{1,4}-\d{1,10}$/.test(number) || /^\d{3,4}-\d{3,10}$/.test(number);
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

function normalizeDate(value) {
  const text = String(value || "").trim();
  const iso = text.match(/\b(20\d{2})[/-](\d{1,2})[/-](\d{1,2})\b/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;

  const local = text.match(/\b(\d{1,2})[/-](\d{1,2})[/-](20\d{2})\b/);
  if (local) return `${local[3]}-${local[2].padStart(2, "0")}-${local[1].padStart(2, "0")}`;

  return "";
}

function amountLikePattern() {
  return /(?:S\/\.?|PEN|USD|\$)\s*[|_\s-]*\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})|\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})|\d+(?:[.,]\d{2})/gi;
}

function extractAmounts(text) {
  const matches = String(text).match(amountLikePattern()) || [];
  return matches
    .map(parseAmount)
    .filter((amount) => Number.isFinite(amount) && amount > 0 && amount < 1000000);
}

function findAmount(text, labels, options = {}) {
  const lines = cleanText(text).split(/\n+/).map((line) => line.trim()).filter(Boolean);
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

function normalizeInvoiceAmounts(text, subtotal, igv, total) {
  const normalized = cleanText(text);
  const strictSubtotal = findAmount(normalized, [
    "op\\.?\\s*gravada(?:s)?",
    "operaci[oÃ³]n(?:es)?\\s*gravada(?:s)?",
    "venta\\s*gravada",
    "base\\s*imponible",
    "subtotal",
    "sub\\s*total"
  ], { excludes: ["gratuita", "gratuitas", "inafecta", "exonerada", "exportaci[oÃ³]n", "descuento", "percepci[oÃ³]n"] });
  const strictIgv = findAmount(normalized, [
    "\\bigv\\b",
    "i\\.?g\\.?v\\.?",
    "\\bi[eÃ©]v\\b",
    "impuesto\\s+general"
  ], { excludes: ["icbper"] });
  const strictTotal = findAmount(normalized, [
    "total\\s+a\\s+pagar",
    "importe\\s+total",
    "monto\\s+total",
    "total\\s+venta",
    "precio\\s+total"
  ], { excludes: ["descuento", "gratuita", "gratuitas", "inafecta", "exonerada", "exportaci[oÃ³]n", "percepci[oÃ³]n"], preferLast: true });

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
  const compact = String(text).replace(/[^\d]/g, " ");
  const direct = String(text).match(/\b(?:10|20)\d{9}\b/);
  if (direct) return direct[0];

  const labeled = String(text).match(/R\.?\s*U\.?\s*C\.?[^0-9]{0,20}((?:\d[\s.-]*){11})/i);
  if (labeled) {
    const digits = labeled[1].replace(/\D/g, "");
    if (/^(10|20)\d{9}$/.test(digits)) return digits;
  }

  const candidates = compact.match(/\b(?:10|20)\d{9}\b/g) || [];
  return candidates[0] || "";
}

function extractNumber(text) {
  const value = String(text || "").replace(/[\u2013\u2014]/g, "-");
  const patterns = [
    /\b((?:F|E|B)\s*[O0I1l\d]{3}\s*-\s*[O0I1l\d]{1,10})\b/i,
    /\b((?:F|E|B)\s*[O0I1l\d]{3}\s*[O0I1l\d]{3,10})\b/i,
    /(?:FACTURA|BOLETA|COMPROBANTE|DOCUMENTO|ELECTRONICA|ELECTRONICA)[^\n]{0,80}?((?:F|E|B)?\s*[O0I1l\d]{3,4}\s*-\s*[O0I1l\d]{1,10})/i,
    /\b(\d{3,4}\s*-\s*\d{3,10})\b/
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match) return repairInvoiceNumberFromText(match[1] || match[0], value);
  }

  return "";
}
function extractDate(text) {
  return normalizeDate(text);
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
      if (beforeRuc.length > 3 && !/cliente|fecha|direcci[oÃ³]n/i.test(beforeRuc)) return normalizeProviderName(beforeRuc);
    }
  }

  const stopWords = /factura|boleta|cliente|fecha|direcci[oó]n|orden|cantidad|unidad|descripci[oó]n|total|igv|ruc|tel[eé]fono|correo|mail/i;
  const candidate = lines.find((line) => line.length > 3 && !/\d{6,}/.test(line) && !stopWords.test(line));
  return normalizeProviderName(candidate || originalName.replace(/\.[^.]+$/, ""));
}

function parseInvoiceText(text, originalName) {
  const normalized = cleanText(text);
  const lines = normalized.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const ruc = extractRuc(normalized);
  const number = extractNumber(normalized);
  const date = extractDate(normalized);
  let subtotal = findAmount(normalized, ["subtotal", "sub total", "op\\.?\\s*gravada", "operaci[oÃ³]n gravada", "op\\.?\\s*gravadas", "valor venta", "venta gravada", "base imponible"], { excludes: ["gratuita", "gratuitas", "inafecta", "exonerada", "exportaci[oÃ³]n", "descuento", "percepci[oÃ³]n"] });
  let igv = findAmount(normalized, ["i\\.?g\\.?v\\.?", "\\bigv\\b", "\\bi[eÃ©]v\\b", "igv\\s*18", "impuesto general"], { excludes: ["icbper"] });
  let total = findAmount(normalized, ["importe total", "total a pagar", "monto total", "total venta", "precio total"], { excludes: ["descuento", "gratuita", "gratuitas", "inafecta", "exonerada", "exportaci[oÃ³]n", "percepci[oÃ³]n"], preferLast: true });

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

  const provider = extractProvider(lines, ruc, originalName);
  const confidence = [ruc, number, date, subtotal, igv, total].filter(Boolean).length * 16;

  return {
    ruc,
    number,
    provider,
    date,
    subtotal,
    igv,
    total,
    confidence: Math.min(confidence, 96),
    extractedText: normalized
  };
}

function normalizeAiInvoice(aiData) {
  if (!aiData || typeof aiData !== "object") return null;
  const ruc = String(aiData.ruc || "").replace(/\D/g, "").slice(0, 11);
  const number = normalizeInvoiceNumber(aiData.number || aiData.numero || aiData.numeroFactura || "");
  return {
    ruc,
    number: number && number !== ruc ? number : "",
    provider: String(aiData.provider || aiData.proveedor || "").trim(),
    date: normalizeDate(aiData.date || aiData.fecha || ""),
    subtotal: parseAmount(aiData.subtotal),
    igv: parseAmount(aiData.igv),
    total: parseAmount(aiData.total),
    confidence: Math.min(Number(aiData.confidence || aiData.confianza || 90) || 90, 98)
  };
}

function mergeInvoiceData(ruleData, aiData) {
  if (!aiData) return { ...ruleData, extractionMethod: "rules" };
  const ruleAmounts = normalizeInvoiceAmounts(ruleData.extractedText || "", ruleData.subtotal, ruleData.igv, ruleData.total);
  const aiAmounts = normalizeInvoiceAmounts(ruleData.extractedText || "", aiData.subtotal, aiData.igv, aiData.total);
  const ruleAmountsBalance = amountsBalance(ruleAmounts.subtotal, ruleAmounts.igv, ruleAmounts.total);
  const useAiAmounts = !ruleAmountsBalance && amountsBalance(aiAmounts.subtotal, aiAmounts.igv, aiAmounts.total);
  const ruleNumber = repairInvoiceNumberFromText(ruleData.number, ruleData.extractedText);
  const aiNumber = repairInvoiceNumberFromText(aiData.number, ruleData.extractedText);
  const merged = {
    ...ruleData,
    ruc: aiData.ruc || ruleData.ruc,
    number: looksLikeInvoiceNumber(ruleNumber) ? ruleNumber : (aiNumber || ruleNumber),
    provider: aiData.provider || ruleData.provider,
    date: ruleData.date || aiData.date,
    subtotal: useAiAmounts ? aiAmounts.subtotal : ruleAmounts.subtotal,
    igv: useAiAmounts ? aiAmounts.igv : ruleAmounts.igv,
    total: useAiAmounts ? aiAmounts.total : ruleAmounts.total,
    confidence: Math.max(ruleData.confidence || 0, aiData.confidence || 0),
    extractionMethod: "ollama"
  };

  merged.extractedText = ruleData.extractedText;
  return merged;
}

module.exports = {
  cleanText,
  parseInvoiceText,
  normalizeAiInvoice,
  mergeInvoiceData
};
