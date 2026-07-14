const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const {
  PORT,
  PROJECT_ROOT,
  CLIENT_DIR,
  DATA_DIR,
  DB_FILE,
  LEGACY_DB_FILE,
  UPLOAD_DIR,
  PREVIEW_DIR,
  SESSION_TTL_MS,
  DEFAULT_TESSERACT,
  DEFAULT_POPPLER_BIN,
  OLLAMA_URL,
  OLLAMA_MODEL,
  MIME_TYPES
} = require("./config");
const { createStateStore } = require("./storage/database");
const { createAuthRoutes } = require("./routes/auth.routes");
const { createBackupRoutes } = require("./routes/backup.routes");
const { createDocumentRoutes } = require("./routes/documents.routes");
const { createInvoiceRoutes } = require("./routes/invoices.routes");
const { createProcessingRoutes } = require("./routes/processing.routes");
const { createProviderRoutes } = require("./routes/providers.routes");
const { createSettingsRoutes } = require("./routes/settings.routes");
const { createUserRoutes } = require("./routes/users.routes");
const { createAiService } = require("./services/ai.service");
const { createOcrService } = require("./services/ocr.service");
const { createStaticFileHandler } = require("./services/static-files");
const { send, sendJson } = require("./utils/http");

const database = createStateStore({ sqliteFile: DB_FILE, legacyJsonFile: LEGACY_DB_FILE });
const sessions = new Map();
const permissionOptions = ["dashboard", "upload", "validate", "invoices", "reports", "users", "settings", "trash", "activity"];
const defaultRoleCatalog = [
  { name: "Administrador", permissions: permissionOptions },
  { name: "Contador", permissions: ["dashboard", "upload", "validate", "invoices", "reports", "activity"] }
];

function resolveTool(command, fallbackPath) {
  if (fallbackPath && fs.existsSync(fallbackPath)) return fallbackPath;
  return command;
}

const TOOLS = {
  tesseract: resolveTool("tesseract", process.env.TESSERACT_PATH || DEFAULT_TESSERACT),
  pdftotext: resolveTool("pdftotext", process.env.PDFTOTEXT_PATH || path.join(DEFAULT_POPPLER_BIN, "pdftotext.exe")),
  pdftoppm: resolveTool("pdftoppm", process.env.PDFTOPPM_PATH || path.join(DEFAULT_POPPLER_BIN, "pdftoppm.exe"))
};

function hashPassword(password) {
  return crypto.createHash("sha256").update(String(password)).digest("hex");
}

function visiblePasswordFromUser(user) {
  const savedPassword = String(user?.password || user?.plainPassword || "");
  if (savedPassword) return savedPassword;
  return user?.passwordHash === hashPassword("123456") ? "123456" : "";
}

function slugUsername(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._-]+/g, "")
    .slice(0, 24);
}

function splitPersonName(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 2) {
    return { firstNames: parts[0] || "", lastNames: parts.slice(1).join(" ") };
  }
  return {
    firstNames: parts.slice(0, -2).join(" "),
    lastNames: parts.slice(-2).join(" ")
  };
}

function fullNameFromParts(firstNames, lastNames) {
  return [firstNames, lastNames].map((value) => String(value || "").trim()).filter(Boolean).join(" ");
}

