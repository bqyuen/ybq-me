---
title: "Token 消耗统计"
layout: "single"
description: "AI 助手 Token 消耗管理后台"
robotsNoIndex: true
---

<div id="token-admin-app">
  <div id="auth-screen" class="ta-card">
    <h2 class="ta-title">🔐 管理后台鉴权</h2>
    <p class="ta-hint">请输入访问密钥查看统计</p>
    <div class="ta-auth-row">
      <input type="password" id="auth-key" placeholder="访问密钥..." class="ta-input" autocomplete="off">
      <button id="auth-btn" class="ta-btn ta-btn-primary">进入</button>
    </div>
    <div id="auth-error" class="ta-error" style="display:none"></div>
  </div>

  <div id="dashboard" style="display:none">
    <header class="ta-header">
      <div>
        <h1 class="ta-page-title">📊 Token 消耗统计</h1>
        <p class="ta-page-subtitle" id="last-updated">加载中...</p>
      </div>
      <div class="ta-header-actions">
        <select id="range-select" class="ta-select">
          <option value="7">近 7 天</option>
          <option value="30" selected>近 30 天</option>
          <option value="90">近 90 天</option>
        </select>
        <button id="refresh-btn" class="ta-btn">🔄 刷新</button>
        <button id="logout-btn" class="ta-btn ta-btn-danger">退出</button>
      </div>
    </header>

    <section class="ta-cards">
      <div class="ta-metric-card">
        <div class="ta-metric-label">今日消耗</div>
        <div class="ta-metric-value" id="today-tokens">-</div>
        <div class="ta-metric-sub" id="today-cost">¥ -</div>
      </div>
      <div class="ta-metric-card">
        <div class="ta-metric-label">本周消耗</div>
        <div class="ta-metric-value" id="week-tokens">-</div>
        <div class="ta-metric-sub" id="week-cost">¥ -</div>
      </div>
      <div class="ta-metric-card">
        <div class="ta-metric-label">本月消耗</div>
        <div class="ta-metric-value" id="month-tokens">-</div>
        <div class="ta-metric-sub" id="month-cost">¥ -</div>
      </div>
      <div class="ta-metric-card ta-metric-highlight">
        <div class="ta-metric-label">累计消耗</div>
        <div class="ta-metric-value" id="total-tokens">-</div>
        <div class="ta-metric-sub" id="total-cost">¥ -</div>
      </div>
    </section>

    <section class="ta-section">
      <h2 class="ta-section-title">按用途分类</h2>
      <div class="ta-breakdown" id="breakdown"></div>
    </section>

    <section class="ta-section">
      <h2 class="ta-section-title">每日趋势（近 <span id="trend-days">30</span> 天）</h2>
      <div class="ta-chart-wrap">
        <svg id="trend-chart" class="ta-chart" viewBox="0 0 800 240" preserveAspectRatio="none"></svg>
        <div class="ta-chart-legend">
          <span class="ta-legend-item"><span class="ta-dot ta-dot-ask"></span>问答 ask</span>
          <span class="ta-legend-item"><span class="ta-dot ta-dot-suggest"></span>推荐 suggest</span>
        </div>
      </div>
    </section>

    <section class="ta-section">
      <h2 class="ta-section-title">明细表</h2>
      <div class="ta-table-wrap">
        <table class="ta-table" id="detail-table">
          <thead>
            <tr>
              <th>日期</th>
              <th>问答次数</th>
              <th>问答 prompt</th>
              <th>问答 completion</th>
              <th>推荐次数</th>
              <th>推荐 prompt</th>
              <th>推荐 completion</th>
              <th>当日合计</th>
            </tr>
          </thead>
          <tbody id="detail-tbody"></tbody>
        </table>
      </div>
    </section>
  </div>
</div>

