/**
 * EcoPay Quibdó - Lógica Principal (app.js v4.5.0)
 * Sistema Comunitario de Alerta Temprana, Prevención de Inundaciones y Residuos
 * Experiencia Dual: Portal Web en PC + Aplicación Móvil Nativa (PWA Mobile)
 * Coordenadas oficiales de Quibdó: Latitud 5.6919, Longitud -76.6583
 */

const CONFIG = {
  CITY: 'Quibdó, Chocó',
  LATITUDE: 5.6919,
  LONGITUDE: -76.6583,
  OPEN_METEO_API: 'https://api.open-meteo.com/v1/forecast?latitude=5.6919&longitude=-76.6583&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code&hourly=precipitation_probability,precipitation,rain&forecast_days=1&timezone=America%2FBogota',
  AUTO_REFRESH_INTERVAL_MS: 300000,
  ECOPOINTS_PER_REPORT: 10,
  STORAGE_KEYS: {
    REPORTS: 'ecopay_quibdo_reports_v1',
    POINTS: 'ecopay_user_points_v1',
    LAST_WEATHER: 'ecopay_last_weather_v1'
  }
};

// Los 10 Puntos Críticos de Quibdó (Sector La Margarita y caños tributarios)
const CRITICAL_POINTS = [
  { id: 'cascarita_margarita', name: 'Quebrada La Cascarita (Cruce La Margarita)', zone: 'Sector La Margarita' },
  { id: 'rejilla_c24_cra1', name: 'Rejilla de la Carrera 1ª con Calle 24 (Alameda)', zone: 'Alameda / Atrato' },
  { id: 'yesca_puente_margarita', name: 'Caño La Yesca (Sector Puente La Margarita)', zone: 'Sector La Margarita' },
  { id: 'desague_c26_cra3', name: 'Alcantarilla de la Carrera 3ª con Calle 26', zone: 'Centro' },
  { id: 'canal_kennedy_margarita', name: 'Canal Colector de Kennedy (Conexión La Margarita)', zone: 'La Margarita / Kennedy' },
  { id: 'alcantarilla_cancha_margarita', name: 'Rejilla junto a la cancha de La Margarita', zone: 'Sector La Margarita' },
  { id: 'carano_perimetral', name: 'Caño El Caraño (Desembocadura vía perimetral)', zone: 'Perimetral' },
  { id: 'rejilla_c28_muro', name: 'Rejilla de la Calle 28 (Frente al muro)', zone: 'Sector Atrato' },
  { id: 'box_yesquita', name: 'Quebrada Yesquita (Box-coulvert principal)', zone: 'Yesquita' },
  { id: 'drenaje_bajoviento', name: 'Desagüe del sector Bajoviento', zone: 'Bajoviento' }
];

