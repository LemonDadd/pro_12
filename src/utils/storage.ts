import type { SaveData, GameSettings } from '@/types/game'

const STORAGE_KEY = 'breakout_save_v1'

const defaultSettings: GameSettings = {
  sfxVolume: 0.6,
  musicVolume: 0.4,
  showCenterMarker: true,
  mouseControl: true
}

const defaultSave: SaveData = {
  unlockedLevel: 1,
  highScores: {},
  starRatings: {},
  totalScore: 0,
  settings: defaultSettings,
  endlessHighScore: 0
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...defaultSave }
    const parsed = JSON.parse(raw)
    return {
      ...defaultSave,
      ...parsed,
      settings: { ...defaultSettings, ...(parsed.settings || {}) }
    }
  } catch {
    return { ...defaultSave }
  }
}

export function saveSave(data: SaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
  }
}

export function updateSettings(settings: Partial<GameSettings>): SaveData {
  const data = loadSave()
  data.settings = { ...data.settings, ...settings }
  saveSave(data)
  return data
}

export function recordLevelResult(levelId: number, score: number, stars: number): SaveData {
  const data = loadSave()
  if (!data.highScores[levelId] || score > data.highScores[levelId]) {
    data.highScores[levelId] = score
  }
  if (!data.starRatings[levelId] || stars > data.starRatings[levelId]) {
    data.starRatings[levelId] = stars
  }
  if (levelId >= data.unlockedLevel && levelId < 30) {
    data.unlockedLevel = Math.min(levelId + 1, 30)
  }
  data.totalScore += score
  saveSave(data)
  return data
}

export function recordEndlessScore(score: number): SaveData {
  const data = loadSave()
  if (score > data.endlessHighScore) {
    data.endlessHighScore = score
  }
  data.totalScore += score
  saveSave(data)
  return data
}

export function resetProgress(): SaveData {
  const fresh: SaveData = {
    ...defaultSave,
    settings: loadSave().settings
  }
  saveSave(fresh)
  return fresh
}
