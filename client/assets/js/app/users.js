function renderUsers() {
  const table = document.getElementById("user-table");
  if (!table) return;
  if (!canManageUsers()) {
    table.innerHTML = `<tr><td colspan="11">Tu rol no tiene permiso para gestionar usuarios.</td></tr>`;
    document.getElementById("open-user-modal").disabled = true;
    document.getElementById("user-delete-selected").disabled = true;
    return;
  }
  renderRoleControls();

  const query = (document.getElementById("user-search")?.value || "").trim().toLowerCase();
  const roleFilter = document.getElementById("user-role-filter")?.value || "Todos";
  const statusFilter = document.getElementById("user-status-filter")?.value || "Todos";
  const accessFilter = document.getElementById("user-access-filter")?.value || "Todos";
  const list = users.filter((user) => {
    const role = normalizedUserRole(user.role);
    const status = user.status || "Activo";
    const matchesQuery = [userGeneratedCode(user), user.id, userFirstNames(user), userLastNames(user), userFullName(user), userLoginName(user), user.dni, user.birthDate, user.email, role].join(" ").toLowerCase().includes(query);
    const matchesRole = roleFilter === "Todos" || role === normalizedUserRole(roleFilter);
    const matchesStatus = statusFilter === "Todos" || status === statusFilter;
    const matchesAccess = matchesUserAccessFilter(user, accessFilter);
    return matchesQuery && matchesRole && matchesStatus && matchesAccess;
  });

  renderUserMetrics();
  renderPermissionsTable();

  table.innerHTML = list.length
    ? list.map((user) => {
      const status = user.status || "Activo";
      const role = normalizedUserRole(user.role);
      const isCurrent = currentUser?.id === user.id;
      return `
        <tr>
          <td><input type="checkbox" data-user-select="${escapeHtml(user.id)}" aria-label="Seleccionar usuario" ${isCurrent ? "disabled" : ""} /></td>
          <td class="user-image-cell">${renderUserAvatar(user)}</td>
          <td><code class="user-id-cell" title="ID interno: ${escapeHtml(user.id)}">${escapeHtml(userGeneratedCode(user))}</code></td>
          <td>${escapeHtml(user.dni || "-")}</td>
          <td>${escapeHtml(userFirstNames(user))}${isCurrent ? ` <small class="self-tag">Tu</small>` : ""}</td>
          <td>${escapeHtml(userLastNames(user) || "-")}</td>
          <td><strong class="username-cell">${escapeHtml(userLoginName(user))}</strong></td>
          <td><span class="role-pill">${escapeHtml(role)}</span></td>
          <td><span class="badge ${status === "Activo" ? "ok" : "duplicate"}">${escapeHtml(status)}</span></td>
          <td class="last-access-cell">${formatUserLastAccess(user)}</td>
          <td>
            <div class="row-actions compact-actions">
              <button class="ghost-button small" data-user-action="edit" data-id="${escapeHtml(user.id)}">Editar</button>
              <div class="action-menu-wrap">
                <button class="ghost-button small menu-trigger" data-user-action="menu" data-id="${escapeHtml(user.id)}" aria-haspopup="true" aria-expanded="false">...</button>
                <div class="action-menu hidden" data-menu-for="${escapeHtml(user.id)}">
                  <button type="button" data-user-action="detail" data-id="${escapeHtml(user.id)}">Ver detalle</button>
                  <button type="button" data-user-action="photo" data-id="${escapeHtml(user.id)}">Cambiar foto</button>
                  ${userPhotoSrc(user) ? `<button type="button" data-user-action="remove-photo" data-id="${escapeHtml(user.id)}">Quitar foto</button>` : ""}
                  <button type="button" data-user-action="toggle" data-id="${escapeHtml(user.id)}">${status === "Activo" ? "Desactivar" : "Activar"}</button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      `;
    }).join("")
    : `<tr><td colspan="11">No hay usuarios con esos filtros.</td></tr>`;

  const selectAll = document.getElementById("user-select-all");
  if (selectAll) {
    selectAll.checked = false;
    selectAll.indeterminate = false;
  }
  updateUserBulkBar();

  const isAdmin = canManageUsers();
  document.getElementById("open-user-modal").disabled = !isAdmin;
  document.getElementById("user-form").querySelectorAll("input, select, button").forEach((field) => {
    field.disabled = !isAdmin;
  });
  table.querySelectorAll("button").forEach((button) => {
    button.disabled = !isAdmin;
  });
}

