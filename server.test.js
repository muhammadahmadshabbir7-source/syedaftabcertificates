const test = require('node:test');
const assert = require('node:assert/strict');
const {
  generateStableId,
  normalizeTrainingRecord,
  parseEnvFile
} = require('./lib/portfolio-api');

test('parseEnvFile reads simple env values', () => {
  assert.deepEqual(parseEnvFile('A=one\nB="two"\n# ignored\nC=three=four'), {
    A: 'one',
    B: 'two',
    C: 'three=four'
  });
});

test('normalizeTrainingRecord fills app defaults', () => {
  const record = normalizeTrainingRecord({
    title: 'Example Seminar',
    provider: 'Example Provider',
    date: '2026-06-12',
    images: 'one.jpg'
  });

  assert.equal(record.id, 'example-seminar-example-provider-2026-06-12');
  assert.equal(record.type, 'Seminar');
  assert.equal(record.duration, '1 Day');
  assert.deepEqual(record.images, ['one.jpg']);
});
