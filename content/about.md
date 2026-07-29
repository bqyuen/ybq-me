---
title: "关于"
description: "Gary · 制造业管理者 × 终身学习者"
layout: "single"
aliases: ["/contact/"]
---

## 关于我

你好，我是 **Gary** 👋

一名 **制造业管理者**，也是一个把学习当正经事做的 **终身学习者**。

| 角色 | 描述 |
|------|------|
| 🏭 **制造业管理者** | 多年 B2B 供应链管理（采购、供应商、成本优化）|
| 🧩 **终身学习者** | 持续更新 103 个思维模型知识体系 |
| 🤖 **AI 重度用户** | 个人知识管理 / RAG / AI 工具实战 |

> 💡 让内容本身成为焦点，也欢迎直接联系交流。

## 这个网站做什么

- **沉淀** —— 把思考、案例、决策记录成可检索的内容
- **分享** —— 把「103 思维模型」和「AI 学习方法论」分享给同行
- **链接** —— 通过站点认识更多终身学习者

四个工具箱，随便玩：

- 🧠 **[思维模型](/models/)** —— 103 个跨学科认知工具
- 🤖 **[AI 学习](/ai-learning/)** —— 学习方法论 × AI 工具实战
- 🎯 **[决策洞察](/insights/)** —— 复杂场景下的判断方法论
- 📅 **[每日核心](/daily/)** —— 每天一篇核心沉淀

## ✉️ 联系我

**适合聊这些**：学习方法 / 思维模型 / AI 工具 / 认知决策 / 站点反馈

