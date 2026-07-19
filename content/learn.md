---
title: "AI 学习路径"
layout: "single"
description: "输入你的学习目标，AI 规划专属阅读路径"
---

<div class="learn-path-intro">
  <p>想提升某个能力？输入目标，AI 会从 100 个思维模型中为你规划一条学习路径。</p>
</div>

<div class="learn-path-input-area">
  <div class="learn-path-presets">
    <button class="lp-btn" data-goal="提升决策能力">🎯 提升决策能力</button>
    <button class="lp-btn" data-goal="学会系统思考">🧠 学会系统思考</button>
    <button class="lp-btn" data-goal="提高学习效率">📚 提高学习效率</button>
    <button class="lp-btn" data-goal="改善人际关系">🤝 改善人际关系</button>
    <button class="lp-btn" data-goal="增强创新能力">💡 增强创新能力</button>
    <button class="lp-btn" data-goal="管理时间和精力">⏰ 管理时间和精力</button>
  </div>
  <div class="learn-path-custom">
    <input type="text" id="learn-goal-input" placeholder="或输入你的具体目标..." maxlength="100">
    <button id="learn-goal-send" class="lp-send-btn">生成学习路径</button>
  </div>
</div>

<div id="learn-path-result" style="display:none">
  <div id="learn-path-content"></div>
</div>

<style>
.learn-path-intro{margin-bottom:24px;line-height:1.8;color:var(--content,#333)}
.learn-path-presets{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}
/* 预设按钮：浅底深字（浅色）/ 深底浅字（深色） */
.lp-btn{padding:8px 16px;border:1px solid var(--border,#ddd);border-radius:8px;background:var(--theme,#fff);color:var(--content,#333);cursor:pointer;font-size:14px;transition:all .2s}
.lp-btn:hover{border-color:var(--content,#333);background:var(--tertiary,#eee)}
.learn-path-custom{display:flex;gap:8px;margin-bottom:24px}
#learn-goal-input{flex:1;padding:12px 16px;border:1px solid var(--border,#ddd);border-radius:8px;background:var(--theme,#fff);color:var(--content,#333);font-size:15px;outline:none}
#learn-goal-input:focus{border-color:var(--content,#333)}
/* 发送按钮：深底浅字 */
.lp-send-btn{padding:12px 24px;border:none;border-radius:8px;background:var(--content,#333);color:var(--theme,#fff);cursor:pointer;font-size:15px;font-weight:500;transition:opacity .2s}
.lp-send-btn:hover{opacity:.85}
.lp-send-btn:disabled{opacity:.5;cursor:not-allowed}
#learn-path-result{padding:24px;border-radius:12px;background:var(--code-bg,#f8f8f8);border:1px solid var(--border,#eee)}
#learn-path-content{line-height:1.9;font-size:15px;color:var(--content,#333)}
#learn-path-content h3{margin-top:1.5rem;margin-bottom:.5rem;color:var(--content,#333)}
#learn-path-content ol{padding-left:1.5rem}
#learn-path-content li{margin-bottom:8px}
#learn-path-content a{color:var(--content,#333);text-decoration:underline;font-weight:500}
#learn-path-content strong{font-weight:600}
.lp-loading{color:var(--secondary,#999);font-size:15px;padding:20px 0}
</style>

<script>
(function() {
  var AI_EP = 'https://ybq-ai-search.garyyuen.workers.dev';

  document.querySelectorAll('.lp-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.getElementById('learn-goal-input').value = btn.dataset.goal;
      generatePath(btn.dataset.goal);
    });
  });

  document.getElementById('learn-goal-send').addEventListener('click', function() {
    var goal = document.getElementById('learn-goal-input').value.trim();
    if (goal) generatePath(goal);
  });

  document.getElementById('learn-goal-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      var goal = e.target.value.trim();
      if (goal) generatePath(goal);
    }
  });

  function generatePath(goal) {
    var result = document.getElementById('learn-path-result');
    var content = document.getElementById('learn-path-content');
    var sendBtn = document.getElementById('learn-goal-send');

    result.style.display = 'block';
    content.innerHTML = '<div class="lp-loading">🧠 AI 正在规划学习路径...</div>';
    sendBtn.disabled = true;

    fetch(AI_EP, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: '用户的学习目标是「' + goal + '」。请从网站的100个思维模型中，推荐5-8个最相关的模型，按学习顺序排列，每个模型说明为什么推荐、和目标的关系、建议的学习方法。格式：用编号列表，每个包含模型名称（带链接）、推荐理由、学习建议。'
      })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.error) {
        content.innerHTML = '<span style="color:#c33">' + data.error + '</span>';
      } else {
        var html = data.answer
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>')
          .replace(/\n/g, '<br>');
        content.innerHTML = html;
        if (data.sources && data.sources.length) {
          content.innerHTML += '<div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border,#eee);font-size:13px;color:var(--secondary,#999)">📎 引用：' +
            data.sources.map(function(s) { return '<a href="' + s.url + '" target="_blank" style="color:var(--secondary,#999)">' + s.title + '</a>'; }).join(' · ') +
            '</div>';
        }
      }
    })
    .catch(function() {
      content.innerHTML = '<span style="color:#c33">网络错误，请稍后重试</span>';
    })
    .finally(function() {
      sendBtn.disabled = false;
    });
  }
})();
</script>
