import { Howl } from 'howler'
import type { BrickType } from '@/types/game'

export type SfxType =
  | 'paddleHit'
  | 'brickNormal'
  | 'brickTough'
  | 'brickSteel'
  | 'brickExplode'
  | 'ballLost'
  | 'powerupCatch'
  | 'split'
  | 'launch'
  | 'levelComplete'
  | 'gameOver'
  | 'combo'

type ToneSpec = {
  freq: number
  freqEnd?: number
  duration: number
  volume: number
  type: OscillatorType
  delay?: number
}

type SfxSpec = ToneSpec[]

const SFX_SPECS: Record<SfxType, SfxSpec> = {
  paddleHit: [{ freq: 520, freqEnd: 200, duration: 0.06, volume: 0.4, type: 'square' }],
  brickNormal: [{ freq: 780, freqEnd: 300, duration: 0.05, volume: 0.35, type: 'triangle' }],
  brickTough: [{ freq: 620, freqEnd: 180, duration: 0.08, volume: 0.4, type: 'sawtooth' }],
  brickSteel: [{ freq: 320, freqEnd: 100, duration: 0.05, volume: 0.3, type: 'square' }],
  brickExplode: [
    { freq: 200, freqEnd: 80, duration: 0.25, volume: 0.4, type: 'sawtooth' },
    { freq: 100, freqEnd: 50, duration: 0.2, volume: 0.3, type: 'square' },
  ],
  ballLost: [{ freq: 440, freqEnd: 120, duration: 0.4, volume: 0.35, type: 'triangle' }],
  powerupCatch: [
    { freq: 660, duration: 0.2, volume: 0.35, type: 'sine', delay: 0 },
    { freq: 880, duration: 0.2, volume: 0.35, type: 'sine', delay: 0.04 },
    { freq: 990, duration: 0.2, volume: 0.35, type: 'sine', delay: 0.08 },
  ],
  split: [
    { freq: 523, duration: 0.35, volume: 0.4, type: 'triangle', delay: 0 },
    { freq: 659, duration: 0.35, volume: 0.4, type: 'triangle', delay: 0.04 },
    { freq: 784, duration: 0.35, volume: 0.4, type: 'triangle', delay: 0.08 },
    { freq: 988, duration: 0.35, volume: 0.4, type: 'triangle', delay: 0.12 },
  ],
  launch: [{ freq: 680, freqEnd: 300, duration: 0.05, volume: 0.3, type: 'sine' }],
  levelComplete: [
    { freq: 523, duration: 0.12, volume: 0.4, type: 'triangle', delay: 0 },
    { freq: 659, duration: 0.12, volume: 0.4, type: 'triangle', delay: 0.1 },
    { freq: 784, duration: 0.12, volume: 0.4, type: 'triangle', delay: 0.2 },
    { freq: 1047, duration: 0.2, volume: 0.4, type: 'triangle', delay: 0.3 },
  ],
  gameOver: [
    { freq: 392, duration: 0.18, volume: 0.4, type: 'sawtooth', delay: 0 },
    { freq: 349, duration: 0.18, volume: 0.4, type: 'sawtooth', delay: 0.18 },
    { freq: 311, duration: 0.18, volume: 0.4, type: 'sawtooth', delay: 0.36 },
    { freq: 262, duration: 0.25, volume: 0.4, type: 'sawtooth', delay: 0.54 },
  ],
  combo: [{ freq: 1200, freqEnd: 600, duration: 0.04, volume: 0.25, type: 'sine' }],
}

function encodeWav(samples: Float32Array, sampleRate: number): string {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }

  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeStr(36, 'data')
  view.setUint32(40, samples.length * 2, true)

  let offset = 44
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }

  let binary = ''
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return 'data:audio/wav;base64,' + btoa(binary)
}

