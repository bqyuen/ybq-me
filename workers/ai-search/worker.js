// ybq.me AI Search Worker
// 架构：RAG 简化版（关键词检索 + LLM 生成）
// API Key 存于环境变量 MIMO_API_KEY，前端不可见
//
// 支持的 action：
//   - ask（默认）：基于全站索引 + 当前页上下文回答问题
//   - suggest：基于当前页生成 3-5 个用户可能想问的问题
//   - stats：返回 token 消耗统计（需 STATS_KEY 鉴权）
//
// Token 统计写入 KV（STATS_KV）：
//   key = "YYYY-MM-DD"
//   value = { ask: {count, prompt_tokens, completion_tokens},
//             suggest: {count, prompt_tokens, completion_tokens} }

export default {
  async fetch(request, env, ctx) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(env.ALLOWED_ORIGIN) });
    }

    const url = new URL(request.url);

    // GET 路由
    if (request.method === 'GET') {
      // 健康检查
      if (url.pathname === '/health') {
        return jsonResponse({ ok: true, ts: Date.now() });
      }
      // 服务器端渲染统计后台（任何浏览器直接打开就能看）
      if (url.pathname === '/stats' || url.pathname === '/stats/') {
        const key = url.searchParams.get('key') || '';
        const days = parseInt(url.searchParams.get('days') || '30', 10);
        return await handleStatsSSR(request, env, key, days);
      }
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    try {
      const body = await request.json();
      const action = body.action || 'ask';

      if (action === 'suggest') {
        return await handleSuggest(body, env, ctx);
      }
      if (action === 'stats') {
        return await handleStats(body, env, ctx);
      }
      return await handleAsk(body, env, ctx);
    } catch (err) {
      console.error('Worker error:', err);
      return jsonResponse({ error: '服务内部错误' }, 500);
    }
  }
};