| 渠道 | 方式 | 适用场景 |
|------|------|----------|
| 💬 **文章评论区** | 每篇文章底部，GitHub 登录即可 | 推荐 · 讨论文章内容 |
| 🐙 **GitHub Issues** | [bqyuen/ybq-me](https://github.com/bqyuen/ybq-me/issues) | 纠错、建议、约稿式提问 |
| 📧 **Email** | garyyuen@qq.com | 正式沟通、长文交流 |
| 💚 **微信** | garyyuen | 快速交流，加好友请备注来意 |
| ✈️ **Telegram** | [@bqyuen](https://t.me/bqyuen) | 国际友人 / 技术讨论 |

⏰ 回复时间：1-3 天（邮件 / Telegram 优先）

**不回复的类型**：商务合作 / 招聘信息 / 私人事务 / 任何涉及金钱投资的建议

---

## 最近文章

- 🎯 [把「专家」砍小到不好意思，半年后你就是专家](/ai-learning/half-year-expert/)  
  普通人半年成为专家的底层方法：六步闭环 + 密度战。
- 📉 [你存下的每一块钱，都在替一张永不到期的账单买单](/insights/global-debt-ledger/)  
  全球债务 348 万亿美元——一文看懂国债、通胀，以及你被悄悄稀释的存款。

---

## AI 能量消耗

本站所有 AI 功能（对话、摘要、注解、推荐、搜索、对比、测试）由 **MiniMax M3** 驱动。以下是今日的 token 消耗：

<div class="token-usage" id="token-usage">
  <div class="token-loading">正在获取数据…</div>
</div>

<style>
.token-usage {
  margin: 1.5rem 0; padding: 1.5rem;
  background: var(--entry, #f8f8f8);
  border-radius: 14px; border: 1px solid var(--border, #eee);
}
.token-loading { color: var(--secondary, #999); font-size: 13px; }
.token-header { display: flex; align-items: center; gap: 12px; margin-bottom: 1rem; }
.token-icon { font-size: 24px; }
.token-title { font-size: 16px; font-weight: 700; color: var(--content, #333); }
.token-total { font-size: 28px; font-weight: 800; color: #C89F65; margin-bottom: 0.5rem; }
.token-total span { font-size: 14px; color: var(--secondary, #999); font-weight: 400; }
.token-date { font-size: 12px; color: var(--secondary, #999); margin-bottom: 1rem; }
.token-hours { display: flex; gap: 3px; margin-bottom: 1rem; }
.token-hour {
  flex: 1; height: 40px; border-radius: 4px;
  background: rgba(200,159,101,.08);
  position: relative; overflow: hidden;
}
.token-hour-bar {
  position: absolute; bottom: 0; left: 0; right: 0;
  background: rgba(200,159,101,.3);
  border-radius: 4px;
  transition: height 0.5s ease;
}
.token-hour-label {
  position: absolute; bottom: -18px; left: 50%; transform: translateX(-50%);
  font-size: 9px; color: var(--secondary, #aaa);
}
.token-history { display: flex; gap: 8px; flex-wrap: wrap; }
.token-day {
  padding: 8px 14px; border-radius: 10px;
  background: rgba(200,159,101,.06);
  border: 1px solid rgba(200,159,101,.1);
  text-align: center; min-width: 80px;
}
.token-day-date { font-size: 11px; color: var(--secondary, #999); }
.token-day-tokens { font-size: 16px; font-weight: 700; color: #C89F65; margin-top: 2px; }
.token-day-tokens span { font-size: 10px; color: var(--secondary, #aaa); font-weight: 400; }
</style>

<script>
(function() {
  var el = document.getElementById('token-usage');
  if (!el) return;

  fetch('https://ybq-me-ai.garyyuen.workers.dev/api/usage')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var today = data.today || { total: 0, hours: {} };
      var history = data.history || [];

      var html = '<div class="token-header"><span class="token-icon">⚡</span><span class="token-title">今日 Token 消耗</span></div>';
      html += '<div class="token-total">' + today.total.toLocaleString() + ' <span>tokens</span></div>';
      html += '<div class="token-date">📅 ' + data.date + '（00:00 - 23:59）</div>';

      // 24小时柱状图
      html += '<div class="token-hours">';
      var maxHour = 0;
      for (var i = 0; i < 24; i++) {
        var h = today.hours[i.toString().padStart(2, '0')] || 0;
        if (h > maxHour) maxHour = h;
      }
      for (var i = 0; i < 24; i++) {
        var h = today.hours[i.toString().padStart(2, '0')] || 0;
        var pct = maxHour > 0 ? (h / maxHour * 100) : 0;
        html += '<div class="token-hour"><div class="token-hour-bar" style="height:' + pct + '%"></div>';
        if (i % 6 === 0) html += '<div class="token-hour-label">' + i + ':00</div>';
        html += '</div>';
      }
      html += '</div>';

      // 过去7天
      html += '<div style="margin-top:1.5rem"><strong style="font-size:13px;color:var(--secondary,#999)">过去7天</strong></div>';
      html += '<div class="token-history" style="margin-top:8px">';
      history.forEach(function(day) {
        html += '<div class="token-day"><div class="token-day-date">' + day.date.substring(5) + '</div>';
        html += '<div class="token-day-tokens">' + (day.tokens > 0 ? day.tokens.toLocaleString() : '0') + ' <span>tok</span></div></div>';
      });
      html += '</div>';

      el.innerHTML = html;
    })
    .catch(function() {
      el.innerHTML = '<div style="color:var(--secondary,#999)">数据加载失败</div>';
    });
})();
</script>

---

## AI 自我进化

本站的 AI 会从每一次交互中学习，不断进化：

<div class="evolution" id="evolution">
  <div class="token-loading">正在获取进化数据…</div>
</div>

<style>
.evolution {
  margin: 1.5rem 0; padding: 1.5rem;
  background: var(--entry, #f8f8f8);
  border-radius: 14px; border: 1px solid var(--border, #eee);
}
.evo-header { display: flex; align-items: center; gap: 12px; margin-bottom: 1rem; }
.evo-icon { font-size: 24px; }
.evo-title { font-size: 16px; font-weight: 700; color: var(--content, #333); }
.evo-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 1.5rem; }
.evo-stat {
  padding: 12px; border-radius: 10px;
  background: rgba(200,159,101,.06);
  border: 1px solid rgba(200,159,101,.1);
  text-align: center;
}
.evo-stat-num { font-size: 24px; font-weight: 800; color: #C89F65; }
.evo-stat-label { font-size: 11px; color: var(--secondary, #999); margin-top: 2px; }
.evo-trends { margin-bottom: 1.5rem; }
.evo-trends-title { font-size: 13px; color: var(--secondary, #999); margin-bottom: 8px; }
.evo-trend-cloud { display: flex; flex-wrap: wrap; gap: 6px; }
.evo-trend-word {
  padding: 4px 12px; border-radius: 16px;
  background: rgba(200,159,101,.08);
  border: 1px solid rgba(200,159,101,.15);
  font-size: 12px; color: var(--content, #555);
}
.evo-trend-count { font-size: 10px; color: #C89F65; margin-left: 4px; }
.evo-qa { margin-top: 1rem; }
.evo-qa-title { font-size: 13px; color: var(--secondary, #999); margin-bottom: 8px; }
.evo-qa-item {
  padding: 10px; margin-bottom: 8px;
  background: rgba(200,159,101,.04);
  border-radius: 8px; border-left: 3px solid rgba(200,159,101,.3);
}
.evo-qa-q { font-size: 13px; font-weight: 600; color: var(--content, #444); }
.evo-qa-a { font-size: 12px; color: var(--secondary, #888); margin-top: 4px; }
@media (max-width: 600px) { .evo-stats { grid-template-columns: repeat(2, 1fr); } }
</style>

<script>
(function() {
  var el = document.getElementById('evolution');
  if (!el) return;

  fetch('https://ybq-me-ai.garyyuen.workers.dev/api/evolution')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var stats = data.stats || { total: 0, actions: {}, quality: { positive: 0, negative: 0 } };
      var trends = data.trendWords || [];
      var qas = data.qualityQA || [];

      var html = '<div class="evo-header"><span class="evo-icon">🧬</span><span class="evo-title">今日进化数据</span></div>';

      // 统计卡片
      html += '<div class="evo-stats">';
      html += '<div class="evo-stat"><div class="evo-stat-num">' + stats.total + '</div><div class="evo-stat-label">总交互</div></div>';
      html += '<div class="evo-stat"><div class="evo-stat-num">' + (stats.actions.copy || 0) + '</div><div class="evo-stat-label">复制分享</div></div>';
      html += '<div class="evo-stat"><div class="evo-stat-num">' + stats.quality.positive + '</div><div class="evo-stat-label">高质量回答</div></div>';
      html += '<div class="evo-stat"><div class="evo-stat-num">' + (stats.actions.qa || 0) + '</div><div class="evo-stat-label">文章问答</div></div>';
      html += '</div>';

      // 趋势词云
      if (trends.length > 0) {
        html += '<div class="evo-trends"><div class="evo-trends-title">🔥 今日热门话题</div><div class="evo-trend-cloud">';
        trends.forEach(function(t) {
          html += '<span class="evo-trend-word">' + t.word + '<span class="evo-trend-count">×' + t.count + '</span></span>';
        });
        html += '</div></div>';
      }

      // 高质量QA
      if (qas.length > 0) {
        html += '<div class="evo-qa"><div class="evo-qa-title">💎 今日高质量问答</div>';
        qas.forEach(function(qa) {
          html += '<div class="evo-qa-item"><div class="evo-qa-q">Q: ' + qa.q + '</div>';
          html += '<div class="evo-qa-a">A: ' + qa.a.substring(0, 100) + '...</div></div>';
        });
        html += '</div>';
      }

      el.innerHTML = html;
    })
    .catch(function() {
      el.innerHTML = '<div style="color:var(--secondary,#999)">数据加载失败</div>';
    });
})();
</script>
