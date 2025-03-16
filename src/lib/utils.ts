import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function nanoid() {
  return Math.random().toString(36).substring(2, 10);
}

export function createLocalStorageListener(
  key: string,
  callback: (newValue: string | null) => void
) {
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === key) {
      callback(e.newValue);
    }
  };
  
  window.addEventListener('storage', handleStorageChange);
  return () => window.removeEventListener('storage', handleStorageChange);
}
