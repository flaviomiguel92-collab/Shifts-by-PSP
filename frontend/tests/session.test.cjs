const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { createStore } = require('zustand/vanilla');

// Run the actual TypeScript stores and API with platform/network boundaries stubbed.
function app({ token, storageFailure = false, platform = 'native', timeout = false, fetch = async () => profile() } = {}) {
  const values = new Map(token ? [['session_token', token]] : []);
  let clears = 0;
  const data = { clearSyncedCollections() { clears++; } };
  const cache = new Map();
  const context = vm.createContext({
    console, process: { env: { EXPO_PUBLIC_API_URL: 'https://example.test' } },
    setTimeout: timeout ? (callback) => setTimeout(callback, 10) : setTimeout,
    clearTimeout, AbortController, fetch: (...args) => fetch(...args),
    window: { localStorage: {
      getItem: (key) => { if (storageFailure) throw Error('unavailable'); return values.get(key) ?? null; },
      setItem: (key, value) => { if (storageFailure) throw Error('unavailable'); values.set(key, value); },
      removeItem: (key) => values.delete(key),
    } },
  });
  function load(file) {
    file = path.resolve(__dirname, '..', file);
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} };
    cache.set(file, module);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    const req = (name) => {
      if (name === 'zustand') return { create: (initializer) => createStore(initializer) };
      if (name.endsWith('/dataStore')) return { useDataStore: { getState: () => data } };
      if (name === 'react-native') return { Platform: { OS: platform } };
      if (name === '@react-native-async-storage/async-storage') return {
        getItem: async (key) => { if (storageFailure) throw Error('unavailable'); return values.get(key) ?? null; },
        setItem: async (key, value) => { if (storageFailure) throw Error('unavailable'); values.set(key, value); },
        removeItem: async (key) => values.delete(key),
      };
      return load(path.resolve(path.dirname(file), name + '.ts'));
    };
    vm.runInContext(`(function(require,module,exports){${code}\n})`, context)(req, module, module.exports);
    return module.exports;
  }
  const store = load('src/store/authStore.ts').useAuthStore;
  return { store, values, session: load('src/services/session.ts').session,
    api: load('src/services/api.ts'), clears: () => clears };
}
const user = { user_id: 'test-user', name: 'Test', email: 'user@example.test' };
const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json' },
});
const profile = () => json(user);
const deferred = () => { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; };

for (const platform of ['web', 'native']) {
  test(`${platform} opens with saved credentials before the server responds`, async () => {
    const started = deferred();
    const response = deferred();
    const a = app({ token: 'saved', platform, fetch: () => {
      started.resolve();
      return response.promise;
    } });
    const validation = a.store.getState().checkAuth();
    await started.promise;
    // The network promise is still unresolved, so this proves that opening the
    // app is independent of server latency rather than merely a fast response.
    assert.equal(a.store.getState().isAuthenticated, true);
    assert.equal(a.store.getState().sessionToken, 'saved');
    assert.equal(a.store.getState().user, null);
    response.resolve(profile());
    assert.equal(await validation, true);
    assert.equal(a.store.getState().user.user_id, user.user_id);
  });
}

test('background validation still rejects a revoked remembered session', async () => {
  const response = deferred();
  const started = deferred();
  const a = app({ token: 'revoked', fetch: () => { started.resolve(); return response.promise; } });
  const validation = a.store.getState().checkAuth();
  await started.promise;
  assert.equal(a.store.getState().isAuthenticated, true);
  response.resolve(json({}, 401));
  assert.equal(await validation, false);
  assert.equal(a.store.getState().status, 'anonymous');
  assert.equal(a.values.has('session_token'), false);
});

