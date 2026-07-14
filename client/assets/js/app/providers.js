function renderProviders() {
  const table = document.getElementById("provider-table");
  if (!table) return;
  const query = (document.getElementById("provider-search")?.value || "").trim().toLowerCase();
  const list = providers.filter((provider) => [provider.ruc, provider.name, provider.category, provider.contact, provider.email]
    .join(" ")
    .toLowerCase()
    .includes(query));

  table.innerHTML = list.length
    ? list.map((provider) => `
      <tr>
        <td>${escapeHtml(provider.ruc || "Sin RUC")}</td>
        <td>${escapeHtml(provider.name)}</td>
        <td>${escapeHtml(provider.category || "Servicios")}</td>
        <td>${escapeHtml(provider.contact || provider.email || "-")}</td>
        <td><span class="badge ${provider.status === "Activo" ? "ok" : "pending"}">${escapeHtml(provider.status || "Activo")}</span></td>
        <td>
          <div class="row-actions">
            <button class="ghost-button small" data-provider-action="edit" data-id="${escapeHtml(provider.id)}">Editar</button>
            <button class="ghost-button small danger" data-provider-action="toggle" data-id="${escapeHtml(provider.id)}">${provider.status === "Activo" ? "Desactivar" : "Activar"}</button>
          </div>
        </td>
      </tr>
    `).join("")
    : `<tr><td colspan="6">No hay proveedores registrados.</td></tr>`;

  document.getElementById("provider-form").querySelectorAll("input, button").forEach((field) => {
    field.disabled = !canEditInvoices();
  });
}

document.getElementById("provider-search").addEventListener("input", renderProviders);

document.getElementById("provider-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const state = document.getElementById("provider-state");
  state.textContent = "Guardando proveedor...";

  try {
    const data = await api("/api/providers", {
      method: "POST",
      body: JSON.stringify({
        ruc: document.getElementById("provider-ruc").value,
        name: document.getElementById("provider-name").value,
        category: document.getElementById("provider-category").value,
        contact: document.getElementById("provider-contact").value,
        phone: document.getElementById("provider-phone").value,
        email: document.getElementById("provider-email").value
      })
    });
    providers = data.providers || providers;
    event.target.reset();
    document.getElementById("provider-category").value = "Servicios";
    state.textContent = "Proveedor guardado.";
    renderProviders();
  } catch (error) {
    state.textContent = error.message;
  }
});

document.getElementById("provider-table").addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-provider-action]");
  if (!button || !canEditInvoices()) return;
  const provider = providers.find((item) => item.id === button.dataset.id);
  if (!provider) return;
  const state = document.getElementById("provider-state");

  try {
    let payload = { ...provider };
    if (button.dataset.providerAction === "edit") {
      const name = prompt("Razon social", provider.name);
      if (name === null) return;
      const category = prompt("Categoria", provider.category || "Servicios");
      if (category === null) return;
      payload = { ...payload, name, category };
    }
    if (button.dataset.providerAction === "toggle") {
      payload.status = provider.status === "Activo" ? "Inactivo" : "Activo";
    }
    const data = await api(`/api/providers/${provider.id}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    providers = data.providers || providers;
    state.textContent = "Proveedor actualizado.";
    renderProviders();
  } catch (error) {
    state.textContent = error.message;
  }
});
