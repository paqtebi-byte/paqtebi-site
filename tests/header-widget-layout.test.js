import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appSource = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');

test('header social placeholder links are removed', () => {
  assert.doesNotMatch(appSource, /\["Facebook", "Twitter", "YouTube", "Instagram"\]/);
});

test('live date and time are rendered below weather in the hero widget group', () => {
  assert.match(appSource, /<WeatherWidget \/>[\s\S]*?<time[^>]+dateTime=\{currentDateTime\.toISOString\(\)\}/);
  assert.match(appSource, /window\.setInterval\(updateDateTime, 30_000\)/);
  assert.match(appSource, /formatGeorgianFullDate\(currentDateTime\)/);
});
