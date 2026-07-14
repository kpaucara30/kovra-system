const STORAGE_KEY = "facturasmart_invoices_v2";
const API_BASE = location.protocol === "file:" || location.port === "8000" ? "http://localhost:8001" : "";

const titles = {
  dashboard: "Dashboard",
  upload: "Procesar Facturas",
  processing: "Procesamiento OCR",
  validate: "Validacion de datos",
  save: "Guardar Facturas",
  result: "Resultado",
  invoices: "Facturas registradas",
  reports: "Reportes",
  users: "Usuarios",
  trash: "Papelera",
  settings: "Configuracion del sistema"
};

const statusClass = {
  Validado: "ok",
  Pendiente: "pending",
  Observado: "observed",
  Duplicado: "duplicate",
  Eliminado: "duplicate"
};

const permissionOptions = [
  { id: "dashboard", label: "Dashboard" },
  { id: "upload", label: "Procesar facturas" },
  { id: "validate", label: "Validar facturas procesadas" },
  { id: "invoices", label: "Consultar facturas" },
  { id: "reports", label: "Generar reportes" },
  { id: "users", label: "Gestionar usuarios" },
  { id: "settings", label: "Configuracion del sistema" },
  { id: "trash", label: "Editar / Eliminar facturas registradas" },
  { id: "activity", label: "Ver actividad del sistema" }
];

const defaultRoleCatalog = [
  {
    name: "Administrador",
    description: "Acceso completo",
    locked: true,
    permissions: permissionOptions.map((item) => item.id)
  },
  {
    name: "Contador",
    description: "Acceso limitado",
    locked: true,
    permissions: ["dashboard", "upload", "validate", "invoices", "reports", "activity"]
  }
];

const viewPermissions = {
  dashboard: "dashboard",
  upload: "upload",
  processing: "upload",
  validate: "validate",
  save: "validate",
  result: "validate",
  invoices: "invoices",
  reports: "reports",
  users: "users",
  trash: "trash",
  settings: "settings"
};

let invoices = [];
let users = [];
let providers = [];
let settings = {};
let currentUser = null;
let selectedInvoiceFile = null;
let selectedInvoiceFiles = [];
let selectedInvoiceDataUrl = "";
let selectedInvoiceObjectUrl = "";
let currentDraft = null;
let validationRows = [];
let validationModalIndex = 0;
let validationModalInitialData = "";
let pendingDeleteValidationIndex = null;
let pendingAppMessageAction = null;
let invoiceBeingViewed = null;
let editingInvoiceId = null;
let invoicePage = 1;
let invoicePageSize = 15;
let invoiceSort = { key: "date", direction: "desc" };
let lastProcessSummary = { total: 0, correct: 0, warnings: 0, errors: 0 };
let activePreview = { type: "", source: "", fileName: "", zoom: 100, fitMode: "width", pageCount: 0 };
let previewDrag = { active: false, startX: 0, startY: 0, scrollLeft: 0, scrollTop: 0 };
let appliedReportFilters = { from: "", to: "", provider: "", status: "Todos los estados", type: "monthly" };
