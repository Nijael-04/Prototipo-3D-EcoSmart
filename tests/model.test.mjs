import assert from 'node:assert/strict';
import { CONFIG, calculatePower, createState, advance } from '../model.js';

let passed = 0;
const close = (actual, expected, label = '') => assert.ok(
  Math.abs(actual - expected) < 1e-8,
  `${label}: expected ${expected}, got ${actual}`,
);
const test = (name, fn) => {
  fn();
  passed += 1;
  console.log(`PASS ${name}`);
};
const conservation = (initialWh, state) => {
  close(initialWh + state.solarWh + state.windWh,
    state.batteryWh + state.servedWh + state.curtailedWh, 'energy conservation');
  assert.ok(state.batteryWh >= 0 && state.batteryWh <= CONFIG.batteryCapacityWh);
};

test('night and calm produce no generation', () => {
  assert.deepEqual(calculatePower({ irradiance: 0, wind: 0, phones: 0 }), {
    solarW: 0, windW: 0, totalW: 0, loadW: 0, netW: 0, windStatus: 'Sin viento útil',
  });
});

test('solar output and integer phone demand use stated assumptions', () => {
  close(calculatePower({ irradiance: 1000 }).solarW, 255);
  close(calculatePower({ irradiance: 500 }).solarW, 127.5);
  close(calculatePower({ phones: 6 }).loadW, 90);
  close(calculatePower({ phones: 2.4 }).loadW, 30);
});

test('wind starts at cut-in, increases monotonically, caps and stops at cut-out', () => {
  close(calculatePower({ wind: 3 }).windW, 0);
  let previous = 0;
  for (let v = 3.1; v < 12; v += 0.1) {
    const current = calculatePower({ wind: v }).windW;
    assert.ok(current > previous && current < 150);
    previous = current;
  }
  close(calculatePower({ wind: 12 }).windW, 150);
  close(calculatePower({ wind: 24.9 }).windW, 150);
  close(calculatePower({ wind: 25 }).windW, 0);
  assert.equal(calculatePower({ wind: 25 }).windStatus, 'Protección por viento fuerte');
});

test('input boundaries prevent invalid generation and demand', () => {
  close(calculatePower({ irradiance: -1, wind: -1, phones: -1 }).totalW, 0);
  close(calculatePower({ irradiance: 2000, phones: 50 }).solarW, 255);
  close(calculatePower({ irradiance: 2000, phones: 50 }).loadW, 90);
  close(calculatePower({ irradiance: NaN, wind: Infinity }).totalW, 0);
  close(createState(-10).batteryWh, 0);
  close(createState(110).batteryWh, 240);
});

test('empty battery supplies only generated energy after reserve exhaustion', () => {
  const original = createState(10); // 24 Wh available.
  const state = advance(original, calculatePower({ phones: 6 }), 1);
  close(state.batteryWh, 0);
  close(state.servedWh, 24);
  close(state.unservedWh, 66);
  conservation(24, state);
  close(original.batteryWh, 24); // No in-place mutation.
});

test('battery filling within an interval preserves surplus as curtailment', () => {
  const original = createState(90); // 216 Wh; 24 Wh of free capacity.
  const state = advance(original, calculatePower({ irradiance: 1000, phones: 2 }), 1);
  close(state.batteryWh, 240);
  close(state.servedWh, 30);
  close(state.curtailedWh, 201);
  close(state.solarWh, 255);
  conservation(216, state);
});

test('generation serves load while battery drains, with correct partial service', () => {
  const original = createState(10);
  const state = advance(original, calculatePower({ irradiance: 100, phones: 6 }), 2);
  close(state.solarWh, 51);
  close(state.batteryWh, 0);
  close(state.servedWh, 75);
  close(state.unservedWh, 105);
  conservation(24, state);
});

test('large step equals many small steps under the same conditions', () => {
  for (const input of [
    { irradiance: 1000, wind: 12, phones: 2 },
    { irradiance: 10, wind: 2, phones: 6 },
  ]) {
    const power = calculatePower(input);
    const once = advance(createState(), power, 12);
    let many = createState();
    for (let i = 0; i < 1200; i++) many = advance(many, power, 0.01);
    for (const key of Object.keys(once)) close(many[key], once[key], key);
    conservation(144, many);
  }
});

test('changing conditions conserve energy and requested demand over a day', () => {
  let state = createState();
  let demand = 0;
  for (let minute = 0; minute < 1440; minute++) {
    const irradiance = Math.max(0, 1000 * Math.sin((minute - 360) * Math.PI / 720));
    const wind = 5 + 5 * Math.sin(minute / 78);
    const power = calculatePower({ irradiance, wind, phones: 6 });
    state = advance(state, power, 1 / 60);
    demand += power.loadW / 60;
    conservation(144, state);
  }
  close(state.elapsedHours, 24);
  close(state.servedWh + state.unservedWh, demand);
});

test('zero, negative and non-finite elapsed time leave state unchanged', () => {
  const original = createState();
  for (const dt of [0, -1, NaN, Infinity]) {
    assert.deepEqual(advance(original, calculatePower({ irradiance: 1000 }), dt), original);
  }
});

console.log(`\n${passed} model checks passed.`);

