// ybq.me 全站交互体检（Playwright 端到端）
// 运行: NODE_PATH=/tmp/node_modules node scripts/e2e_check.js
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const os = require('os');

function findBrowser() {
  const root = path.join(os.homedir(), 'Library/Caches/ms-playwright');
  const dirs = fs.readdirSync(root).filter(d => d.startsWith('chromium_headless_shell-')).sort().reverse();
  for (const d of dirs) {
    const p = path.join(root, d, 'chrome-headless-shell-mac-arm64', 'chrome-headless-shell');
    if (fs.existsSync(p)) return p;
  }
  throw new Error('未找到 chromium headless shell');
}

const BASE = 'https://ybq.me';
const results = [];
let pageErrors = [];
let badResponses = [];

function record(name, pass, note) {
  results.push({ name, pass, note: note || '' });
  console.log((pass ? '✅ PASS' : '❌ FAIL') + '  ' + name + (note ? '  —— ' + note : ''));
}

async function newPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  pageErrors = [];
  badResponses = [];
  page.on('pageerror', e => pageErrors.push(e.message.split('\n')[0]));
  page.on('response', r => {
    if (r.status() >= 400 && !r.url().includes('giscus.app')) badResponses.push(r.status() + ' ' + r.url());
  });
  return page;
}

async function goto(page, url) {
  const resp = await page.goto(BASE + url + '?t=' + Date.now(), { waitUntil: 'networkidle', timeout: 45000 });
  return resp ? resp.status() : 0;
}

