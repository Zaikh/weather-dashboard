/* ==========================
   DOM CACHE (ONE TIME)
========================== */
const $ = id => document.getElementById(id);

const DOM = {
  search: $("search"),
  btn: $("searchBtn"),
  loc: $("location"),
  temp: $("temp"),
  cond: $("condition"),
  uv: $("uv"),
  pressure: $("pressure"),
  humVal: $("humVal"),
  humProg: $("humProg"),
  windVal: $("windVal"),
  windProg: $("windProg"),
  thermo: $("thermoFill"),
  week: $("week"),
  icon: $("weatherIcon"),
  chart: $("chart"),
  bgVideo: $("bgVideo")
};

/* ==========================
   CONSTANTS & CACHE
========================== */
const RING_CIRC = 314;
const cache = new Map();
let abortController = null;

/* ==========================
   HELPERS
========================== */
const debounce = (fn, delay = 400) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
};

const weatherText = c =>
  c === 0 ? "Clear" :
  c <= 3 ? "Cloudy" :
  c <= 48 ? "Fog" :
  c <= 67 ? "Rain" :
  c <= 77 ? "Snow" : "Storm";

const setIcon = code => {
  DOM.icon.className =
    code === 0  ? "wi wi-day-sunny" :
    code <= 3  ? "wi wi-day-cloudy" :
    code <= 48 ? "wi wi-fog" :
    code <= 67 ? "wi wi-rain" :
    code <= 77 ? "wi wi-snow" :
                 "wi wi-thunderstorm";
};

const ring = (el, val, max = 100) => {
  el.style.strokeDashoffset =
    RING_CIRC - (Math.min(val, max) / max) * RING_CIRC;
};

const setUV = v => {
  DOM.uv.textContent = v.toFixed(1);
  DOM.uv.style.color =
    v < 3 ? "#4ade80" :
    v < 6 ? "#facc15" :
    v < 8 ? "#fb923c" : "#ef4444";
};

const setThermo = t => {
  DOM.thermo.style.height =
    Math.min(100, Math.max(0, ((t + 10) / 60) * 100)) + "%";
};

/* ==========================
   API (CACHED + SAFE)
========================== */
async function fetchJSON(url) {
  if (cache.has(url)) return cache.get(url);

  abortController?.abort();
  abortController = new AbortController();

  const res = await fetch(url, { signal: abortController.signal });
  const data = await res.json();
  cache.set(url, data);
  return data;
}

async function getCoords(city) {
  const d = await fetchJSON(
    `https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1`
  );
  return d?.results?.[0];
}

async function loadWeather(lat, lon, label) {
  const d = await fetchJSON(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m,uv_index,surface_pressure,temperature_2m&daily=temperature_2m_max&timezone=auto`
  );

  /* BATCH DOM UPDATE */
  requestAnimationFrame(() => {
    DOM.loc.textContent = label;
    DOM.temp.textContent = d.current_weather.temperature + "°C";
    DOM.cond.textContent = weatherText(d.current_weather.weathercode);

    setIcon(d.current_weather.weathercode);
    setThermo(d.current_weather.temperature);

    const hour = d.current_weather.time.slice(0, 13);
    const idx = d.hourly.time.findIndex(t => t.startsWith(hour));

    DOM.humVal.textContent = d.hourly.relativehumidity_2m[idx];
    ring(DOM.humProg, d.hourly.relativehumidity_2m[idx]);

    DOM.windVal.textContent = d.current_weather.windspeed;
    ring(DOM.windProg, d.current_weather.windspeed);

    DOM.pressure.textContent =
      Math.round(d.hourly.surface_pressure[idx]) + " mb";

    setUV(d.hourly.uv_index[idx]);

    /* WEEK LIST (NO innerHTML +=) */
    const frag = document.createDocumentFragment();
    d.daily.temperature_2m_max.forEach((t, i) => {
      const li = document.createElement("li");
      li.innerHTML = `Day ${i + 1}<span>${t}°</span>`;
      frag.appendChild(li);
    });
    DOM.week.replaceChildren(frag);

    drawChart(d.hourly.temperature_2m.slice(0, 12));
  });
}

/* ==========================
   CANVAS (THROTTLED)
========================== */
let chartRAF;
function drawChart(arr) {
  cancelAnimationFrame(chartRAF);
  chartRAF = requestAnimationFrame(() => {
    const ctx = DOM.chart.getContext("2d");
    const w = DOM.chart.offsetWidth;
    DOM.chart.width = w;

    ctx.clearRect(0, 0, w, 120);

    const max = Math.max(...arr);
    const min = Math.min(...arr);

    ctx.beginPath();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;

    arr.forEach((t, i) => {
      const x = (i / (arr.length - 1)) * w;
      const y = 120 - ((t - min) / (max - min)) * 120;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.stroke();
  });
}

/* ==========================
   EVENTS
========================== */
const searchWeather = debounce(async () => {
  if (!DOM.search.value) return;
  const c = await getCoords(DOM.search.value);
  if (c) loadWeather(c.latitude, c.longitude, `${c.name}, ${c.country}`);
});

DOM.btn.addEventListener("click", searchWeather);
DOM.search.addEventListener("keydown", e => e.key === "Enter" && searchWeather());

/* ==========================
   INIT
========================== */
navigator.geolocation.getCurrentPosition(
  p => loadWeather(p.coords.latitude, p.coords.longitude, "Your Location"),
  () => getCoords("Delhi").then(c =>
    loadWeather(c.latitude, c.longitude, "Delhi")
  )
);

/* Video perf */
DOM.bgVideo.playbackRate = 0.6;
DOM.bgVideo.preload = "auto";
