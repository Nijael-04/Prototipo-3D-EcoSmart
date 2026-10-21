import { CONFIG, calculatePower, createState, advance } from './model.js';

const $ = id => document.getElementById(id);
const number = (value, digits = 1) => new Intl.NumberFormat('es-PE', {minimumFractionDigits: digits, maximumFractionDigits: digits}).format(value);
const formatTime = hours => {
  const seconds = Math.floor(hours * 3600 + 1e-6);
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map(v => String(v).padStart(2, '0')).join(':');
};
let environment = { irradiance: 750, wind: 7, phones: 2 };
let power = calculatePower(environment);
let state = createState();
let running = false;
let speed = 60;
let scene = null;
let previousFrame = null;
let sampleSeconds = 0;
let uiSeconds = 0;
let history = [];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function record() {
  const sample = {...environment, ...power, ...state};
  const last = history.at(-1);
  if (last && last.elapsedHours === sample.elapsedHours && last.solarW === sample.solarW && last.windW === sample.windW && last.loadW === sample.loadW) return;
  history.push(sample);
}

function drawChart() {
  const samples = history.slice(-180);
  $('chart-empty').hidden = samples.length < 2;
  $('chart-empty').style.display = samples.length < 2 ? 'grid' : 'none';
  if (samples.length < 2) {
    ['solar-line','wind-line','solar-area'].forEach(id => $(id).setAttribute('d', ''));
    $('chart-start').textContent = 'Inicio'; $('chart-end').textContent = 'Tiempo simulado';
    return;
  }
  const start = samples[0].elapsedHours;
  const end = samples.at(-1).elapsedHours;
  const span = Math.max(end - start, 1 / 3600);
  const points = key => samples.map((sample, i) => `${i ? 'L' : 'M'}${(35 + (sample.elapsedHours - start) / span * 590).toFixed(2)},${(135 - Math.min(sample[key],300) / 300 * 120).toFixed(2)}`).join(' ');
  const solar = points('solarW');
  $('solar-line').setAttribute('d', solar);
  $('wind-line').setAttribute('d', points('windW'));
  $('solar-area').setAttribute('d', `${solar} L625,135 L35,135 Z`);
  $('chart-start').textContent = formatTime(start);
  $('chart-end').textContent = formatTime(end);
  $('history-chart').setAttribute('aria-label', `Historial de potencia. Última lectura: solar ${number(power.solarW)} W, eólica ${number(power.windW)} W. Desde ${formatTime(start)} hasta ${formatTime(end)} de tiempo simulado.`);
}