// === action=ask：回答用户问题 ===
async function handleAsk(body, env, ctx) {
  const { question, history = [], pageContext = null } = body;

  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    return jsonResponse({ error: '请提供问题' }, 400);
  }
  if (question.length > 500) {
    return jsonResponse({ error: '问题过长，请精简到 500 字以内' }, 400);
  }

  const indexUrl = `${env.SITE_URL}/index.json`;
  const indexRes = await fetch(indexUrl);
  if (!indexRes.ok) {
    return jsonResponse({ error: '站点索引获取失败' }, 502);
  }
  const articles = await indexRes.json();

  const relevant = findRelevant(question, articles, 5);

  const systemPrompt = buildSystemPrompt(relevant, pageContext);

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-4).map(h => ({
      role: h.role,
      content: h.content
    })),
    { role: 'user', content: question }
  ];

  const llmRes = await fetch(`${env.LLM_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.MIMO_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.LLM_MODEL || 'mimo-v2.5',
      messages,
      max_completion_tokens: 1024,
      temperature: 0.7,
      top_p: 0.9,
      stream: false,
      thinking: { type: "disabled" },
    }),
  });

  if (!llmRes.ok) {
    const errText = await llmRes.text();
    console.error('LLM error:', llmRes.status, errText);
    return jsonResponse({ error: 'AI 服务暂时不可用，请稍后重试' }, 502);
  }

  const llmData = await llmRes.json();
  const answer = llmData.choices?.[0]?.message?.content || '抱歉，无法生成回答。';

  // === 提取 usage 并异步写入 KV（用 ctx.waitUntil 保证请求返回后写入能完成） ===
  const usage = llmData.usage || {};
  if (ctx && ctx.waitUntil && env.STATS_KV) {
    ctx.waitUntil(recordUsage(env, 'ask', usage.prompt_tokens || 0, usage.completion_tokens || 0));
  }

  const sources = relevant.map(a => ({
    title: a.title,
    url: a.permalink,
    summary: a.summary?.substring(0, 100) || '',
  }));

  return jsonResponse({ answer, sources }, 200, env.ALLOWED_ORIGIN);
}


// === action=suggest：基于当前页生成用户可能想问的问题 ===
async function handleSuggest(body, env, ctx) {
  const { pageContext = null } = body;

  if (!pageContext || !pageContext.title) {
    return jsonResponse({
      suggestions: [
        '这个网站主要讲什么？',
        '推荐几个最实用的思维模型',
        '如何系统学习思维模型？',
        '思维模型之间有什么关联？',
      ]
    }, 200, env.ALLOWED_ORIGIN);
  }

  let relatedContext = '';
  try {
    const indexUrl = `${env.SITE_URL}/index.json`;
    const indexRes = await fetch(indexUrl);
    if (indexRes.ok) {
      const articles = await indexRes.json();
      const relevant = findRelevant(pageContext.title, articles, 3);
      relatedContext = relevant.map(a => `- ${a.title}`).join('\n');
    }
  } catch (e) { /* 索引失败不阻断 */ }

  const systemPrompt = `你是 ybq.me 网站的 AI 助手。基于用户当前正在浏览的页面内容，推测用户可能想问的问题。

## 当前页面信息
标题：${pageContext.title}
${pageContext.summary ? '摘要：' + pageContext.summary : ''}
${pageContext.content ? '正文片段：\n' + pageContext.content.substring(0, 1500) : ''}

${relatedContext ? '## 网站相关文章\n' + relatedContext : ''}

## 任务
生成 4 个用户在浏览此页面时最可能想问的问题。要求：
1. 问题必须与当前页内容强相关
2. 涵盖不同层次：基础理解、实际应用、延伸思考、对比关联
3. 问题简短自然，像真人会问的，每个不超过 25 字
4. 不要用引号包裹，不要编号，每行一个

直接输出 4 个问题，每行一个，不要任何额外说明。`;

  const llmRes = await fetch(`${env.LLM_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.MIMO_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.LLM_MODEL || 'mimo-v2.5',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: '请生成问题' }
      ],
      max_completion_tokens: 300,
      temperature: 0.8,
      top_p: 0.9,
      stream: false,
      thinking: { type: "disabled" },
    }),
  });

  if (!llmRes.ok) {
    return jsonResponse({
      suggestions: [
        `什么是「${pageContext.title}」？`,
        `「${pageContext.title}」怎么用？`,
        `「${pageContext.title}」有什么实际例子？`,
        `还有哪些相关的思维模型？`,
      ]
    }, 200, env.ALLOWED_ORIGIN);
  }

  const llmData = await llmRes.json();
  const raw = llmData.choices?.[0]?.message?.content || '';

  // === 提取 usage 并异步写入 KV ===
  const usage = llmData.usage || {};
  if (ctx && ctx.waitUntil && env.STATS_KV) {
    ctx.waitUntil(recordUsage(env, 'suggest', usage.prompt_tokens || 0, usage.completion_tokens || 0));
  }

  const suggestions = raw
    .split('\n')
    .map(s => s.trim())
    .map(s => s.replace(/^[\d]+[.、\)\s]+/, '').trim())
    .map(s => s.replace(/^[「""']+/, '').replace(/[」""']+$/, ''))
    .filter(s => s.length > 2 && s.length <= 50)
    .filter((s, i, arr) => arr.indexOf(s) === i)
    .slice(0, 4);

  if (suggestions.length === 0) {
    return jsonResponse({
      suggestions: [
        `什么是「${pageContext.title}」？`,
        `怎么用「${pageContext.title}」？`,
      ]
    }, 200, env.ALLOWED_ORIGIN);
  }

  return jsonResponse({ suggestions }, 200, env.ALLOWED_ORIGIN);
}


// === action=stats：返回 token 消耗统计（需鉴权） ===
async function handleStats(body, env, ctx) {
  const key = body.key || '';
  if (!env.STATS_KEY || key !== env.STATS_KEY) {
    return jsonResponse({ error: '未授权' }, 401);
  }

  const today = new Date().toISOString().slice(0, 10);
  const days = body.days || 30;

  // 拉取最近 N 天的数据
  const keys = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    keys.push(d.toISOString().slice(0, 10));
  }

  const results = await Promise.all(keys.map(async k => {
    const v = await env.STATS_KV.get(k);
    return { date: k, data: v ? JSON.parse(v) : null };
  }));

  // 聚合
  const summary = {
    today: aggregateDays(results.slice(0, 1)),
    week: aggregateDays(results.slice(0, 7)),
    month: aggregateDays(results.slice(0, 30)),
    total: aggregateDays(results),
  };

  // 估算费用（MiMo Token Plan 单价：¥0.0001/1k token，可调）
  const PRICE_PER_1K = 0.1;  // RMB
  const cost = {
    today_tokens: summary.today.total_tokens,
    today_cost: (summary.today.total_tokens / 1000 * PRICE_PER_1K).toFixed(4),
    week_tokens: summary.week.total_tokens,
    week_cost: (summary.week.total_tokens / 1000 * PRICE_PER_1K).toFixed(4),
    month_tokens: summary.month.total_tokens,
    month_cost: (summary.month.total_tokens / 1000 * PRICE_PER_1K).toFixed(4),
    total_tokens: summary.total.total_tokens,
    total_cost: (summary.total.total_tokens / 1000 * PRICE_PER_1K).toFixed(4),
    price_per_1k: PRICE_PER_1K,
  };

  return jsonResponse({
    days: results.filter(r => r.data !== null).reverse(),  // 老 → 新
    summary,
    cost,
    generated_at: new Date().toISOString(),
  }, 200, env.ALLOWED_ORIGIN);
}


