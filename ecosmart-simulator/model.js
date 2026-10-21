/**
 * Modelo didáctico de EcoSmart UCS Table. Resultados estimados, no mediciones.
 * La potencia está en W; la energía en Wh; el tiempo simulado en horas.
 * Véanse los supuestos y las fuentes en README.md.
 */
export const CONFIG = Object.freeze({
  solarRatedW: 300,
  solarDerating: 0.85,
  solarReferenceIrradiance: 1000,
  windRatedW: 150,
  windCutIn: 3,
  windRatedSpeed: 12,
  windCutOut: 25,
  batteryCapacityWh: 240,
  phoneW: 15,
  maxPhones: 6,
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const finite = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

/** Irradiancia incidente efectiva sobre los paneles, no iluminancia en lux. */
export function calculatePower({ irradiance = 0, wind = 0, phones = 0 } = {}) {
  const sunlight = clamp(finite(irradiance), 0, CONFIG.solarReferenceIrradiance);
  const velocity = clamp(finite(wind), 0, CONFIG.windCutOut);
  const phoneCount = clamp(Math.round(finite(phones)), 0, CONFIG.maxPhones);
  const solarW = CONFIG.solarRatedW * sunlight / CONFIG.solarReferenceIrradiance
    * CONFIG.solarDerating;
  let windW = 0;
  let windStatus = 'Sin viento útil';

  if (velocity >= CONFIG.windCutOut) {
    windStatus = 'Protección por viento fuerte';
  } else if (velocity >= CONFIG.windRatedSpeed) {
    windW = CONFIG.windRatedW;
    windStatus = 'Potencia nominal';
  } else if (velocity > CONFIG.windCutIn) {
    windW = CONFIG.windRatedW
      * (velocity ** 3 - CONFIG.windCutIn ** 3)
      / (CONFIG.windRatedSpeed ** 3 - CONFIG.windCutIn ** 3);
    windStatus = 'Generando';
  }

  const totalW = solarW + windW;
  const loadW = phoneCount * CONFIG.phoneW;
  return { solarW, windW, totalW, loadW, netW: totalW - loadW, windStatus };
}

/** La reserva inicial no se contabiliza como energía generada. */
export function createState(initialBatteryPct = 60) {
  return {
    elapsedHours: 0,
    solarWh: 0,
    windWh: 0,
    batteryWh: CONFIG.batteryCapacityWh * clamp(finite(initialBatteryPct, 60), 0, 100) / 100,
    servedWh: 0,
    unservedWh: 0,
    curtailedWh: 0,
  };
}

/**
 * Avanza con condiciones constantes durante dtHours, sin modificar state.
 * Balance: reserva inicial + generación = batería + consumo servido + excedente.
 * El límite de almacenamiento se integra exactamente, incluso dentro del paso.
 * Batería ideal: sin pérdidas, reserva mínima ni límite de potencia de carga.
 */
export function advance(state, power, dtHours) {
  const dt = Math.max(0, finite(dtHours));
  const solarWh = Math.max(0, finite(power.solarW)) * dt;
  const windWh = Math.max(0, finite(power.windW)) * dt;
  const generatedWh = solarWh + windWh;
  const demandWh = Math.max(0, finite(power.loadW)) * dt;
  const batteryBefore = clamp(finite(state.batteryWh), 0, CONFIG.batteryCapacityWh);
  const balanceWh = generatedWh - demandWh;
  let batteryWh;
  let servedWh;
  let unservedWh = 0;
  let curtailedWh = 0;

  if (balanceWh >= 0) {
    const storedWh = Math.min(balanceWh, CONFIG.batteryCapacityWh - batteryBefore);
    batteryWh = batteryBefore + storedWh;
    servedWh = demandWh;
    curtailedWh = balanceWh - storedWh;
  } else {
    const drawnWh = Math.min(-balanceWh, batteryBefore);
    batteryWh = batteryBefore - drawnWh;
    servedWh = generatedWh + drawnWh;
    unservedWh = demandWh - servedWh;
  }

  return {
    elapsedHours: state.elapsedHours + dt,
    solarWh: state.solarWh + solarWh,
    windWh: state.windWh + windWh,
    batteryWh,
    servedWh: state.servedWh + servedWh,
    unservedWh: state.unservedWh + unservedWh,
    curtailedWh: state.curtailedWh + curtailedWh,
  };
}