// Reportes históricos de prueba
const INITIAL_HISTORIC_REPORTS = [
  { id: 'rep-01', pointId: 'cascarita_margarita', wasteType: 'Botellas plásticas, empaques e icopor', severity: '3', note: 'Varias botellas plásticas represadas en la entrada del tubo.', author: 'Don Emiro (Sector La Margarita)', timestamp: '2026-11-09T18:30:00Z' },
  { id: 'rep-02', pointId: 'cascarita_margarita', wasteType: 'Arena, barro y sedimentos', severity: '2', note: 'La arena y el barro que bajaron taparon la mitad del paso de agua.', author: 'Luz Marina Murillo', timestamp: '2026-11-09T19:15:00Z' },
  { id: 'rep-03', pointId: 'cascarita_margarita', wasteType: 'Bolsas de basura sin recoger', severity: '3', note: 'Dejaron bolsas de basura en la esquina y el agua las está arrastrando.', author: 'Vecinos de la Calle 24', timestamp: '2026-11-09T20:00:00Z' },
  { id: 'rep-04', pointId: 'cascarita_margarita', wasteType: 'Ramas, madera y palizadas', severity: '3', note: 'Ramas y pedazos de madera atravesados que no dejan correr el agua.', author: 'Carlos Palacios', timestamp: '2026-11-09T21:10:00Z' },
  { id: 'rep-05', pointId: 'yesca_puente_margarita', wasteType: 'Botellas plásticas, empaques e icopor', severity: '2', note: 'Envases plásticos trancados en las bases del puente.', author: 'Yesid Bejarano', timestamp: '2026-11-09T17:40:00Z' },
  { id: 'rep-06', pointId: 'yesca_puente_margarita', wasteType: 'Bolsas de basura sin recoger', severity: '2', note: 'Bolsas de comida y plástico atascadas en la orilla del caño.', author: 'Ana Rentería', timestamp: '2026-11-09T19:50:00Z' },
  { id: 'rep-07', pointId: 'canal_kennedy_margarita', wasteType: 'Botellas plásticas, empaques e icopor', severity: '2', note: 'Bastante plástico acumulado antes de entrar al canal colector.', author: 'Vecinos de Kennedy', timestamp: '2026-11-09T16:20:00Z' },
  { id: 'rep-08', pointId: 'rejilla_c24_cra1', wasteType: 'Arena, barro y sedimentos', severity: '1', note: 'La rejilla de hierro quedó tapada con arena y hojas secas.', author: 'Marcos Córdoba', timestamp: '2026-11-09T15:00:00Z' },
  { id: 'rep-09', pointId: 'box_yesquita', wasteType: 'Ramas, madera y palizadas', severity: '2', note: 'Un tronco atravesado está frenando el paso del agua.', author: 'Comité de Yesquita', timestamp: '2026-11-09T14:10:00Z' },
  { id: 'rep-10', pointId: 'cascarita_margarita', wasteType: 'Botellas plásticas, empaques e icopor', severity: '3', note: 'Se acumuló basura plástica frente a la rejilla.', author: 'Grupo de jóvenes', timestamp: '2026-11-09T22:00:00Z' }
];

const AppState = {
  simulationMode: null,
  currentWeather: null,
  reports: [],
  userEcoPoints: 140,
  audioContext: null,
  alarmOscillator: null,
  alarmGainNode: null,
  alarmIntervalId: null,
  isAlarmPlaying: false,
  deferredPWAInstallPrompt: null
};

// Sintetizador Web Audio API para alarma de emergencia
const AudioSynthesizer = {
  initContext() {
    if (!AppState.audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        AppState.audioContext = new AudioCtx();
      }
    }
    if (AppState.audioContext && AppState.audioContext.state === 'suspended') {
      AppState.audioContext.resume();
    }
  },

  playEmergencySiren() {
    this.initContext();
    if (!AppState.audioContext) return;
    if (AppState.isAlarmPlaying) return;

    try {
      const ctx = AppState.audioContext;
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.18, ctx.currentTime);
      gainNode.connect(ctx.destination);
      AppState.alarmGainNode = gainNode;

      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.connect(gainNode);
      osc.start();
      AppState.alarmOscillator = osc;

      let highTone = true;
      AppState.alarmIntervalId = setInterval(() => {
        if (!AppState.isAlarmPlaying || !AppState.alarmOscillator) return;
        const targetFreq = highTone ? 660 : 880;
        AppState.alarmOscillator.frequency.exponentialRampToValueAtTime(targetFreq, ctx.currentTime + 0.12);
        highTone = !highTone;
      }, 350);

      AppState.isAlarmPlaying = true;
      this.updateAudioButtonState();

      setTimeout(() => {
        if (AppState.isAlarmPlaying) {
          AudioSynthesizer.stopEmergencySiren();
        }
      }, 18000);

    } catch (e) {
      console.warn('Audio de alarma restringido por el navegador:', e);
    }
  },

  stopEmergencySiren() {
    if (AppState.alarmIntervalId) {
      clearInterval(AppState.alarmIntervalId);
      AppState.alarmIntervalId = null;
    }
    if (AppState.alarmOscillator) {
      try {
        AppState.alarmOscillator.stop();
        AppState.alarmOscillator.disconnect();
      } catch (e) { /* ignore */ }
      AppState.alarmOscillator = null;
    }
    AppState.isAlarmPlaying = false;
    this.updateAudioButtonState();
  },

  toggleAlarm() {
    if (AppState.isAlarmPlaying) {
      this.stopEmergencySiren();
    } else {
      this.playEmergencySiren();
    }
  },

  updateAudioButtonState() {
    const btn = document.getElementById('btn-toggle-alarm');
    const statusText = document.getElementById('audio-status-text');
    if (!btn) return;

    if (AppState.isAlarmPlaying) {
      btn.innerHTML = 'Silenciar alarma';
      btn.style.background = '#991b1b';
      if (statusText) statusText.textContent = 'Alarma sonora activa';
    } else {
      btn.innerHTML = 'Activar alarma sonora';
      btn.style.background = 'var(--wx-emergency-red)';
      if (statusText) statusText.textContent = 'Alarma silenciada';
    }
  }
};