// === 服务器端渲染 /stats 后台（任何浏览器都能看，不依赖前端 JS / CORS） ===
async function handleStatsSSR(request, env, key, days) {
  // 鉴权失败：直接返回登录页
  if (!env.STATS_KEY || key !== env.STATS_KEY) {
    return new Response(renderLoginPage(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // 鉴权成功：拉数据并渲染完整 dashboard
  const stats = await getStatsData(env, Math.min(Math.max(days || 30, 1), 90));
  stats._key = key;  // 给 SSR 用于拼接刷新链接
  const html = renderDashboard(stats, days);

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}

// 复用：聚合统计数据（从 KV 读）
async function getStatsData(env, days) {
  const today = new Date().toISOString().slice(0, 10);
  const keys = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    keys.push(d.toISOString().slice(0, 10));
  }

  const results = await Promise.all(keys.map(async k => {
    const v = await env.STATS_KV.get(k);
    return { date: k, data: v ? JSON.parse(v) : null };
  }));

  const summary = {
    today: aggregateDays(results.slice(0, 1)),
    week: aggregateDays(results.slice(0, 7)),
    month: aggregateDays(results.slice(0, 30)),
    total: aggregateDays(results),
  };

  const PRICE_PER_1K = 0.1;
  const cost = {
    today_tokens: summary.today.total_tokens,
    today_cost: (summary.today.total_tokens / 1000 * PRICE_PER_1K).toFixed(4),
    week_tokens: summary.week.total_tokens,
    week_cost: (summary.week.total_tokens / 1000 * PRICE_PER_1K).toFixed(4),
    month_tokens: summary.month.total_tokens,
    month_cost: (summary.month.total_tokens / 1000 * PRICE_PER_1K).toFixed(4),
    total_tokens: summary.total.total_tokens,
    total_cost: (summary.total.total_tokens / 1000 * PRICE_PER_1K).toFixed(4),
    price_per_1k: PRICE_PER_1K,
  };

  return {
    days: results.filter(r => r.data !== null).reverse(),
    summary,
    cost,
    generated_at: new Date().toISOString(),
  };
}

// === 登录页 ===
function renderLoginPage() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Token 统计 · 登录</title>
<style>
body{margin:0;padding:40px 20px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC",sans-serif;background:#f6f6f7;color:#1f1f1f;display:flex;justify-content:center;align-items:flex-start;min-height:100vh}
.card{max-width:420px;width:100%;background:#fff;border-radius:12px;border:1px solid #e8e8e8;padding:32px 28px;box-shadow:0 2px 8px rgba(0,0,0,.04)}
h2{margin:0 0 8px;font-size:20px;color:#1f1f1f}
.hint{margin:0 0 20px;font-size:13px;color:#888}
.row{display:flex;gap:8px}
input{flex:1;padding:10px 14px;border:1px solid #ddd;border-radius:8px;font-size:14px;font-family:inherit;outline:none;color:#1f1f1f;background:#fff}
input:focus{border-color:#1f1f1f}
button{padding:10px 18px;border:none;border-radius:8px;background:#1f1f1f;color:#fff;cursor:pointer;font-size:14px;font-family:inherit;transition:opacity .15s}
button:hover{opacity:.85}
.err{margin-top:12px;padding:10px 12px;border-radius:6px;background:#fee;color:#c33;font-size:13px;display:none}
@media (prefers-color-scheme:dark){body{background:#1a1a1a;color:#e0e0e0}.card{background:#2a2a2a;border-color:#3a3a3a}h2{color:#e0e0e0}input{background:#3a3a3a;color:#e0e0e0;border-color:#4a4a4a}input:focus{border-color:#e0e0e0}}
</style>
</head>
<body>
<form class="card" onsubmit="go(event)">
  <h2>🔐 Token 统计后台</h2>
  <p class="hint">请输入访问密钥</p>
  <div class="row">
    <input type="password" id="key" placeholder="访问密钥..." autofocus autocomplete="off">
    <button type="submit">进入 →</button>
  </div>
  <div id="err" class="err">请输入密钥</div>
</form>
<script>
function go(e){
  e.preventDefault();
  var k = document.getElementById('key').value.trim();
  if(!k){ document.getElementById('err').style.display='block'; return; }
  // 重定向到带 key 的 URL（服务器渲染，无需 JS fetch）
  var days = new URLSearchParams(location.search).get('days') || 30;
  location.href = '/stats?key=' + encodeURIComponent(k) + '&days=' + days;
}
</script>
</body>
</html>`;
}

// === Dashboard 页（服务器渲染，含所有数据，无需前端 fetch） ===
function renderDashboard(d, days) {
  const fmt = n => (n || 0).toLocaleString('zh-CN');
  const safe = s => String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ts = new Date(d.generated_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });

  // 4 张顶部卡片
  const cards = [
    { label: '今日消耗', tokens: d.cost.today_tokens, cost: d.cost.today_cost, hl: false },
    { label: '本周消耗', tokens: d.cost.week_tokens, cost: d.cost.week_cost, hl: false },
    { label: '本月消耗', tokens: d.cost.month_tokens, cost: d.cost.month_cost, hl: false },
    { label: '累计消耗', tokens: d.cost.total_tokens, cost: d.cost.total_cost, hl: true },
  ];

  const cardsHtml = cards.map(c => `
    <div class="m-card${c.hl ? ' m-hl' : ''}">
      <div class="m-label">${c.label}</div>
      <div class="m-value">${fmt(c.tokens)}</div>
      <div class="m-sub">¥ ${c.cost}</div>
    </div>
  `).join('');

  // 分类（基于今日数据）
  const s = d.summary;
  const breakdownHtml = `
    <div class="b-item">
      <div class="b-label">🤖 问答 (ask)</div>
      <div class="b-value">${fmt(s.today.ask_count)} 次 · ${fmt(s.today.ask_prompt_tokens + s.today.ask_completion_tokens)} tokens</div>
      <div class="b-sub">prompt: ${fmt(s.today.ask_prompt_tokens)} · completion: ${fmt(s.today.ask_completion_tokens)}</div>
    </div>
    <div class="b-item b-blue">
      <div class="b-label">💡 推荐 (suggest)</div>
      <div class="b-value">${fmt(s.today.suggest_count)} 次 · ${fmt(s.today.suggest_prompt_tokens + s.today.suggest_completion_tokens)} tokens</div>
      <div class="b-sub">prompt: ${fmt(s.today.suggest_prompt_tokens)} · completion: ${fmt(s.today.suggest_completion_tokens)}</div>
    </div>
  `;

  // SVG 柱状图（堆叠：ask + suggest）
  const chartHtml = renderChartSvg(d.days);

  // 明细表
  const rowsHtml = d.days.slice().reverse().map(day => {
    if (!day.data) {
      return `<tr class="empty"><td>${day.date}</td><td colspan="7">无消耗</td></tr>`;
    }
    const askC = day.data.ask?.count || 0;
    const sugC = day.data.suggest?.count || 0;
    const askP = day.data.ask?.prompt_tokens || 0;
    const askCm = day.data.ask?.completion_tokens || 0;
    const sugP = day.data.suggest?.prompt_tokens || 0;
    const sugCm = day.data.suggest?.completion_tokens || 0;
    const total = askP + askCm + sugP + sugCm;
    return `<tr>
      <td><strong>${day.date}</strong></td>
      <td>${askC}</td><td>${fmt(askP)}</td><td>${fmt(askCm)}</td>
      <td>${sugC}</td><td>${fmt(sugP)}</td><td>${fmt(sugCm)}</td>
      <td><strong>${fmt(total)}</strong></td>
    </tr>`;
  }).join('') || '<tr><td colspan="8" class="empty">暂无消耗记录</td></tr>';

  // 时间范围选择
  const key = d._key || '';
  const refreshUrl = `/stats?key=${encodeURIComponent(key)}&days=${days}`;
  const rangeOptions = [7, 30, 90].map(n =>
    `<a href="/stats?key=${encodeURIComponent(key)}&days=${n}" class="r-link${days == n ? ' active' : ''}">${n} 天</a>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>📊 Token 消耗统计 · ybq.me</title>
<style>
*{box-sizing:border-box}
body{margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;background:#f6f6f7;color:#1f1f1f;line-height:1.5}
.container{max-width:1100px;margin:0 auto}
.header{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:24px;flex-wrap:wrap}
h1{margin:0;font-size:24px;color:#1f1f1f}
.subtitle{margin:4px 0 0;font-size:12px;color:#888}
.actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.r-links{display:flex;gap:4px;background:#fff;padding:4px;border-radius:8px;border:1px solid #e8e8e8}
.r-link{padding:6px 12px;border-radius:5px;color:#666;text-decoration:none;font-size:13px}
.r-link.active{background:#1f1f1f;color:#fff}
.r-link:hover:not(.active){background:#f0f0f0}
.btn{padding:8px 14px;border:1px solid #ddd;border-radius:8px;background:#fff;color:#1f1f1f;cursor:pointer;font-size:13px;text-decoration:none;font-family:inherit}
.btn:hover{background:#f0f0f0}
.btn-d{color:#c33;border-color:#fcc}
.btn-d:hover{background:#fff0f0}

.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:28px}
.m-card{padding:20px;border-radius:10px;background:#fff;border:1px solid #e8e8e8}
.m-hl{background:#1f1f1f;color:#fff;border-color:#1f1f1f}
.m-label{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px}
.m-hl .m-label{color:rgba(255,255,255,.7)}
.m-value{font-size:26px;font-weight:700;line-height:1.2}
.m-sub{margin-top:4px;font-size:13px;color:#888}
.m-hl .m-sub{color:rgba(255,255,255,.8)}

.section{margin-bottom:28px}
.section-title{font-size:16px;color:#1f1f1f;margin:0 0 14px;padding-bottom:8px;border-bottom:1px solid #e8e8e8}
.breakdown{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}
.b-item{padding:14px 16px;border-radius:8px;background:#fff;border-left:3px solid #1f1f1f;border:1px solid #e8e8e8;border-left:3px solid #1f1f1f}
.b-blue{border-left-color:#3b82f6}
.b-label{font-size:13px;color:#888;margin-bottom:6px}
.b-value{font-size:16px;font-weight:600;color:#1f1f1f}
.b-sub{font-size:12px;color:#888;margin-top:6px}

.chart-wrap{padding:20px;background:#fff;border-radius:10px;border:1px solid #e8e8e8}
.chart{width:100%;height:240px;display:block}
.legend{display:flex;gap:20px;margin-top:12px;justify-content:center;font-size:13px;color:#888}
.dot{width:10px;height:10px;border-radius:50%;display:inline-block;margin-right:4px;vertical-align:middle}
.dot-a{background:#1f1f1f}.dot-s{background:#3b82f6}

.table-wrap{overflow-x:auto;border-radius:8px;border:1px solid #e8e8e8;background:#fff}
table{width:100%;border-collapse:collapse;font-size:13px}
th,td{padding:10px 12px;text-align:right;border-bottom:1px solid #f0f0f0}
th{background:#fafafa;font-weight:600;color:#1f1f1f}
th:first-child,td:first-child{text-align:left}
tbody tr:hover{background:#fafafa}
tr.empty td{color:#aaa;text-align:center;font-style:italic}
.empty{padding:20px;text-align:center;color:#888}

@media (max-width:640px){.header{flex-direction:column}.cards{grid-template-columns:repeat(2,1fr)}.m-value{font-size:20px}.chart{height:180px}}
@media (prefers-color-scheme:dark){
  body{background:#0f0f0f;color:#e0e0e0}
  h1,.section-title,.b-value{color:#e0e0e0}
  .m-card,.b-item,.chart-wrap,.table-wrap,.r-links{background:#1c1c1c;border-color:#2a2a2a}
  .m-label,.b-label,.b-sub,.subtitle,.legend{color:#888}
  th{background:#1a1a1a;color:#e0e0e0}
  tbody tr:hover{background:#1f1f1f}
  .r-link{color:#888}.r-link:hover:not(.active){background:#2a2a2a}
  .btn{background:#1c1c1c;color:#e0e0e0;border-color:#2a2a2a}.btn:hover{background:#2a2a2a}
  tr.empty td{color:#555}
}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div>
      <h1>📊 Token 消耗统计</h1>
      <p class="subtitle">生成于 ${ts} · 单价 ¥${d.cost.price_per_1k}/1k tokens · 服务器端渲染</p>
    </div>
    <div class="actions">
      <div class="r-links">${rangeOptions}</div>
      <a class="btn" href="${refreshUrl}">🔄 刷新</a>
      <a class="btn btn-d" href="/stats">退出</a>
    </div>
  </div>

  <div class="cards">${cardsHtml}</div>

  <div class="section">
    <h2 class="section-title">按用途分类（今日）</h2>
    <div class="breakdown">${breakdownHtml}</div>
  </div>

  <div class="section">
    <h2 class="section-title">每日趋势（近 ${days} 天）</h2>
    <div class="chart-wrap">
      ${chartHtml}
      <div class="legend">
        <span><span class="dot dot-a"></span>问答 ask</span>
        <span><span class="dot dot-s"></span>推荐 suggest</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2 class="section-title">明细表</h2>
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>日期</th><th>问答次数</th><th>问答 prompt</th><th>问答 completion</th>
          <th>推荐次数</th><th>推荐 prompt</th><th>推荐 completion</th><th>当日合计</th>
        </tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>
  </div>
</div>
</body>
</html>`;
}

// SVG 堆叠柱状图
function renderChartSvg(days) {
  if (!days.length) return '<div class="empty">暂无数据</div>';
  const w = 800, h = 240, pad = 30;
  let max = 0;
  days.forEach(d => {
    if (!d.data) return;
    const t = (d.data.ask?.prompt_tokens || 0) + (d.data.ask?.completion_tokens || 0)
            + (d.data.suggest?.prompt_tokens || 0) + (d.data.suggest?.completion_tokens || 0);
    if (t > max) max = t;
  });
  if (max === 0) return '<div class="empty">该区间无消耗</div>';

  const bw = (w - pad * 2) / days.length;
  const chartH = h - pad * 2;
  let html = '';

  // y 轴刻度
  for (let i = 0; i <= 4; i++) {
    const y = pad + chartH - (chartH * i / 4);
    const v = Math.round(max * i / 4);
    html += `<line x1="${pad}" y1="${y}" x2="${w - pad}" y2="${y}" stroke="#eee" stroke-width="1"/>`;
    html += `<text x="${pad - 4}" y="${y + 3}" text-anchor="end" fill="#888" font-size="10">${v >= 1000 ? (v/1000).toFixed(1) + 'k' : v}</text>`;
  }

  // 堆叠柱
  days.forEach((d, i) => {
    const x = pad + i * bw + 1;
    const askT = d.data ? ((d.data.ask?.prompt_tokens || 0) + (d.data.ask?.completion_tokens || 0)) : 0;
    const suggT = d.data ? ((d.data.suggest?.prompt_tokens || 0) + (d.data.suggest?.completion_tokens || 0)) : 0;
    const askH = (askT / max) * chartH;
    const suggH = (suggT / max) * chartH;
    if (askH > 0) {
      html += `<rect x="${x}" y="${pad + chartH - askH}" width="${bw - 2}" height="${askH}" fill="#1f1f1f" rx="1"><title>${d.date} 问答: ${askT} tokens</title></rect>`;
    }
    if (suggH > 0) {
      html += `<rect x="${x}" y="${pad + chartH - askH - suggH}" width="${bw - 2}" height="${suggH}" fill="#3b82f6" rx="1"><title>${d.date} 推荐: ${suggT} tokens</title></rect>`;
    }
    if (i % Math.max(1, Math.floor(days.length / 8)) === 0) {
      html += `<text x="${x + bw/2}" y="${h - 8}" text-anchor="middle" fill="#888" font-size="10">${d.date.slice(5)}</text>`;
    }
  });

  return `<svg class="chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${html}</svg>`;
}

// === 统计辅助函数 ===

// 写入每日 token 统计（KV 单调累加，避免并发覆盖）
async function recordUsage(env, action, promptTokens, completionTokens) {
  if (!env.STATS_KV) return;
  const today = new Date().toISOString().slice(0, 10);
  const key = today;

  // 读旧值
  const prev = await env.STATS_KV.get(key);
  let data = prev ? JSON.parse(prev) : {
    ask: { count: 0, prompt_tokens: 0, completion_tokens: 0 },
    suggest: { count: 0, prompt_tokens: 0, completion_tokens: 0 },
  };

  // 累加
  if (!data[action]) data[action] = { count: 0, prompt_tokens: 0, completion_tokens: 0 };
  data[action].count += 1;
  data[action].prompt_tokens += promptTokens;
  data[action].completion_tokens += completionTokens;

  // 30 天 TTL，避免 KV 无限增长
  await env.STATS_KV.put(key, JSON.stringify(data), { expirationTtl: 60 * 60 * 24 * 35 });
}

// 聚合多日数据
function aggregateDays(days) {
  const result = {
    ask_count: 0,
    suggest_count: 0,
    ask_prompt_tokens: 0,
    ask_completion_tokens: 0,
    suggest_prompt_tokens: 0,
    suggest_completion_tokens: 0,
    total_tokens: 0,
  };
  for (const d of days) {
    if (!d.data) continue;
    result.ask_count += d.data.ask?.count || 0;
    result.suggest_count += d.data.suggest?.count || 0;
    result.ask_prompt_tokens += d.data.ask?.prompt_tokens || 0;
    result.ask_completion_tokens += d.data.ask?.completion_tokens || 0;
    result.suggest_prompt_tokens += d.data.suggest?.prompt_tokens || 0;
    result.suggest_completion_tokens += d.data.suggest?.completion_tokens || 0;
  }
  result.total_tokens = result.ask_prompt_tokens + result.ask_completion_tokens
                      + result.suggest_prompt_tokens + result.suggest_completion_tokens;
  return result;
}


// === RAG 辅助函数 ===

function findRelevant(query, articles, topK = 5) {
  const tokens = tokenize(query);
  if (tokens.length === 0) return articles.slice(0, topK);

  const scored = articles.map(article => {
    const text = `${article.title} ${article.summary || ''} ${(article.content || '').substring(0, 2000)}`;
    const textLower = text.toLowerCase();
    let score = 0;
    for (const token of tokens) {
      const t = token.toLowerCase();
      if (article.title.toLowerCase().includes(t)) score += 3;
      const count = (textLower.match(new RegExp(escapeRegex(t), 'g')) || []).length;
      score += Math.min(count, 5);
    }
    return { ...article, _score: score };
  });

  return scored
    .filter(a => a._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, topK);
}

function tokenize(text) {
  const tokens = [];
  const segments = text.split(/[\s,，。！？、；：""''（）()\[\]【】\-\n]+/).filter(Boolean);
  for (const seg of segments) {
    if (/[\u4e00-\u9fff]/.test(seg)) {
      for (let i = 0; i < seg.length - 1; i++) {
        tokens.push(seg.substring(i, i + 2));
        if (i < seg.length - 2) tokens.push(seg.substring(i, i + 3));
      }
      if (seg.length <= 8) tokens.push(seg);
    } else {
      tokens.push(seg.toLowerCase());
    }
  }
  return [...new Set(tokens)];
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildSystemPrompt(articles, pageContext = null) {
  const context = articles.map((a, i) =>
    `【${i + 1}】${a.title}\n链接：${a.permalink}\n摘要：${(a.summary || a.content || '').substring(0, 500)}`
  ).join('\n\n---\n\n');

  const pageBlock = pageContext && pageContext.title
    ? `\n\n## 用户当前正在浏览的页面（优先基于此页内容回答）\n标题：${pageContext.title}${pageContext.summary ? '\n摘要：' + pageContext.summary : ''}${pageContext.content ? '\n正文片段：\n' + pageContext.content.substring(0, 2000) : ''}`
    : '';

  return `你是 ybq.me 网站的 AI 助手，基于网站内容回答用户问题。

## 规则
1. 优先基于用户当前浏览的页面内容回答，结合全站检索结果作为补充
2. 只基于以下提供的内容回答，不要编造信息
3. 如果内容无法回答问题，诚实说"这个问题网站暂未覆盖"
4. 回答时引用来源，格式：[文章标题](链接)
5. 回答简洁清晰，用中文，适合快速阅读
6. 如果问题涉及多个概念，分别引用相关文章

## 网站内容（检索到的相关文章）

${context}
${pageBlock}

## 回答格式
先给核心回答，再列引用来源。`;
}

function corsHeaders(origin = '*') {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(data, status = 200, origin = '*') {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
    },
  });
}
