const http = require("http");
const {
  cleanText,
  parseInvoiceText,
  normalizeAiInvoice,
  mergeInvoiceData
} = require("./invoice.service");

function postJson(url, payload, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const body = JSON.stringify(payload);
    const request = http.request({
      hostname: target.hostname,
      port: target.port || 80,
      path: `${target.pathname}${target.search}`,
      method: "POST",
      timeout: timeoutMs,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body)
      }
    }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(text || `HTTP ${response.statusCode}`));
          return;
        }

        try {
          resolve(JSON.parse(text));
        } catch {
          reject(new Error("Respuesta JSON invalida."));
        }
      });
    });

    request.on("timeout", () => {
      request.destroy(new Error("Tiempo de espera agotado."));
    });
    request.on("error", reject);
    request.write(body);
    request.end();
  });
}

function getJson(url, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const request = http.request({
      hostname: target.hostname,
      port: target.port || 80,
      path: `${target.pathname}${target.search}`,
      method: "GET",
      timeout: timeoutMs
    }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(text || `HTTP ${response.statusCode}`));
          return;
        }

        try {
          resolve(JSON.parse(text));
        } catch {
          reject(new Error("Respuesta JSON invalida."));
        }
      });
    });

    request.on("timeout", () => {
      request.destroy(new Error("Tiempo de espera agotado."));
    });
    request.on("error", reject);
    request.end();
  });
}

function extractJsonObject(value) {
  const text = String(value || "").trim();
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function createAiService({ ollamaUrl, ollamaModel }) {
  async function parseInvoiceTextWithAi(text, originalName) {
    const ruleData = parseInvoiceText(text, originalName);
    const normalized = cleanText(text).slice(0, 12000);
    if (!normalized) return { ...ruleData, extractionMethod: "rules" };

    const prompt = [
      "Extrae los datos principales de esta factura o boleta peruana.",
      "Responde solo JSON valido, sin explicaciones.",
      "Usa exactamente estas claves: ruc, number, provider, date, subtotal, igv, total, confidence.",
      "La fecha debe estar en formato YYYY-MM-DD si es posible.",
      "Si un dato no existe, usa cadena vacia o 0.",
      "",
      `Archivo: ${originalName}`,
      "Texto OCR:",
      normalized
    ].join("\n");

    try {
      const response = await postJson(`${ollamaUrl}/api/generate`, {
        model: ollamaModel,
        prompt,
        stream: false,
        format: "json",
        options: {
          temperature: 0.1
        }
      }, 60000);
      const aiData = normalizeAiInvoice(extractJsonObject(response.response));
      return mergeInvoiceData(ruleData, aiData);
    } catch {
      return { ...ruleData, extractionMethod: "rules" };
    }
  }

  async function ollamaAvailable() {
    try {
      const response = await getJson(`${ollamaUrl}/api/tags`, 10000);
      const models = Array.isArray(response.models) ? response.models : [];
      return models.some((model) => model.name === ollamaModel);
    } catch {
      return false;
    }
  }

  return {
    parseInvoiceTextWithAi,
    ollamaAvailable
  };
}

module.exports = { createAiService };