// Vibración háptica en móviles
function triggerMobileVibration() {
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate([300, 150, 300, 150, 500]);
    } catch (e) {
      console.log('Vibración restringida.');
    }
  }
}

// Telemetría con Open-Meteo
const WeatherService = {
  async fetchQuibdoWeather() {
    const refreshBtn = document.getElementById('btn-refresh-weather');
    if (refreshBtn) refreshBtn.innerHTML = 'Consultando...';

    try {
      const response = await fetch(CONFIG.OPEN_METEO_API);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      AppState.currentWeather = data;
      localStorage.setItem(CONFIG.STORAGE_KEYS.LAST_WEATHER, JSON.stringify(data));
      this.renderWeather(data);
      evaluateAlertLevel();
      showToast('Pronóstico del clima actualizado');
    } catch (error) {
      console.warn('Sin conexión en vivo, cargando memoria caché:', error);
      const cached = localStorage.getItem(CONFIG.STORAGE_KEYS.LAST_WEATHER);
      if (cached) {
        const parsed = JSON.parse(cached);
        AppState.currentWeather = parsed;
        this.renderWeather(parsed, true);
        evaluateAlertLevel();
        showToast('Mostrando datos del clima guardados en memoria');
      } else {
        this.renderFallbackOffline();
      }
    } finally {
      if (refreshBtn) refreshBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15" style="margin-right:4px;vertical-align:middle"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg> Actualizar pronóstico';
    }
  },

  renderWeather(data, isCached = false) {
    const cur = data.current || {};
    const hourly = data.hourly || { time: [], precipitation: [], precipitation_probability: [] };

    let rainNext1h = 0;
    let probNext1h = 0;

    if (hourly.time && hourly.time.length > 0) {
      const curTimeIso = cur.time || new Date().toISOString();
      const curHourStr = curTimeIso.slice(0, 13);
      let matchIdx = hourly.time.findIndex(t => t.startsWith(curHourStr));
      if (matchIdx === -1) matchIdx = 0;

      const nextIdx = Math.min(matchIdx + 1, hourly.time.length - 1);
      rainNext1h = hourly.precipitation ? (hourly.precipitation[nextIdx] ?? 0) : 0;
      probNext1h = hourly.precipitation_probability ? (hourly.precipitation_probability[nextIdx] ?? hourly.precipitation_probability[matchIdx] ?? 0) : 0;
    }

    const curPrecip = cur.precipitation ?? cur.rain ?? 0;
    const curTemp = cur.temperature_2m ?? '--';
    const appTemp = cur.apparent_temperature ?? curTemp;
    const humidity = cur.relative_humidity_2m ?? '--';

    document.getElementById('val-precip-current').textContent = `${Number(curPrecip).toFixed(1)} mm/h`;
    document.getElementById('val-rain-1h').textContent = `${Number(rainNext1h).toFixed(1)} mm`;
    document.getElementById('val-rain-prob').textContent = `${Math.round(probNext1h)}%`;
    document.getElementById('val-temperature').textContent = `${curTemp} °C`;
    document.getElementById('val-app-temp').textContent = `Sensación térmica: ${appTemp} °C`;
    document.getElementById('val-humidity').textContent = `${humidity}%`;

    const syncEl = document.getElementById('weather-last-sync');
    if (syncEl) {
      const syncDate = new Date();
      syncEl.textContent = `Última actualización: ${syncDate.toLocaleTimeString('es-CO')} ${isCached ? '(Memoria local)' : '(Datos en vivo)'}`;
    }
  },

  renderFallbackOffline() {
    document.getElementById('val-precip-current').textContent = '0.0 mm/h';
    document.getElementById('val-rain-1h').textContent = '0.0 mm';
    document.getElementById('val-rain-prob').textContent = '40%';
    document.getElementById('val-temperature').textContent = '26.0 °C';
    document.getElementById('val-app-temp').textContent = 'Sensación térmica: 30.0 °C';
    document.getElementById('val-humidity').textContent = '88%';

    const syncEl = document.getElementById('weather-last-sync');
    if (syncEl) {
      syncEl.textContent = 'Modo sin internet para Quibdó';
    }
  }
};

