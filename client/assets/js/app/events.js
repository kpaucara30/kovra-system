document.getElementById("dashboard-range").addEventListener("change", renderMonthlyChart);
document.getElementById("report-chart-year")?.addEventListener("change", renderReports);
["report-from", "report-to", "report-category"].forEach((id) => {
  document.getElementById(id)?.addEventListener("change", applyReportFilters);
});
["report-provider", "report-search"].forEach((id) => {
  document.getElementById(id)?.addEventListener("input", applyReportFilters);
});
document.getElementById("export-csv").addEventListener("click", exportCsv);
document.getElementById("export-pdf").addEventListener("click", exportPrintablePdf);
document.querySelectorAll("[data-dashboard-report-action]").forEach((button) => {
  button.addEventListener("click", () => {
    const action = button.dataset.dashboardReportAction;
    if (action === "excel") {
      exportCsv();
      return;
    }
    setView("reports");
    if (action === "pdf") exportPrintablePdf();
    if (action === "print") printReport();
  });
});
document.getElementById("report-period").addEventListener("change", () => {
  const period = document.getElementById("report-period").value;
  if (period === "current-month") {
    document.getElementById("report-from").value = `${currentPeriod()}-01`;
    document.getElementById("report-to").value = today();
  }
  if (period === "current-year") {
    document.getElementById("report-from").value = `${today().slice(0, 4)}-01-01`;
    document.getElementById("report-to").value = today();
  }
});
document.getElementById("report-clear").addEventListener("click", () => {
  document.getElementById("report-type").value = "monthly";
  document.getElementById("report-period").value = "custom";
  document.getElementById("report-from").value = "";
  document.getElementById("report-to").value = "";
  document.getElementById("report-provider").value = "";
  document.getElementById("report-category").value = "";
  document.getElementById("report-search").value = "";
  document.getElementById("report-status").value = "Todos";
  applyReportFilters();
});
document.getElementById("report-apply").addEventListener("click", applyReportFilters);
document.getElementById("toggle-report-filters").addEventListener("click", () => {
  document.getElementById("report-filter-panel").classList.toggle("hidden");
});
document.getElementById("print-report").addEventListener("click", printReport);
document.getElementById("report-table").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-report-action='view']");
  if (!button) return;
  const invoice = invoices.find((item) => item.id === button.dataset.id);
  if (invoice) openInvoiceViewModal(invoice);
});
document.querySelectorAll("[data-report-tab]").forEach((button) => {
  button.addEventListener("click", () => setReportTab(button.dataset.reportTab));
});

function closeActionMenus() {
  document.querySelectorAll(".action-menu").forEach((item) => {
    item.classList.add("hidden");
    item.removeAttribute("style");
  });
  document.querySelectorAll(".menu-trigger").forEach((item) => item.setAttribute("aria-expanded", "false"));
}

function positionActionMenu(menu, button) {
  const buttonRect = button.getBoundingClientRect();
  const menuWidth = 150;
  const menuHeight = 88;
  const margin = 8;
  const left = Math.max(margin, Math.min(window.innerWidth - menuWidth - margin, buttonRect.right - menuWidth));
  const opensUp = buttonRect.bottom + menuHeight + margin > window.innerHeight;
  const top = opensUp
    ? Math.max(margin, buttonRect.top - menuHeight - 6)
    : buttonRect.bottom + 6;

  Object.assign(menu.style, {
    position: "fixed",
    left: `${left}px`,
    right: "auto",
    top: `${top}px`,
    zIndex: "1000"
  });
}

document.addEventListener("click", (event) => {
  if (!event.target.closest(".action-menu-wrap")) {
    closeActionMenus();
  }
  if (!event.target.closest(".session-menu-wrap")) {
    document.getElementById("session-menu")?.classList.add("hidden");
    document.getElementById("session-menu-button")?.setAttribute("aria-expanded", "false");
  }
});
