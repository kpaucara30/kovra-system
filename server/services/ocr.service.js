const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

function cleanText(value) {
  return String(value || "")
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[^\S\r\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function run(command, args, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    execFile(command, args, { windowsHide: true, maxBuffer: 20 * 1024 * 1024, timeout: timeoutMs }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
        return;
      }

      resolve(stdout);
    });
  });
}

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function createOcrService({ tools, uploadDir, previewDir, ensureStorage }) {
  async function commandAvailable(command, versionArgs) {
    try {
      await run(command, versionArgs, 3000);
      return true;
    } catch {
      return false;
    }
  }

  async function extractText(filePath, mimeType, workDir) {
    if (mimeType === "application/pdf") {
      try {
        const text = await run(tools.pdftotext, ["-layout", filePath, "-"]);
        if (cleanText(text).length > 30) return text;
      } catch {
        // Continue with OCR fallback below.
      }

      try {
        const prefix = path.join(workDir, "page");
        await run(tools.pdftoppm, ["-png", "-f", "1", "-singlefile", filePath, prefix]);
        return await run(tools.tesseract, [`${prefix}.png`, "stdout", "-l", "spa+eng"]);
      } catch (error) {
        throw new Error(`No se pudo leer el PDF. Instala Poppler y Tesseract. Detalle: ${error.message}`);
      }
    }

    if (mimeType.startsWith("image/")) {
      try {
        return await run(tools.tesseract, [filePath, "stdout", "-l", "spa+eng"]);
      } catch (error) {
        throw new Error(`No se pudo aplicar OCR a la imagen. Instala Tesseract. Detalle: ${error.message}`);
      }
    }

    throw new Error("Formato no soportado. Usa PDF, JPG o PNG.");
  }

  async function getPdfPreviewPages(req) {
    const requestUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const requestedFile = requestUrl.searchParams.get("file") || "";
    const uploadName = path.basename(decodeURIComponent(requestedFile).replace(/^\/uploads\//, ""));
    const pdfPath = path.normalize(path.join(uploadDir, uploadName));

    if (!uploadName || path.extname(uploadName).toLowerCase() !== ".pdf" || !pdfPath.startsWith(uploadDir)) {
      throw createHttpError(400, "PDF invalido.");
    }

    if (!fs.existsSync(pdfPath)) {
      throw createHttpError(404, "No se encontro el PDF.");
    }

    ensureStorage();
    const cacheName = path.basename(uploadName, ".pdf").replace(/[^\w.-]/g, "_");
    const cacheDir = path.join(previewDir, cacheName);
    const cachePrefix = path.join(cacheDir, "page");
    fs.mkdirSync(cacheDir, { recursive: true });

    let pages = fs.readdirSync(cacheDir).filter((name) => /^page-\d+\.png$/i.test(name)).sort((a, b) => {
      return Number((a.match(/\d+/) || [0])[0]) - Number((b.match(/\d+/) || [0])[0]);
    });

    if (!pages.length) {
      await run(tools.pdftoppm, ["-png", "-r", "150", pdfPath, cachePrefix]);
      pages = fs.readdirSync(cacheDir).filter((name) => /^page-\d+\.png$/i.test(name)).sort((a, b) => {
        return Number((a.match(/\d+/) || [0])[0]) - Number((b.match(/\d+/) || [0])[0]);
      });
    }

    return pages.map((name) => `/uploads/previews/${cacheName}/${name}`);
  }

  return {
    commandAvailable,
    extractText,
    getPdfPreviewPages
  };
}

module.exports = { createOcrService };