<style>
.ta-card{padding:24px;border-radius:12px;background:var(--code-bg,#f8f8f8);border:1px solid var(--border,#eee);max-width:420px;margin:40px auto}
.ta-title{font-size:1.2rem;margin-bottom:8px;color:var(--content,#333)}
.ta-hint{font-size:13px;color:var(--secondary,#888);margin-bottom:16px}
.ta-auth-row{display:flex;gap:8px}
.ta-input{flex:1;padding:10px 14px;border:1px solid var(--border,#ddd);border-radius:8px;background:var(--theme,#fff);color:var(--content,#333);font-size:14px;outline:none}
.ta-input:focus{border-color:var(--content,#333)}
.ta-btn{padding:10px 16px;border:1px solid var(--border,#ddd);border-radius:8px;background:var(--theme,#fff);color:var(--content,#333);cursor:pointer;font-size:14px;transition:all .15s;font-family:inherit}
.ta-btn:hover{background:var(--code-bg,#f0f0f0)}
.ta-btn-primary{background:var(--content,#333);color:var(--theme,#fff);border-color:var(--content,#333)}
.ta-btn-primary:hover{opacity:.85;background:var(--content,#333)}
.ta-btn-danger{color:#c33;border-color:#fcc}
.ta-btn-danger:hover{background:#fff0f0}
.ta-error{margin-top:12px;padding:8px 12px;border-radius:6px;background:#fee;color:#c33;font-size:13px}

.ta-header{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:24px;flex-wrap:wrap}
.ta-page-title{font-size:1.6rem;margin:0;color:var(--content,#333)}
.ta-page-subtitle{font-size:12px;color:var(--secondary,#888);margin-top:4px}
.ta-header-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.ta-select{padding:8px 12px;border:1px solid var(--border,#ddd);border-radius:6px;background:var(--theme,#fff);color:var(--content,#333);font-size:13px;font-family:inherit}

.ta-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:28px}
.ta-metric-card{padding:20px;border-radius:10px;background:var(--code-bg,#f7f7f7);border:1px solid var(--border,#eee)}
.ta-metric-highlight{background:var(--content,#333);color:var(--theme,#fff);border-color:var(--content,#333)}
.ta-metric-label{font-size:12px;color:var(--secondary,#888);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px}
.ta-metric-highlight .ta-metric-label{color:rgba(255,255,255,.7)}
.ta-metric-value{font-size:1.8rem;font-weight:700;color:var(--content,#333);line-height:1.2}
.ta-metric-highlight .ta-metric-value{color:var(--theme,#fff)}
.ta-metric-sub{margin-top:4px;font-size:13px;color:var(--secondary,#888)}
.ta-metric-highlight .ta-metric-sub{color:rgba(255,255,255,.8)}

.ta-section{margin-bottom:28px}
.ta-section-title{font-size:1.1rem;color:var(--content,#333);margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid var(--border,#eee)}
.ta-breakdown{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}
.ta-breakdown-item{padding:14px 16px;border-radius:8px;background:var(--code-bg,#f7f7f7);border-left:3px solid var(--content,#333)}
.ta-breakdown-item.suggest{border-left-color:#3b82f6}
.ta-breakdown-label{font-size:13px;color:var(--secondary,#888);margin-bottom:6px}
.ta-breakdown-value{font-size:16px;font-weight:600;color:var(--content,#333)}

.ta-chart-wrap{padding:20px;background:var(--code-bg,#f7f7f7);border-radius:10px;border:1px solid var(--border,#eee)}
.ta-chart{width:100%;height:240px;display:block}
.ta-chart-legend{display:flex;gap:20px;margin-top:12px;justify-content:center;font-size:13px;color:var(--secondary,#888)}
.ta-legend-item{display:inline-flex;align-items:center;gap:6px}
.ta-dot{width:10px;height:10px;border-radius:50%;display:inline-block}
.ta-dot-ask{background:var(--content,#333)}
.ta-dot-suggest{background:#3b82f6}

.ta-table-wrap{overflow-x:auto;border-radius:8px;border:1px solid var(--border,#eee)}
.ta-table{width:100%;border-collapse:collapse;font-size:13px;background:var(--theme,#fff)}
.ta-table th,.ta-table td{padding:10px 12px;text-align:right;border-bottom:1px solid var(--border,#eee)}
.ta-table th{background:var(--code-bg,#f7f7f7);font-weight:600;color:var(--content,#333);position:sticky;top:0}
.ta-table th:first-child,.ta-table td:first-child{text-align:left}
.ta-table tbody tr:hover{background:var(--code-bg,#fafafa)}
.ta-table-empty{padding:20px;text-align:center;color:var(--secondary,#999)}

@media screen and (max-width:640px){
  .ta-header{flex-direction:column}
  .ta-cards{grid-template-columns:repeat(2,1fr)}
  .ta-metric-value{font-size:1.4rem}
  .ta-chart{height:180px}
}
</style>

<script>
(function() {
  'use strict';
  var AI_EP = 'https://ybq-ai-search.garyyuen.workers.dev';
  var KEY_STORAGE = 'ybq_stats_key';
  var state = { key: '', data: null, days: 30 };

  // 自动填入 localStorage 的 key
  var savedKey = localStorage.getItem(KEY_STORAGE) || '';
  var urlKey = new URLSearchParams(location.search).get('key');
  if (urlKey) {
    state.key = urlKey;
    localStorage.setItem(KEY_STORAGE, urlKey);
  } else if (savedKey) {
    state.key = savedKey;
  }

  var authScreen = document.getElementById('auth-screen');
  var dashboard = document.getElementById('dashboard');
  var authInput = document.getElementById('auth-key');
  var authBtn = document.getElementById('auth-btn');
  var authError = document.getElementById('auth-error');

  if (state.key) {
    authInput.value = state.key;
    showDashboard();
  }

  authBtn.addEventListener('click', function() {
    var k = authInput.value.trim();
    if (!k) { authError.textContent = '请输入密钥'; authError.style.display = 'block'; return; }
    state.key = k;
    authError.style.display = 'none';
    authBtn.textContent = '验证中...';
    authBtn.disabled = true;
    loadData().then(function(ok) {
      authBtn.textContent = '进入';
      authBtn.disabled = false;
      if (ok) {
        localStorage.setItem(KEY_STORAGE, k);
        showDashboard();
      } else {
        authError.textContent = '密钥无效';
        authError.style.display = 'block';
      }
    });
  });
  authInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') authBtn.click(); });

  function showDashboard() {
    authScreen.style.display = 'none';
    dashboard.style.display = 'block';
    loadData().then(function() { render(); });
  }

  document.getElementById('refresh-btn').addEventListener('click', function() {
    var btn = this;
    btn.textContent = '🔄 加载中...';
    btn.disabled = true;
    loadData().then(function() {
      btn.textContent = '🔄 刷新';
      btn.disabled = false;
      render();
    });
  });

  document.getElementById('logout-btn').addEventListener('click', function() {
    localStorage.removeItem(KEY_STORAGE);
    state.key = '';
    location.search = '';
    location.reload();
  });

  document.getElementById('range-select').addEventListener('change', function() {
    state.days = parseInt(this.value, 10);
    loadData().then(render);
  });

  function loadData() {
    return fetch(AI_EP, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stats', key: state.key, days: state.days })
    })
    .then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function(data) {
      state.data = data;
      return true;
    })
    .catch(function(err) {
      console.error('loadData error:', err);
      return false;
    });
  }

  function render() {
    if (!state.data) return;
    var d = state.data;
    document.getElementById('last-updated').textContent = '生成于 ' + new Date(d.generated_at).toLocaleString('zh-CN') + ' · 单价 ¥' + d.cost.price_per_1k + '/1k tokens';

    // 顶部卡片
    setNum('today-tokens', d.cost.today_tokens);
    setNum('week-tokens', d.cost.week_tokens);
    setNum('month-tokens', d.cost.month_tokens);
    setNum('total-tokens', d.cost.total_tokens);
    document.getElementById('today-cost').textContent = '¥ ' + d.cost.today_cost;
    document.getElementById('week-cost').textContent = '¥ ' + d.cost.week_cost;
    document.getElementById('month-cost').textContent = '¥ ' + d.cost.month_cost;
    document.getElementById('total-cost').textContent = '¥ ' + d.cost.total_cost;

    // 分类
    var s = d.summary;
    document.getElementById('breakdown').innerHTML =
      renderBreakdown('🤖 问答 (ask)', s.today.ask_count, s.today.ask_prompt_tokens, s.today.ask_completion_tokens, false) +
      renderBreakdown('💡 推荐 (suggest)', s.today.suggest_count, s.today.suggest_prompt_tokens, s.today.suggest_completion_tokens, true);

    // 趋势图
    document.getElementById('trend-days').textContent = state.days;
    renderChart(d.days);

    // 明细表
    renderTable(d.days);
  }

  function renderBreakdown(label, count, prompt, completion, isSuggest) {
    var total = prompt + completion;
    return '<div class="ta-breakdown-item ' + (isSuggest ? 'suggest' : '') + '">' +
      '<div class="ta-breakdown-label">' + label + '</div>' +
      '<div class="ta-breakdown-value">' + count.toLocaleString() + ' 次 · ' + total.toLocaleString() + ' tokens</div>' +
      '<div class="ta-breakdown-label" style="margin-top:6px">prompt: ' + prompt.toLocaleString() + ' · completion: ' + completion.toLocaleString() + '</div>' +
    '</div>';
  }

  function renderChart(days) {
    var svg = document.getElementById('trend-chart');
    var w = 800, h = 240, pad = 30;
    if (!days.length) { svg.innerHTML = '<text x="400" y="120" text-anchor="middle" fill="#999">暂无数据</text>'; return; }
    var max = 0;
    days.forEach(function(d) {
      if (!d.data) return;
      var t = (d.data.ask?.prompt_tokens||0) + (d.data.ask?.completion_tokens||0)
            + (d.data.suggest?.prompt_tokens||0) + (d.data.suggest?.completion_tokens||0);
      if (t > max) max = t;
    });
    if (max === 0) { svg.innerHTML = '<text x="400" y="120" text-anchor="middle" fill="#999">该区间无消耗</text>'; return; }

    var bw = (w - pad * 2) / days.length;
    var chartH = h - pad * 2;
    var html = '';

    // y 轴刻度
    for (var i = 0; i <= 4; i++) {
      var y = pad + chartH - (chartH * i / 4);
      var v = Math.round(max * i / 4);
      html += '<line x1="' + pad + '" y1="' + y + '" x2="' + (w - pad) + '" y2="' + y + '" stroke="var(--border,#eee)" stroke-width="1"/>';
      html += '<text x="' + (pad - 4) + '" y="' + (y + 3) + '" text-anchor="end" fill="var(--secondary,#999)" font-size="10">' + formatK(v) + '</text>';
    }

    // 堆叠柱
    days.forEach(function(d, i) {
      var x = pad + i * bw + 1;
      var askT = d.data ? ((d.data.ask?.prompt_tokens||0) + (d.data.ask?.completion_tokens||0)) : 0;
      var suggT = d.data ? ((d.data.suggest?.prompt_tokens||0) + (d.data.suggest?.completion_tokens||0)) : 0;
      var askH = (askT / max) * chartH;
      var suggH = (suggT / max) * chartH;
      // 问答在底部
      if (askH > 0) {
        html += '<rect x="' + x + '" y="' + (pad + chartH - askH) + '" width="' + (bw - 2) + '" height="' + askH + '" fill="var(--content,#333)" rx="1"><title>' + d.date + ' 问答: ' + askT + ' tokens</title></rect>';
      }
      // 推荐在上部
      if (suggH > 0) {
        html += '<rect x="' + x + '" y="' + (pad + chartH - askH - suggH) + '" width="' + (bw - 2) + '" height="' + suggH + '" fill="#3b82f6" rx="1"><title>' + d.date + ' 推荐: ' + suggT + ' tokens</title></rect>';
      }
      // 日期标签（仅每 5 天）
      if (i % Math.max(1, Math.floor(days.length / 8)) === 0) {
        html += '<text x="' + (x + bw/2) + '" y="' + (h - 8) + '" text-anchor="middle" fill="var(--secondary,#999)" font-size="10">' + d.date.slice(5) + '</text>';
      }
    });

    svg.innerHTML = html;
  }

  function renderTable(days) {
    var tbody = document.getElementById('detail-tbody');
    var reversed = days.slice().reverse();
    if (!reversed.filter(function(d){return d.data;}).length) {
      tbody.innerHTML = '<tr><td colspan="8" class="ta-table-empty">该区间暂无消耗记录</td></tr>';
      return;
    }
    tbody.innerHTML = reversed.map(function(d) {
      if (!d.data) {
        return '<tr style="opacity:.4"><td>' + d.date + '</td><td colspan="7" style="color:var(--secondary,#aaa)">无消耗</td></tr>';
      }
      var askC = d.data.ask?.count || 0;
      var sugC = d.data.suggest?.count || 0;
      var askP = d.data.ask?.prompt_tokens || 0;
      var askCm = d.data.ask?.completion_tokens || 0;
      var sugP = d.data.suggest?.prompt_tokens || 0;
      var sugCm = d.data.suggest?.completion_tokens || 0;
      var total = askP + askCm + sugP + sugCm;
      return '<tr>' +
        '<td><strong>' + d.date + '</strong></td>' +
        '<td>' + askC + '</td><td>' + askP.toLocaleString() + '</td><td>' + askCm.toLocaleString() + '</td>' +
        '<td>' + sugC + '</td><td>' + sugP.toLocaleString() + '</td><td>' + sugCm.toLocaleString() + '</td>' +
        '<td><strong>' + total.toLocaleString() + '</strong></td>' +
      '</tr>';
    }).join('');
  }

  function setNum(id, n) { document.getElementById(id).textContent = n.toLocaleString(); }
  function formatK(n) { return n >= 1000 ? (n/1000).toFixed(1) + 'k' : n.toString(); }
})();
</script>