test('restores saved session and profile without login', async () => {
  const a = app({ token: 'saved', fetch: async (_, init) => {
    assert.equal(init.headers.Authorization, 'Bearer saved'); return profile();
  } });
  assert.equal(await a.store.getState().checkAuth(), true);
  assert.equal(a.store.getState().user.user_id, user.user_id);
  assert.equal(a.store.getState().status, 'authenticated');
});
test('missing credentials require login', async () => {
  const a = app();
  assert.equal(await a.store.getState().checkAuth(), false);
  assert.equal(a.store.getState().status, 'anonymous');
});
test('web restores persisted localStorage credentials', async () => {
  const a = app({ token: 'web-saved', platform: 'web' });
  assert.equal(await a.store.getState().checkAuth(), true);
  assert.equal(a.store.getState().sessionToken, 'web-saved');
});
test('web login reports blocked localStorage', async () => {
  const a = app({ platform: 'web', storageFailure: true, fetch: async () => json({ user, session_token: 'new' }) });
  await assert.rejects(a.store.getState().login('user@example.test', 'Password1'));
  assert.equal(a.store.getState().isAuthenticated, false);
});
test('timeout keeps the app open with saved credentials', async () => {
  const a = app({ token: 'saved', timeout: true, fetch: (_, init) => new Promise((_, reject) => {
    init.signal.addEventListener('abort', () => reject(Error('timeout')));
  }) });
  assert.equal(await a.store.getState().checkAuth(), true);
  assert.equal(a.values.get('session_token'), 'saved');
  assert.equal(a.store.getState().status, 'unavailable');
  assert.equal(a.store.getState().isLoading, false);
});
for (const failure of [async () => json({}, 503), async () => { throw Error('offline'); }]) {
  test('temporary failure preserves token and allows retry without login', async () => {
    let fail = true;
    const a = app({ token: 'saved', fetch: (...args) => fail ? failure(...args) : Promise.resolve(profile()) });
    assert.equal(await a.store.getState().checkAuth(), true);
    assert.equal(a.values.get('session_token'), 'saved');
    assert.equal(a.store.getState().status, 'unavailable');
    assert.equal(a.store.getState().isAuthenticated, true);
    fail = false;
    assert.equal(await a.store.getState().checkAuth(), true);
  });
}
test('401 clears credentials, profile and user data together', async () => {
  const a = app({ token: 'saved', fetch: async () => json({}, 401) });
  await a.store.getState().checkAuth();
  assert.equal(a.values.has('session_token'), false);
  assert.equal(a.store.getState().status, 'anonymous');
  assert.equal(a.store.getState().user, null);
  assert.ok(a.clears() > 0);
});
test('concurrent validation shares one request', async () => {
  const d = deferred(); let requests = 0;
  const a = app({ token: 'saved', fetch: () => { requests++; return d.promise; } });
  const first = a.store.getState().checkAuth();
  const second = a.store.getState().checkAuth();
  d.resolve(profile());
  await Promise.all([first, second]);
  assert.equal(requests, 1);
});
test('storage failure keeps restoration retryable instead of showing login', async () => {
  const a = app({ storageFailure: true });
  await a.store.getState().checkAuth();
  assert.equal(a.store.getState().status, 'unavailable');
});
test('login cannot report success when token persistence fails', async () => {
  const a = app({ storageFailure: true, fetch: async () => json({ user, session_token: 'new' }) });
  await assert.rejects(a.store.getState().login('user@example.test', 'Password1'), /sessão guardada/);
  assert.equal(a.store.getState().isAuthenticated, false);
});
test('login persists credentials that a fresh app instance can restore', async () => {
  const a = app({ fetch: async () => json({ user, session_token: 'new' }) });
  await a.store.getState().login('user@example.test', 'Password1');
  const reopened = app({ token: a.values.get('session_token') });
  assert.equal(await reopened.store.getState().checkAuth(), true);
});
test('late 401 from previous session cannot remove new login', async () => {
  const d = deferred(); const started = deferred();
  const a = app({ token: 'old', fetch: () => { started.resolve(); return d.promise; } });
  const request = a.api.getShifts();
  await started.promise;
  await a.session.save('new');
  d.resolve(json({}, 401));
  await assert.rejects(request);
  assert.equal(a.values.get('session_token'), 'new');
});
test('late successful response cannot populate data for a different account', async () => {
  const d = deferred(); const started = deferred();
  const a = app({ token: 'old', fetch: () => { started.resolve(); return d.promise; } });
  const request = a.api.getShifts();
  await started.promise;
  await a.session.save('new');
  d.resolve(json([{ id: 'private-old-user' }]));
  await assert.rejects(request, /sessão mudou/);
});
test('late validation cannot resurrect a logged-out session', async () => {
  const d = deferred(); const started = deferred();
  const a = app({ token: 'old', fetch: () => { started.resolve(); return d.promise; } });
  const request = a.store.getState().checkAuth();
  await started.promise;
  await a.session.invalidate('old');
  d.resolve(profile());
  assert.equal(await request, false);
  assert.equal(a.store.getState().status, 'anonymous');
});
test('runtime 401 invalidates the store as well as storage', async () => {
  let reject = false;
  const a = app({ token: 'saved', fetch: async () => reject ? json({}, 401) : profile() });
  await a.store.getState().checkAuth();
  reject = true;
  await assert.rejects(a.api.getShifts());
  assert.equal(a.store.getState().isAuthenticated, false);
  assert.equal(a.store.getState().sessionToken, null);
});
test('explicit logout removes credentials and clears private state', async () => {
  const a = app({ token: 'saved' });
  await a.store.getState().checkAuth();
  await a.store.getState().logout();
  assert.equal(a.values.has('session_token'), false);
  assert.equal(a.store.getState().user, null);
  assert.equal(a.store.getState().status, 'anonymous');
});
