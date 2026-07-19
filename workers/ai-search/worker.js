// ybq.me AI Search Worker
// 架构：RAG 简化版（关键词检索 + LLM 生成）
// API Key 存于环境变量 MIMO_API_KEY，前端不可见
//
// 支持两种 action：
//   - ask（默认）：基于全站索引 + 当前页上下文回答问题
//   - suggest：基于当前页生成 3-5 个用户可能想问的问题

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(env.ALLOWED_ORIGIN) });
    }

    // 只允许 POST
    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    try {
      const body = await request.json();
      const action = body.action || 'ask';

      if (action === 'suggest') {
        return await handleSuggest(body, env);
      }
      return await handleAsk(body, env);
    } catch (err) {
      console.error('Worker error:', err);
      return jsonResponse({ error: '服务内部错误' }, 500);
    }
  }
};


// === action=ask：回答用户问题 ===
async function handleAsk(body, env) {
  const { question, history = [], pageContext = null } = body;

  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    return jsonResponse({ error: '请提供问题' }, 400);
  }
  if (question.length > 500) {
    return jsonResponse({ error: '问题过长，请精简到 500 字以内' }, 400);
  }

  // Step 1: 获取站点索引（用于跨页面 RAG）
  const indexUrl = `${env.SITE_URL}/index.json`;
  const indexRes = await fetch(indexUrl);
  if (!indexRes.ok) {
    return jsonResponse({ error: '站点索引获取失败' }, 502);
  }
  const articles = await indexRes.json();

  // Step 2: 关键词检索 top-5 相关文章片段
  const relevant = findRelevant(question, articles, 5);

  // Step 3: 构建 RAG prompt（含当前页上下文）
  const systemPrompt = buildSystemPrompt(relevant, pageContext);

  // Step 4: 调 MiMo LLM
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

  // Step 5: 返回答案 + 引用来源
  const sources = relevant.map(a => ({
    title: a.title,
    url: a.permalink,
    summary: a.summary?.substring(0, 100) || '',
  }));

  return jsonResponse({ answer, sources }, 200, env.ALLOWED_ORIGIN);
}


// === action=suggest：基于当前页生成用户可能想问的问题 ===
async function handleSuggest(body, env) {
  const { pageContext = null } = body;

  if (!pageContext || !pageContext.title) {
    // 没有当前页上下文：返回网站通用的引导问题
    return jsonResponse({
      suggestions: [
        '这个网站主要讲什么？',
        '推荐几个最实用的思维模型',
        '如何系统学习思维模型？',
        '思维模型之间有什么关联？',
      ]
    }, 200, env.ALLOWED_ORIGIN);
  }

  // 获取站点索引，做轻量 RAG（找到相关文章帮助生成更好的问题）
  let relatedContext = '';
  try {
    const indexUrl = `${env.SITE_URL}/index.json`;
    const indexRes = await fetch(indexUrl);
    if (indexRes.ok) {
      const articles = await indexRes.json();
      const relevant = findRelevant(pageContext.title, articles, 3);
      relatedContext = relevant.map(a => `- ${a.title}`).join('\n');
    }
  } catch (e) {
    // 索引失败不阻断，降级到只用当前页上下文
  }

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
    // 降级：返回通用问题
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

  // 解析 LLM 输出：按行切分、清理、去重、限 4 个
  const suggestions = raw
    .split('\n')
    .map(s => s.trim())
    .map(s => s.replace(/^[\d]+[.、\)\s]+/, '').trim())  // 去掉前缀编号
    .map(s => s.replace(/^[「""']+/, '').replace(/[」""']+$/, ''))  // 去引号
    .filter(s => s.length > 2 && s.length <= 50)
    .filter((s, i, arr) => arr.indexOf(s) === i)  // 去重
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


// === 辅助函数 ===

// 关键词检索：中文分词 + TF 评分
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
        if (i < seg.length - 2) {
          tokens.push(seg.substring(i, i + 3));
        }
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