(async () => {
  const browser = await chromium.launch({ executablePath: findBrowser() });

  // ===== 1. 全栏目页面可达性 =====
  const pages = ['/', '/models/', '/graph/', '/daily/', '/ai-learning/', '/insights/', '/about/', '/learn/', '/search/'];
  for (const u of pages) {
    const page = await newPage(browser);
    try {
      const status = await goto(page, u);
      const bad = badResponses.filter(x => !x.includes('favicon'));
      record('页面可达 ' + u, status === 200, 'HTTP ' + status + (bad.length ? '；资源异常: ' + bad.slice(0, 2).join(', ') : ''));
    } catch (e) { record('页面可达 ' + u, false, e.message.split('\n')[0]); }
    await page.close();
  }

  // ===== 2. 首页交互 =====
  {
    const page = await newPage(browser);
    await goto(page, '/');
    const links = await page.evaluate(() => {
      const grab = sel => Array.from(document.querySelectorAll(sel)).map(a => a.getAttribute('href'));
      return {
        hero: grab('.hero-btn'),
        starmap: grab('.starmap-banner'),
        top10: grab('.top10-card').length,
        toolbox: grab('.toolbox-card').length,
        cats: grab('.cat-cloud a').length
      };
    });
    record('首页 hero 按钮', links.hero.includes('/models/') && links.hero.includes('/about/'), links.hero.join(', '));
    record('首页星图横幅', links.starmap.includes('/graph/'), links.starmap.join(','));
    record('首页 top10 卡片', links.top10 === 10, links.top10 + ' 张');
    record('首页工具箱卡片', links.toolbox === 4, links.toolbox + ' 张');
    record('首页分类云', links.cats >= 8, links.cats + ' 个');
    // 点击 top10 第一张
    await page.click('.top10-card >> nth=0');
    await page.waitForTimeout(1500);
    record('首页 top10 点击跳转', page.url().includes('/models/'), page.url().replace(BASE, ''));
    await page.close();
  }

  // ===== 3. models 栏目页交互 =====
  {
    const page = await newPage(browser);
    await goto(page, '/models/');
    const chipCount = await page.locator('.mchip').count();
    record('models 分类筛选 chips', chipCount === 11, chipCount + ' 个（应 11）');
    await page.click('.mchip:has-text("认知决策")');
    await page.waitForTimeout(400);
    const visible = await page.locator('.model-card:not([hidden])').count();
    record('models 分类筛选生效', visible === 15, '认知决策可见 ' + visible + ' 张（应 15）');
    await page.fill('#modelsSearch', '机会成本');
    await page.waitForTimeout(400);
    const searched = await page.locator('.model-card:not([hidden])').count();
    record('models 即时搜索', searched === 1, '搜索"机会成本"命中 ' + searched + ' 张');
    await page.fill('#modelsSearch', '');
    await page.waitForTimeout(300);
    await page.click('.mchip:has-text("全部")');
    await page.waitForTimeout(300);
    const starmapHref = await page.locator('.starmap-banner').getAttribute('href');
    record('models 页星图入口', starmapHref === '/graph/', starmapHref || '缺失');
    await page.click('.model-card >> nth=0');
    await page.waitForTimeout(1500);
    record('models 卡片点击跳转', page.url().includes('/models/'), page.url().replace(BASE, ''));
    await page.close();
  }

  // ===== 4. 星图交互 =====
  {
    const page = await newPage(browser);
    await goto(page, '/graph/');
    await page.waitForTimeout(3500);
    const g = await page.evaluate(() => ({
      nodes: document.querySelectorAll('.graph-node').length,
      links: document.querySelectorAll('.graph-link').length
    }));
    record('星图渲染', g.nodes === 100 && g.links > 300, g.nodes + ' 节点 / ' + g.links + ' 连线');
    await page.click('.graph-node >> nth=0', { force: true });
    await page.waitForTimeout(1200);
    const panel = await page.evaluate(() => ({
      open: document.getElementById('graph-panel').classList.contains('open'),
      href: document.getElementById('gp-cta').getAttribute('href')
    }));
    record('星图节点点击开面板', panel.open && panel.href && panel.href.startsWith('/models/'), panel.href || '未打开');
    // 图例筛选
    await page.click('.legend-chip >> nth=0');
    await page.waitForTimeout(500);
    const dimmed = await page.locator('.graph-node.dim').count();
    record('星图分类隔离', dimmed > 10, dimmed + ' 个节点被淡出');
    await page.click('#graph-container', { position: { x: 40, y: 300 } });
    await page.waitForTimeout(400);
    // 搜索直达
    await page.fill('#graph-search', '杠杆');
    await page.waitForTimeout(600);
    const items = await page.locator('.gs-item').count();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);
    const gpName = await page.locator('#gp-name').textContent();
    record('星图搜索直达', items > 0 && gpName.includes('杠杆'), '候选 ' + items + ' 个，面板显示: ' + (gpName || '').trim());
    // CTA 跳转（回归）
    await page.click('#gp-cta');
    await page.waitForTimeout(2000);
    record('星图阅读原文跳转（回归）', page.url().includes('/models/'), page.url().replace(BASE, ''));
    // 缩放控件
    await goto(page, '/graph/');
    await page.waitForTimeout(3000);
    const t0 = await page.evaluate(() => document.querySelector('#graph-container svg g').getAttribute('transform') || '');
    await page.click('#gz-in');
    await page.waitForTimeout(800);
    const t1 = await page.evaluate(() => document.querySelector('#graph-container svg g').getAttribute('transform') || '');
    record('星图缩放控件', t0 !== t1, 'transform 已变化');
    const jsErr = pageErrors.filter(e => !e.includes('giscus'));
    record('星图页无 JS 错误', jsErr.length === 0, jsErr.slice(0, 2).join(' | ') || '干净');
    await page.close();
  }

  // ===== 5. 文章页交互 =====
  {
    const page = await newPage(browser);
    await goto(page, '/models/001-%E6%9C%BA%E4%BC%9A%E6%88%90%E6%9C%AC/');
    const rel = await page.locator('.related-card').count();
    record('文章页相关模型卡片', rel === 5, rel + ' 张');
    const relHref = await page.locator('.related-card >> nth=0').getAttribute('href');
    await page.click('.related-card >> nth=0');
    await page.waitForTimeout(1500);
    record('相关模型点击跳转', page.url().includes('/models/') && !page.url().includes('001-'), page.url().replace(BASE, ''));
    await goto(page, '/models/001-%E6%9C%BA%E4%BC%9A%E6%88%90%E6%9C%AC/');
    // 文章内 AI 问答
    const aiQa = await page.locator('.ai-qa-btn, .ai-qa-send').count();
    record('文章页 AI 问答区存在', aiQa > 0, aiQa + ' 个控件');
    if (aiQa > 0) {
      const before = Date.now();
      await page.click('.ai-qa-send, .ai-qa-btn >> nth=0').catch(() => {});
      await page.waitForTimeout(12000);
      const result = await page.evaluate(() => {
        const el = document.querySelector('.ai-qa-result');
        return el ? (el.textContent || '').trim().slice(0, 80) : '';
      });
      record('文章页 AI 问答响应', result.length > 10, (Date.now() - before) + 'ms，返回: ' + (result || '（空）').slice(0, 50));
    }
    const coverOk = await page.evaluate(() => {
      const img = document.querySelector('.post-content img, .post-cover img, article img');
      return img ? img.complete && img.naturalWidth > 0 : true;
    });
    record('文章页封面图加载', coverOk, '');
    await page.close();
  }

  // ===== 6. 全站搜索页 =====
  {
    const page = await newPage(browser);
    await goto(page, '/search/');
    await page.fill('#searchInput', '决策');
    await page.waitForTimeout(2500);
    const hits = await page.evaluate(() => {
      const r = document.querySelector('#searchResults');
      return r ? r.querySelectorAll('a, .post-entry, li').length : 0;
    });
    record('全站搜索出结果', hits > 0, '命中 ' + hits + ' 条');
    await page.close();
  }

  // ===== 7. AI 助手 =====
  {
    const page = await newPage(browser);
    await goto(page, '/');
    await page.click('#ai-assistant-fab');
    await page.waitForTimeout(1000);
    const open = await page.evaluate(() => {
      const p = document.querySelector('.ai-panel');
      return p && p.classList.contains('open');
    });
    record('AI 助手面板打开', !!open, '');
    // 推荐问题（走 worker）
    await page.waitForTimeout(12000);
    const sug = await page.evaluate(() => {
      const s = document.querySelector('.ai-suggestions, #ai-suggestions, .ai-panel .ai-suggestions-loading');
      return s ? (s.textContent || '').trim().slice(0, 60) : '';
    });
    record('AI 助手推荐问题加载', sug.length > 4 && !sug.includes('加载失败'), sug ? sug.slice(0, 40) : '（无内容）');
    // 提问
    const input = await page.$('.ai-panel textarea, .ai-panel input[type="text"], .ai-qa-input');
    if (input) {
      await input.fill('什么是机会成本？一句话回答');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(18000);
      const ans = await page.evaluate(() => {
        const cands = document.querySelectorAll('.ai-msg, .ai-answer, .ai-panel [class*="message"], .ai-panel [class*="answer"]');
        let t = '';
        cands.forEach(el => { t = (el.textContent || '').trim(); });
        return t.slice(0, 60);
      });
      record('AI 助手提问响应', ans.length > 10, ans ? ans.slice(0, 40) : '（未捕获到回答文本）');
    } else {
      record('AI 助手提问响应', false, '找不到输入框');
    }
    await page.close();
  }

  // ===== 8. 主题切换 =====
  {
    const page = await newPage(browser);
    await goto(page, '/');
    const before = await page.evaluate(() => document.documentElement.dataset.theme || 'auto');
    await page.click('#theme-toggle').catch(() => {});
    await page.waitForTimeout(600);
    const after = await page.evaluate(() => document.documentElement.dataset.theme || 'auto');
    record('主题明暗切换', before !== after, (before || '∅') + ' → ' + (after || '∅'));
    await page.close();
  }

  // ===== 9. /learn/ AI 学习路径页 =====
  {
    const page = await newPage(browser);
    await goto(page, '/learn/');
    const hasForm = await page.evaluate(() => {
      return !!document.querySelector('input, textarea, button[type="submit"], form');
    });
    record('学习路径页有输入控件', hasForm, '');
    await page.close();
  }

  await browser.close();

  // ===== 汇总 =====
  const pass = results.filter(r => r.pass).length;
  const fail = results.filter(r => !r.pass);
  console.log('\n========== 体检汇总 ==========');
  console.log('通过 ' + pass + ' / ' + results.length);
  if (fail.length) {
    console.log('失败项:');
    fail.forEach(f => console.log('  ❌ ' + f.name + ' —— ' + f.note));
  }
  process.exit(fail.length ? 1 : 0);
})();