// Evaluación de alertas
function evaluateAlertLevel() {
  const modeTag = document.getElementById('current-mode-tag');

  if (AppState.simulationMode === 'SOFT') {
    renderAlertUI('SOFT', 'Simulación de alerta preventiva activa para evaluación.');
    if (modeTag) {
      modeTag.textContent = 'Modo: Simulación preventiva activa';
      modeTag.className = 'wx-demo-tag simulated';
    }
    return;
  }

  if (AppState.simulationMode === 'AGGRESSIVE') {
    renderAlertUI('AGGRESSIVE', 'Simulación de alerta de emergencia activa para evaluación.');
    if (modeTag) {
      modeTag.textContent = 'Modo: Simulación de emergencia activa';
      modeTag.className = 'wx-demo-tag simulated';
    }
    return;
  }

  if (modeTag) {
    modeTag.textContent = 'Modo: Clima en tiempo real';
    modeTag.className = 'wx-demo-tag';
  }

  if (!AppState.currentWeather) {
    renderAlertUI('NORMAL', 'Consultando pronóstico oficial...');
    return;
  }

  const cur = AppState.currentWeather.current || {};
  const hourly = AppState.currentWeather.hourly || {};
  const curPrecip = Number(cur.precipitation ?? 0);

  let maxProb = 0;
  let nextHourRain = 0;
  if (hourly.precipitation_probability && hourly.precipitation_probability.length > 0) {
    maxProb = Math.max(...hourly.precipitation_probability.slice(0, 3));
  }
  if (hourly.precipitation && hourly.precipitation.length > 0) {
    nextHourRain = Number(hourly.precipitation[1] ?? hourly.precipitation[0] ?? 0);
  }

  const weatherCode = Number(cur.weather_code ?? 0);
  const isSevereThunderstormCode = [65, 67, 75, 81, 82, 95, 96, 99].includes(weatherCode);

  if (curPrecip >= 5.0 || nextHourRain >= 5.0 || maxProb >= 70 || isSevereThunderstormCode) {
    renderAlertUI('AGGRESSIVE', 'Lluvia torrencial esperada en la ciudad.');
  } else if (maxProb >= 35 || curPrecip >= 0.5 || nextHourRain >= 0.5) {
    renderAlertUI('SOFT', 'Lluvia moderada esperada en los próximos 40 a 60 minutos.');
  } else {
    renderAlertUI('NORMAL', 'Flujo de agua normal en la cuenca.');
  }
}