function generatedUsernameFromProfile(birthDate, dni) {
  const cleanDni = String(dni || "").replace(/\D/g, "").slice(0, 8);
  const date = new Date(`${birthDate}T00:00:00`);
  if (cleanDni.length !== 8 || Number.isNaN(date.getTime())) return "";
  const year = String(date.getFullYear()).slice(-2);
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${cleanDni}${day}`;
}

function userLoginName(user) {
  return slugUsername(user?.username || user?.email || user?.name || "");
}

function normalizedUserRole(role) {
  return role === "Contadora" ? "Contador" : String(role || "Contador").trim();
}

function roleCatalogFromSettings(settings = {}) {
  const customRoles = Array.isArray(settings.customRoles) ? settings.customRoles : [];
  const map = new Map();
  [...defaultRoleCatalog, ...customRoles].forEach((role) => {
    const name = normalizedUserRole(role.name);
    if (!name) return;
    map.set(name, {
      name,
      permissions: Array.isArray(role.permissions) ? role.permissions.map(String) : []
    });
  });
  return [...map.values()];
}

function roleAllows(user, permissionId) {
  if (!user) return false;
  const db = readDb();
  const role = roleCatalogFromSettings(db.settings).find((item) => normalizedUserRole(item.name) === normalizedUserRole(user.role));
  return Boolean(role?.permissions?.includes(permissionId));
}

function permissionsForUser(user, db = readDb()) {
  if (!user) return [];
  const role = roleCatalogFromSettings(db.settings).find((item) => normalizedUserRole(item.name) === normalizedUserRole(user.role));
  return Array.isArray(role?.permissions) ? role.permissions : [];
}

function normalizeUsers(users) {
  const used = new Set();
  const usedIds = new Set();
  const normalized = users.map((user) => {
    const legacyName = splitPersonName(user.name);
    const firstNames = String(user.firstNames || legacyName.firstNames || "").trim();
    const lastNames = String(user.lastNames || legacyName.lastNames || "").trim();
    const name = fullNameFromParts(firstNames, lastNames) || String(user.name || "").trim();
    let username = slugUsername(user.username || (String(user.email || "").split("@")[0]) || user.name || "usuario");
    if (!username) username = "usuario";
    const base = username;
    let suffix = 2;
    while (used.has(username)) {
      username = `${base}${suffix}`;
      suffix += 1;
    }
    used.add(username);
    let id = String(user.id || "").trim();
    if (!id || usedIds.has(id)) id = crypto.randomUUID();
    usedIds.add(id);
    return {
      ...user,
      id,
      firstNames,
      lastNames,
      name,
      birthDate: String(user.birthDate || ""),
      username,
      role: normalizedUserRole(user.role),
      status: user.status || "Activo"
    };
  });
  if (!normalized.some((user) => normalizedUserRole(user.role) === "Administrador" && user.status === "Activo")) {
    const admin = normalized.find((user) => normalizedUserRole(user.role) === "Administrador");
    if (admin) admin.status = "Activo";
  }
  return normalized;
}

function createDefaultDb() {
  return {
    invoices: [],
    providers: [],
    users: [
      {
        id: crypto.randomUUID(),
        name: "Admin PYME",
        username: "admin",
        email: "admin@pyme.pe",
        role: "Administrador",
        status: "Activo",
        password: "123456",
        passwordHash: hashPassword("123456"),
        createdAt: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        name: "Maria Torres",
        username: "contador",
        email: "contador@pyme.pe",
        role: "Contador",
        status: "Activo",
        password: "123456",
        passwordHash: hashPassword("123456"),
        createdAt: new Date().toISOString()
      }
    ],
    settings: {
      companyName: "PYME Lima 2026"
    }
  };
}

function normalizeDbState(db = {}) {
  return {
    invoices: Array.isArray(db.invoices) ? db.invoices : [],
    providers: Array.isArray(db.providers) ? db.providers : [],
    users: normalizeUsers(Array.isArray(db.users) ? db.users : []),
    settings: db.settings || {}
  };
}

function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  if (!fs.existsSync(PREVIEW_DIR)) fs.mkdirSync(PREVIEW_DIR, { recursive: true });
  database.ensure(() => normalizeDbState(createDefaultDb()));
}

function readDb() {
  ensureDb();
  try {
    const db = database.read();
    const normalized = normalizeDbState(db);
    if (JSON.stringify(normalized) !== JSON.stringify(db || {})) {
      database.write(normalized);
    }
    return normalized;
  } catch {
    const db = normalizeDbState(createDefaultDb());
    database.write(db);
    return db;
  }
}

function writeDb(db) {
  ensureDb();
  database.write(normalizeDbState(db));
}

function publicUser(user) {
  if (!user) return null;
  const { passwordHash, ...safeUser } = user;
  return {
    ...safeUser,
    password: visiblePasswordFromUser(user),
    role: normalizedUserRole(safeUser.role),
    permissions: permissionsForUser(user)
  };
}

function parseCookies(req) {
  return Object.fromEntries(String(req.headers.cookie || "")
    .split(";")
    .map((cookie) => cookie.trim().split("="))
    .filter(([key, value]) => key && value));
}

function getSessionUser(req) {
  const token = parseCookies(req).fs_session;
  if (!token) return null;

  const session = sessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }

  const db = readDb();
  const user = db.users.find((item) => item.id === session.userId && item.status === "Activo");
  return user || null;
}

function requireAuth(req, res) {
  const user = getSessionUser(req);
  if (!user) {
    sendJson(res, 401, { ok: false, error: "Inicia sesion para continuar." });
    return null;
  }
  return user;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8") || "{}";
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("JSON invalido."));
      }
    });
  });
}

function canManageUsers(user) {
  return normalizedUserRole(user?.role) === "Administrador";
}

function canViewInvoices(user) {
  return ["dashboard", "upload", "validate", "invoices", "reports", "trash", "activity"].some((permission) => roleAllows(user, permission));
}

function canViewProviders(user) {
  return ["dashboard", "upload", "validate", "invoices", "reports", "activity"].some((permission) => roleAllows(user, permission));
}

function canEditInvoices(user) {
  return roleAllows(user, "upload") || roleAllows(user, "validate") || roleAllows(user, "trash");
}

function canViewReports(user) {
  return roleAllows(user, "invoices") || roleAllows(user, "reports") || roleAllows(user, "activity");
}

function safeFileName(fileName) {
  const extension = path.extname(fileName || ".bin").toLowerCase() || ".bin";
  const base = path.basename(fileName || "factura", extension)
    .replace(/[^a-z0-9-_]+/gi, "-")
    .replace(/-+/g, "-")
    .slice(0, 80) || "factura";
  return `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${base}${extension}`;
}

function findOrCreateProvider(db, invoice) {
  const ruc = String(invoice.ruc || "").trim();
  if (!ruc && !invoice.provider) return null;

  let provider = db.providers.find((item) => ruc ? item.ruc === ruc : item.name === invoice.provider);
  if (!provider) {
    provider = {
      id: crypto.randomUUID(),
      ruc,
      name: invoice.provider || "Proveedor sin nombre",
      category: invoice.category || "Servicios",
      contact: "",
      phone: "",
      email: "",
      status: "Activo",
      createdAt: new Date().toISOString()
    };
    db.providers.unshift(provider);
  } else {
    provider.name = invoice.provider || provider.name;
    provider.category = invoice.category || provider.category;
    provider.updatedAt = new Date().toISOString();
  }

  return provider;
}

const ocrService = createOcrService({
  tools: TOOLS,
  uploadDir: UPLOAD_DIR,
  previewDir: PREVIEW_DIR,
  ensureStorage: ensureDb
});

const aiService = createAiService({
  ollamaUrl: OLLAMA_URL,
  ollamaModel: OLLAMA_MODEL
});

const serveStatic = createStaticFileHandler({
  clientDir: CLIENT_DIR,
  projectRoot: PROJECT_ROOT,
  mimeTypes: MIME_TYPES,
  send
});

const handleAuthRoutes = createAuthRoutes({
  readDb,
  writeDb,
  readJsonBody,
  sendJson,
  sessions,
  sessionTtlMs: SESSION_TTL_MS,
  parseCookies,
  slugUsername,
  hashPassword,
  userLoginName,
  publicUser,
  getSessionUser
});

const handleUserRoutes = createUserRoutes({
  readDb,
  writeDb,
  readJsonBody,
  sendJson,
  requireAuth,
  canManageUsers,
  slugUsername,
  generatedUsernameFromProfile,
  hashPassword,
  userLoginName,
  publicUser,
  clientDir: CLIENT_DIR
});

const handleInvoiceRoutes = createInvoiceRoutes({
  readDb,
  writeDb,
  readJsonBody,
  sendJson,
  requireAuth,
  canViewInvoices,
  canEditInvoices,
  findOrCreateProvider
});

const handleProviderRoutes = createProviderRoutes({
  readDb,
  writeDb,
  readJsonBody,
  sendJson,
  requireAuth,
  canViewProviders,
  canEditInvoices,
  findOrCreateProvider
});

const handleSettingsRoutes = createSettingsRoutes({
  readDb,
  writeDb,
  readJsonBody,
  sendJson,
  requireAuth,
  canManageUsers
});

const handleBackupRoutes = createBackupRoutes({
  readDb,
  writeDb,
  readJsonBody,
  sendJson,
  requireAuth,
  canViewReports,
  canManageUsers
});

const handleDocumentRoutes = createDocumentRoutes({
  sendJson,
  requireAuth,
  getPdfPreviewPages: ocrService.getPdfPreviewPages
});

const handleProcessingRoutes = createProcessingRoutes({
  uploadDir: UPLOAD_DIR,
  send,
  requireAuth,
  canEditInvoices,
  safeFileName,
  extractText: ocrService.extractText,
  parseInvoiceTextWithAi: aiService.parseInvoiceTextWithAi
});

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    send(res, 204, "");
    return;
  }

  if (handleAuthRoutes(req, res)) return;
  if (handleUserRoutes(req, res)) return;
  if (handleInvoiceRoutes(req, res)) return;
  if (handleProviderRoutes(req, res)) return;
  if (handleSettingsRoutes(req, res)) return;
  if (handleBackupRoutes(req, res)) return;
  if (handleDocumentRoutes(req, res)) return;
  if (handleProcessingRoutes(req, res)) return;

  if (req.method === "GET" && req.url === "/api/status") {
    Promise.all([
      ocrService.commandAvailable(TOOLS.tesseract, ["--version"]),
      ocrService.commandAvailable(TOOLS.pdftotext, ["-v"]),
      ocrService.commandAvailable(TOOLS.pdftoppm, ["-v"]),
      aiService.ollamaAvailable()
    ]).then(([tesseract, pdftotext, pdftoppm, ollama]) => {
      send(res, 200, JSON.stringify({
        ok: tesseract && pdftotext && pdftoppm,
        tools: { tesseract, pdftotext, pdftoppm, ollama, ollamaModel: OLLAMA_MODEL },
        message: tesseract && pdftotext && pdftoppm
          ? (ollama ? `OCR e IA local listos con ${OLLAMA_MODEL}.` : "OCR listo. IA local no conectada.")
          : "Faltan herramientas OCR. Instala Tesseract y Poppler, luego reinicia el servidor."
      }));
    });
    return;
  }

  if (req.method === "GET") {
    serveStatic(req, res);
    return;
  }

  send(res, 405, "Metodo no permitido", "text/plain; charset=utf-8");
});

server.listen(PORT, () => {
  console.log(`FacturaSmart ejecutandose en http://localhost:${PORT}/index.html`);
});
