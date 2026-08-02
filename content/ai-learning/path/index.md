---
title: "AI 学习路径生成器"
date: 2026-07-30
draft: false
description: "输入你想学的方向，AI 从 100+ 思维模型中为你规划个性化学习路径"
tags: ["AI", "学习路径", "思维模型", "终身学习"]
categories: ["学习方法"]
aliases: ["/ai-learning/path/"]
---

<div class="learning-path-generator">
  <div class="generator-header">
    <h2>🎯 你想学什么？</h2>
    <p>输入你的学习目标，AI 会从 100+ 思维模型中为你规划个性化学习路径</p>
  </div>

  <div class="generator-form">
    <div class="input-group">
      <input type="text" id="learning-goal" placeholder="例如：提升决策能力、学会系统思考、提高沟通影响力..." maxlength="200">
      <button id="generate-btn" onclick="generatePath()">
        <span class="btn-text">生成学习路径</span>
        <span class="btn-loading" style="display:none;">生成中...</span>
      </button>
    </div>
    <div class="input-hint">
      <span>💡 试试这些目标：</span>
      <button class="hint-btn" onclick="setGoal('提升决策能力')">提升决策能力</button>
      <button class="hint-btn" onclick="setGoal('学会系统思考')">学会系统思考</button>
      <button class="hint-btn" onclick="setGoal('提高沟通影响力')">提高沟通影响力</button>
      <button class="hint-btn" onclick="setGoal('对抗认知偏差')">对抗认知偏差</button>
      <button class="hint-btn" onclick="setGoal('建立个人知识体系')">建立个人知识体系</button>
    </div>
  </div>

  <div id="result" class="generator-result" style="display:none;">
    <div class="result-header">
      <h3 id="path-title"></h3>
      <p id="path-description"></p>
      <div class="path-meta">
        <span id="path-duration"></span>
        <span id="path-steps-count"></span>
      </div>
    </div>
    <div class="path-timeline" id="path-timeline">
      <!-- 动态生成 -->
    </div>
    <div class="result-actions">
      <button onclick="resetPath()" class="btn-secondary">重新生成</button>
      <button onclick="sharePath()" class="btn-primary">分享路径</button>
    </div>
  </div>

  <div id="error" class="generator-error" style="display:none;">
    <p id="error-message"></p>
    <button onclick="resetPath()" class="btn-secondary">重试</button>
  </div>
</div>

<style>
.learning-path-generator {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 20px;
}

.generator-header {
  text-align: center;
  margin-bottom: 40px;
}

.generator-header h2 {
  font-size: 28px;
  color: var(--primary);
  margin-bottom: 12px;
}

.generator-header p {
  font-size: 16px;
  color: var(--secondary);
  line-height: 1.6;
}

.generator-form {
  margin-bottom: 40px;
}

.input-group {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.input-group input {
  flex: 1;
  padding: 16px 20px;
  border: 2px solid var(--border);
  border-radius: 12px;
  font-size: 16px;
  font-family: inherit;
  background: var(--entry);
  color: var(--primary);
  transition: border-color 0.2s;
}

.input-group input:focus {
  outline: none;
  border-color: #C89F65;
}

.input-group input::placeholder {
  color: var(--secondary);
}

#generate-btn {
  padding: 16px 32px;
  background: #1E3A5F;
  color: #FAF9F6;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
  white-space: nowrap;
}

#generate-btn:hover {
  background: #2a4a6f;
  transform: translateY(-1px);
}

#generate-btn:disabled {
  background: #666;
  cursor: not-allowed;
  transform: none;
}

.input-hint {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--secondary);
}

.hint-btn {
  padding: 6px 12px;
  background: var(--entry);
  border: 1px solid var(--border);
  border-radius: 20px;
  font-size: 13px;
  color: var(--primary);
  cursor: pointer;
  transition: all 0.2s;
}

.hint-btn:hover {
  border-color: #C89F65;
  color: #C89F65;
}

.generator-result {
  margin-top: 40px;
}

.result-header {
  text-align: center;
  margin-bottom: 32px;
}

.result-header h3 {
  font-size: 24px;
  color: var(--primary);
  margin-bottom: 8px;
}

.result-header p {
  font-size: 15px;
  color: var(--secondary);
  margin-bottom: 12px;
}

.path-meta {
  display: flex;
  justify-content: center;
  gap: 24px;
  font-size: 14px;
  color: var(--secondary);
}

.path-meta span {
  display: flex;
  align-items: center;
  gap: 6px;
}

.path-timeline {
  position: relative;
  padding-left: 40px;
  margin-bottom: 40px;
}

