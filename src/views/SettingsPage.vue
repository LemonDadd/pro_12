<template>
  <div class="page settings-page">
    <header class="page-header">
      <button class="back-btn" @click="$router.push('/')">← 返回</button>
      <h2>设置</h2>
      <div class="spacer"></div>
    </header>

    <div class="settings-container">
      <section class="setting-section">
        <h3>音频</h3>
        <div class="setting-row">
          <label>音效音量</label>
          <input
            type="range"
            min="0" max="100"
            v-model.number="sfxVol"
            @input="onChange"
          />
          <span class="val">{{ sfxVol }}%</span>
        </div>
        <div class="setting-row">
          <label>音乐音量</label>
          <input
            type="range"
            min="0" max="100"
            v-model.number="musicVol"
            @input="onChange"
          />
          <span class="val">{{ musicVol }}%</span>
        </div>
      </section>

      <section class="setting-section">
        <h3>画面</h3>
        <div class="setting-row setting-toggle-row">
          <label>显示圆心标记</label>
          <label class="switch">
            <input type="checkbox" v-model="showCenter" @change="onChange" />
            <span class="slider"></span>
          </label>
        </div>
      </section>

      <section class="setting-section">
        <h3>操作</h3>
        <div class="setting-row setting-toggle-row">
          <label>鼠标/触控跟随挡板</label>
          <label class="switch">
            <input type="checkbox" v-model="mouseControl" @change="onChange" />
            <span class="slider"></span>
          </label>
        </div>
        <div class="help-text">
          键盘：← → 或 A D 移动，Space 发射，P/Esc 暂停
        </div>
      </section>

      <section class="setting-section danger-section">
        <h3>数据</h3>
        <button class="btn btn-danger" @click="resetProgress">
          重置所有进度
        </button>
        <div class="reset-hint">此操作将清除：关卡进度、最高分、星级评价（不清除设置）</div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { loadSave, resetProgress, updateSettings } from '@/utils/storage'
import { audioManager } from '@/utils/audio'

const sfxVol = ref(60)
const musicVol = ref(40)
const showCenter = ref(true)
const mouseControl = ref(true)

onMounted(() => {
  const save = loadSave()
  sfxVol.value = Math.round(save.settings.sfxVolume * 100)
  musicVol.value = Math.round(save.settings.musicVolume * 100)
  showCenter.value = save.settings.showCenterMarker
  mouseControl.value = save.settings.mouseControl
})

function onChange() {
  const data = updateSettings({
    sfxVolume: sfxVol.value / 100,
    musicVolume: musicVol.value / 100,
    showCenterMarker: showCenter.value,
    mouseControl: mouseControl.value,
  })
  audioManager.setVolumes(data.settings.sfxVolume, data.settings.musicVolume)
}

function resetProgress() {
  if (!confirm('确定要重置所有游戏进度吗？此操作不可撤销。')) return
  resetProgress()
  alert('进度已重置')
}
</script>

<style scoped>
.settings-page {
  min-height: 100vh;
  padding: 28px 24px;
  background: radial-gradient(ellipse at top, #161640 0%, #05050f 70%);
  color: #e6ecff;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  max-width: 640px;
  margin: 0 auto 28px;
}

.page-header h2 { margin: 0; font-size: 24px; letter-spacing: 0.1em; }

.back-btn {
  background: rgba(255, 255, 255, 0.08);
  color: #cdd7ff;
  border: 1px solid rgba(150, 180, 255, 0.2);
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
}

.back-btn:hover { background: rgba(255, 255, 255, 0.14); }

.spacer { flex: 1; }

.settings-container {
  max-width: 640px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.setting-section {
  background: rgba(20, 25, 60, 0.6);
  border: 1px solid rgba(120, 160, 255, 0.18);
  border-radius: 12px;
  padding: 20px 24px;
  backdrop-filter: blur(10px);
}

.setting-section h3 {
  margin: 0 0 16px;
  font-size: 15px;
  letter-spacing: 0.15em;
  color: #6ee7b7;
  text-transform: uppercase;
}

.setting-row {
  display: grid;
  grid-template-columns: 160px 1fr 60px;
  align-items: center;
  gap: 16px;
  padding: 10px 0;
}

.setting-toggle-row {
  grid-template-columns: 1fr auto;
}

.setting-toggle-row .val { display: none; }

.setting-row label {
  font-size: 14px;
  color: rgba(220, 230, 255, 0.9);
}

.val {
  text-align: right;
  font-size: 13px;
  color: rgba(180, 220, 255, 0.8);
  font-variant-numeric: tabular-nums;
}

input[type='range'] {
  width: 100%;
  accent-color: #6ee7b7;
}

.switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 26px;
}

.switch input { display: none; }

.slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: rgba(100, 120, 180, 0.3);
  border: 1px solid rgba(150, 180, 255, 0.25);
  transition: 0.25s;
  border-radius: 26px;
}

.slider::before {
  position: absolute;
  content: '';
  height: 18px;
  width: 18px;
  left: 3px;
  top: 3px;
  background: white;
  transition: 0.25s;
  border-radius: 50%;
}

.switch input:checked + .slider {
  background: linear-gradient(135deg, #10b981, #06b6d4);
  border-color: #10b981;
  box-shadow: 0 0 12px rgba(16, 185, 129, 0.4);
}

.switch input:checked + .slider::before {
  transform: translateX(22px);
}

.help-text {
  font-size: 13px;
  color: rgba(160, 180, 240, 0.6);
  margin-top: 10px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 8px;
}

.danger-section {
  border-color: rgba(244, 114, 182, 0.25);
}

.btn-danger {
  width: 100%;
  padding: 12px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid rgba(244, 63, 94, 0.5);
  background: rgba(244, 63, 94, 0.12);
  color: #fda4af;
  font-family: inherit;
  transition: all 0.15s;
}

.btn-danger:hover {
  background: rgba(244, 63, 94, 0.22);
  border-color: rgba(244, 63, 94, 0.7);
}

.reset-hint {
  font-size: 12px;
  color: rgba(244, 114, 182, 0.6);
  margin-top: 10px;
  text-align: center;
}
</style>