function renderAlertUI(level, triggerReason = '') {
  const banner = document.getElementById('alert-banner');
  if (!banner) return;

  banner.className = 'wx-alert-hud';
  const heroStatus = document.getElementById('hero-quick-status');

  if (level === 'NORMAL') {
    AudioSynthesizer.stopEmergencySiren();
    if (heroStatus) heroStatus.textContent = 'Buen tiempo en Quibdó • Caños despejados';
    banner.classList.add('hud-normal');
    banner.innerHTML = `
      <div class="wx-hud-header">
        <div class="wx-hud-icon-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="28" height="28">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            <polyline points="9 12 11 14 15 10"></polyline>
          </svg>
        </div>
        <div class="wx-hud-content">
          <div class="wx-hud-meta">
            <span class="wx-hud-tag">Todo en orden</span>
            <span class="wx-hud-subtag">${triggerReason || 'Sin lluvias por ahora'}</span>
          </div>
          <h3 class="wx-hud-title">Rejillas y caños fluyendo con normalidad</h3>
          <p class="wx-hud-description">
            Por ahora no hay nubes de aguacero sobre Quibdó. Los caños de La Margarita están estables y el agua baja sin problemas.
          </p>
          <div class="wx-alert-instructions">
            <h4>Recomendaciones para hoy:</h4>
            <ul>
              <li>✓ Mantén las bolsas de basura cerradas y bajo techo hasta que pase el camión.</li>
              <li>✓ Revisa que la cuneta frente a tu casa no tenga botellas plásticas tapando la rejilla.</li>
            </ul>
          </div>
        </div>
      </div>
    `;
  } else if (level === 'SOFT') {
    AudioSynthesizer.stopEmergencySiren();
    if (heroStatus) heroStatus.textContent = 'Alerta Amarilla: Se acerca lluvia (40 a 60 min)';
    banner.classList.add('hud-soft');
    banner.innerHTML = `
      <div class="wx-hud-header">
        <div class="wx-hud-icon-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="28" height="28">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>
        <div class="wx-hud-content">
          <div class="wx-hud-meta">
            <span class="wx-hud-tag">Alerta Amarilla</span>
            <span class="wx-hud-subtag">Aviso con 40 a 60 minutos de anticipación</span>
          </div>
          <h3 class="wx-hud-title">Viene lluvia: Por favor resguarda las basuras</h3>
          <p class="wx-hud-description">
            El satélite detectó nubes de lluvia acercándose a Quibdó. Ayúdanos en La Margarita entrando las bolsas antes de que empiece a llover.
          </p>
          <div class="wx-alert-instructions">
            <h4>Qué hacer antes de que empiece a llover:</h4>
            <ul>
              <li><strong>Guarda las bolsas bajo techo:</strong> Mételas a la casa o bajo un alero para que la corriente no se las lleve.</li>
              <li><strong>No dejes canecas en la calle:</strong> Evita que el agua arrastre plásticos hacia la quebrada La Cascarita.</li>
              <li><strong>Revisión rápida:</strong> Si ves botellas en la cuneta de tu cuadra, recógelas a tiempo.</li>
            </ul>
          </div>
        </div>
      </div>
    `;
  } else if (level === 'AGGRESSIVE') {
    if (heroStatus) heroStatus.textContent = 'Alerta Roja: ¡Aguacero torrencial en Quibdó!';
    banner.classList.add('hud-aggressive');
    banner.innerHTML = `
      <div class="wx-hud-header">
        <div class="wx-hud-icon-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="28" height="28">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <div class="wx-hud-content">
          <div class="wx-hud-meta">
            <span class="wx-hud-tag">Alerta Roja</span>
            <span class="wx-hud-subtag">Aguacero torrencial en curso</span>
          </div>
          <h3 class="wx-hud-title">¡Peligro de creciente y taponamiento!</h3>
          <p class="wx-hud-description">
            Lluvia muy fuerte en Quibdó. El agua puede arrastrar basuras y desbordar los caños en La Margarita.
          </p>
          <div class="wx-alert-instructions">
            <h4>Medidas urgentes de seguridad:</h4>
            <ul>
              <li><strong>Aléjate de los caños:</strong> Mantén a niños y adultos lejos de la Quebrada La Cascarita y Caño Yesca.</li>
              <li><strong>No intentes destapar rejillas durante la tormenta:</strong> La fuerza del agua puede ser peligrosa.</li>
              <li><strong>Línea de emergencia:</strong> Si hay riesgo de inundación, llama a Bomberos (119) o Defensa Civil (144).</li>
            </ul>
          </div>
          <div class="wx-audio-box">
            <button id="btn-toggle-alarm" class="wx-btn-audio" type="button">
              Silenciar Sirena
            </button>
            <span id="audio-status-text" style="font-size: 0.82rem; font-weight: 700; color: var(--app-red);">
              Sirena de emergencia activada
            </span>
          </div>
        </div>
      </div>
    `;

    const toggleBtn = document.getElementById('btn-toggle-alarm');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => AudioSynthesizer.toggleAlarm());
    }

    AudioSynthesizer.playEmergencySiren();
    triggerMobileVibration();
  }
}