.path-timeline::before {
  content: '';
  position: absolute;
  left: 15px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(to bottom, #C89F65, #1E3A5F);
}

.path-step {
  position: relative;
  margin-bottom: 24px;
  padding: 20px 24px;
  background: var(--entry);
  border: 1px solid var(--border);
  border-radius: 12px;
  transition: transform 0.2s, box-shadow 0.2s;
}

.path-step:hover {
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.path-step::before {
  content: attr(data-order);
  position: absolute;
  left: -40px;
  top: 20px;
  width: 28px;
  height: 28px;
  background: #C89F65;
  color: #FAF9F6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
}

.step-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--primary);
  margin-bottom: 8px;
}

.step-title a {
  color: inherit;
  text-decoration: none;
  border-bottom: 1px dashed #C89F65;
}

.step-title a:hover {
  color: #C89F65;
  border-bottom-style: solid;
}

.step-reason {
  font-size: 14px;
  color: var(--secondary);
  line-height: 1.5;
}

.result-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.btn-primary {
  padding: 12px 24px;
  background: #1E3A5F;
  color: #FAF9F6;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: #2a4a6f;
}

.btn-secondary {
  padding: 12px 24px;
  background: transparent;
  color: var(--primary);
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  border-color: #C89F65;
  color: #C89F65;
}

.generator-error {
  text-align: center;
  padding: 40px;
  color: #c33;
}

.generator-error p {
  margin-bottom: 16px;
}

@media (max-width: 600px) {
  .input-group {
    flex-direction: column;
  }
  
  .input-group input {
    width: 100%;
  }
  
  .input-hint {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .path-timeline {
    padding-left: 30px;
  }
  
  .path-step::before {
    left: -30px;
    width: 24px;
    height: 24px;
    font-size: 12px;
  }
}
</style>

<script>
const WORKER_URL = 'https://ybq-ai-search.garyyuen.workers.dev';

function setGoal(goal) {
  document.getElementById('learning-goal').value = goal;
  document.getElementById('learning-goal').focus();
}

async function generatePath() {
  const goal = document.getElementById('learning-goal').value.trim();
  if (!goal) {
    alert('请输入学习目标');
    return;
  }

  const btn = document.getElementById('generate-btn');
  const btnText = btn.querySelector('.btn-text');
  const btnLoading = btn.querySelector('.btn-loading');
  
  btn.disabled = true;
  btnText.style.display = 'none';
  btnLoading.style.display = 'inline';
  
  document.getElementById('result').style.display = 'none';
  document.getElementById('error').style.display = 'none';

  try {
    const res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'learning-path',
        goal: goal
      })
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || '请求失败');
    }

    const data = await res.json();
    displayPath(data);
  } catch (err) {
    console.error('Error:', err);
    document.getElementById('error-message').textContent = err.message || '生成失败，请重试';
    document.getElementById('error').style.display = 'block';
  } finally {
    btn.disabled = false;
    btnText.style.display = 'inline';
    btnLoading.style.display = 'none';
  }
}

function displayPath(data) {
  document.getElementById('path-title').textContent = data.path_title || '学习路径';
  document.getElementById('path-description').textContent = data.path_description || '';
  document.getElementById('path-duration').textContent = `⏱️ 预计 ${data.estimated_weeks || 2} 周`;
  document.getElementById('path-steps-count').textContent = `📚 ${data.steps?.length || 0} 个模型`;

  const timeline = document.getElementById('path-timeline');
  timeline.innerHTML = '';

  if (data.steps && Array.isArray(data.steps)) {
    data.steps.forEach((step, index) => {
      const stepEl = document.createElement('div');
      stepEl.className = 'path-step';
      stepEl.setAttribute('data-order', index + 1);
      stepEl.innerHTML = `
        <div class="step-title">
          <a href="${step.url || '#'}" target="_blank">${step.title || step.model_id}</a>
        </div>
        <div class="step-reason">${step.reason || ''}</div>
      `;
      timeline.appendChild(stepEl);
    });
  }

  document.getElementById('result').style.display = 'block';
  
  // 滚动到结果
  document.getElementById('result').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetPath() {
  document.getElementById('result').style.display = 'none';
  document.getElementById('error').style.display = 'none';
  document.getElementById('learning-goal').value = '';
  document.getElementById('learning-goal').focus();
}

function sharePath() {
  const goal = document.getElementById('learning-goal').value.trim();
  const title = document.getElementById('path-title').textContent;
  const url = window.location.href;
  
  if (navigator.share) {
    navigator.share({
      title: `学习路径：${title}`,
      text: `我在 ybq.me 生成了一个学习路径：${title}`,
      url: url
    });
  } else {
    // 复制到剪贴板
    const text = `🎯 ${title}\n${url}`;
    navigator.clipboard.writeText(text).then(() => {
      alert('链接已复制到剪贴板');
    });
  }
}

// 回车键触发生成
document.getElementById('learning-goal').addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    generatePath();
  }
});
</script>
