import { Howl } from 'howler'

type SfxType =
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

class AudioManager {
  private sfxVolume: number = 0.6
  private musicVolume: number = 0.4
  private audioContext: AudioContext | null = null
  private musicOscillators: OscillatorNode[] = []
  private musicGain: GainNode | null = null
  private musicInterval: number | null = null

  setVolumes(sfx: number, music: number) {
    this.sfxVolume = sfx
    this.musicVolume = music
    if (this.musicGain) {
      this.musicGain.gain.value = this.musicVolume * 0.08
    }
  }

  private ensureContext(): AudioContext {
    if (!this.audioContext) {
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext
      this.audioContext = new Ctx()
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume()
    }
    return this.audioContext
  }

  playSfx(type: SfxType) {
    const ctx = this.ensureContext()
    const vol = this.sfxVolume
    switch (type) {
      case 'paddleHit':
        this.playTone(ctx, 520, 0.06, vol * 0.4, 'square', 200)
        break
      case 'brickNormal':
        this.playTone(ctx, 780, 0.05, vol * 0.35, 'triangle', 300)
        break
      case 'brickTough':
        this.playTone(ctx, 620, 0.08, vol * 0.4, 'sawtooth', 180)
        break
      case 'brickSteel':
        this.playTone(ctx, 320, 0.05, vol * 0.3, 'square', 100)
        break
      case 'brickExplode':
        this.playNoise(ctx, 0.2, vol * 0.5)
        this.playTone(ctx, 200, 0.25, vol * 0.4, 'sawtooth', 80)
        break
      case 'ballLost':
        this.playSweep(ctx, 440, 120, 0.4, vol * 0.35, 'triangle')
        break
      case 'powerupCatch':
        this.playChord(ctx, [660, 880, 990], 0.2, vol * 0.35, 'sine')
        break
      case 'split':
        this.playChord(ctx, [523, 659, 784, 988], 0.35, vol * 0.4, 'triangle')
        break
      case 'launch':
        this.playTone(ctx, 680, 0.05, vol * 0.3, 'sine', 300)
        break
      case 'levelComplete':
        this.playArpeggio(ctx, [523, 659, 784, 1047], 0.1, vol * 0.4, 'triangle')
        break
      case 'gameOver':
        this.playArpeggio(ctx, [392, 349, 311, 262], 0.18, vol * 0.4, 'sawtooth')
        break
      case 'combo':
        this.playTone(ctx, 1200, 0.04, vol * 0.25, 'sine', 600)
        break
    }
  }

  private playTone(
    ctx: AudioContext,
    freq: number,
    duration: number,
    volume: number,
    type: OscillatorType = 'sine',
    freqEnd?: number
  ) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, ctx.currentTime)
    if (freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), ctx.currentTime + duration)
    }
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + duration + 0.02)
  }

  private playSweep(
    ctx: AudioContext,
    start: number,
    end: number,
    duration: number,
    volume: number,
    type: OscillatorType
  ) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(start, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, end), ctx.currentTime + duration)
    gain.gain.setValueAtTime(volume, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + duration + 0.02)
  }

  private playChord(
    ctx: AudioContext,
    freqs: number[],
    duration: number,
    volume: number,
    type: OscillatorType
  ) {
    freqs.forEach((f, i) => {
      setTimeout(() => this.playTone(ctx, f, duration, volume, type), i * 40)
    })
  }

  private playArpeggio(
    ctx: AudioContext,
    notes: number[],
    perNote: number,
    volume: number,
    type: OscillatorType
  ) {
    notes.forEach((n, i) => {
      setTimeout(() => this.playTone(ctx, n, perNote * 1.2, volume, type), i * perNote * 1000)
    })
  }

  private playNoise(ctx: AudioContext, duration: number, volume: number) {
    const bufferSize = Math.floor(ctx.sampleRate * duration)
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
    }
    const src = ctx.createBufferSource()
    src.buffer = buffer
    const gain = ctx.createGain()
    gain.gain.value = volume
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 800
    src.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)
    src.start()
  }

  startMusic() {
    const ctx = this.ensureContext()
    if (this.musicInterval !== null) return
    const master = ctx.createGain()
    master.gain.value = this.musicVolume * 0.08
    master.connect(ctx.destination)
    this.musicGain = master

    const notes = [261.63, 329.63, 392, 523.25, 392, 329.63, 293.66, 349.23]
    let idx = 0
    const playNote = () => {
      if (!this.musicGain) return
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = notes[idx % notes.length]
      g.gain.setValueAtTime(0, ctx.currentTime)
      g.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.04)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45)
      osc.connect(g)
      g.connect(master)
      osc.start()
      osc.stop(ctx.currentTime + 0.5)
      this.musicOscillators.push(osc)
      if (this.musicOscillators.length > 10) this.musicOscillators.shift()
      idx++
    }
    playNote()
    this.musicInterval = window.setInterval(playNote, 500)
  }

  stopMusic() {
    if (this.musicInterval !== null) {
      clearInterval(this.musicInterval)
      this.musicInterval = null
    }
    this.musicOscillators.forEach((o) => {
      try { o.stop() } catch {}
    })
    this.musicOscillators = []
    if (this.musicGain) {
      try { this.musicGain.disconnect() } catch {}
      this.musicGain = null
    }
  }
}

export const audioManager = new AudioManager()
