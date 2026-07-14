async function initApp() {
  document.body.classList.add("locked");
  document.getElementById("batch-period").value = currentPeriod();

  try {
    const data = await api("/api/me");
    if (data.user) {
      currentUser = data.user;
      await startSession();
      return;
    }
  } catch {
    // Keep the login screen visible.
  }

  document.body.classList.remove("booting");
  document.getElementById("app-loading-screen")?.classList.add("hidden");
  document.getElementById("login-screen").classList.remove("hidden");
  renderAll();
}

initApp();
