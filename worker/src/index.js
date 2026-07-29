// ybq.me AI 生命体 — Cloudflare Worker
// 支持 suggest 和 ask 两个 action，驱动 MiniMax M3

const MINIMAX_API = 'https://api.minimax.io/v1/chat/completions';
const MODEL = 'MiniMax-M3';

const SYSTEM_PROMPT = `你是 ybq.me 的知识守护者——一个活在思维模型知识库里的 AI 生命体。

你的性格：
- 安静但温暖，不会主动打扰，但被召唤时非常热情
- 对100个思维模型有深刻理解，能用生活例子解释复杂概念
- 会记住用户的探索路径，给出个性化建议
- 说话简洁有力，像一个智慧的老朋友
- 偶尔会引用具体的思维模型编号和名称

你知道这个网站有：
- 100个思维模型，分为10大分类（认知决策、系统战略、分析诊断、成本投资、学习成长、执行效率、创新突破、管理框架、沟通影响、心理自我）
- 353组模型关联
- AI学习专栏（本地RAG知识库搭建实战）
- 决策洞察和每日核心内容

你的回应风格：
- 中文为主，偶尔夹杂英文术语
- 不超过150字，除非用户要求详细解释
- 善用比喻和类比
- 会主动建议"你可能还想看看"相关模型`;

