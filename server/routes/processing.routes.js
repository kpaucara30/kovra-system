const fs = require("fs");
const os = require("os");
const path = require("path");

function parseMultipart(buffer, contentType) {
  const boundaryMatch = contentType.match(/boundary=(.+)$/);
  if (!boundaryMatch) throw new Error("No se encontro boundary multipart.");

  const boundary = `--${boundaryMatch[1]}`;
  const raw = buffer.toString("latin1");
  const part = raw.split(boundary).find((chunk) => chunk.includes("name=\"invoice\""));
  if (!part) throw new Error("No se encontro el archivo invoice.");

  const headerEnd = part.indexOf("\r\n\r\n");
  const header = part.slice(0, headerEnd);
  let body = part.slice(headerEnd + 4);
  body = body.replace(/\r\n--$/, "").replace(/\r\n$/, "");

  const fileName = (header.match(/filename="([^"]+)"/) || ["", "factura"])[1];
  const mimeType = (header.match(/Content-Type:\s*([^\r\n]+)/i) || ["", "application/octet-stream"])[1];
  return { fileName, mimeType, content: Buffer.from(body, "latin1") };
}

function createProcessingRoutes({
  uploadDir,
  send,
  requireAuth,
  canEditInvoices,
  safeFileName,
  extractText,
  parseInvoiceTextWithAi
}) {
  return function handleProcessingRoutes(req, res) {
    if (req.method === "POST" && req.url === "/api/process-invoice") {
      const user = requireAuth(req, res);
      if (!user) return true;
      if (!canEditInvoices(user)) {
        send(res, 403, JSON.stringify({ ok: false, error: "Tu rol no permite procesar facturas." }), "application/json; charset=utf-8");
        return true;
      }

      const chunks = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", async () => {
        const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "facturasmart-"));

        try {
          const upload = parseMultipart(Buffer.concat(chunks), req.headers["content-type"] || "");
          const extension = path.extname(upload.fileName) || ".bin";
          const filePath = path.join(workDir, `invoice${extension}`);
          fs.writeFileSync(filePath, upload.content);

          const text = await extractText(filePath, upload.mimeType, workDir);
          const data = await parseInvoiceTextWithAi(text, upload.fileName);
          const storedName = safeFileName(upload.fileName);
          const storedPath = path.join(uploadDir, storedName);
          fs.writeFileSync(storedPath, upload.content);
          send(res, 200, JSON.stringify({
            ok: true,
            data: {
              ...data,
              fileUrl: `/uploads/${storedName}`,
              filePath: storedName
            }
          }));
        } catch (error) {
          send(res, 200, JSON.stringify({
            ok: false,
            error: error.message,
            data: {
              confidence: 0,
              extractedText: error.message
            }
          }));
        } finally {
          fs.rm(workDir, { recursive: true, force: true }, () => {});
        }
      });
      return true;
    }

    return false;
  };
}

module.exports = { createProcessingRoutes };
