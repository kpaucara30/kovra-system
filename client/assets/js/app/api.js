async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: options.body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    credentials: "same-origin",
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || "No se pudo completar la operacion.");
  }
  return data;
}

async function loadInvoices() {
  const data = await api("/api/invoices");
  invoices = data.invoices || [];

  if (!invoices.length) {
    try {
      const legacyInvoices = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (Array.isArray(legacyInvoices) && legacyInvoices.length) {
        invoices = legacyInvoices;
        await saveInvoices();
      }
    } catch {
      // Legacy browser data is optional.
    }
  }
}

async function saveInvoices() {
  const data = await api("/api/invoices", {
    method: "PUT",
    body: JSON.stringify({ invoices })
  });
  invoices = data.invoices || invoices;
}

async function loadUsers() {
  if (!canManageUsers()) {
    users = currentUser ? [currentUser] : [];
    return;
  }
  const data = await api("/api/users");
  users = data.users || [];
}

async function loadProviders() {
  const data = await api("/api/providers");
  providers = data.providers || [];
}

async function loadSettings() {
  const data = await api("/api/settings");
  settings = data.settings || {};
}

function isAdminUser(user = currentUser) {
  return normalizedUserRole(user?.role) === "Administrador";
}

function canManageUsers() {
  return isAdminUser();
}

function canEditInvoices() {
  return roleAllows(currentUser?.role, "upload") || roleAllows(currentUser?.role, "validate") || roleAllows(currentUser?.role, "trash");
}

function canUseReports() {
  return roleAllows(currentUser?.role, "invoices") || roleAllows(currentUser?.role, "reports") || roleAllows(currentUser?.role, "activity");
}

function userLoginName(user) {
  return String(user?.username || user?.email || user?.name || "").trim();
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

function roleCatalog() {
  const customRoles = Array.isArray(settings.customRoles) ? settings.customRoles : [];
  const map = new Map();
  [...defaultRoleCatalog, ...customRoles].forEach((role) => {
    const name = String(role.name || "").trim();
    if (!name) return;
    map.set(name, {
      name,
      description: role.description || (role.locked ? "Rol del sistema" : "Rol personalizado"),
      locked: Boolean(role.locked),
      permissions: Array.isArray(role.permissions) ? role.permissions : []
    });
  });
  return [...map.values()];
}

function roleAllows(roleName, permissionId) {
  const normalized = normalizedUserRole(roleName);
  if (currentUser && normalizedUserRole(currentUser.role) === normalized && Array.isArray(currentUser.permissions)) {
    return currentUser.permissions.includes(permissionId);
  }
  const role = roleCatalog().find((item) => normalizedUserRole(item.name) === normalized);
  return Boolean(role?.permissions?.includes(permissionId));
}

function canAccessView(viewId) {
  if (["users", "trash"].includes(viewId)) {
    return isAdminUser();
  }
  const permission = viewPermissions[viewId];
  return !permission || roleAllows(currentUser?.role, permission);
}

function firstAllowedView() {
  return Object.keys(viewPermissions).find((viewId) => {
    const view = document.getElementById(viewId);
    return view && canAccessView(viewId);
  }) || "dashboard";
}

function companyProfile() {
  return {
    name: String(settings.companyName || "PYME S.A.C.").trim(),
    ruc: String(settings.companyRuc || "").trim(),
    address: String(settings.companyAddress || "").trim(),
    email: String(settings.companyEmail || "").trim(),
    phone: String(settings.companyPhone || "").trim(),
    logo: String(settings.companyLogo || "").trim()
  };
}

function companyDetailLines() {
  const company = companyProfile();
  return [
    company.ruc ? `RUC: ${company.ruc}` : "",
    company.address,
    company.email ? `Correo: ${company.email}` : "",
    company.phone ? `Telefono: ${company.phone}` : ""
  ].filter(Boolean);
}

function money(value) {
  const amount = Number(value) || 0;
  return `S/ ${amount.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function roundMoney(value) {
  return Number((Number(value) || 0).toFixed(2));
}

function igvRate() {
  return (Number(settings.igvRate) || 18) / 100;
}

function formatDate(dateValue) {
  if (!dateValue) return "";
  const [year, month, day] = dateValue.split("-");
  return `${day}/${month}/${year}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function currentPeriod() {
  return today().slice(0, 7);
}

function invoicePeriod(invoice) {
  return invoice.period || String(invoice.date || "").slice(0, 7) || currentPeriod();
}

function formatPeriod(period) {
  if (!period) return "";
  const [year, month] = period.split("-");
  return month && year ? `${month}/${year}` : period;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