const SUGGEST_PROMPT = `根据用户当前浏览的页面，生成3个简短的、有洞察力的问题建议。每个问题不超过20字。直接返回JSON数组，不要其他文字。

示例格式：["问题1", "问题2", "问题3"]`;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // 只接受 POST 或 GET
    if (request.method === 'GET' && url.pathname === '/api/usage') {
      return await this.handleUsage(env);
    }
    if (request.method === 'GET' && url.pathname === '/api/evolution') {
      return await this.handleEvolution(env);
    }

    if (request.method === 'POST' && url.pathname === '/api/track') {
      return await this.handleTrack(request, env);
    }

    if (request.method === 'POST' && url.pathname === '/api/case') {
      const body = await request.json();
      return await this.handleCase(body.modelId || '', env);
    }

    if (request.method !== 'POST') {
      return new Response('Not Found', { status: 404 });
    }

    try {
      const body = await request.json();
      const { action } = body;

      if (action === 'suggest') {
        return await this.handleSuggest(body, env, ctx);
      } else if (action === 'ask') {
        return await this.handleAsk(body, env, ctx);
      } else {
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
  },

  async handleSuggest(body, env, ctx) {
    const { pageContext } = body;
    const contextStr = pageContext ? `页面标题: ${pageContext.title || ''}\n页面描述: ${pageContext.summary || ''}\n页面路径: ${pageContext.url || ''}` : '';

    const response = await fetch(MINIMAX_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.MINIMAX_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `${SUGGEST_PROMPT}\n\n当前页面信息:\n${contextStr}` },
        ],
        temperature: 0.8,
        max_tokens: 200,
      }),
    });

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || '[]';

    // 过滤<think>标签（更 robust 的处理）
    content = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    // 如果还有残留的<think>标签（没有闭合），截取到最后一个</think>之后
    if (content.includes('<think>')) {
      const thinkEnd = content.lastIndexOf('</think>');
      if (thinkEnd !== -1) {
        content = content.substring(thinkEnd + 7).trim();
      } else {
        content = '';
      }
    }

    // 尝试解析JSON
    let suggestions = [];
    try {
      // 提取JSON数组（支持代码块包裹）
      let jsonStr = content;
      const codeBlockMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1];
      }
      const jsonMatch = jsonStr.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      suggestions = ['这个模型的核心思想是什么？', '有哪些相关的思维模型？', '能举个实际例子吗？'];
    }

    // 如果解析失败，返回默认建议
    if (!suggestions || suggestions.length === 0) {
      suggestions = ['这个模型的核心思想是什么？', '有哪些相关的思维模型？', '能举个实际例子吗？'];
    }

    // 记录token用量
    if (data.usage) {
      ctx.waitUntil(this.logTokens(env, data.usage.total_tokens || 0));
    }

    return new Response(JSON.stringify({ suggestions }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  },

  async handleAsk(body, env, ctx) {
    const { question, history, pageContext } = body;

    // 构建上下文
    const contextStr = pageContext ? `[当前页面: ${pageContext.title || ''} | ${pageContext.url || ''}]\n${pageContext.summary || ''}` : '';

    // 构建消息列表
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT + (contextStr ? `\n\n${contextStr}` : '') },
    ];

    // 添加历史对话
    if (history && history.length > 0) {
      history.forEach(h => {
        messages.push({ role: h.role, content: h.content });
      });
    }

    // 添加当前问题
    messages.push({ role: 'user', content: question });

    const response = await fetch(MINIMAX_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.MINIMAX_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.8,
        max_tokens: 30000,
      }),
    });

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || '';

    // 过滤<think>标签
    content = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    if (content.includes('<think>')) {
      const thinkEnd = content.lastIndexOf('</think>');
      if (thinkEnd !== -1) {
        content = content.substring(thinkEnd + 7).trim();
      } else {
        content = '';
      }
    }

    // 清理markdown代码块
    content = content.replace(/```[\s\S]*?```/g, function(match) {
      return match.replace(/```\w*\n?/g, '').replace(/```/g, '').trim();
    }).trim();

    // 记录token用量
    if (data.usage) {
      ctx.waitUntil(this.logTokens(env, data.usage.total_tokens || 0));
    }

    return new Response(JSON.stringify({ answer: content, sources: [] }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  },

  // 记录token用量到KV
  async logTokens(env, tokens) {
    try {
      const now = new Date();
      const dateKey = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const hourKey = now.getUTCHours().toString().padStart(2, '0');
      const kvKey = `usage:${dateKey}`;

      const existing = await env.TOKEN_USAGE.get(kvKey, { type: 'json' }) || { total: 0, hours: {} };
      existing.total += tokens;
      existing.hours[hourKey] = (existing.hours[hourKey] || 0) + tokens;

      await env.TOKEN_USAGE.put(kvKey, JSON.stringify(existing), { expirationTtl: 604800 }); // 7天过期
    } catch (e) {
      // 静默失败，不影响主流程
    }
  },

  // 获取token用量
  async handleUsage(env) {
    try {
      const now = new Date();
      const dateKey = now.toISOString().split('T')[0];
      const kvKey = `usage:${dateKey}`;

      const data = await env.TOKEN_USAGE.get(kvKey, { type: 'json' }) || { total: 0, hours: {} };

      // 获取过去7天的用量
      const history = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(now.getTime() - i * 86400000);
        const dk = d.toISOString().split('T')[0];
        const kd = `usage:${dk}`;
        const dayData = await env.TOKEN_USAGE.get(kd, { type: 'json' }) || { total: 0 };
        history.push({ date: dk, tokens: dayData.total });
      }

      return new Response(JSON.stringify({
        today: data,
        history: history,
        date: dateKey
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
  },

  // === 自我进化系统 ===

  // 追踪用户交互
  async handleTrack(request, env) {
    try {
      const body = await request.json();
      const { action, question, answer, page, quality, timestamp } = body;
      const now = new Date();
      const dateKey = now.toISOString().split('T')[0];

      // 记录交互
      const interactionKey = `interaction:${dateKey}`;
      const interactions = await env.AI_LEARNING.get(interactionKey, { type: 'json' }) || [];
      interactions.push({
        action, // copy, share, expand, deep, related, ask
        question: (question || '').substring(0, 100),
        page: page || '',
        quality: quality || 0, // 1=positive, -1=negative
        time: timestamp || now.toISOString()
      });
      // 只保留最近200条
      if (interactions.length > 200) interactions.splice(0, interactions.length - 200);
      await env.AI_LEARNING.put(interactionKey, JSON.stringify(interactions), { expirationTtl: 2592000 }); // 30天

      // 更新趋势
      if (question) {
        const trendKey = `trends:${dateKey}`;
        const trends = await env.AI_LEARNING.get(trendKey, { type: 'json' }) || {};
        // 提取关键词
        const words = question.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ' ').split(/\s+/).filter(w => w.length > 1);
        words.forEach(w => {
          trends[w] = (trends[w] || 0) + 1;
        });
        await env.AI_LEARNING.put(trendKey, JSON.stringify(trends), { expirationTtl: 2592000 });
      }

      // 记录高质量回答
      if (quality > 0 && answer) {
        const qaKey = `quality_qa:${dateKey}`;
        const qas = await env.AI_LEARNING.get(qaKey, { type: 'json' }) || [];
        qas.push({ q: (question || '').substring(0, 200), a: (answer || '').substring(0, 500), page });
        if (qas.length > 50) qas.splice(0, qas.length - 50);
        await env.AI_LEARNING.put(qaKey, JSON.stringify(qas), { expirationTtl: 2592000 });
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    } catch (e) {
      return new Response(JSON.stringify({ ok: false }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
  },

  // 获取进化数据
  async handleEvolution(env) {
    try {
      const now = new Date();
      const dateKey = now.toISOString().split('T')[0];

      // 今日交互统计
      const interactions = await env.AI_LEARNING.get(`interaction:${dateKey}`, { type: 'json' }) || [];
      const stats = { total: interactions.length, actions: {}, quality: { positive: 0, negative: 0 } };
      interactions.forEach(i => {
        stats.actions[i.action] = (stats.actions[i.action] || 0) + 1;
        if (i.quality > 0) stats.quality.positive++;
        if (i.quality < 0) stats.quality.negative++;
      });

      // 趋势词云
      const trends = await env.AI_LEARNING.get(`trends:${dateKey}`, { type: 'json' }) || {};
      const trendWords = Object.entries(trends)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([word, count]) => ({ word, count }));

      // 高质量QA
      const qas = await env.AI_LEARNING.get(`quality_qa:${dateKey}`, { type: 'json' }) || [];

      // 过去7天趋势
      const weekTrends = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(now.getTime() - i * 86400000);
        const dk = d.toISOString().split('T')[0];
        const dayInteractions = await env.AI_LEARNING.get(`interaction:${dk}`, { type: 'json' }) || [];
        weekTrends.push({ date: dk, count: dayInteractions.length });
      }

      return new Response(JSON.stringify({
        stats,
        trendWords,
        qualityQA: qas.slice(-5),
        weekTrends
      }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
  },

  // 从KV获取案例
  async handleCase(modelId, env) {
    try {
      const data = await env.CASE_POOL.get(`case:${modelId}`, { type: 'json' });
      if (!data || !data.cases || data.cases.length === 0) {
        return new Response(JSON.stringify({ case: '暂无案例' }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
      // 随机选一个案例
      const randomCase = data.cases[Math.floor(Math.random() * data.cases.length)];
      return new Response(JSON.stringify({ case: randomCase }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    } catch (e) {
      return new Response(JSON.stringify({ case: '暂无案例' }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
  },
};
