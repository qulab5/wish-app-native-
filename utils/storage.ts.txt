import AsyncStorage from '@react-native-async-storage/async-storage';

export const Storage = {
  async get(key: string, fallback: any = null) {
    try {
      const val = await AsyncStorage.getItem(key);
      if (val === null) return fallback;
      return JSON.parse(val);
    } catch {
      return fallback;
    }
  },
  async set(key: string, value: any) {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch {}
  },
  async remove(key: string) {
    try {
      await AsyncStorage.removeItem(key);
    } catch {}
  },
};
