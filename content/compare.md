---
title: "AI 模型对比"
layout: "single"
description: "选择两个思维模型，AI 为你分析它们的异同、适用场景和组合用法"
---

<div class="compare-container">
  <div class="compare-selectors">
    <div class="compare-select-group">
      <label class="compare-label">模型 A</label>
      <select id="compare-a" class="compare-select">
        <option value="">选择一个模型…</option>
      </select>
    </div>
    <div class="compare-vs">VS</div>
    <div class="compare-select-group">
      <label class="compare-label">模型 B</label>
      <select id="compare-b" class="compare-select">
        <option value="">选择一个模型…</option>
      </select>
    </div>
  </div>
  <button id="compare-btn" class="compare-btn" disabled>开始 AI 对比</button>
  <div id="compare-result" class="compare-result"></div>
</div>

<style>
.compare-container { max-width: 700px; margin: 0 auto; }
.compare-selectors { display: flex; align-items: center; gap: 16px; margin-bottom: 1.5rem; }
.compare-select-group { flex: 1; }
.compare-label { display: block; font-size: 13px; color: var(--secondary, #999); margin-bottom: 6px; }
.compare-select {
  width: 100%; padding: 10px 14px; border-radius: 10px;
  border: 1px solid var(--border, #ddd);
  background: var(--theme, #fff); color: var(--content, #333);
  font-size: 14px; outline: none;
}
.compare-select:focus { border-color: #C89F65; }
.compare-vs { font-size: 18px; font-weight: 800; color: #C89F65; flex-shrink: 0; }
.compare-btn {
  width: 100%; padding: 12px; border-radius: 12px; border: none;
  background: #C89F65; color: #fff; font-size: 15px; font-weight: 600;
  cursor: pointer; transition: all .2s; margin-bottom: 1.5rem;
}
.compare-btn:hover:not(:disabled) { background: #b88a4a; transform: translateY(-1px); }
.compare-btn:disabled { opacity: .5; cursor: not-allowed; }
.compare-result {
  padding: 1.5rem; background: var(--entry, #f8f8f8);
  border-radius: 14px; border: 1px solid var(--border, #eee);
  font-size: 14px; line-height: 1.8; color: var(--content, #333);
  min-height: 100px;
}
.compare-result strong { color: #C89F65; }
.compare-result h4 { margin: 1rem 0 .5rem; font-size: 15px; }
.compare-loading { text-align: center; color: var(--secondary, #999); }
@media (max-width: 600px) {
  .compare-selectors { flex-direction: column; gap: 12px; }
  .compare-vs { font-size: 14px; }
}
</style>

<script>
(function() {
  var MODELS = [
    '001-机会成本','002-沉没成本','004-决策树','006-确认偏误',
    '007-易得性偏差','008-逆向思维','009-六顶思考帽','013-第一性原理',
    '014-奥卡姆剃刀','016-反脆弱','020-卡尼曼双系统','032-黄金圈思维',
    '033-心流理论','043-蝴蝶效应','048-幸存者偏差','057-复利效应',
    '058-二八定律','067-元认知','072-杠杆原理','075-飞轮效应',
    '076-swot分析','077-pdca循环','085-峰终定律','090-博弈论','095-前景理论','100-护城河理论'
  ];

  var selectA = document.getElementById('compare-a');
  var selectB = document.getElementById('compare-b');
  var btn = document.getElementById('compare-btn');
  var result = document.getElementById('compare-result');

  MODELS.forEach(function(m) {
    var parts = m.split('-');
    var optA = document.createElement('option');
    optA.value = m; optA.textContent = '#' + parts[0] + ' ' + parts[1];
    selectA.appendChild(optA);
    var optB = optA.cloneNode(true);
    selectB.appendChild(optB);
  });

  function checkBtn() {
    btn.disabled = !selectA.value || !selectB.value || selectA.value === selectB.value;
  }
  selectA.addEventListener('change', checkBtn);
  selectB.addEventListener('change', checkBtn);

  btn.addEventListener('click', async function() {
    var a = selectA.value.split('-');
    var b = selectB.value.split('-');
    var nameA = '#' + a[0] + ' ' + a[1];
    var nameB = '#' + b[0] + ' ' + b[1];

    result.innerHTML = '<div class="compare-loading">AI 正在分析 ' + nameA + ' 和 ' + nameB + ' 的关系…</div>';

    try {
      var resp = await fetch('https://ybq-me-ai.garyyuen.workers.dev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ask',
          question: '请对比分析以下两个思维模型，用以下格式：\n\n**核心区别：**\n（一句话）\n\n**相似之处：**\n（一句话）\n\n**各自适用场景：**\n' + nameA + '：…\n' + nameB + '：…\n\n**组合用法：**\n（如何同时使用这两个模型）\n\n模型A：' + nameA + '\n模型B：' + nameB,
          history: [],
          pageContext: { title: '模型对比', summary: nameA + ' vs ' + nameB, url: '/compare/' }
        })
      });
      var data = await resp.json();
      if (data.answer) {
        result.innerHTML = data.answer
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\n/g, '<br>');
      } else {
        result.innerHTML = '对比失败，请稍后重试。';
      }
    } catch (e) {
      result.innerHTML = '网络错误，请稍后重试。';
    }
  });
})();
</script>
