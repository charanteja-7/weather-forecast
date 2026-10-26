const GEOCODING_API = "https://geocoding-api.open-meteo.com/v1/search";
const LOCAL_SEARCH_API = "https://nominatim.openstreetmap.org/search";
const REVERSE_API = "https://nominatim.openstreetmap.org/reverse";
const FORECAST_API = "https://api.open-meteo.com/v1/forecast";
const DEFAULT_LOCATION = { name: "Bengaluru", admin1: "Karnataka", country: "India", latitude: 12.97194, longitude: 77.59369 };
const state = { unit: localStorage.getItem("atmos-unit") || "metric", location: getLocationFromUrl() || DEFAULT_LOCATION, weather: null, suggestions: [], activeSuggestion: -1, searchController: null, forecastController: null };
const elements = {
  content: document.querySelector("#forecast-content"), locationName: document.querySelector("#location-name"), locationContext: document.querySelector("#location-context"),
  searchForm: document.querySelector("#search-form"), searchInput: document.querySelector("#search-input"), searchResults: document.querySelector("#search-results"), status: document.querySelector("#status-message"),
  sidebar: document.querySelector("#sidebar"), scrim: document.querySelector("#sidebar-scrim"), menuButton: document.querySelector("#menu-button"), currentTemp: document.querySelector("#current-temp"),
  currentCondition: document.querySelector("#current-condition"), currentIcon: document.querySelector("#current-icon"), updatedTime: document.querySelector("#updated-time"), finding: document.querySelector("#weather-finding"),
  sunrise: document.querySelector("#sunrise"), sunset: document.querySelector("#sunset"), daylightProgress: document.querySelector("#daylight-progress"), chart: document.querySelector("#temperature-chart"),
  hourlyStrip: document.querySelector("#hourly-strip"), weekly: document.querySelector("#weekly-forecast"), recentList: document.querySelector("#recent-list"), weekRange: document.querySelector("#week-range")
};
const weatherCodes = { 0:["Clear sky","clear"],1:["Mostly clear","partly"],2:["Partly cloudy","partly"],3:["Overcast","cloud"],45:["Fog","fog"],48:["Rime fog","fog"],51:["Light drizzle","rain"],53:["Drizzle","rain"],55:["Heavy drizzle","rain"],56:["Freezing drizzle","rain"],57:["Freezing drizzle","rain"],61:["Light rain","rain"],63:["Rain","rain"],65:["Heavy rain","rain"],66:["Freezing rain","rain"],67:["Freezing rain","rain"],71:["Light snow","snow"],73:["Snow","snow"],75:["Heavy snow","snow"],77:["Snow grains","snow"],80:["Light showers","rain"],81:["Showers","rain"],82:["Heavy showers","rain"],85:["Snow showers","snow"],86:["Heavy snow showers","snow"],95:["Thunderstorm","storm"],96:["Thunderstorm with hail","storm"],99:["Thunderstorm with hail","storm"] };

