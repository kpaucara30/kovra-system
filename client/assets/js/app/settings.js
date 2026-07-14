function setFieldValue(id, value) {
  const field = document.getElementById(id);
  if (field) field.value = value;
}

function setCheckedValue(id, value) {
  const field = document.getElementById(id);
  if (field) field.checked = Boolean(value);
}

function readFieldValue(id, fallback = "") {
  const field = document.getElementById(id);
  return field ? field.value : fallback;
}

function readCheckedValue(id, fallback = false) {
  const field = document.getElementById(id);
  return field ? field.checked : fallback;
}

function renderCompanyLogoPreview(value = "") {
  const preview = document.getElementById("company-logo-preview");
  if (!preview) return;
  preview.innerHTML = value
    ? `<img src="${escapeHtml(value)}" alt="Logo de la empresa" />`
    : "<span>Logo</span>";
}

function renderSettings() {
  setFieldValue("settings-company", settings.companyName || "PYME S.A.C.");
  setFieldValue("settings-ruc", settings.companyRuc || "");
  setFieldValue("settings-address", settings.companyAddress || "Av. Los Emprendedores 123, Lima");
  setFieldValue("settings-email", settings.companyEmail || "contacto@pyme.pe");
  setFieldValue("settings-phone", settings.companyPhone || "987 654 321");
  setFieldValue("settings-company-logo", settings.companyLogo || "");
  renderCompanyLogoPreview(settings.companyLogo || "");
  setFieldValue("settings-currency", settings.currency || "PEN");
  setFieldValue("settings-igv", settings.igvRate || 18);
  setFieldValue("settings-date-format", settings.dateFormat || "DD/MM/YYYY");
  setFieldValue("settings-max-file-size", settings.maxFileSizeMb || 20);
  setCheckedValue("settings-auto-backup", settings.autoBackup !== false);
  setFieldValue("settings-backup-frequency", settings.backupFrequency || "Diario");
  setFieldValue("settings-backup-time", settings.backupTime || "22:00");
  setFieldValue("settings-backup-path", settings.backupPath || "C:\\FactuIA\\Backups");
  setFieldValue("settings-session-timeout", settings.sessionTimeout || "30 minutos");
  setCheckedValue("settings-account-recovery", settings.accountRecovery !== false);
  setFieldValue("settings-login-attempts", String(settings.loginAttempts || 5));
  setCheckedValue("settings-auto-lock", settings.autoLock !== false);
  renderPermissionsTable();

  const isAdmin = canManageUsers();
  document.querySelectorAll("#settings input, #settings select, #settings button").forEach((field) => {
    if (field.id === "restore-backup-file") return;
    if (field.classList.contains("settings-tab")) return;
    field.disabled = !isAdmin;
  });
}

document.querySelectorAll("[data-settings-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.settingsTab;
    document.querySelectorAll("[data-settings-tab]").forEach((item) => {
      item.classList.toggle("active", item === button);
    });
    document.querySelectorAll("[data-settings-panel]").forEach((panel) => {
      panel.classList.toggle("active", panel.dataset.settingsPanel === target);
    });
    if (target === "roles") renderPermissionsTable();
  });
});

document.getElementById("company-logo-button")?.addEventListener("click", () => {
  document.getElementById("settings-logo-file")?.click();
});

document.getElementById("company-logo-remove")?.addEventListener("click", () => {
  setFieldValue("settings-company-logo", "");
  renderCompanyLogoPreview("");
  const file = document.getElementById("settings-logo-file");
  if (file) file.value = "";
});

document.getElementById("settings-logo-file")?.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  const state = document.getElementById("settings-state");
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    if (state) state.textContent = "Selecciona una imagen valida para el logo.";
    event.target.value = "";
    return;
  }
  if (file.size > 1024 * 1024) {
    if (state) state.textContent = "El logo debe pesar menos de 1 MB.";
    event.target.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const value = String(reader.result || "");
    setFieldValue("settings-company-logo", value);
    renderCompanyLogoPreview(value);
    if (state) state.textContent = "Logo cargado. Guarda los cambios para conservarlo.";
  };
  reader.readAsDataURL(file);
});