// Persistencia en localStorage y aprendizaje empírico
const ReportsManager = {
  loadReports() {
    const raw = localStorage.getItem(CONFIG.STORAGE_KEYS.REPORTS);
    if (raw) {
      try {
        AppState.reports = JSON.parse(raw);
      } catch (e) {
        AppState.reports = [...INITIAL_HISTORIC_REPORTS];
      }
    } else {
      AppState.reports = [...INITIAL_HISTORIC_REPORTS];
      this.persistReports();
    }

    const rawPoints = localStorage.getItem(CONFIG.STORAGE_KEYS.POINTS);
    if (rawPoints) {
      AppState.userEcoPoints = parseInt(rawPoints, 10) || 140;
    }
  },

  persistReports() {
    localStorage.setItem(CONFIG.STORAGE_KEYS.REPORTS, JSON.stringify(AppState.reports));
  },

  persistPoints() {
    localStorage.setItem(CONFIG.STORAGE_KEYS.POINTS, AppState.userEcoPoints.toString());
  },

  addReport(reportData) {
    const newReport = {
      id: 'rep-' + Date.now(),
      ...reportData,
      timestamp: new Date().toISOString()
    };

    AppState.reports.unshift(newReport);
    this.persistReports();

    AppState.userEcoPoints += CONFIG.ECOPOINTS_PER_REPORT;
    this.persistPoints();

    this.updateUI();
    showToast(`Reporte guardado con éxito (+${CONFIG.ECOPOINTS_PER_REPORT} EcoPuntos)`);
  },

  resetReportsToDefault() {
    AppState.reports = [...INITIAL_HISTORIC_REPORTS];
    this.persistReports();
    this.updateUI();
    showToast('Reportes restablecidos a los datos iniciales');
  },

  computeVulnerabilityRanking() {
    const counts = {};
    const severityWeighted = {};

    CRITICAL_POINTS.forEach(pt => {
      counts[pt.id] = 0;
      severityWeighted[pt.id] = 0;
    });

    AppState.reports.forEach(r => {
      if (counts[r.pointId] !== undefined) {
        counts[r.pointId]++;
        const sev = parseInt(r.severity, 10) || 1;
        severityWeighted[r.pointId] += sev;
      }
    });

    const ranking = CRITICAL_POINTS.map(pt => ({
      ...pt,
      reportCount: counts[pt.id],
      weightedScore: severityWeighted[pt.id]
    }));

    ranking.sort((a, b) => {
      if (b.reportCount !== a.reportCount) {
        return b.reportCount - a.reportCount;
      }
      return b.weightedScore - a.weightedScore;
    });

    return ranking;
  },

  updateUI() {
    this.renderEcoPoints();
    this.renderVulnerabilitySection();
    this.renderReportsFeed();
  },

  renderEcoPoints() {
    const badge = document.getElementById('user-ecopoints-badge');
    if (badge) {
      badge.innerHTML = `<span class="points-icon-svg"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="26" height="26"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v12"></path><path d="M16 10l-4-4-4 4"></path></svg></span> <span class="points-text">${AppState.userEcoPoints} EcoPuntos</span>`;
    }
  },

  renderVulnerabilitySection() {
    const ranking = this.computeVulnerabilityRanking();
    const topVulnerable = ranking[0];
    const totalReports = AppState.reports.length;

    const topBannerName = document.getElementById('top-vulnerable-name');
    const topBannerStats = document.getElementById('top-vulnerable-stats');

    if (topBannerName && topVulnerable) {
      topBannerName.textContent = topVulnerable.name;
    }
    if (topBannerStats && topVulnerable) {
      const percentage = totalReports > 0 ? Math.round((topVulnerable.reportCount / totalReports) * 100) : 0;
      topBannerStats.innerHTML = `
        <strong>${topVulnerable.reportCount}</strong> reportes acumulados (${percentage}% del total registrado) &bull; ${topVulnerable.zone}
      `;
    }

    const rankingListEl = document.getElementById('ranking-list-container');
    if (!rankingListEl) return;

    rankingListEl.innerHTML = '';
    const maxReports = Math.max(...ranking.map(r => r.reportCount), 1);

    ranking.forEach((item, index) => {
      const isTopDanger = index === 0 && item.reportCount > 0;
      const progressPercent = Math.min(100, Math.round((item.reportCount / maxReports) * 100));

      const itemEl = document.createElement('div');
      itemEl.className = `wx-ranking-item ${isTopDanger ? 'is-top-danger' : ''}`;
      itemEl.innerHTML = `
        <div class="wx-ranking-item-top">
          <div class="wx-ranking-item-name">
            <span>#${index + 1}</span> ${item.name}
          </div>
          <span class="wx-ranking-item-count ${isTopDanger ? 'danger' : ''}">
            ${item.reportCount} ${item.reportCount === 1 ? 'reporte' : 'reportes'}
          </span>
        </div>
        <div class="wx-prog-bar">
          <div class="wx-prog-bar-fill" style="width: ${progressPercent}%;"></div>
        </div>
        ${isTopDanger ? '<div style="font-size: 0.74rem; color: #dc2626; font-weight: 800;">Zona de Mayor Vulnerabilidad Hídrica (Prioridad de limpieza)</div>' : ''}
      `;
      rankingListEl.appendChild(itemEl);
    });
  },

  renderReportsFeed() {
    const feedContainer = document.getElementById('reports-feed-container');
    if (!feedContainer) return;

    const recent = AppState.reports.slice(0, 6);
    if (recent.length === 0) {
      feedContainer.innerHTML = '<p style="color: var(--wx-text-muted); font-size: 0.85rem;">No hay reportes registrados aún.</p>';
      return;
    }

    feedContainer.innerHTML = '';
    recent.forEach(r => {
      const pt = CRITICAL_POINTS.find(p => p.id === r.pointId);
      const ptName = pt ? pt.name : r.pointId;
      const dateStr = new Date(r.timestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

      const severityText = r.severity === '3' ? '<span class="badge-dot dot-red"></span> Taponamiento alto' : (r.severity === '2' ? '<span class="badge-dot dot-amber"></span> Taponamiento medio' : '<span class="badge-dot dot-green"></span> Paso leve');

      const card = document.createElement('div');
      card.className = 'wx-feed-item';
      card.innerHTML = `
        <div class="wx-feed-item-header">
          <span class="wx-feed-item-point">${ptName}</span>
          <span class="wx-feed-item-time">${dateStr}</span>
        </div>
        <div class="wx-feed-item-waste"><strong>Material:</strong> ${r.wasteType}</div>
        <div style="color: var(--wx-text-body); font-style: italic; font-size: 0.82rem;">${r.note ? `"${r.note}"` : 'Sin comentarios adicionales.'}</div>
        <div class="wx-feed-item-meta">
          <span>${severityText}</span>
          <span>Por: ${r.author || 'Vecino anónimo'}</span>
        </div>
      `;
      feedContainer.appendChild(card);
    });
  }
};

function showToast(message) {
  let toast = document.getElementById('app-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Configuración de la Barra de Navegación Inferior Móvil (Mobile Bottom Bar)
function setupMobileBottomNav() {
  const tabs = document.querySelectorAll('.wx-tab-item, .app-tab-item');
  if (!tabs.length) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      if ('vibrate' in navigator) {
        try { navigator.vibrate(15); } catch (err) {}
      }
    });
  });

  // Rastreo automático de sección activa según el scroll en celular
  const sections = ['inicio', 'panel-simulacion', 'seccion-clima', 'puntos-criticos', 'seccion-reporte', 'seccion-ranking'];
  window.addEventListener('scroll', () => {
    const scrollPos = window.scrollY + 200;

    sections.forEach(secId => {
      const el = document.getElementById(secId);
      if (el) {
        const top = el.offsetTop;
        const height = el.offsetHeight;
        if (scrollPos >= top && scrollPos < top + height) {
          tabs.forEach(t => {
            if (t.getAttribute('data-target') === secId || t.getAttribute('href') === `#${secId}`) {
              t.classList.add('active');
            } else {
              t.classList.remove('active');
            }
          });
        }
      }
    });
  }, { passive: true });
}