function getLocationFromUrl() {
  const params = new URLSearchParams(location.search);
  const latitude = Number(params.get("lat"));
  const longitude = Number(params.get("lon"));
  const name = params.get("place");
  if (!name || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { name, latitude, longitude, admin1: params.get("region") || "", country: params.get("country") || "" };
}

function forecastUrl(place) {
  const params = new URLSearchParams({
    latitude: place.latitude, longitude: place.longitude,
    current: ["temperature_2m","relative_humidity_2m","apparent_temperature","is_day","precipitation","weather_code","cloud_cover","surface_pressure","wind_speed_10m","wind_direction_10m"].join(","),
    hourly: ["temperature_2m","apparent_temperature","precipitation_probability","weather_code","visibility","wind_speed_10m","relative_humidity_2m"].join(","),
    daily: ["weather_code","temperature_2m_max","temperature_2m_min","sunrise","sunset","uv_index_max","precipitation_probability_max","wind_speed_10m_max"].join(","),
    temperature_unit: state.unit === "imperial" ? "fahrenheit" : "celsius", wind_speed_unit: state.unit === "imperial" ? "mph" : "kmh", timezone: "auto", forecast_days: "7"
  });
  return `${FORECAST_API}?${params}`;
}

async function fetchJson(url, controller, timeoutMs = 12000) {
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Request failed with ${response.status}`);
    return await response.json();
  } finally { clearTimeout(timeout); }
}

async function loadWeather(place, { save = true } = {}) {
  if (state.forecastController) state.forecastController.abort();
  const controller = new AbortController();
  state.forecastController = controller;
  state.location = place;
  setLoading(true);
  hideStatus();
  updateLocationHeading(place, "Loading live weather\u2026");
  try {
    const data = await fetchJson(forecastUrl(place), controller);
    if (controller !== state.forecastController) return;
    state.weather = data;
    renderWeather(data, place);
    updateUrl(place);
    if (save) saveRecent(place);
  } catch (error) {
    if (error.name === "AbortError") return;
    showStatus("Live weather could not be loaded. Check your connection, then try again.", true);
    elements.updatedTime.textContent = "Update failed";
  } finally {
    if (controller === state.forecastController) setLoading(false);
  }
}

function renderWeather(data, place) {
  const current = data.current;
  const unit = temperatureUnit();
  const shortUnit = state.unit === "imperial" ? "F" : "C";
  const windUnit = state.unit === "imperial" ? "mph" : "km/h";
  const condition = getWeather(current.weather_code);
  let hourlyIndex = data.hourly.time.findIndex(time => time >= current.time);
  if (hourlyIndex < 0) hourlyIndex = 0;
  const hourly = sliceHourly(data.hourly, hourlyIndex, 12);
  document.body.dataset.weather = condition.type;
  document.body.dataset.day = current.is_day === 1 ? "day" : "night";
  updateLocationHeading(place, formatLocationTime(current.time));
  elements.currentTemp.textContent = Math.round(current.temperature_2m);
  document.querySelectorAll(".temperature-unit").forEach(node => { node.textContent = unit; });
  elements.currentCondition.textContent = condition.label;
  elements.currentIcon.innerHTML = weatherIcon(condition.type, current.is_day === 1);
  elements.updatedTime.textContent = `Updated ${formatTime(current.time)}`;
  elements.finding.textContent = buildFinding(data, hourlyIndex);
  elements.sunrise.textContent = formatTime(data.daily.sunrise[0]);
  elements.sunset.textContent = formatTime(data.daily.sunset[0]);
  elements.daylightProgress.style.width = `${daylightPercentage(current.time, data.daily.sunrise[0], data.daily.sunset[0])}%`;
  setText("#feels-like", `${Math.round(current.apparent_temperature)}${unit}`);
  setText("#humidity", `${Math.round(current.relative_humidity_2m)}%`);
  setText("#wind", `${Math.round(current.wind_speed_10m)} ${windUnit}`);
  setText("#visibility", formatVisibility(data.hourly.visibility[hourlyIndex], state.unit));
  setText("#pressure", `${Math.round(current.surface_pressure)} hPa`);
  setText("#uv-index", formatUv(data.daily.uv_index_max[0]));
  renderChart(hourly, unit);
  renderHourly(hourly, unit);
  renderWeekly(data.daily, shortUnit, windUnit);
  elements.weekRange.textContent = `${formatShortDate(data.daily.time[0])} - ${formatShortDate(data.daily.time[6])}`;
}

function updateLocationHeading(place, statusText) {
  elements.locationName.textContent = place.name;
  const regionParts = [...new Set([place.locality, place.admin1, place.country].filter(Boolean))];
  elements.locationContext.textContent = [regionParts.join(", "), statusText].filter(Boolean).join(" - ");
}

function sliceHourly(hourly, start, count) {
  return Array.from({ length: count }, (_, offset) => {
    const index = Math.min(start + offset, hourly.time.length - 1);
    return { time: hourly.time[index], temperature: hourly.temperature_2m[index], precipitation: hourly.precipitation_probability[index] ?? 0, weatherCode: hourly.weather_code[index] };
  });
}

function renderChart(hours, unit) {
  const width = Math.max(300, Math.round(elements.chart.clientWidth || 720));
  const height = 174;
  const margin = { top: 12, right: 16, bottom: 28, left: 36 };
  const values = hours.map(hour => hour.temperature);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const step = Math.max(2, Math.ceil((rawMax - rawMin || 4) / 3));
  const min = Math.floor((rawMin - 1) / step) * step;
  const max = Math.ceil((rawMax + 1) / step) * step;
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const x = index => margin.left + index / (hours.length - 1) * plotWidth;
  const y = value => margin.top + (max - value) / (max - min || 1) * plotHeight;
  const ticks = Array.from({ length: 4 }, (_, index) => min + (max - min) / 3 * index).reverse();
  const points = hours.map((hour, index) => `${x(index).toFixed(1)},${y(hour.temperature).toFixed(1)}`).join(" ");
  const grid = ticks.map(tick => { const yp = y(tick).toFixed(1); return `<line class="chart-grid" x1="${margin.left}" y1="${yp}" x2="${width - margin.right}" y2="${yp}"/><text x="0" y="${Number(yp) + 4}">${Math.round(tick)}&deg;</text>`; }).join("");
  const labels = hours.map((hour, index) => index % 2 ? "" : `<text x="${x(index).toFixed(1)}" y="${height - 4}" text-anchor="${index === 0 ? "start" : "middle"}">${index === 0 ? "Now" : formatTime(hour.time).replace(":00", "")}</text>`).join("");
  const dots = hours.map((hour, index) => `<circle class="chart-dot" cx="${x(index).toFixed(1)}" cy="${y(hour.temperature).toFixed(1)}" r="${index === 0 ? 4 : 2.5}"><title>${formatTime(hour.time)}: ${Math.round(hour.temperature)}${unit}</title></circle>`).join("");
  elements.chart.setAttribute("aria-label", `Temperature from ${Math.round(rawMin)} to ${Math.round(rawMax)}${unit} over the next 12 hours.`);
  elements.chart.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-hidden="true" preserveAspectRatio="none">${grid}<polyline class="chart-line" pathLength="1" points="${points}"/>${dots}${labels}</svg>`;
}

function renderHourly(hours, unit) {
  elements.hourlyStrip.innerHTML = hours.map((hour, index) => `<div class="hour-item"><span class="hour-time">${index === 0 ? "Now" : formatTime(hour.time)}</span><span class="hour-icon" aria-hidden="true">${weatherIcon(getWeather(hour.weatherCode).type, true)}</span><strong class="hour-temp">${Math.round(hour.temperature)}${unit}</strong><span class="hour-rain">${Math.round(hour.precipitation)}% rain</span></div>`).join("");
}

function renderWeekly(daily, shortUnit, windUnit) {
  elements.weekly.innerHTML = daily.time.map((date, index) => {
    const condition = getWeather(daily.weather_code[index]);
    return `<div class="week-row"><div class="week-day"><span class="weather-icon" aria-hidden="true">${weatherIcon(condition.type, true)}</span><span>${index === 0 ? "Today" : formatWeekday(date)}</span></div><span class="week-condition">${condition.label}</span><span class="week-rain num">${Math.round(daily.precipitation_probability_max[index] ?? 0)}% rain</span><span class="week-temp num"><strong>${Math.round(daily.temperature_2m_max[index])}&deg;</strong> <span>/ ${Math.round(daily.temperature_2m_min[index])}&deg; ${shortUnit}</span></span><span class="week-wind num">${Math.round(daily.wind_speed_10m_max[index])} ${windUnit}</span></div>`;
  }).join("");
}

function buildFinding(data, start) {
  const probabilities = data.hourly.precipitation_probability.slice(start, start + 12);
  const maxRain = Math.max(...probabilities.map(value => value ?? 0));
  const rainOffset = probabilities.indexOf(maxRain);
  const currentTemp = data.current.temperature_2m;
  const high = data.daily.temperature_2m_max[0];
  const low = data.daily.temperature_2m_min[0];
  const uv = data.daily.uv_index_max[0];
  const degree = "\u00B0";
  if (maxRain >= 45) return `Rain is most likely around ${formatTime(data.hourly.time[start + rainOffset])}, reaching ${Math.round(maxRain)}%.`;
  if (uv >= 7 && data.current.is_day === 1) return `UV peaks at ${formatUv(uv)} today. Shade matters even with cloud cover.`;
  if (high - currentTemp >= 4) return `Still warming: today reaches about ${Math.round(high)}${degree} before easing to ${Math.round(low)}${degree} overnight.`;
  return `A steady day ahead, with a high near ${Math.round(high)}${degree} and little rain expected.`;
}

function weatherIcon(type, isDay) {
  const celestial = isDay
    ? `<g class="icon-sun"><circle class="weather-sun" cx="40" cy="34" r="12"/><g class="sun-rays"><path d="M40 9v9M40 50v9M15 34h9M56 34h9M22 16l7 7M51 45l7 7M58 16l-7 7M29 45l-7 7"/></g></g>`
    : `<g class="icon-moon"><path class="weather-moon" d="M54 17a21 21 0 1 0 13 31A23 23 0 0 1 54 17Z"/><circle cx="60" cy="18" r="2"/></g>`;
  const cloud = `<g class="icon-cloud"><path class="cloud-shadow" d="M20 67h49a13 13 0 0 0 0-26 22 22 0 0 0-41 9A13 13 0 0 0 20 67Z"/><path class="weather-cloud" d="M18 63h49a13 13 0 0 0 0-26 22 22 0 0 0-41 9A13 13 0 0 0 18 63Z"/></g>`;
  const effects = {
    clear: celestial,
    partly: `${celestial}${cloud}`,
    cloud,
    fog: `${cloud}<g class="fog-lines"><path d="M18 75h52M28 84h35"/></g>`,
    rain: `${cloud}<g class="rain-drops"><path d="m29 72-4 10M47 72l-4 10M65 72l-4 10"/></g>`,
    snow: `${cloud}<g class="snow-flakes"><path d="M29 73v10M24 78h10M47 73v10M42 78h10M65 73v10M60 78h10"/></g>`,
    storm: `${cloud}<path class="lightning" d="m49 68-10 15h10l-6 12 18-20H51l6-7Z"/>`
  };
  return `<svg class="weather-svg weather-${type}" viewBox="0 0 96 96" aria-hidden="true">${effects[type] || cloud}</svg>`;
}

function getWeather(code) { const [label, type] = weatherCodes[code] || ["Variable weather", "cloud"]; return { label, type }; }
function temperatureUnit() { return state.unit === "imperial" ? "\u00B0F" : "\u00B0C"; }

async function searchLocations(query, showResults = true) {
  const normalized = query.trim();
  if (normalized.length < 2) { closeSearchResults(); return []; }
  if (state.searchController) state.searchController.abort();
  const controller = new AbortController();
  state.searchController = controller;
  try {
    const params = new URLSearchParams({ name: normalized, count: "6", language: "en", format: "json" });
    const data = await fetchJson(`${GEOCODING_API}?${params}`, controller, 8000);
    if (controller !== state.searchController) return [];
    state.suggestions = (data.results || []).map(normalizeOpenMeteoPlace);
    state.activeSuggestion = -1;
    if (showResults) renderSearchResults();
    return state.suggestions;
  } catch (error) {
    if (error.name !== "AbortError" && showResults) closeSearchResults();
    return [];
  }
}

async function searchLocalPlaces(query) {
  const controller = new AbortController();
  state.searchController = controller;
  const searchText = /\b\d{6}\b/.test(query) ? `${query}, India` : `${query}, India`;
  const params = new URLSearchParams({ format: "jsonv2", q: searchText, "accept-language": "en", countrycodes: "in", limit: "6", addressdetails: "1" });
  try {
    const data = await fetchJson(`${LOCAL_SEARCH_API}?${params}`, controller, 10000);
    if (controller !== state.searchController) return [];
    return data.map(normalizeMapPlace).filter(place => Number.isFinite(place.latitude) && Number.isFinite(place.longitude));
  } catch (error) { return []; }
}

function normalizeOpenMeteoPlace(place) {
  return { name: place.name, admin1: place.admin1 || place.admin2 || "", country: place.country || "", latitude: place.latitude, longitude: place.longitude };
}

function normalizeMapPlace(place) {
  const address = place.address || {};
  const name = place.name || address.suburb || address.neighbourhood || address.town || address.city || address.village || address.postcode || place.display_name.split(",")[0];
  const locality = address.city || address.town || address.village || address.municipality || "";
  const admin1 = address.state_district || address.state || address.county || "";
  return { name, locality: locality === name ? "" : locality, admin1, country: address.country || "India", latitude: Number(place.lat), longitude: Number(place.lon) };
}

function renderSearchResults() {
  if (!state.suggestions.length) { closeSearchResults(); return; }
  elements.searchResults.innerHTML = state.suggestions.map((place, index) => {
    const detail = [...new Set([place.locality, place.admin1, place.country].filter(Boolean))].join(", ");
    return `<button class="search-option ${index === state.activeSuggestion ? "active" : ""}" type="button" role="option" aria-selected="${index === state.activeSuggestion}" data-index="${index}"><strong>${escapeHtml(place.name)}</strong><span>${escapeHtml(detail)}</span></button>`;
  }).join("");
  elements.searchResults.hidden = false;
  elements.searchInput.setAttribute("aria-expanded", "true");
}

function chooseSuggestion(index) {
  const place = state.suggestions[index];
  if (!place) return;
  elements.searchInput.value = place.name;
  closeSearchResults();
  loadWeather(place);
}

function closeSearchResults() {
  elements.searchResults.hidden = true;
  elements.searchResults.innerHTML = "";
  elements.searchInput.setAttribute("aria-expanded", "false");
  state.activeSuggestion = -1;
}

function getRecent() { try { return JSON.parse(localStorage.getItem("atmos-recent") || "[]"); } catch { return []; } }
function saveRecent(place) {
  const recent = [place, ...getRecent().filter(item => Math.abs(item.latitude - place.latitude) > 0.001 || Math.abs(item.longitude - place.longitude) > 0.001)].slice(0, 5);
  localStorage.setItem("atmos-recent", JSON.stringify(recent));
  renderRecent();
}
function renderRecent() {
  const recent = getRecent();
  elements.recentList.innerHTML = recent.length ? recent.map((place, index) => `<button class="recent-button" type="button" data-recent="${index}"><span>${escapeHtml(place.name)}</span><small>${escapeHtml(place.admin1 || place.country || "")}</small></button>`).join("") : `<p class="recent-empty">Your searches will appear here.</p>`;
}

async function useCurrentLocation() {
  if (!navigator.geolocation) { showStatus("Location access is not supported by this browser.", true); return; }
  showStatus("Finding your location\u2026");
  navigator.geolocation.getCurrentPosition(async position => {
    const fallback = { name: "Current location", admin1: "", country: "", latitude: position.coords.latitude, longitude: position.coords.longitude };
    let place = fallback;
    try {
      const controller = new AbortController();
      const params = new URLSearchParams({ format: "jsonv2", lat: fallback.latitude, lon: fallback.longitude, "accept-language": "en", zoom: "14", addressdetails: "1" });
      const result = await fetchJson(`${REVERSE_API}?${params}`, controller, 8000);
      place = normalizeMapPlace(result);
    } catch { /* Coordinates still provide a valid forecast. */ }
    loadWeather(place);
  }, error => {
    const message = error.code === 1 ? "Location permission was not granted." : "Your location could not be determined.";
    showStatus(`${message} Search for a place instead.`, true);
  }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 });
}

