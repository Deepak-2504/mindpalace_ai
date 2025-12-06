import { MemoryPalace } from '../types';

const STORAGE_KEY = 'mindpalace_data_v1';

export const getPalaces = (): MemoryPalace[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to load palaces", error);
    return [];
  }
};

export const getPalaceById = (id: string): MemoryPalace | undefined => {
  const palaces = getPalaces();
  return palaces.find(p => p.id === id);
};

export const savePalace = (palace: MemoryPalace): void => {
  const palaces = getPalaces();
  const index = palaces.findIndex(p => p.id === palace.id);
  
  if (index >= 0) {
    palaces[index] = palace;
  } else {
    palaces.push(palace);
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(palaces));
};

export const deletePalace = (id: string): void => {
  const palaces = getPalaces().filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(palaces));
};
