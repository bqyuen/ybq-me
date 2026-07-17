# ybq.me 部署检查清单（Cloudflare Pages 单一路径 · 2026-07-16 Gary 拍板）

按顺序执行，每步完成后打勾 ✅。

> 🎯 **本路径**：纯 Cloudflare Pages（不备案、不用腾讯云、域名继续在 Cloudflare）。
> ⚠️ **真实代价**：大陆访问有 1-3 秒跨境延迟、百度 SEO 慢、微信内偶尔受限。
> 💡 **未来可选**：如果未来需要大陆极速访问 + 百度 SEO，可走"备案 + 腾讯云"路径，Cloudflare Pages 配置完全保留，只需改 DNS A 记录即可。

---

## 📋 Phase 1：本地准备（10 分钟）

- [ ] 安装 Hugo（已装请跳过）
  ```bash
  brew install hugo   # macOS
  ```
- [ ] 检查 Hugo 版本 ≥ 0.124
  ```bash
  hugo version
  ```
- [ ] 检查 Git
  ```bash
  git --version
  ```

## 📋 Phase 2：项目初始化（5 分钟）

- [ ] 进入项目目录
  ```bash
  cd "/Users/apple/Library/Mobile Documents/com~apple~CloudDocs/网页开发项目/ybq-me"
  ```
- [ ] 初始化 Git 仓库
  ```bash
  git init
  ```
- [ ] 添加 PaperMod 主题为 submodule
  ```bash
  git submodule add https://github.com/adityatelange/hugo-PaperMod.git themes/PaperMod
  ```
- [ ] 首次本地预览
  ```bash
  hugo server -D
  # 浏览器打开 http://localhost:1313
  ```
- [ ] 确认首页、关于、learn、blog、contact 5 个页面都正常显示
- [ ] Ctrl+C 停止本地服务器

## 📋 Phase 3：推送到 GitHub（5 分钟）

- [ ] 在 GitHub 创建新仓库 `ybq-me`（Public 或 Private 都行）
  - 🔗 https://github.com/new
- [ ] 提交本地代码
  ```bash
  git add .
  git commit -m "init: ybq.me 项目骨架 + 终身学习者定位"
  git branch -M main
  git remote add origin https://github.com/<你的用户名>/ybq-me.git
  git push -u origin main
  ```
- [ ] GitHub 仓库能看到所有文件（包括 themes/PaperMod 子模块链接）

## 📋 Phase 4：Cloudflare Pages 配置（10 分钟）

- [ ] 登录 Cloudflare 控制台 → https://dash.cloudflare.com
- [ ] 左侧菜单 → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
- [ ] 选择 `ybq-me` 仓库 → **Begin setup**
- [ ] 配置构建设置：
  - **Project name**: `ybq-me`
  - **Production branch**: `main`
  - **Build command**: `hugo --minify`
  - **Build output directory**: `public`
  - **Environment variables (advanced)**:
    - `HUGO_VERSION` = `0.124.1`
- [ ] 点 **Save and Deploy**
- [ ] 等待 2-3 分钟，看 build log 是否成功
- [ ] Cloudflare 会分配一个 `*.ybq-me.pages.dev` 临时域名，先访问测试

## 📋 Phase 5：绑定 ybq.me 自定义域名（3 分钟）

- [ ] Cloudflare Pages 项目 → **Custom domains** → **Set up a custom domain**
- [ ] 输入 `ybq.me` → **Continue**
- [ ] Cloudflare 自动检测 ybq.me 已在 Cloudflare 注册 → 自动配置 DNS
- [ ] 等待 SSL 证书签发（通常 1-5 分钟）
- [ ] 浏览器打开 https://ybq.me → 🎉 **看到你的网站**

## 📋 Phase 6：上线后验证（5 分钟）

- [ ] 桌面浏览器访问 https://ybq.me → 正常
- [ ] 移动浏览器访问 → 响应式正常
- [ ] 切换深色模式 → 正常
- [ ] 5 个菜单导航全部能点开
- [ ] 第一篇思维模型文章 `first-principles.md` 能看到
- [ ] 控制台无报错（按 F12 看 Console）

## 📋 Phase 7（可选 · 未来）：备案 + 切换大陆服务器

> ⏸️ 当前不做。如果未来需要大陆极速访问 + 百度 SEO + 微信生态，再启动。

- [ ] 买腾讯云轻量服务器（约 ¥50-80/月）
- [ ] ybq.me 在 Cloudflare 后台做"域名实名"
- [ ] 提交 ICP 备案（7-20 天）
- [ ] 备案完成后 Cloudflare DNS A 记录指向腾讯云服务器
- [ ] 腾讯云服务器配置 Nginx + Let's Encrypt SSL
- [ ] 保留 Cloudflare Pages 作为"灾备"

---

## 🆘 故障排查

### Hugo 构建失败
- 检查 `hugo version` ≥ 0.124
- 检查 `themes/PaperMod/` 是否成功 clone
- 删除 `public/` 和 `resources/` 重新构建

### Cloudflare 部署失败
- 看 Build log 具体错误
- 检查 `HUGO_VERSION` 环境变量是否设置

### ybq.me 无法访问
- Cloudflare DNS 解析是否生效（dig ybq.me）
- SSL 证书是否签发完成（Custom domains 页面状态）
- 浏览器强制刷新（Ctrl+Shift+R）

### 大陆访问慢
- 这是 Cloudflare Pages 的正常现象（跨境延迟）
- 真正解决需要走 Phase 7 备案路径

---

## 📞 求助

执行过程中遇到任何问题，告诉我具体步骤 + 报错截图 / 文本，我帮你排查。