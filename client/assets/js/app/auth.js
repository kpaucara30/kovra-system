function renderSession() {
  document.body.dataset.admin = String(isAdminUser());
  document.getElementById("session-name").textContent = currentUser?.name || "Sin sesion";
  document.getElementById("session-email").textContent = userLoginName(currentUser) || "";
  const avatar = document.getElementById("session-avatar");
  const photo = typeof userPhotoSrc === "function" ? userPhotoSrc(currentUser) : "";
  avatar.innerHTML = photo
    ? `<img src="${escapeHtml(photo)}" alt="${escapeHtml(currentUser?.name || "Usuario")}" />`
    : escapeHtml(initials(currentUser?.name || "Usuario"));
}

async function startSession() {
  document.body.classList.remove("booting");
  document.getElementById("app-loading-screen")?.classList.add("hidden");
  document.body.classList.remove("locked");
  document.getElementById("login-screen").classList.add("hidden");
  renderSession();
  await loadSettings();
  applyPermissions();
  await Promise.all([
    canUseReports() || canEditInvoices() || roleAllows(currentUser?.role, "dashboard") ? loadInvoices() : Promise.resolve(),
    canUseReports() || canEditInvoices() || roleAllows(currentUser?.role, "dashboard") ? loadProviders() : Promise.resolve(),
    loadUsers(),
    canEditInvoices() ? renderOcrStatus() : Promise.resolve()
  ]);
  document.getElementById("batch-period").value = currentPeriod();
  setView(firstAllowedView());
  renderAll();
}

document.getElementById("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const state = document.getElementById("login-state");
  state.textContent = "Validando acceso...";
  state.classList.remove("error");

  try {
    const data = await api("/api/login", {
      method: "POST",
      body: JSON.stringify({
        username: document.getElementById("login-username").value,
        password: document.getElementById("login-password").value
      })
    });
    currentUser = data.user;
    await startSession();
  } catch (error) {
    state.textContent = error.message;
    state.classList.add("error");
  }
});

document.getElementById("toggle-login-password").addEventListener("click", () => {
  const input = document.getElementById("login-password");
  const button = document.getElementById("toggle-login-password");
  const visible = input.type === "text";
  input.type = visible ? "password" : "text";
  button.textContent = visible ? "Ver" : "Ocultar";
});

document.getElementById("recover-access").addEventListener("click", () => {
  document.getElementById("login-username").value = "admin";
  document.getElementById("login-password").value = "123456";
  document.getElementById("login-state").textContent = "Acceso recuperado: usa admin / 123456.";
  document.getElementById("login-state").classList.remove("error");
  document.getElementById("login-password").focus();
});

document.getElementById("session-menu-button").addEventListener("click", (event) => {
  event.stopPropagation();
  const menu = document.getElementById("session-menu");
  const hidden = menu.classList.toggle("hidden");
  document.getElementById("session-menu-button").setAttribute("aria-expanded", String(!hidden));
});

document.getElementById("logout-button").addEventListener("click", async () => {
  await api("/api/logout", { method: "POST", body: JSON.stringify({}) }).catch(() => {});
  currentUser = null;
  invoices = [];
  providers = [];
  users = [];
  settings = {};
  document.body.dataset.admin = "false";
  document.getElementById("session-menu").classList.add("hidden");
  document.getElementById("session-menu-button").setAttribute("aria-expanded", "false");
  document.body.classList.add("locked");
  document.getElementById("login-screen").classList.remove("hidden");
});