function updateUrl(place) {
  const params = new URLSearchParams({ place: place.name, lat: Number(place.latitude).toFixed(4), lon: Number(place.longitude).toFixed(4) });
  if (place.admin1) params.set("region", place.admin1);
  if (place.country) params.set("country", place.country);
  history.replaceState(null, "", `${location.pathname}?${params}`);
}
function setLoading(value) { elements.content.setAttribute("aria-busy", String(value)); document.querySelector("#refresh-button").disabled = value; }
function showStatus(message, isError = false) { elements.status.textContent = message; elements.status.classList.toggle("error", isError); elements.status.hidden = false; }
function hideStatus() { elements.status.hidden = true; elements.status.textContent = ""; }
function setText(selector, value) { document.querySelector(selector).textContent = value; }
function formatTime(dateTime) { if (!dateTime || !dateTime.includes("T")) return "--"; const [hoursText, minutes] = dateTime.split("T")[1].split(":"); const hours = Number(hoursText); return `${hours % 12 || 12}:${minutes} ${hours >= 12 ? "PM" : "AM"}`; }
function formatLocationTime(apiTime) { try { const parts = apiTime.split("T")[0].split("-").map(Number); const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])); const day = new Intl.DateTimeFormat("en", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric" }).format(date); return `${day} - Local time ${formatTime(apiTime)}`; } catch { return `Local time ${formatTime(apiTime)}`; } }
function formatWeekday(date) { return new Intl.DateTimeFormat("en", { weekday: "long", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`)); }
function formatShortDate(date) { return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`)); }
function formatVisibility(metres, unit) { if (!Number.isFinite(metres)) return "--"; return unit === "imperial" ? `${(metres / 1609.344).toFixed(1)} mi` : `${(metres / 1000).toFixed(1)} km`; }
function formatUv(value) { const number = Math.round(value * 10) / 10; if (number < 3) return `${number} low`; if (number < 6) return `${number} moderate`; if (number < 8) return `${number} high`; if (number < 11) return `${number} very high`; return `${number} extreme`; }
function daylightPercentage(current, sunrise, sunset) { const minutes = value => { const [hours, mins] = value.split("T")[1].split(":").map(Number); return hours * 60 + mins; }; const start = minutes(sunrise); const end = minutes(sunset); const now = minutes(current); return Math.max(0, Math.min(100, (now - start) / (end - start) * 100)); }
function escapeHtml(value) { return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
function openSidebar() { elements.sidebar.classList.add("open"); elements.scrim.hidden = false; elements.menuButton.setAttribute("aria-expanded", "true"); document.querySelector("#sidebar-close").focus(); }
function closeSidebar() { elements.sidebar.classList.remove("open"); elements.scrim.hidden = true; elements.menuButton.setAttribute("aria-expanded", "false"); }

function focusSearch() {
  elements.searchInput.focus({ preventScroll: true });
  elements.searchForm.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
}

let searchTimer;
elements.searchInput.addEventListener("input", () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => searchLocations(elements.searchInput.value), 320); });
elements.searchInput.addEventListener("keydown", event => {
  if (elements.searchResults.hidden || !state.suggestions.length) return;
  if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); const delta = event.key === "ArrowDown" ? 1 : -1; state.activeSuggestion = (state.activeSuggestion + delta + state.suggestions.length) % state.suggestions.length; renderSearchResults(); }
  else if (event.key === "Enter" && state.activeSuggestion >= 0) { event.preventDefault(); chooseSuggestion(state.activeSuggestion); }
  else if (event.key === "Escape") closeSearchResults();
});
elements.searchForm.addEventListener("submit", async event => {
  event.preventDefault();
  clearTimeout(searchTimer);
  const query = elements.searchInput.value.trim();
  if (!query) { elements.searchInput.focus(); return; }
  if (state.activeSuggestion >= 0) { chooseSuggestion(state.activeSuggestion); return; }
  closeSearchResults();
  showStatus("Searching city and local map data\u2026");
  let results = await searchLocations(query, false);
  if (!results.length) results = await searchLocalPlaces(query);
  else if (/^\d{6}$/.test(query) || results.every(item => item.name.toLowerCase() !== query.toLowerCase())) {
    const localResults = await searchLocalPlaces(query);
    if (localResults.length) results = localResults;
  }
  hideStatus();
  if (results.length) { state.suggestions = results; chooseSuggestion(0); }
  else showStatus(`No place matched "${query}". Try a nearby locality, city, or six-digit postcode.`, true);
});
elements.searchResults.addEventListener("click", event => { const option = event.target.closest("[data-index]"); if (option) chooseSuggestion(Number(option.dataset.index)); });
document.addEventListener("click", event => { if (!elements.searchForm.contains(event.target)) closeSearchResults(); });
document.querySelectorAll(".unit-button").forEach(button => {
  const active = button.dataset.unit === state.unit;
  button.classList.toggle("active", active);
  button.setAttribute("aria-pressed", String(active));
  button.addEventListener("click", () => {
    if (state.unit === button.dataset.unit) return;
    state.unit = button.dataset.unit;
    localStorage.setItem("atmos-unit", state.unit);
    document.querySelectorAll(".unit-button").forEach(item => { const selected = item.dataset.unit === state.unit; item.classList.toggle("active", selected); item.setAttribute("aria-pressed", String(selected)); });
    loadWeather(state.location, { save: false });
  });
});
elements.recentList.addEventListener("click", event => { const button = event.target.closest("[data-recent]"); if (!button) return; const place = getRecent()[Number(button.dataset.recent)]; if (place) loadWeather(place, { save: false }); closeSidebar(); });
document.querySelector("#location-button").addEventListener("click", useCurrentLocation);
document.querySelector("#mobile-location").addEventListener("click", useCurrentLocation);
document.querySelector("#refresh-button").addEventListener("click", () => loadWeather(state.location, { save: false }));
document.querySelector(".mobile-search-trigger").addEventListener("click", focusSearch);
elements.menuButton.addEventListener("click", openSidebar);
document.querySelector("#sidebar-close").addEventListener("click", closeSidebar);
elements.scrim.addEventListener("click", closeSidebar);
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && elements.sidebar.classList.contains("open")) closeSidebar();
  if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
    event.preventDefault();
    focusSearch();
  }
});
let resizeTimer;
window.addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { if (!state.weather) return; let index = state.weather.hourly.time.findIndex(time => time >= state.weather.current.time); if (index < 0) index = 0; renderChart(sliceHourly(state.weather.hourly, index, 12), temperatureUnit()); }, 140); });

renderRecent();
loadWeather(state.location, { save: false });
