<template>
  <div class="page home-page">
    <div class="hero-section">
      <h1 class="title">
        <span class="title-glow">BREAKOUT</span>
        <span class="subtitle">经典打砖块</span>
      </h1>
      <div class="preview-balls" aria-hidden>
        <div class="preview-ball preview-ball-1"></div>
        <div class="preview-ball preview-ball-2"></div>
        <div class="preview-ball preview-ball-3"></div>
      </div>
    </div>

    <div class="menu-section">
      <button class="btn btn-primary" @click="startCampaign">
        <span class="btn-icon">▶</span> 闯关模式
      </button>
      <button class="btn btn-secondary" @click="startEndless">
        <span class="btn-icon">∞</span> 无尽模式
      </button>
      <button class="btn btn-ghost" @click="$router.push('/levels')">
        <span class="btn-icon">☰</span> 关卡选择
      </button>
      <button class="btn btn-ghost" @click="$router.push('/settings')">
        <span class="btn-icon">⚙</span> 设置
      </button>
    </div>

    <div class="stats-footer">
      <div class="stat-card">
        <div class="stat-label">累计得分</div>
        <div class="stat-value">{{ save.totalScore.toLocaleString() }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">已解锁关卡</div>
        <div class="stat-value">{{ save.unlockedLevel }} / 30</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">无尽最高分</div>
        <div class="stat-value">{{ save.endlessHighScore.toLocaleString() }}</div>
      </div>
    </div>

    <div class="hint">
      键盘 ← → / A D 移动挡板，Space 或 点击 发射 · P 暂停
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { loadSave } from '@/utils/storage'
import type { SaveData } from '@/types/game'
import { audioManager } from '@/utils/audio'

const router = useRouter()
const save = ref<SaveData>(loadSave())

onMounted(() => {
  save.value = loadSave()
})

function startCampaign() {
  audioManager.setVolumes(save.value.settings.sfxVolume, save.value.settings.musicVolume)
  audioManager.startMusic()
  router.push(`/play/campaign/${save.value.unlockedLevel}`)
}

function startEndless() {
  audioManager.setVolumes(save.value.settings.sfxVolume, save.value.settings.musicVolume)
  audioManager.startMusic()
  router.push('/play/endless')
}
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
  background: radial-gradient(ellipse at top, #1a1a4a 0%, #05050f 60%);
  position: relative;
  overflow: hidden;
}

.home-page::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(80, 120, 255, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(80, 120, 255, 0.05) 1px, transparent 1px);
  background-size: 40px 40px;
  pointer-events: none;
}

.hero-section {
  text-align: center;
  margin-bottom: 56px;
  position: relative;
}

.title {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.title-glow {
  font-size: clamp(48px, 8vw, 96px);
  font-weight: 900;
  letter-spacing: 0.1em;
  background: linear-gradient(180deg, #6ee7b7 0%, #06b6d4 50%, #3b82f6 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 0 24px rgba(16, 185, 129, 0.5));
  text-shadow: 0 0 40px rgba(14, 165, 233, 0.3);
}

.subtitle {
  font-size: 18px;
  color: rgba(180, 220, 255, 0.8);
  letter-spacing: 0.4em;
  text-transform: uppercase;
}

.preview-balls {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.preview-ball {
  position: absolute;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #fff, #6ee7b7);
  box-shadow: 0 0 20px #6ee7b7;
  animation: float 4s ease-in-out infinite;
}

.preview-ball-1 {
  top: 20%;
  left: 10%;
  animation-delay: 0s;
}

.preview-ball-2 {
  top: 50%;
  right: 8%;
  animation-delay: 1s;
}

.preview-ball-3 {
  bottom: 10%;
  left: 20%;
  animation-delay: 2s;
}

@keyframes float {
  0%, 100% { transform: translateY(0) scale(1); opacity: 0.8; }
  50% { transform: translateY(-20px) scale(1.2); opacity: 1; }
}

.menu-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
  max-width: 320px;
  margin-bottom: 48px;
}

.btn {
  padding: 14px 24px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: transform 0.15s ease, box-shadow 0.2s ease, background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-family: inherit;
}

.btn-icon {
  font-size: 18px;
  display: inline-flex;
  align-items: center;
}

.btn-primary {
  background: linear-gradient(135deg, #10b981, #06b6d4);
  color: white;
  box-shadow: 0 4px 24px rgba(16, 185, 129, 0.4);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(16, 185, 129, 0.55);
}

.btn-secondary {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  box-shadow: 0 4px 24px rgba(99, 102, 241, 0.4);
}

.btn-secondary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(99, 102, 241, 0.55);
}

.btn-ghost {
  background: rgba(255, 255, 255, 0.06);
  color: #cdd7ff;
  border: 1px solid rgba(150, 180, 255, 0.2);
}

.btn-ghost:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(150, 180, 255, 0.4);
  transform: translateY(-1px);
}

.stats-footer {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  width: 100%;
  max-width: 560px;
  margin-bottom: 32px;
}

.stat-card {
  background: rgba(20, 25, 60, 0.6);
  border: 1px solid rgba(120, 160, 255, 0.18);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  backdrop-filter: blur(10px);
}

.stat-label {
  font-size: 12px;
  color: rgba(180, 200, 255, 0.6);
  margin-bottom: 6px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: #6ee7b7;
}

.hint {
  font-size: 13px;
  color: rgba(160, 180, 240, 0.5);
  text-align: center;
  max-width: 420px;
}
</style>
