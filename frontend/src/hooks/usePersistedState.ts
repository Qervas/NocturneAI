import { useState, useEffect } from 'react';
import { ChatMessage } from '../types/council';

export function usePersistedState<T>(
  key: string,
  defaultValue: T,
  options?: {
    serialize?: (value: T) => string;
    deserialize?: (value: string) => T;
  }
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const serialize = options?.serialize || JSON.stringify;
  const deserialize = options?.deserialize || JSON.parse;

  const [state, setState] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? deserialize(item) : defaultValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, serialize(state));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, state, serialize]);

  return [state, setState];
}

export function usePersistedMessages() {
  return usePersistedState<Record<string, ChatMessage[]>>('intelligence-empire-messages', {});
} 