function renderSfx(spec: SfxSpec, globalVolume: number): string {
  const sampleRate = 22050
  const totalDuration = spec.reduce((max, t) => Math.max(max, (t.delay || 0) + t.duration), 0) + 0.05
  const length = Math.ceil(sampleRate * totalDuration)
  const output = new Float32Array(length)

  for (const tone of spec) {
    const delay = tone.delay || 0
    const toneLen = Math.ceil(sampleRate * tone.duration)
    const startIdx = Math.floor(sampleRate * delay)
    const vol = tone.volume * globalVolume

    for (let i = 0; i < toneLen; i++) {
      const t = i / sampleRate
      const progress = i / toneLen
      let freq = tone.freq
      if (tone.freqEnd !== undefined) {
        const r = progress
        freq = tone.freq + (tone.freqEnd - tone.freq) * r * r
      }
      const phase = 2 * Math.PI * freq * t
      let sample = 0
      switch (tone.type) {
        case 'sine': sample = Math.sin(phase); break
        case 'square': sample = Math.sin(phase) >= 0 ? 1 : -1; break
        case 'sawtooth': sample = 2 * ((t * freq) % 1) - 1; break
        case 'triangle': sample = 2 * Math.abs(2 * ((t * freq) % 1) - 1) - 1; break
      }
      const envelope = progress < 0.02
        ? progress / 0.02
        : 1 - (progress - 0.02) / 0.98 * 0.7
      const idx = startIdx + i
      if (idx < length) output[idx] += sample * vol * envelope
    }
  }

  let peak = 0
  for (let i = 0; i < length; i++) {
    const v = Math.abs(output[i])
    if (v > peak) peak = v
  }
  if (peak > 0) {
    const norm = 0.9 / peak
    for (let i = 0; i < length; i++) output[i] *= norm
  }

  return encodeWav(output, sampleRate)
}

class AudioManager {
  private sfxVolume: number = 0.6
  private musicVolume: number = 0.4
  private howls: Partial<Record<SfxType, Howl>> = {}
  private musicInterval: number | null = null
  private musicNotes = [261.63, 329.63, 392, 523.25, 392, 329.63, 293.66, 349.23]
  private musicHowl: Howl | null = null
  private musicIdx = 0

  constructor() {
    this.preRenderSfx()
  }

  private preRenderSfx() {
    const types = Object.keys(SFX_SPECS) as SfxType[]
    for (const type of types) {
      const dataUri = renderSfx(SFX_SPECS[type], this.sfxVolume)
      this.howls[type] = new Howl({
        src: [dataUri],
        format: ['wav'],
        volume: 1,
      })
    }
  }

  setVolumes(sfx: number, music: number) {
    this.sfxVolume = sfx
    this.musicVolume = music
    this.preRenderSfx()
    if (this.musicHowl) this.musicHowl.volume(this.musicVolume)
  }

  playSfx(type: SfxType) {
    const howl = this.howls[type]
    if (howl) {
      try { howl.stop() } catch {}
      howl.play()
    }
  }

  playBrickHit(type: BrickType) {
    if (type === 'normal') this.playSfx('brickNormal')
    else if (type === 'tough') this.playSfx('brickTough')
    else if (type === 'steel') this.playSfx('brickSteel')
    else if (type === 'explosive') this.playSfx('brickExplode')
  }

  startMusic() {
    if (this.musicInterval !== null) return
    this.musicIdx = 0
    const playNext = () => {
      const freq = this.musicNotes[this.musicIdx % this.musicNotes.length]
      const noteDuration = 0.5
      const sampleRate = 22050
      const len = Math.ceil(sampleRate * noteDuration)
      const samples = new Float32Array(len)
      const vol = this.musicVolume * 0.12

      for (let i = 0; i < len; i++) {
        const t = i / sampleRate
        const phase = 2 * Math.PI * freq * t
        const progress = i / len
        const envelope = progress < 0.05
          ? progress / 0.05
          : Math.exp(-3 * (progress - 0.05))
        let sample = 2 * Math.abs(2 * ((t * freq) % 1) - 1) - 1
        samples[i] = sample * vol * envelope
      }

      let peak = 0
      for (let i = 0; i < len; i++) {
        const v = Math.abs(samples[i])
        if (v > peak) peak = v
      }
      if (peak > 0) {
        const norm = 0.9 / peak
        for (let i = 0; i < len; i++) samples[i] *= norm
      }

      const dataUri = encodeWav(samples, sampleRate)
      const noteHowl = new Howl({
        src: [dataUri],
        format: ['wav'],
        volume: 1,
      })
      noteHowl.play()
      this.musicIdx++
    }
    playNext()
    this.musicInterval = window.setInterval(playNext, 500)
  }

  stopMusic() {
    if (this.musicInterval !== null) {
      clearInterval(this.musicInterval)
      this.musicInterval = null
    }
    this.musicHowl = null
  }
}

export const audioManager = new AudioManager()