function renderRoleControls() {
  const roles = roleCatalog();
  const roleSelect = document.getElementById("user-role");
  const roleFilter = document.getElementById("user-role-filter");
  const currentRole = roleSelect?.value || "Contador";
  const currentFilter = roleFilter?.value || "Todos";
  if (roleSelect) {
    roleSelect.innerHTML = roles.map((role) => `<option>${escapeHtml(role.name)}</option>`).join("");
    roleSelect.value = roles.some((role) => role.name === currentRole) ? currentRole : "Contador";
  }
  if (roleFilter) {
    roleFilter.innerHTML = `<option>Todos</option>${roles.map((role) => `<option>${escapeHtml(role.name)}</option>`).join("")}`;
    roleFilter.value = roles.some((role) => role.name === currentFilter) ? currentFilter : "Todos";
  }
  renderRolePermissionChecks();
}

function normalizedUserRole(role) {
  if (role === "Contadora") return "Contador";
  return role || "Contador";
}

function initials(name) {
  const parts = String(name || "Usuario").trim().split(/\s+/);
  return parts.slice(0, 2).map((part) => part[0] || "").join("").toUpperCase() || "U";
}

function splitLegacyUserName(user) {
  const parts = String(user?.name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 2) {
    return { firstNames: parts[0] || "", lastNames: parts.slice(1).join(" ") };
  }
  return {
    firstNames: parts.slice(0, -2).join(" "),
    lastNames: parts.slice(-2).join(" ")
  };
}

function userFirstNames(user) {
  return String(user?.firstNames || splitLegacyUserName(user).firstNames || "").trim();
}

function userLastNames(user) {
  return String(user?.lastNames || splitLegacyUserName(user).lastNames || "").trim();
}

function userFullName(user) {
  return [userFirstNames(user), userLastNames(user)].filter(Boolean).join(" ") || String(user?.name || "").trim();
}

