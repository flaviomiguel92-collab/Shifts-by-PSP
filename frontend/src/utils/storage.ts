import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage utility that works on both web and native
export const storage = {
  async getItem(key: string, strict = false): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
        if (strict) throw new Error('Armazenamento indisponível.');
        return null;
      }
      return await AsyncStorage.getItem(key);
    } catch (error) {
      if (strict) throw new Error('Não foi possível aceder à sessão guardada. Verifique o armazenamento do dispositivo.');
      console.error('Storage getItem error:', error);
      return null;
    }
  },

  async setItem(key: string, value: string, strict = false): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
        } else if (strict) {
          throw new Error('Armazenamento indisponível.');
        }
        return;
      }
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      if (strict) throw new Error('Não foi possível aceder à sessão guardada. Verifique o armazenamento do dispositivo.');
      console.error('Storage setItem error:', error);
    }
  },

  async removeItem(key: string, strict = false): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        } else if (strict) {
          throw new Error('Armazenamento indisponível.');
        }
        return;
      }
      await AsyncStorage.removeItem(key);
    } catch (error) {
      if (strict) throw new Error('Não foi possível aceder à sessão guardada. Verifique o armazenamento do dispositivo.');
      console.error('Storage removeItem error:', error);
    }
  },
};