document.getElementById("settings-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const state = document.getElementById("settings-state");
  state.textContent = "Guardando configuracion...";

  try {
    const data = await api("/api/settings", {
      method: "PUT",
      body: JSON.stringify({
        companyName: readFieldValue("settings-company"),
        companyRuc: readFieldValue("settings-ruc"),
        companyAddress: readFieldValue("settings-address"),
        companyEmail: readFieldValue("settings-email"),
        companyPhone: readFieldValue("settings-phone"),
        companyLogo: readFieldValue("settings-company-logo"),
        currency: readFieldValue("settings-currency", "PEN"),
        igvRate: readFieldValue("settings-igv", "18"),
        dateFormat: readFieldValue("settings-date-format", "DD/MM/YYYY"),
        maxFileSizeMb: readFieldValue("settings-max-file-size", "20"),
        autoBackup: readCheckedValue("settings-auto-backup", true),
        backupFrequency: readFieldValue("settings-backup-frequency", "Diario"),
        backupTime: readFieldValue("settings-backup-time", "22:00"),
        backupPath: readFieldValue("settings-backup-path", "C:\\FactuIA\\Backups"),
        sessionTimeout: readFieldValue("settings-session-timeout", "30 minutos"),
        accountRecovery: readCheckedValue("settings-account-recovery", true),
        loginAttempts: readFieldValue("settings-login-attempts", "5"),
        autoLock: readCheckedValue("settings-auto-lock", true),
        allowedFileTypes: ["PDF", "JPG", "PNG"],
        customRoles: Array.isArray(settings.customRoles) ? settings.customRoles : []
      })
    });
    settings = data.settings || settings;
    state.textContent = "Configuracion guardada.";
    renderSettings();
  } catch (error) {
    state.textContent = error.message;
  }
});

document.getElementById("password-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const state = document.getElementById("security-state");
  state.textContent = "Cambiando contrasena...";

  try {
    await api("/api/change-password", {
      method: "POST",
      body: JSON.stringify({
        currentPassword: document.getElementById("current-password").value,
        newPassword: document.getElementById("new-password").value
      })
    });
    event.target.reset();
    state.textContent = "Contrasena actualizada correctamente.";
  } catch (error) {
    state.textContent = error.message;
  }
});

document.getElementById("export-backup").addEventListener("click", async () => {
  const state = document.getElementById("security-state");
  state.textContent = "Generando backup...";

  try {
    const data = await api("/api/backup");
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `factuia-backup-${today()}.json`;
    document.body.appendChild(link);
    link.click();
    URL.revokeObjectURL(link.href);
    link.remove();
    state.textContent = "Backup exportado.";
  } catch (error) {
    state.textContent = error.message;
  }
});

document.querySelectorAll(".backup-download").forEach((button) => {
  button.addEventListener("click", () => document.getElementById("export-backup").click());
});

document.querySelectorAll(".mini-action.danger").forEach((button) => {
  button.addEventListener("click", () => {
    document.getElementById("security-state").textContent = "La eliminacion de respaldos estara disponible cuando exista un repositorio de respaldos historicos.";
  });
});

document.querySelectorAll(".settings-outline-button").forEach((button) => {
  button.addEventListener("click", () => {
    document.getElementById("security-state").textContent = "Ya se muestran los respaldos recientes disponibles.";
  });
});

document.getElementById("restore-backup-button").addEventListener("click", () => {
  document.getElementById("restore-backup-file").click();
});

document.getElementById("restore-backup-file").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const state = document.getElementById("security-state");
  state.textContent = "Restaurando backup...";

  try {
    const text = await file.text();
    await api("/api/backup/restore", {
      method: "POST",
      body: text
    });
    await Promise.all([loadInvoices(), loadProviders(), loadUsers(), loadSettings()]);
    renderAll();
    state.textContent = "Backup restaurado correctamente.";
  } catch (error) {
    state.textContent = error.message;
  } finally {
    event.target.value = "";
  }
});