function formatUserBirthDate(value) {
  if (!value) return "-";
  const [year, month, day] = String(value).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function formatUserAccessDate(value) {
  const date = new Date(value || Date.now());
  return date.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function selectedUserIds() {
  return [...document.querySelectorAll("[data-user-select]:checked")].map((item) => item.dataset.userSelect);
}

function updateUserBulkBar() {
  const selected = selectedUserIds();
  const button = document.getElementById("user-delete-selected");
  if (!button) return;
  button.disabled = selected.length === 0 || !canManageUsers();
  button.classList.toggle("danger", selected.length > 0);
  const label = selected.length ? `Eliminar seleccionadas (${selected.length})` : "Eliminar seleccionadas";
  button.innerHTML = `<img class="invoice-button-icon" src="assets/img/eliminar.png" alt="" /><span>${label}</span>`;
}

function userIdShort(id) {
  const value = String(id || "").trim();
  return value ? value.slice(0, 8) : "sin-id";
}

function generatedUsernameFromProfile(birthDate, dni) {
  const cleanDni = String(dni || "").replace(/\D/g, "").slice(0, 8);
  const date = new Date(`${birthDate}T00:00:00`);
  if (cleanDni.length !== 8 || Number.isNaN(date.getTime())) return "";
  const year = String(date.getFullYear()).slice(-2);
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${cleanDni}${day}`;
}

function userGeneratedCode(user) {
  return generatedUsernameFromProfile(user?.birthDate, user?.dni) || "-";
}

function formatUserLastAccess(user) {
  const value = user?.lastLoginAt || user?.updatedAt || user?.createdAt;
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return `${date.toLocaleDateString("es-PE")}<br><span>${date.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}</span>`;
}

function userLastAccessDate(user) {
  const value = user?.lastLoginAt;
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function matchesUserAccessFilter(user, filter) {
  if (!filter || filter === "Todos") return true;
  const accessDate = userLastAccessDate(user);
  if (filter === "Sin acceso") return !accessDate;
  if (!accessDate) return false;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  if (filter === "Hoy") {
    return accessDate >= todayStart;
  }

  const days = Number(filter);
  if (!Number.isFinite(days)) return true;
  const from = new Date(todayStart);
  from.setDate(from.getDate() - (days - 1));
  return accessDate >= from;
}

function defaultUsernameFromName(firstNames, lastNames, birthDate) {
  const firstName = String(firstNames || "").trim().split(/\s+/)[0] || "";
  const lastNameParts = String(lastNames || "").trim().split(/\s+/).filter(Boolean);
  const firstLastName = lastNameParts[0] || "";
  const secondLastName = lastNameParts[1] || "";
  const date = new Date(`${birthDate}T00:00:00`);
  const month = Number.isNaN(date.getTime()) ? "" : String(date.getMonth() + 1);
  return slugUsername(`${firstName[0] || ""}${firstLastName}${secondLastName[0] || ""}${month}`);
}

function updateGeneratedUsername() {
  const usernameInput = document.getElementById("user-username");
  usernameInput.value = defaultUsernameFromName(
    document.getElementById("user-first-names").value,
    document.getElementById("user-last-names").value,
    document.getElementById("user-birthdate").value
  );
}

function updateGeneratedCode() {
  const codeInput = document.getElementById("user-code");
  if (!codeInput) return;
  codeInput.value = generatedUsernameFromProfile(
    document.getElementById("user-birthdate").value,
    document.getElementById("user-dni").value
  );
}

function userPhotoSrc(user) {
  const value = String(user?.photoUrl || "").trim();
  if (!value) return "";
  if (/^data:image\//i.test(value) || /^https?:\/\//i.test(value)) return value;
  return value.replace(/^\/+/, "");
}

function renderUserAvatar(user, className = "user-avatar") {
  const photo = userPhotoSrc(user);
  const name = userFullName(user);
  const label = escapeHtml(initials(name));
  return `<span class="${className}">${photo ? `<img src="${escapeHtml(photo)}" alt="${escapeHtml(name || "Usuario")}" />` : label}</span>`;
}

function renderUserPhotoPreview(value = "", name = "") {
  const preview = document.getElementById("user-photo-preview");
  if (!preview) return;
  preview.innerHTML = value
    ? `<img src="${escapeHtml(value)}" alt="Foto del trabajador" />`
    : `<span>${escapeHtml(initials(name || [document.getElementById("user-first-names")?.value, document.getElementById("user-last-names")?.value].filter(Boolean).join(" ") || "Usuario"))}</span>`;
}

function readUserPhotoFile(file) {
  const allowed = ["image/png", "image/jpeg", "image/webp"];
  if (!allowed.includes(file.type)) {
    return Promise.reject(new Error("La foto debe ser PNG, JPG o WEBP."));
  }
  if (file.size > 2 * 1024 * 1024) {
    return Promise.reject(new Error("La foto no debe superar 2 MB."));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("No se pudo leer la foto seleccionada."));
    reader.readAsDataURL(file);
  });
}

function renderUserMetrics() {
  const total = users.length;
  const active = users.filter((user) => (user.status || "Activo") === "Activo").length;
  const admins = users.filter((user) => normalizedUserRole(user.role) === "Administrador").length;
  const counters = users.filter((user) => normalizedUserRole(user.role) === "Contador").length;
  document.getElementById("user-metrics").innerHTML = `
    <article class="invoice-metric purple user-summary-metric">
      <span class="invoice-metric-icon">U</span>
      <div><span>Total de usuarios</span><strong>${total}</strong><small>Usuarios registrados</small></div>
    </article>
    <article class="invoice-metric green user-summary-metric">
      <span class="invoice-metric-icon">A</span>
      <div><span>Usuarios activos</span><strong>${active}</strong><small>Cuentas activas</small></div>
    </article>
    <article class="invoice-metric blue user-summary-metric">
      <span class="invoice-metric-icon">R</span>
      <div><span>Administradores</span><strong>${admins}</strong><small>Acceso completo</small></div>
    </article>
    <article class="invoice-metric orange user-summary-metric">
      <span class="invoice-metric-icon">C</span>
      <div><span>Contadores</span><strong>${counters}</strong><small>Acceso limitado</small></div>
    </article>
  `;
}

function renderPermissionsTable() {
  const permissionsTable = document.getElementById("permissions-table");
  const availableRoleUsers = document.getElementById("available-role-users");
  if (!permissionsTable || !availableRoleUsers) return;
  const roles = roleCatalog();
  permissionsTable.innerHTML = `
    <table class="permissions-table">
      <thead>
        <tr>
          <th>Modulo</th>
          ${roles.map((role) => `<th><span class="role-head">${escapeHtml(role.name)}<small>${escapeHtml(role.description)}</small></span></th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${permissionOptions.map((permission) => `
          <tr>
            <td>${escapeHtml(permission.label)}</td>
            ${roles.map((role) => {
              const allowed = role.permissions.includes(permission.id);
              return `<td><span class="permission ${allowed ? "yes" : "no"}">${allowed ? "&#10003;" : "&#215;"}</span></td>`;
            }).join("")}
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  const groupedUsers = roles.map((role) => {
    const roleUsers = users.filter((user) => normalizedUserRole(user.role) === normalizedUserRole(role.name));
    return `
      <article>
        <div>
          <strong>${escapeHtml(role.name)}</strong>
          <span>${roleUsers.length} usuario${roleUsers.length === 1 ? "" : "s"} disponible${roleUsers.length === 1 ? "" : "s"}</span>
        </div>
        <div class="available-user-list">
          ${roleUsers.length ? roleUsers.map((user) => `
            <span><b>${userPhotoSrc(user) ? `<img src="${escapeHtml(userPhotoSrc(user))}" alt="${escapeHtml(userFullName(user))}" />` : escapeHtml(initials(userFullName(user)))}</b>${escapeHtml(userFullName(user))} <small>@${escapeHtml(userLoginName(user))}</small></span>
          `).join("") : "<em>Sin usuarios asignados</em>"}
        </div>
      </article>
    `;
  }).join("");
  availableRoleUsers.innerHTML = groupedUsers;
}

function renderRolePermissionChecks() {
  const container = document.getElementById("role-permission-checks");
  if (!container) return;
  container.innerHTML = permissionOptions.map((permission) => `
    <label class="permission-check">
      <input type="checkbox" value="${escapeHtml(permission.id)}" />
      <span>${escapeHtml(permission.label)}</span>
    </label>
  `).join("");
}

function openUserModal() {
  const form = document.getElementById("user-form");
  form.reset();
  form.dataset.mode = "create";
  delete form.dataset.userId;
  delete form.dataset.photoRemoved;
  document.getElementById("user-modal-title").textContent = "Nuevo usuario";
  document.getElementById("save-user-button").textContent = "Guardar usuario";
  document.getElementById("user-password").placeholder = "Ingresa la contrasena";
  document.getElementById("user-password-confirm").placeholder = "Confirma la contrasena";
  document.getElementById("user-status").value = "Activo";
  document.getElementById("user-birthdate").value = "";
  document.getElementById("user-code").value = "";
  document.getElementById("user-username").value = "";
  document.getElementById("user-state").classList.add("hidden");
  document.getElementById("user-state").textContent = "";
  document.getElementById("user-password").type = "password";
  document.getElementById("user-password-confirm").type = "password";
  document.getElementById("toggle-user-password").textContent = "Ver";
  document.getElementById("toggle-user-password-confirm").textContent = "Ver";
  document.getElementById("user-photo-data").value = "";
  document.getElementById("user-photo-file").value = "";
  renderUserPhotoPreview("");
  updateSelectedRoleInfo();
  document.getElementById("user-modal").classList.remove("hidden");
  document.getElementById("user-first-names").focus();
}

function openEditUserModal(user) {
  const form = document.getElementById("user-form");
  form.reset();
  form.dataset.mode = "edit";
  form.dataset.userId = user.id;
  delete form.dataset.photoRemoved;
  document.getElementById("user-modal-title").textContent = "Editar usuario";
  document.getElementById("save-user-button").textContent = "Guardar cambios";
  document.getElementById("user-first-names").value = userFirstNames(user);
  document.getElementById("user-last-names").value = userLastNames(user);
  document.getElementById("user-dni").value = user.dni || "";
  document.getElementById("user-birthdate").value = user.birthDate || "";
  document.getElementById("user-code").value = userGeneratedCode(user);
  document.getElementById("user-username").value = userLoginName(user);
  document.getElementById("user-email").value = user.email || "";
  document.getElementById("user-role").value = normalizedUserRole(user.role);
  document.getElementById("user-status").value = user.status || "Activo";
  document.getElementById("user-password").value = user.password || "";
  document.getElementById("user-password-confirm").value = user.password || "";
  document.getElementById("user-password").placeholder = "Contrasena del usuario";
  document.getElementById("user-password-confirm").placeholder = "Confirma la contrasena";
  document.getElementById("user-password").type = "password";
  document.getElementById("user-password-confirm").type = "password";
  document.getElementById("toggle-user-password").textContent = "Ver";
  document.getElementById("toggle-user-password-confirm").textContent = "Ver";
  document.getElementById("user-photo-data").value = "";
  document.getElementById("user-photo-file").value = "";
  renderUserPhotoPreview(userPhotoSrc(user), userFullName(user));
  document.getElementById("user-state").classList.add("hidden");
  document.getElementById("user-state").textContent = "";
  updateSelectedRoleInfo();
  document.getElementById("user-modal").classList.remove("hidden");
  document.getElementById("user-first-names").focus();
}

function closeUserModal() {
  document.getElementById("user-modal").classList.add("hidden");
}

function updateSelectedRoleInfo() {
  const role = document.getElementById("user-role").value;
  document.getElementById("selected-role-info").textContent = role === "Administrador"
    ? "Administrador: Acceso completo a todas las funcionalidades del sistema."
    : "Contador: Puede procesar, validar, consultar facturas y generar reportes.";
}

document.getElementById("open-user-modal").addEventListener("click", openUserModal);

document.getElementById("close-user-modal").addEventListener("click", closeUserModal);
document.getElementById("cancel-user-modal").addEventListener("click", closeUserModal);
document.getElementById("user-modal").addEventListener("click", (event) => {
  if (event.target.id === "user-modal") closeUserModal();
});
document.getElementById("user-role").addEventListener("change", updateSelectedRoleInfo);
document.getElementById("toggle-role-builder").addEventListener("click", () => {
  const form = document.getElementById("role-builder-form");
  form.classList.toggle("hidden");
  if (!form.classList.contains("hidden")) {
    form.reset();
    document.getElementById("role-builder-state").classList.add("hidden");
    document.getElementById("role-builder-name").focus();
  }
});
document.getElementById("cancel-role-builder").addEventListener("click", () => {
  document.getElementById("role-builder-form").classList.add("hidden");
});
document.getElementById("user-first-names").addEventListener("input", () => {
  updateGeneratedUsername();
  if (!document.getElementById("user-photo-data").value) {
    renderUserPhotoPreview("");
  }
});
document.getElementById("user-last-names").addEventListener("input", () => {
  updateGeneratedUsername();
  if (!document.getElementById("user-photo-data").value) {
    renderUserPhotoPreview("");
  }
});
document.getElementById("user-birthdate").addEventListener("input", () => {
  updateGeneratedUsername();
  updateGeneratedCode();
});
document.getElementById("user-dni").addEventListener("input", (event) => {
  event.target.value = event.target.value.replace(/\D/g, "").slice(0, 8);
  updateGeneratedCode();
});
document.getElementById("user-photo-button").addEventListener("click", () => {
  document.getElementById("user-photo-file").click();
});
document.getElementById("user-photo-remove").addEventListener("click", () => {
  const form = document.getElementById("user-form");
  document.getElementById("user-photo-file").value = "";
  document.getElementById("user-photo-data").value = "";
  if (form.dataset.mode === "edit") form.dataset.photoRemoved = "true";
  renderUserPhotoPreview("");
});
document.getElementById("user-photo-file").addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const state = document.getElementById("user-state");
  readUserPhotoFile(file).then((value) => {
    delete document.getElementById("user-form").dataset.photoRemoved;
    document.getElementById("user-photo-data").value = value;
    renderUserPhotoPreview(value);
  }).catch((error) => {
    event.target.value = "";
    state.classList.remove("hidden");
    state.textContent = error.message;
  });
});
[
  ["toggle-user-password", "user-password"],
  ["toggle-user-password-confirm", "user-password-confirm"]
].forEach(([buttonId, inputId]) => {
  document.getElementById(buttonId).addEventListener("click", () => {
    const input = document.getElementById(inputId);
    const button = document.getElementById(buttonId);
    const visible = input.type === "text";
    input.type = visible ? "password" : "text";
    button.textContent = visible ? "Ver" : "Ocultar";
  });
});
document.getElementById("user-search").addEventListener("input", renderUsers);
document.getElementById("user-role-filter").addEventListener("change", renderUsers);
document.getElementById("user-status-filter").addEventListener("change", renderUsers);
document.getElementById("user-access-filter").addEventListener("change", renderUsers);
document.getElementById("clear-user-filters").addEventListener("click", () => {
  document.getElementById("user-search").value = "";
  document.getElementById("user-role-filter").value = "Todos";
  document.getElementById("user-status-filter").value = "Todos";
  document.getElementById("user-access-filter").value = "Todos";
  renderUsers();
});
document.getElementById("user-select-all")?.addEventListener("change", (event) => {
  document.querySelectorAll("[data-user-select]:not(:disabled)").forEach((item) => {
    item.checked = event.target.checked;
  });
  updateUserBulkBar();
});
document.getElementById("user-table")?.addEventListener("change", (event) => {
  if (!event.target.matches("[data-user-select]")) return;
  const checkboxes = [...document.querySelectorAll("[data-user-select]:not(:disabled)")];
  const checked = checkboxes.filter((item) => item.checked);
  const selectAll = document.getElementById("user-select-all");
  if (selectAll) {
    selectAll.checked = checkboxes.length > 0 && checked.length === checkboxes.length;
    selectAll.indeterminate = checked.length > 0 && checked.length < checkboxes.length;
  }
  updateUserBulkBar();
});
document.getElementById("user-delete-selected")?.addEventListener("click", () => {
  const ids = selectedUserIds().filter((id) => id !== currentUser?.id);
  if (!ids.length || !canManageUsers()) return;
  showAppMessage({
    title: "Eliminar usuarios",
    message: `Se eliminaran ${ids.length} usuario${ids.length === 1 ? "" : "s"} seleccionado${ids.length === 1 ? "" : "s"}.`,
    icon: "?",
    primaryText: "Si, eliminar",
    secondaryText: "Cancelar",
    onPrimary: async () => {
      try {
        const data = await api("/api/users/bulk-delete", {
          method: "POST",
          body: JSON.stringify({ ids })
        });
        users = data.users || users;
        renderUsers();
        renderSettings();
        showAppMessage({
          title: "Usuarios eliminados",
          message: `Se eliminaron ${data.deleted || ids.length} usuario${(data.deleted || ids.length) === 1 ? "" : "s"}.`,
          icon: "!",
          primaryText: "Entendido"
        });
      } catch (error) {
        showAppMessage({
          title: "No se pudo eliminar",
          message: error.message,
          icon: "!",
          primaryText: "Entendido"
        });
      }
    }
  });
});

document.getElementById("role-builder-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const state = document.getElementById("role-builder-state");
  state.classList.remove("hidden");
  const name = document.getElementById("role-builder-name").value.trim();
  const permissions = [...document.querySelectorAll("#role-permission-checks input:checked")].map((item) => item.value);
  if (!name) {
    state.textContent = "Escribe el nombre del actor o rol.";
    return;
  }
  if (!permissions.length) {
    state.textContent = "Selecciona al menos una seccion o funcion.";
    return;
  }
  if (roleCatalog().some((role) => normalizedUserRole(role.name).toLowerCase() === normalizedUserRole(name).toLowerCase())) {
    state.textContent = "Ya existe un rol con ese nombre.";
    return;
  }

  try {
    const customRoles = [
      ...(Array.isArray(settings.customRoles) ? settings.customRoles : []),
      { name, description: "Rol personalizado", permissions }
    ];
    const data = await api("/api/settings", {
      method: "PUT",
      body: JSON.stringify({
        ...settings,
        customRoles,
        companyName: document.getElementById("settings-company").value || settings.companyName || "PYME Lima 2026",
        companyRuc: document.getElementById("settings-ruc").value || settings.companyRuc || "",
        currency: document.getElementById("settings-currency").value || settings.currency || "PEN",
        igvRate: document.getElementById("settings-igv").value || settings.igvRate || 18
      })
    });
    settings = data.settings || settings;
    state.textContent = "Actor creado correctamente.";
    event.target.reset();
    event.target.classList.add("hidden");
    renderUsers();
    renderSettings();
  } catch (error) {
    state.textContent = error.message;
  }
});

document.getElementById("user-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target;
  const state = document.getElementById("user-state");
  state.classList.remove("hidden");
  const isEdit = form.dataset.mode === "edit";
  const targetUser = isEdit ? users.find((item) => item.id === form.dataset.userId) : null;
  if (isEdit && !targetUser) {
    state.textContent = "No se encontro el usuario que quieres editar.";
    return;
  }
  updateGeneratedUsername();
  updateGeneratedCode();
  const password = document.getElementById("user-password").value;
  const confirmPassword = document.getElementById("user-password-confirm").value;
  const username = slugUsername(document.getElementById("user-username").value);
  const dni = document.getElementById("user-dni").value.trim();
  const birthDate = document.getElementById("user-birthdate").value;
  const firstNames = document.getElementById("user-first-names").value.trim();
  const lastNames = document.getElementById("user-last-names").value.trim();
  if (!firstNames || !lastNames || !dni || !birthDate || !username || !document.getElementById("user-email").value.trim()) {
    state.textContent = "No se puede guardar: completa nombres, apellidos, DNI, fecha de nacimiento, usuario y correo. Los usuarios antiguos con fecha vacia deben completarse antes de actualizar la tabla.";
    showAppMessage({
      title: "Faltan datos",
      message: "Completa nombres, apellidos, DNI, fecha de nacimiento, usuario y correo. Si el usuario aparece con fecha '-', agrega su fecha para que los cambios se registren.",
      icon: "!",
      primaryText: "Entendido"
    });
    return;
  }
  if (!/^\d{8}$/.test(dni)) {
    state.textContent = "No se puede guardar: el DNI debe tener 8 digitos.";
    showAppMessage({
      title: "DNI invalido",
      message: "Ingresa un DNI valido de 8 digitos.",
      icon: "!",
      primaryText: "Entendido"
    });
    return;
  }
  if (users.some((item) => item.id !== targetUser?.id && String(item.dni || "") === dni)) {
    state.textContent = "No se puede guardar: ya existe un usuario con ese DNI.";
    showAppMessage({
      title: "DNI duplicado",
      message: "Ya existe un usuario registrado con ese DNI.",
      icon: "!",
      primaryText: "Entendido"
    });
    return;
  }
  if ((!isEdit || password) && password.length < 6) {
    state.textContent = "No se puede guardar: la contrasena debe tener minimo 6 caracteres.";
    showAppMessage({
      title: "Contrasena muy corta",
      message: "No se puede guardar porque la contrasena debe tener minimo 6 caracteres.",
      icon: "!",
      primaryText: "Entendido"
    });
    return;
  }
  if (password !== confirmPassword) {
    state.textContent = "No se puede guardar: las contrasenas no coinciden.";
    showAppMessage({
      title: "Contrasenas diferentes",
      message: "No se puede guardar porque la contrasena y su confirmacion no coinciden.",
      icon: "!",
      primaryText: "Entendido"
    });
    return;
  }
  state.textContent = isEdit ? "Guardando cambios..." : "Creando usuario...";

  try {
    const payload = {
      ...(targetUser || {}),
      firstNames,
      lastNames,
      name: [firstNames, lastNames].join(" "),
      dni,
      birthDate,
      birthdate: birthDate,
      username,
      email: document.getElementById("user-email").value,
      role: document.getElementById("user-role").value,
      status: document.getElementById("user-status").value,
      photoData: document.getElementById("user-photo-data").value,
      photoRemoved: form.dataset.photoRemoved === "true"
    };
    if (password) payload.password = password;

    const data = await api(isEdit ? `/api/users/${targetUser.id}` : "/api/users", {
      method: isEdit ? "PUT" : "POST",
      body: JSON.stringify(payload)
    });
    users = data.users || users;
    await loadUsers();
    if (currentUser?.id === data.user?.id) {
      currentUser = data.user;
      renderSession();
    }
    event.target.reset();
    state.textContent = isEdit ? "Usuario actualizado correctamente." : "Usuario creado correctamente.";
    closeUserModal();
    renderUsers();
  } catch (error) {
    state.classList.remove("hidden");
    state.textContent = error.message;
    showAppMessage({
      title: isEdit ? "No se pudo actualizar" : "No se pudo crear",
      message: error.message,
      icon: "!",
      primaryText: "Entendido"
    });
  }
});

