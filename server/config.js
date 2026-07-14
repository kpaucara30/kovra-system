const path = require("path");

const PORT = Number(process.env.PORT) || 8001;
const PROJECT_ROOT = path.resolve(__dirname, "..");
const CLIENT_DIR = path.join(PROJECT_ROOT, "client");
const DATA_DIR = path.join(PROJECT_ROOT, "data");
const DB_FILE = path.join(DATA_DIR, "sistema.db");
const LEGACY_DB_FILE = path.join(DATA_DIR, "db.json");
const UPLOAD_DIR = path.join(PROJECT_ROOT, "uploads");
const PREVIEW_DIR = path.join(UPLOAD_DIR, "previews");
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const DEFAULT_TESSERACT = "C:\\Program Files\\Tesseract-OCR\\tesseract.exe";
const DEFAULT_POPPLER_BIN = "C:\\Users\\kpauc\\AppData\\Local\\Microsoft\\WinGet\\Packages\\oschwartz10612.Poppler_Microsoft.Winget.Source_8wekyb3d8bbwe\\poppler-25.07.0\\Library\\bin";
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2:1b";
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".pdf": "application/pdf",
  ".svg": "image/svg+xml; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp"
};

module.exports = {
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
};