function updateUI() {
  ['solar','wind','total'].forEach(key => $(key + '-power').textContent = number(power[key + 'W']));
  $('solar-energy').textContent = number(state.solarWh);
  $('wind-energy').textContent = number(state.windWh);
  $('total-energy').textContent = number(state.solarWh + state.windWh);
  $('solar-meter').style.width = `${power.solarW / CONFIG.solarRatedW * 100}%`;
  $('wind-meter').style.width = `${power.windW / CONFIG.windRatedW * 100}%`;
  $('split-solar').style.width = `${power.totalW ? power.solarW / power.totalW * 100 : 0}%`;
  $('split-wind').style.width = `${power.totalW ? power.windW / power.totalW * 100 : 0}%`;
  const batteryPct = state.batteryWh / CONFIG.batteryCapacityWh * 100;
  $('battery-percent').textContent = number(batteryPct, 0);
  $('battery-wh').textContent = number(state.batteryWh);
  $('battery-fill').style.width = `${batteryPct}%`;
  $('battery-progress').setAttribute('aria-valuenow', String(Math.round(batteryPct)));
  $('battery-progress').classList.toggle('low', batteryPct < 15);
  $('load-power').textContent = number(power.loadW, 0);
  $('balance-power').textContent = `${power.netW > 0 ? '+' : ''}${number(power.netW)} W`;
  $('balance-power').style.color = power.netW < 0 ? '#a47642' : '';
  $('phones-count').textContent = environment.phones;
  $('phones-minus').disabled = environment.phones === 0;
  $('phones-plus').disabled = environment.phones === CONFIG.maxPhones;
  $('wind-kmh').textContent = number(environment.wind * 3.6);
  $('wind-status').textContent = power.windStatus;
  $('weather-label').textContent = `${environment.irradiance === 0 ? 'Sin sol' : environment.irradiance < 400 ? 'Luz tenue' : 'Luz de día'} · ${environment.wind < 3 ? 'Calma' : environment.wind < 12 ? 'Brisa' : 'Viento fuerte'}`;
  $('elapsed').textContent = formatTime(state.elapsedHours);
  $('run-status').textContent = running ? 'En marcha' : state.elapsedHours > 0 ? 'En pausa' : 'Listo';
  $('run-status').classList.toggle('running', running);
  $('play-label').textContent = running ? 'Pausar' : state.elapsedHours > 0 ? 'Continuar' : 'Iniciar ensayo';
  $('play-icon').textContent = running ? 'Ⅱ' : '▶';
  $('play').setAttribute('aria-label', running ? 'Pausar ensayo' : state.elapsedHours > 0 ? 'Continuar ensayo' : 'Iniciar ensayo');
  $('quick-play').textContent = running ? 'Ⅱ Pausar' : state.elapsedHours > 0 ? '▶ Continuar' : '▶ Iniciar ensayo';
  $('quick-play').setAttribute('aria-label', `${running ? 'Pausar ensayo' : state.elapsedHours > 0 ? 'Continuar ensayo' : 'Iniciar ensayo'} desde el modelo`);
  $('served-energy').textContent = number(state.servedWh);
  $('unserved-energy').textContent = number(state.unservedWh);
  $('curtailed-energy').textContent = number(state.curtailedWh);
  let status = 'En equilibrio';
  let note = 'La generación coincide con la demanda de los celulares.';
  if (power.netW > 0.01) {
    status = state.batteryWh >= CONFIG.batteryCapacityWh - 0.0001 ? 'Batería llena' : running ? 'Cargando' : 'Puede cargar';
    note = state.batteryWh >= CONFIG.batteryCapacityWh - 0.0001 ? 'Batería llena: la energía sobrante queda sin almacenar.' : 'La generación cubre la carga y puede llenar la batería.';
  } else if (power.netW < -0.01) {
    status = state.batteryWh <= 0.0001 ? 'Batería agotada' : running ? 'Descargando' : 'Usará la reserva';
    note = state.batteryWh <= 0.0001 ? 'No hay reserva suficiente: parte de la demanda queda sin cubrir.' : 'La batería aporta la energía que falta para cargar los celulares.';
  } else if (!power.loadW && !power.totalW) { status = 'Sin consumo'; note = 'Sin generación ni celulares conectados, la reserva permanece estable.'; }
  $('battery-status').textContent = status;
  $('supply-note').textContent = note;
}

function refreshEnvironment() {
  power = calculatePower(environment);
  for (const [id, max] of [['irradiance', 1000], ['wind', 25]]) {
    $(id).value = environment[id]; $(id + '-value').value = environment[id];
    $(id).style.setProperty('--fill', `${environment[id] / max * 100}%`);
  }
  if (state.elapsedHours > 0) record();
  updateUI(); drawChart();
}

function clearPreset() { document.querySelectorAll('[data-preset]').forEach(b => b.setAttribute('aria-pressed', 'false')); }
for (const [id, max, step] of [['irradiance',1000,10], ['wind',25,0.5]]) {
  $(id).addEventListener('input', event => {
    if (state.elapsedHours > 0) record();
    environment[id] = Number(event.target.value); clearPreset(); refreshEnvironment();
  });
  $(id + '-value').addEventListener('input', event => {
    if (event.target.value === '' || !Number.isFinite(event.target.valueAsNumber)) return;
    if (state.elapsedHours > 0) record();
    environment[id] = Math.min(max, Math.max(0, event.target.valueAsNumber));
    power = calculatePower(environment);
    $(id).value = environment[id];
    $(id).style.setProperty('--fill', `${environment[id] / max * 100}%`);
    clearPreset(); if (state.elapsedHours > 0) record(); updateUI(); drawChart();
  });
  $(id + '-value').addEventListener('change', event => {
    if (state.elapsedHours > 0) record();
    const value = Number(event.target.value);
    environment[id] = Math.round(Math.min(max, Math.max(0, Number.isFinite(value) ? value : 0)) / step) * step;
    clearPreset(); refreshEnvironment();
  });
}
const presets = { sunny: {irradiance:1000, wind:5}, cloudy: {irradiance:250, wind:8}, night: {irradiance:0, wind:9} };
document.querySelectorAll('[data-preset]').forEach(button => button.addEventListener('click', () => {
  if (state.elapsedHours > 0) record();
  environment = {...environment, ...presets[button.dataset.preset]};
  clearPreset(); button.setAttribute('aria-pressed', 'true'); refreshEnvironment();
}));
$('phones-minus').addEventListener('click', () => { if (state.elapsedHours > 0) record(); environment.phones = Math.max(0,environment.phones - 1); refreshEnvironment(); });
$('phones-plus').addEventListener('click', () => { if (state.elapsedHours > 0) record(); environment.phones = Math.min(CONFIG.maxPhones,environment.phones + 1); refreshEnvironment(); });
function togglePlayback() { running = !running; previousFrame = null; record(); updateUI(); drawChart(); }
$('play').addEventListener('click', togglePlayback);
$('quick-play').addEventListener('click', togglePlayback);
$('reset').addEventListener('click', () => {
  running = false; state = createState(); history = []; sampleSeconds = 0; previousFrame = null;
  updateUI(); drawChart();
});
$('speed').addEventListener('change', event => { speed = Number(event.target.value); previousFrame = null; });

