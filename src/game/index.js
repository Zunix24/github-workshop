// Mission registry: chapters in deck order, progress persistence helpers.

import { missionsA } from './missionsA.js';
import { missionsB } from './missionsB.js';
import { missionsC } from './missionsC.js';
import { missionsD } from './missionsD.js';
import { missionsE } from './missionsE.js';
import { missionsF } from './missionsF.js';

export const MISSIONS = [
  ...missionsA,
  ...missionsB,
  ...missionsC,
  ...missionsD,
  ...missionsE,
  ...missionsF,
];

// Unique chapter names in first-appearance order.
export const CHAPTERS = MISSIONS.reduce((acc, m) => {
  let ch = acc.find((c) => c.name === m.chapter);
  if (!ch) {
    ch = { name: m.chapter, missions: [] };
    acc.push(ch);
  }
  ch.missions.push(m);
  return acc;
}, []);

export function getMission(id) {
  return MISSIONS.find((m) => m.id === id) || MISSIONS[0];
}

export function nextMission(id) {
  const i = MISSIONS.findIndex((m) => m.id === id);
  return i >= 0 && i < MISSIONS.length - 1 ? MISSIONS[i + 1] : null;
}

// Level locking: the first 4 missions are always open, then sequential
// unlock — previous mission completed (or the mission itself, for replays).
const FREE_PREVIEW = 4;

export function isUnlocked(mission, completedIds) {
  const idx = MISSIONS.findIndex((m) => m.id === mission.id);
  if (idx < 0 || idx < FREE_PREVIEW) return true;
  if (completedIds.includes(mission.id)) return true;
  const prev = MISSIONS[idx - 1];
  return !!prev && completedIds.includes(prev.id);
}

const PROGRESS_KEY = 'gitquest-progress-v1';

export function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveProgress(ids) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(ids));
  } catch {
    /* private mode — progress just won't persist */
  }
}
