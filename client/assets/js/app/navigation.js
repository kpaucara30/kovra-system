function setView(viewId) {
  if (!canAccessView(viewId)) {
    const fallback = firstAllowedView();
    if (fallback !== viewId) setView(fallback);
    return;
  }

  const item = document.querySelector(`.nav-item[data-view="${viewId}"]`);
  if (item?.disabled) return;

  document.body.dataset.view = viewId;

  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("active-view", view.id === viewId);
  });

  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.view === viewId);
  });

  document.getElementById("page-title").textContent = titles[viewId] || "FactuIA";
  renderAll();
}
