(() => {
  "use strict";
  const STORAGE_KEY = "ff-control-demo-v1";
  const defaults = {
    fov: 70, headshot: 52, running: false,
    toggles: { aimBot: false, aimLine: true, boxEsp: true, lineEsp: true, healthBar: true, nameTag: true, distanceTag: false }
  };
  const definitions = [
    { id: "aimBot", name: "Aim Bot", description: "Head or neck targeting preview", icon: "⊕", group: "aim" },
    { id: "aimLine", name: "Aim Line", description: "Line to selected target (demo)", icon: "／", group: "aim" },
    { id: "boxEsp", name: "Box ESP", description: "Bounding box preview", icon: "⬚", group: "esp" },
    { id: "lineEsp", name: "Line ESP", description: "Tracer overlay preview", icon: "／", group: "esp" },
    { id: "healthBar", name: "Health Bar", description: "Health status preview", icon: "▤", group: "esp" },
    { id: "nameTag", name: "Name Tag", description: "Display demo name", icon: "◆", group: "esp" },
    { id: "distanceTag", name: "Distance Tag", description: "Demo distance indicator", icon: "▤", group: "esp" }
  ];
  const $ = id => document.getElementById(id);
  let state = loadState();
  let logs = [];
  let toastTimer = null;

  function cloneDefaults() { return JSON.parse(JSON.stringify(defaults)); }
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return cloneDefaults();
      const parsed = JSON.parse(raw);
      return {
        fov: clamp(Number(parsed.fov) || defaults.fov, 1, 100),
        headshot: clamp(Number(parsed.headshot) || defaults.headshot, 1, 100),
        running: false, // Always start safely stopped after a relaunch.
        toggles: { ...defaults.toggles, ...(parsed.toggles || {}) }
      };
    } catch (error) {
      console.warn("Could not load saved settings", error);
      return cloneDefaults();
    }
  }
  function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ fov: state.fov, headshot: state.headshot, toggles: state.toggles }));
    } catch (error) {
      console.warn("Settings could not be saved", error);
      showToast("Settings changed, but could not be saved on this device.");
    }
  }
  function showToast(message) {
    const el = $("toast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2400);
  }
  function timestamp() {
    return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date());
  }
  function addLog(message) {
    logs.unshift({ time: timestamp(), message });
    if (logs.length > 250) logs.length = 250;
    renderLogs();
  }
  function renderSettings() {
    $("fov").value = state.fov;
    $("headshot").value = state.headshot;
    $("fovValue").value = `${state.fov}%`;
    $("headshotValue").value = `${state.headshot}%`;
    definitions.forEach(def => {
      const sw = document.querySelector(`[data-toggle="${def.id}"]`);
      if (!sw) return;
      sw.setAttribute("aria-checked", String(Boolean(state.toggles[def.id])));
      sw.closest(".setting-row").classList.toggle("is-off", !state.toggles[def.id]);
    });
    $("startButton").classList.toggle("running", state.running);
    $("startIcon").textContent = state.running ? "■" : "▶";
    $("startText").textContent = state.running ? "Stop Demo" : "Start Demo";
    $("startButton").setAttribute("aria-pressed", String(state.running));
    const safe = !state.running;
    $("securityChip").textContent = safe ? "SAFE MODE" : "DEMO ACTIVE";
    $("securityChip").classList.toggle("warning", !safe);
    $("securityState").textContent = safe ? "LOCAL-ONLY · NO GAME CONNECTION" : "SIMULATION RUNNING · LOCAL ONLY";
    $("integrityText").textContent = safe ? "Local settings loaded" : "Demo simulation is active";
    $("integrityResult").textContent = safe ? "OK" : "MONITORING";
    $("safeModeButton").textContent = safe ? "Safe Mode Enabled" : "Stop Demo & Enable Safe Mode";
    $("safeModeButton").disabled = safe;
  }
  function renderLogs() {
    const container = $("logEntries");
    container.replaceChildren();
    logs.forEach(entry => {
      const row = document.createElement("div");
      row.className = "log-entry";
      const time = document.createElement("span");
      time.className = "log-time";
      time.textContent = `[${entry.time}]`;
      const message = document.createElement("span");
      message.className = "log-message";
      message.textContent = entry.message;
      row.append(time, message);
      container.append(row);
    });
    $("emptyLogs").hidden = logs.length > 0;
    $("logCount").hidden = logs.length === 0;
    $("logCount").textContent = String(logs.length);
  }
  function createSetting(def) {
    const row = document.createElement("div");
    row.className = "setting-row";
    row.innerHTML = `<div class="icon-tile" aria-hidden="true"></div>
      <div class="setting-copy"><h2 class="setting-name"></h2><p class="setting-description"></p></div>
      <button class="switch" type="button" role="switch"></button>`;
    row.querySelector(".icon-tile").textContent = def.icon;
    row.querySelector(".setting-name").textContent = def.name;
    row.querySelector(".setting-description").textContent = def.description;
    const sw = row.querySelector(".switch");
    sw.dataset.toggle = def.id;
    sw.setAttribute("aria-label", def.name);
    sw.addEventListener("click", () => {
      state.toggles[def.id] = !state.toggles[def.id];
      saveState();
      renderSettings();
      addLog(`${def.name} ${state.toggles[def.id] ? "enabled" : "disabled"}`);
    });
    return row;
  }
  function setupSettings() {
    definitions.filter(d => d.group === "aim").forEach(d => $("aimOptions").append(createSetting(d)));
    definitions.filter(d => d.group === "esp").forEach(d => $("espOptions").append(createSetting(d)));
  }
  function showTab(which) {
    const isLog = which === "log";
    $("menuView").hidden = isLog;
    $("logView").hidden = !isLog;
    $("menuTab").classList.toggle("active", !isLog);
    $("logTab").classList.toggle("active", isLog);
    $("menuTab").setAttribute("aria-selected", String(!isLog));
    $("logTab").setAttribute("aria-selected", String(isLog));
    if (isLog) renderLogs();
  }
  function resetAll() {
    state = cloneDefaults();
    saveState();
    renderSettings();
    addLog("Settings reset to defaults");
    showToast("Settings reset.");
  }

  setupSettings();
  renderSettings();
  renderLogs();

  $("fov").addEventListener("input", event => {
    state.fov = Number(event.target.value);
    $("fovValue").value = `${state.fov}%`;
    saveState();
  });
  $("fov").addEventListener("change", () => addLog(`FOV set to ${state.fov}%`));
  $("headshot").addEventListener("input", event => {
    state.headshot = Number(event.target.value);
    $("headshotValue").value = `${state.headshot}%`;
    saveState();
  });
  $("headshot").addEventListener("change", () => addLog(`Headshot set to ${state.headshot}%`));
  $("menuTab").addEventListener("click", () => showTab("menu"));
  $("logTab").addEventListener("click", () => showTab("log"));
  $("startButton").addEventListener("click", () => {
    state.running = !state.running;
    renderSettings();
    addLog(state.running ? "Demo started" : "Demo stopped");
    showToast(state.running ? "Demo started. Settings are local only." : "Demo stopped.");
  });
  $("resetButton").addEventListener("click", resetAll);
  $("safeModeButton").addEventListener("click", () => {
    state.running = false;
    state.toggles = { ...defaults.toggles };
    saveState();
    renderSettings();
    addLog("Safe Mode enabled: demo stopped and simulated toggles reset");
    showToast("Safe Mode enabled. Demo simulation stopped.");
  });
  $("clearLogs").addEventListener("click", () => {
    logs = [];
    renderLogs();
    showToast("Activity log cleared.");
  });

  // Keep the simulated status clock current without relying on external services.
  function updateClock() {
    $("clock").textContent = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date());
  }
  updateClock();
  setInterval(updateClock, 30000);
  addLog("FF Control Demo initialized");
})();