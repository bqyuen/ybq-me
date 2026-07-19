// ybq.me AI 搜索前端
// 嵌入搜索页面，提供「关键词搜索 / AI 问答」双模式

(function() {
  'use strict';

  // 配置
  const AI_ENDPOINT = 'https://ybq-ai-search.<YOUR_SUBDOMAIN>.workers.dev';  // 部署后替换

  // 状态
  let mode = 'keyword'; // 'keyword' | 'ai'
  let chatHistory = [];
  let isLoading = false;

  // 初始化
  function init() {
    const searchBox = document.getElementById('searchbox');
    if (!searchBox) return;

    // 创建模式切换按钮
    const toggle = document.createElement('div');
    toggle.id = 'search-mode-toggle';
    toggle.innerHTML = `
      <div class="mode-switch">
        <button class="mode-btn active" data-mode="keyword">🔍 关键词</button>
        <button class="mode-btn" data-mode="ai">🤖 AI 问答</button>
      </div>
    `;
    searchBox.parentNode.insertBefore(toggle, searchBox);

    // 创建 AI 聊天区域
    const chatArea = document.createElement('div');
    chatArea.id = 'ai-chat-area';
    chatArea.style.display = 'none';
    chatArea.innerHTML = `
      <div id="ai-messages" class="ai-messages"></div>
      <div id="ai-sources" class="ai-sources"></div>
    `;
    searchBox.parentNode.insertBefore(chatArea, searchBox.nextSibling);

    // 注入样式
    injectStyles();

    // 绑定事件
    toggle.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => switchMode(btn.dataset.mode));
    });

    // 修改搜索框行为
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && mode === 'ai') {
          e.preventDefault();
          e.stopPropagation();
          sendAIQuestion(searchInput.value.trim());
        }
      });
    }
  }

  function switchMode(newMode) {
    mode = newMode;
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === newMode);
    });

    const searchBox = document.getElementById('searchbox');
    const chatArea = document.getElementById('ai-chat-area');
    const results = document.getElementById('searchResults');

    if (newMode === 'ai') {
      searchBox.querySelector('input').placeholder = '输入问题，如：什么是复利效应？怎么用？';
      chatArea.style.display = 'block';
      if (results) results.style.display = 'none';
    } else {
      searchBox.querySelector('input').placeholder = '输入关键词搜索文章...';
      chatArea.style.display = 'none';
      if (results) results.style.display = '';
    }
  }

  async function sendAIQuestion(question) {
    if (!question || isLoading) return;
    isLoading = true;

    // 显示用户消息
    addMessage('user', question);

    // 清空输入
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';

    // 显示加载
    const loadingId = addMessage('loading', '正在思考...');

    try {
      const res = await fetch(AI_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          history: chatHistory.slice(-4),
        }),
      });

      const data = await res.json();

      // 移除加载
      removeMessage(loadingId);

      if (data.error) {
        addMessage('error', data.error);
      } else {
        addMessage('assistant', data.answer);
        showSources(data.sources);
        chatHistory.push({ role: 'user', content: question });
        chatHistory.push({ role: 'assistant', content: data.answer });
      }
    } catch (err) {
      removeMessage(loadingId);
      addMessage('error', '网络错误，请检查连接后重试');
    }

    isLoading = false;
  }

  function addMessage(role, content) {
    const container = document.getElementById('ai-messages');
    const id = 'msg-' + Date.now();
    const div = document.createElement('div');
    div.id = id;
    div.className = `ai-msg ai-msg-${role}`;
    div.innerHTML = role === 'loading'
      ? `<span class="ai-spinner"></span> ${content}`
      : formatAnswer(content);
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return id;
  }

  function removeMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  function showSources(sources) {
    const container = document.getElementById('ai-sources');
    if (!sources || sources.length === 0) {
      container.innerHTML = '';
      return;
    }
    container.innerHTML = `
      <div class="sources-title">📎 引用来源</div>
      ${sources.map(s => `
        <a class="source-link" href="${s.url}" target="_blank">
          <span class="source-title">${s.title}</span>
          ${s.summary ? `<span class="source-summary">${s.summary}...</span>` : ''}
        </a>
      `).join('')}
    `;
  }

  function formatAnswer(text) {
    // 简单 markdown：粗体、链接、换行
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>')
      .replace(/\n/g, '<br>');
  }

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #search-mode-toggle {
        margin-bottom: 16px;
        text-align: center;
      }
      .mode-switch {
        display: inline-flex;
        background: var(--entry, #f5f5f5);
        border-radius: 8px;
        padding: 3px;
        gap: 2px;
      }
      .mode-btn {
        padding: 8px 20px;
        border: none;
        border-radius: 6px;
        background: transparent;
        color: var(--secondary, #666);
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
      }
      .mode-btn.active {
        background: var(--primary, #fff);
        color: var(--content, #333);
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      }
      .ai-messages {
        max-height: 500px;
        overflow-y: auto;
        padding: 8px 0;
      }
      .ai-msg {
        padding: 12px 16px;
        margin: 8px 0;
        border-radius: 12px;
        line-height: 1.7;
        font-size: 15px;
      }
      .ai-msg-user {
        background: var(--entry, #e8e8e8);
        color: var(--content, #333);
        margin-left: 20%;
        text-align: right;
      }
      .ai-msg-assistant {
        background: var(--tertiary, #f0f0f0);
        color: var(--content, #333);
      }
      .ai-msg-error {
        background: #fee;
        color: #c33;
        font-size: 14px;
      }
      .ai-msg-loading {
        color: var(--secondary, #999);
        font-size: 14px;
      }
      .ai-spinner {
        display: inline-block;
        width: 16px;
        height: 16px;
        border: 2px solid var(--secondary, #ccc);
        border-top-color: transparent;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
        vertical-align: middle;
        margin-right: 8px;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
      .ai-sources {
        margin-top: 16px;
        padding-top: 12px;
        border-top: 1px solid var(--border, #eee);
      }
      .sources-title {
        font-size: 13px;
        color: var(--secondary, #999);
        margin-bottom: 8px;
      }
      .source-link {
        display: block;
        padding: 8px 12px;
        margin: 4px 0;
        border-radius: 8px;
        background: var(--entry, #f8f8f8);
        text-decoration: none;
        transition: background 0.2s;
      }
      .source-link:hover {
        background: var(--tertiary, #eee);
      }
      .source-title {
        display: block;
        color: var(--primary, #333);
        font-weight: 500;
        font-size: 14px;
      }
      .source-summary {
        display: block;
        color: var(--secondary, #999);
        font-size: 12px;
        margin-top: 2px;
      }
    `;
    document.head.appendChild(style);
  }

  // 启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
