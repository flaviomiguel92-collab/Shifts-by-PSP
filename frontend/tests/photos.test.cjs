const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/utils/photos.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const exportsObject = {};
vm.runInNewContext(code, { exports: exportsObject });
const { photoUri, validatePhotos } = exportsObject;

test('current data URIs are preserved for opening and downloading', () => {
  const uri = 'data:image/png;base64,iVBORw0KGgo=';
  assert.equal(photoUri(uri), uri);
});
test('legacy raw images receive the matching MIME type', () => {
  for (const [value, type] of [['iVBORw0KGgo=', 'png'], ['/9j/test', 'jpeg'], ['R0lGODtest', 'gif'], ['UklGRtest', 'webp']]) {
    assert.equal(photoUri(value), `data:image/${type};base64,${value}`);
  }
});
test('empty photo list permits removing the final photograph', () => {
  assert.doesNotThrow(() => validatePhotos([]));
});
test('rejects a sixth photo before upload', () => {
  assert.throws(() => validatePhotos(Array(6).fill('image')), /Máximo/);
});
test('rejects oversized photos before upload', () => {
  assert.throws(() => validatePhotos(['x'.repeat(3_000_001)]), /2 MB/);
});