function setupEventListeners() {
  const btnSimSoft = document.getElementById('btn-sim-soft');
  const btnSimHard = document.getElementById('btn-sim-hard');
  const btnSimReset = document.getElementById('btn-sim-reset');

  function setDockActive(btn) {
    [btnSimSoft, btnSimHard, btnSimReset].forEach(b => {
      if (b) b.classList.remove('active');
    });
    if (btn) btn.classList.add('active');
  }

  if (btnSimSoft) {
    btnSimSoft.addEventListener('click', () => {
      AppState.simulationMode = 'SOFT';
      setDockActive(btnSimSoft);
      evaluateAlertLevel();
      showToast('Simulación de alerta preventiva activada (40-60 min)');
    });
  }

  if (btnSimHard) {
    btnSimHard.addEventListener('click', () => {
      AppState.simulationMode = 'AGGRESSIVE';
      setDockActive(btnSimHard);
      evaluateAlertLevel();
      showToast('Simulación de alerta de emergencia activada (Sirena + Vibración)');
    });
  }

  if (btnSimReset) {
    btnSimReset.addEventListener('click', () => {
      AppState.simulationMode = null;
      setDockActive(btnSimReset);
      AudioSynthesizer.stopEmergencySiren();
      evaluateAlertLevel();
      showToast('Restablecido a datos meteorológicos satelitales en vivo');
    });
  }

  const btnRefresh = document.getElementById('btn-refresh-weather');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => {
      WeatherService.fetchQuibdoWeather();
    });
  }

  const reportForm = document.getElementById('form-citizen-report');
  if (reportForm) {
    reportForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const pointSelect = document.getElementById('rep-point-select');
      const wasteSelect = document.getElementById('rep-waste-select');
      const severitySelect = document.getElementById('rep-severity-select');
      const noteInput = document.getElementById('rep-notes-input');
      const authorInput = document.getElementById('rep-author-input');

      if (!pointSelect.value) {
        alert('Por favor elija un punto crítico de la lista.');
        return;
      }

      ReportsManager.addReport({
        pointId: pointSelect.value,
        wasteType: wasteSelect.value,
        severity: severitySelect.value,
        note: noteInput.value.trim(),
        author: authorInput.value.trim() || 'Vecino de Quibdó'
      });

      noteInput.value = '';
      authorInput.value = '';
    });
  }

  const btnResetData = document.getElementById('btn-reset-reports');
  if (btnResetData) {
    btnResetData.addEventListener('click', () => {
      if (confirm('¿Desea restablecer los reportes a los valores iniciales de prueba?')) {
        ReportsManager.resetReportsToDefault();
      }
    });
  }

  const btnForceReload = document.getElementById('btn-force-reload');
  if (btnForceReload) {
    btnForceReload.addEventListener('click', async () => {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let registration of registrations) {
          await registration.unregister();
        }
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        for (let key of keys) {
          await caches.delete(key);
        }
      }
      window.location.reload(true);
    });
  }

  const installBtn = document.getElementById('btn-pwa-install');
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    AppState.deferredPWAInstallPrompt = e;
    if (installBtn) {
      installBtn.style.display = 'inline-flex';
      installBtn.addEventListener('click', async () => {
        if (AppState.deferredPWAInstallPrompt) {
          AppState.deferredPWAInstallPrompt.prompt();
          await AppState.deferredPWAInstallPrompt.userChoice;
          AppState.deferredPWAInstallPrompt = null;
          installBtn.style.display = 'none';
        }
      });
    }
  });

  function updateNetworkStatus() {
    const badge = document.getElementById('network-status-badge');
    if (!badge) return;
    const textSpan = badge.querySelector('.status-text') || badge;
    if (navigator.onLine) {
      textSpan.textContent = 'En línea';
      badge.className = 'wx-badge wx-badge-online';
    } else {
      textSpan.textContent = 'Sin conexión';
      badge.className = 'wx-badge';
      showToast('Sin señal celular: funcionando en modo autónomo local');
    }
  }

  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
  updateNetworkStatus();

  document.addEventListener('click', () => {
    if (AppState.audioContext && AppState.audioContext.state === 'suspended') {
      AppState.audioContext.resume();
    }
  }, { once: true });

  setupMobileBottomNav();
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => {
          console.log('Service Worker activo en:', reg.scope);
        })
        .catch(err => {
          console.error('Error registrando Service Worker:', err);
        });
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const pointSelect = document.getElementById('rep-point-select');
  if (pointSelect) {
    pointSelect.innerHTML = '<option value="" disabled selected>Seleccione un caño o rejilla...</option>';
    CRITICAL_POINTS.forEach(pt => {
      const opt = document.createElement('option');
      opt.value = pt.id;
      opt.textContent = `${pt.name}`;
      pointSelect.appendChild(opt);
    });
  }

  ReportsManager.loadReports();
  ReportsManager.updateUI();
  setupEventListeners();
  registerServiceWorker();

  WeatherService.fetchQuibdoWeather();

  setInterval(() => {
    if (!AppState.simulationMode && navigator.onLine) {
      WeatherService.fetchQuibdoWeather();
    }
  }, CONFIG.AUTO_REFRESH_INTERVAL_MS);
});
