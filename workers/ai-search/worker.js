// ybq.me AI Search Worker
// 架构：RAG 简化版（关键词检索 + LLM 生成）
// API Key 存于环境变量 MIMO_API_KEY，前端不可见

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
      const { question, history = [] } = await request.json();

      if (!question || typeof question !== 'string' || question.trim().length === 0) {
        return jsonResponse({ error: '请提供问题' }, 400);
      }

      if (question.length > 500) {
        return jsonResponse({ error: '问题过长，请精简到 500 字以内' }, 400);
      }

      // Step 1: 获取站点索引
      const indexUrl = `${env.SITE_URL}/index.json`;
      const indexRes = await fetch(indexUrl);
      if (!indexRes.ok) {
        return jsonResponse({ error: '站点索引获取失败' }, 502);
      }
      const articles = await indexRes.json();

      // Step 2: 关键词检索 top-5 相关文章片段
      const relevant = findRelevant(question, articles, 5);

      // Step 3: 构建 RAG prompt
      const systemPrompt = buildSystemPrompt(relevant);

      // Step 4: 调 MiMo LLM
      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-4).map(h => ({  // 保留最近 4 轮对话
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

    } catch (err) {
      console.error('Worker error:', err);
      return jsonResponse({ error: '服务内部错误' }, 500);
    }
  }
};


// === 辅助函数 ===

// 关键词检索：中文分词 + TF 评分
function findRelevant(query, articles, topK = 5) {
  // 简单中文分词：按标点/空格切分 + 单字 fallback
  const tokens = tokenize(query);
  if (tokens.length === 0) return articles.slice(0, topK);

  const scored = articles.map(article => {
    const text = `${article.title} ${article.summary || ''} ${(article.content || '').substring(0, 2000)}`;
    const textLower = text.toLowerCase();
    let score = 0;

    for (const token of tokens) {
      const t = token.toLowerCase();
      // 标题匹配权重 3x
      if (article.title.toLowerCase().includes(t)) score += 3;
      // 正文匹配
      const count = (textLower.match(new RegExp(escapeRegex(t), 'g')) || []).length;
      score += Math.min(count, 5);  // cap per token
    }

    return { ...article, _score: score };
  });

  return scored
    .filter(a => a._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, topK);
}

function tokenize(text) {
  // 中文：按非中文字符切分 + 连续中文按 2-4 字滑窗
  const tokens = [];
  const segments = text.split(/[\s,，。！？、；：""''（）()\[\]【】\-\n]+/).filter(Boolean);

  for (const seg of segments) {
    if (/[\u4e00-\u9fff]/.test(seg)) {
      // 中文片段：2-gram + 3-gram
      for (let i = 0; i < seg.length - 1; i++) {
        tokens.push(seg.substring(i, i + 2));
        if (i < seg.length - 2) {
          tokens.push(seg.substring(i, i + 3));
        }
      }
      // 也加完整片段（如果不太长）
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

function buildSystemPrompt(articles) {
  const context = articles.map((a, i) =>
    `【${i + 1}】${a.title}\n链接：${a.permalink}\n摘要：${(a.summary || a.content || '').substring(0, 500)}`
  ).join('\n\n---\n\n');

  return `你是 ybq.me 网站的 AI 助手，基于网站内容回答用户问题。

## 规则
1. 只基于以下提供的文章内容回答，不要编造信息
2. 如果提供的内容无法回答问题，诚实说"网站内容中暂未覆盖这个问题"
3. 回答时引用来源，格式：[文章标题](链接)
4. 回答简洁清晰，用中文，适合快速阅读
5. 如果问题涉及多个概念，分别引用相关文章

## 网站内容（检索到的相关文章）

${context}

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
