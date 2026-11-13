import { storage } from '../utils/storage';

// Serialize credential changes so an old request cannot delete a newer login.
let pending: Promise<unknown> = Promise.resolve();
let revision = 0;
const listeners = new Set<() => void>();

function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const result = pending.then(operation);
  pending = result.catch(() => {});
  return result;
}

export const session = {
  get revision() { return revision; },
  read: () => serialize(() => storage.getItem('session_token', true)),
  save: (token: string) => serialize(async () => {
    if (!token || typeof token !== 'string') throw new Error('Sessão inválida.');
    await storage.setItem('session_token', token, true);
    if (await storage.getItem('session_token', true) !== token) {
      throw new Error('Não foi possível guardar a sessão neste dispositivo.');
    }
    revision++;
  }),
  invalidate: (token: string) => serialize(async () => {
    if (await storage.getItem('session_token', true) !== token) return;
    try {
      await storage.removeItem('session_token', true);
    } finally {
      revision++;
      listeners.forEach((listener) => listener());
    }
  }),
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
};
