   const qs = id => document.getElementById(id);

    const search   = qs("search");
    const btn      = qs("searchBtn");
    const loc      = qs("location");
    const temp     = qs("temp");
    const cond     = qs("condition");
    const uv       = qs("uv");
    const pressure = qs("pressure");

    const humVal   = qs("humVal");
    const humProg  = qs("humProg");
    const windVal  = qs("windVal");
    const windProg = qs("windProg");

    const thermo   = qs("thermoFill");
    const week     = qs("week");


    function weatherText(code) {
      if (code == 0)  return "Clear";
      if (code <= 3)  return "Cloudy";
      if (code <= 48) return "Fog";
      if (code <= 67) return "Rain";
      if (code <= 77) return "Snow";
      return "Storm";
    }

    function icon(code) {
      const i = qs("weatherIcon");
      i.className =
        code == 0  ? "wi wi-day-sunny" :
        code <= 3  ? "wi wi-day-cloudy" :
        code <= 48 ? "wi wi-fog" :
        code <= 67 ? "wi wi-rain" :
        code <= 77 ? "wi wi-snow" :
                     "wi wi-thunderstorm";
    }

    function ring(el, val, max = 100) {
      const c = 314;
      el.style.strokeDashoffset =
        c - (Math.min(val, max) / max) * c;
    }

    function uvColor(v) {
      uv.textContent = v.toFixed(1);
      uv.style.color =
        v < 3 ? "#4ade80" :
        v < 6 ? "#facc15" :
        v < 8 ? "#fb923c" :
                "#ef4444";
    }

    function thermoFill(t) {
      const p = ((t + 10) / 60) * 100;
      thermo.style.height =
        Math.min(100, Math.max(0, p)) + "%";
    }

    async function coords(city) {
      const r = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1`
      );
      const d = await r.json();
      return d.results[0];
    }

    async function weather(lat, lon, name) {
      const r = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m,uv_index,surface_pressure,temperature_2m&daily=temperature_2m_max&timezone=auto`
      );

      const d = await r.json();

      loc.textContent  = name;
      temp.textContent = d.current_weather.temperature + "°C";
      cond.textContent = weatherText(d.current_weather.weathercode);

      icon(d.current_weather.weathercode);
      thermoFill(d.current_weather.temperature);

      const h = d.current_weather.time.slice(0, 13);
      const i = d.hourly.time.findIndex(t => t.startsWith(h));

      humVal.textContent = d.hourly.relativehumidity_2m[i];
      ring(humProg, d.hourly.relativehumidity_2m[i]);

      windVal.textContent = d.current_weather.windspeed;
      ring(windProg, d.current_weather.windspeed, 100);

      pressure.textContent =
        Math.round(d.hourly.surface_pressure[i]) + " mb";

      uvColor(d.hourly.uv_index[i]);

      week.innerHTML = "";
      d.daily.temperature_2m_max.forEach((t, i) => {
        week.innerHTML += `<li>Day ${i + 1}<span>${t}°</span></li>`;
      });

      draw(d.hourly.temperature_2m.slice(0, 12));
    }

    function draw(arr) {
      const c = qs("chart");
      const x = c.getContext("2d");

      c.width = c.offsetWidth;
      x.clearRect(0, 0, c.width, 120);

      const max = Math.max(...arr);
      const min = Math.min(...arr);

      x.beginPath();
      x.strokeStyle = "#fff";
      x.lineWidth = 2;

      arr.forEach((t, i) => {
        const px = (i / (arr.length - 1)) * c.width;
        const py = 120 - ((t - min) / (max - min)) * 120;
        i ? x.lineTo(px, py) : x.moveTo(px, py);
      });

      x.stroke();
    }

    btn.onclick = async () => {
      if (!search.value) return;
      const c = await coords(search.value);
      weather(c.latitude, c.longitude, `${c.name}, ${c.country}`);
    };

    navigator.geolocation.getCurrentPosition(
      p => weather(
        p.coords.latitude,
        p.coords.longitude,
        "Your Location"
      ),
      () => coords("Delhi").then(c =>
        weather(c.latitude, c.longitude, "Delhi")
      )
    );

    const bgVideo = qs("bgVideo");
    bgVideo.playbackRate = 0.6;

    search.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        btn.click();
      }
    });