document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
  scene?.setView(button.dataset.view);
  document.querySelectorAll('[data-view]').forEach(b => {const active = b === button; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active));});
}));
$('reset-camera').addEventListener('click', () => {
  scene?.resetCamera();
  document.querySelectorAll('[data-view]').forEach(b => {const active = b.dataset.view === 'overview'; b.classList.toggle('active',active); b.setAttribute('aria-pressed',String(active));});
});
const dialog = $('model-dialog');
document.querySelectorAll('[data-open-model]').forEach(button => button.addEventListener('click', () => dialog.showModal()));
['close-dialog','dialog-done'].forEach(id => $(id).addEventListener('click', () => dialog.close()));
dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });

$('export-csv').addEventListener('click', () => {
  record();
  const columns = [['Tiempo_h','elapsedHours'],['Radiacion_W_m2','irradiance'],['Viento_m_s','wind'],['Celulares','phones'],['Solar_W','solarW'],['Eolica_W','windW'],['Total_W','totalW'],['Demanda_W','loadW'],['Solar_Wh','solarWh'],['Eolica_Wh','windWh'],['Bateria_Wh','batteryWh'],['Entregada_Wh','servedWh'],['No_cubierta_Wh','unservedWh'],['Excedente_Wh','curtailedWh']];
  const csv = [columns.map(([name]) => name).join(';'), ...history.map(sample => columns.map(([,key]) => Number(sample[key]).toFixed(4).replace('.',',')).join(';'))].join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF',csv], {type:'text/csv;charset=utf-8;'}));
  const link = document.createElement('a'); link.href = url; link.download = 'EcoSmart_ensayo.csv'; link.click();
  setTimeout(() => URL.revokeObjectURL(url),1000);
});

// All numerical controls remain usable if WebGL is unavailable.
async function initializeScene() {
  try {
    const { createScene } = await import('./scene.js');
    scene = createScene($('scene'));
    $('scene-loading').remove();
  } catch (error) {
    const message = $('scene-loading');
    message.classList.add('scene-error');
    message.innerHTML = '<strong>La vista 3D necesita WebGL</strong><p>Prueba con Chrome, Edge o Firefox actualizado y la aceleración gráfica activada. Puedes seguir usando los controles y los cálculos de energía.</p>';
    document.querySelectorAll('[data-view],#reset-camera').forEach(b => b.disabled = true);
    console.error('No se pudo iniciar la vista 3D:', error);
  }
}

function frame(timestamp) {
  const dt = previousFrame === null ? 0 : Math.min((timestamp - previousFrame) / 1000, 0.25);
  previousFrame = timestamp;
  if (running && !document.hidden) {
    state = advance(state, power, dt * speed / 3600);
    sampleSeconds += dt;
    if (sampleSeconds >= 1) { sampleSeconds = 0; record(); drawChart(); }
  }
  uiSeconds += dt;
  if (uiSeconds >= 0.1) { uiSeconds = 0; updateUI(); }
  scene?.update({...environment, ...power, playing: !reducedMotion.matches, elapsedSeconds:timestamp / 1000});
  requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange', () => { previousFrame = null; });
window.addEventListener('pagehide', () => scene?.dispose(), {once:true});
refreshEnvironment(); initializeScene(); requestAnimationFrame(frame);
