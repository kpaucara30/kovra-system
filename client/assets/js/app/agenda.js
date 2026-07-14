function daysFromToday(dateValue) {
  if (!dateValue) return null;
  const start = new Date(`${today()}T00:00:00`);
  const target = new Date(`${dateValue}T00:00:00`);
  return Math.round((target - start) / 86400000);
}

function agendaCard(invoice) {
  const days = daysFromToday(invoice.dueDate);
  const dueText = invoice.dueDate
    ? days < 0 ? `Vencio hace ${Math.abs(days)} dias` : days === 0 ? "Vence hoy" : `Vence en ${days} dias`
    : "Sin fecha limite";
  return `
    <article>
      <strong>${escapeHtml(invoice.number || invoice.provider)}</strong>
      <span>${escapeHtml(invoice.provider || "Proveedor")} - ${money(invoice.total)}</span>
      <small>${escapeHtml(dueText)} - ${escapeHtml(invoice.priority || "Normal")} - ${escapeHtml(invoice.status)}</small>
      <button class="ghost-button small" data-agenda-id="${escapeHtml(invoice.id)}">Abrir</button>
    </article>
  `;
}

function renderAgenda() {
  const overdueContainer = document.getElementById("agenda-overdue");
  const upcomingContainer = document.getElementById("agenda-upcoming");
  const priorityContainer = document.getElementById("agenda-priority");
  if (!overdueContainer || !upcomingContainer || !priorityContainer) return;

  const open = activeInvoices().filter((invoice) => invoice.status !== "Validado");
  const overdue = open
    .filter((invoice) => invoice.dueDate && daysFromToday(invoice.dueDate) < 0)
    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));
  const upcoming = open
    .filter((invoice) => {
      const days = daysFromToday(invoice.dueDate);
      return days !== null && days >= 0 && days <= 7;
    })
    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));
  const priority = open
    .filter((invoice) => invoice.priority === "Alta")
    .sort((a, b) => String(a.dueDate || "9999").localeCompare(String(b.dueDate || "9999")));

  overdueContainer.innerHTML = overdue.length ? overdue.map(agendaCard).join("") : `<div class="preview-empty compact">Sin vencidas.</div>`;
  upcomingContainer.innerHTML = upcoming.length ? upcoming.map(agendaCard).join("") : `<div class="preview-empty compact">Sin proximas.</div>`;
  priorityContainer.innerHTML = priority.length ? priority.map(agendaCard).join("") : `<div class="preview-empty compact">Sin prioridad alta.</div>`;
}