document.getElementById("user-table").addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-user-action]");
  if (!button || !canManageUsers()) return;

  const user = users.find((item) => item.id === button.dataset.id);
  if (!user) return;
  const state = document.getElementById("user-state");

  if (button.dataset.userAction === "menu") {
    const menu = [...document.querySelectorAll(".action-menu")].find((item) => item.dataset.menuFor === user.id);
    const isHidden = menu?.classList.contains("hidden");
    closeActionMenus();
    if (menu && isHidden) {
      positionActionMenu(menu, button);
      menu.classList.remove("hidden");
      button.setAttribute("aria-expanded", "true");
    }
    return;
  }

  closeActionMenus();

  if (button.dataset.userAction === "edit") {
    openEditUserModal(user);
    return;
  }

  if (button.dataset.userAction === "detail") {
    showAppMessage({
      title: "Detalle del usuario",
      message: `${userFullName(user)} | DNI: ${user.dni || "-"} | Usuario: ${userLoginName(user)} | Correo: ${user.email} | Rol: ${normalizedUserRole(user.role)} | Estado: ${user.status || "Activo"}`,
      icon: "i",
      primaryText: "Cerrar"
    });
    return;
  }

  if (button.dataset.userAction === "photo") {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/webp";
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        state.classList.remove("hidden");
        state.textContent = "Guardando foto...";
        const photoData = await readUserPhotoFile(file);
        const data = await api(`/api/users/${user.id}`, {
          method: "PUT",
          body: JSON.stringify({ ...user, photoData })
        });
        users = data.users || users;
        if (currentUser?.id === user.id) {
          currentUser = data.user || currentUser;
          renderSession();
        }
        state.textContent = "Foto actualizada correctamente.";
        renderUsers();
      } catch (error) {
        state.classList.remove("hidden");
        state.textContent = error.message;
      }
    }, { once: true });
    input.click();
    return;
  }

  if (button.dataset.userAction === "remove-photo") {
    try {
      state.classList.remove("hidden");
      state.textContent = "Quitando foto...";
      const data = await api(`/api/users/${user.id}`, {
        method: "PUT",
        body: JSON.stringify({ ...user, photoRemoved: true })
      });
      users = data.users || users;
      if (currentUser?.id === user.id) {
        currentUser = data.user || currentUser;
        renderSession();
      }
      state.textContent = "Foto quitada correctamente.";
      renderUsers();
    } catch (error) {
      state.textContent = error.message;
    }
    return;
  }

  try {
    let payload = { ...user };
    if (button.dataset.userAction === "toggle") {
      payload.status = user.status === "Activo" ? "Inactivo" : "Activo";
    }

    const data = await api(`/api/users/${user.id}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    users = data.users || users;
    state.textContent = "Usuario actualizado correctamente.";
    renderUsers();
  } catch (error) {
    state.textContent = error.message;
  }
});
