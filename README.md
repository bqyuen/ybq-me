# ybq.me — Gary 的终身学习者主页

> 🧠 思维进化 · 🤖 AI 实战 · 🏭 行业洞察

站点地址：**https://ybq.me**

## 🎯 这是什么

`ybq.me` 是 Gary 的个人网站，定位为**终身学习者的认知进化记录**。

## 📚 内容导航

| 板块 | 内容 | 入口 |
|------|------|------|
| 🧩 **思维模型** | 103 个思维模型深度解读，按十大类别组织（认知决策 / 系统战略 / 执行效率 / 沟通影响…） | [ybq.me/models](https://ybq.me/models/) |
| 🤖 **AI 学习** | AI 实战方法论：刻意练习、半年成为领域专家 | [ybq.me/ai-learning](https://ybq.me/ai-learning/) |
| 🏭 **管理实战** | 管理框架与落地实践 | [ybq.me/management](https://ybq.me/management/) |
| 🔭 **决策洞察** | 行业观察与深度分析（如全球债务账本） | [ybq.me/insights](https://ybq.me/insights/) |
| ☀️ **每日核心** | 每日思考与决策日志 | [ybq.me/daily](https://ybq.me/daily/) |
| 👤 **关于我** | 我是谁 | [ybq.me/about](https://ybq.me/about/) |

## 🏗️ 技术栈

| 层 | 选型 | 理由 |
|----|------|------|
| **静态生成** | Hugo 0.124+ | 极快（5000+ 主题，最快的 SSG） |
| **主题** | PaperMod | 简洁专业，适合个人博客 |
| **托管** | Cloudflare Pages | 与 Cloudflare 域名无缝集成，5 分钟上线 |
| **CDN** | Cloudflare 全球 CDN | 自动 HTTPS + 全球加速 |
| **CI/CD** | GitHub Actions | 推送即部署 |

## 📁 项目结构

```
ybq-me/
├── .github/
│   └── workflows/
│       └── deploy.yml         # GitHub Actions 自动部署到 Cloudflare Pages
├── content/                    # Markdown 内容
│   ├── _index.md              # 首页
│   ├── about.md               # 关于
│   ├── models/                # 思维模型（目标 103 篇）
│   ├── ai-learning/           # AI 学习
│   ├── management/            # 管理实战
│   ├── insights/              # 决策洞察
│   └── daily/                 # 每日核心
├── themes/
│   └── PaperMod/              # Hugo 主题（git submodule）
├── hugo.toml                  # Hugo 配置
├── .gitmodules                # 子模块配置
├── .gitignore
└── README.md
```

## 🚀 快速开始

### 前置条件

- Hugo 0.124+ extended（[安装](https://gohugo.io/installation/)）
- Git
- GitHub 账号
- Cloudflare 账号（已有 ybq.me 域名）

### 本地预览

```bash
# 1. 克隆仓库（含子模块）
git clone --recurse-submodules https://github.com/bqyuen/ybq-me.git
cd ybq-me

# 2. 启动本地预览
hugo server -D

# 3. 访问 http://localhost:1313
```

### 添加新文章

```bash
# 思维模型文章
hugo new models/104-模型名.md

# 洞察文章
hugo new insights/2026-07-20-hello-world.md
```

### 部署到 Cloudflare Pages（5 分钟）

#### 一次性配置

1. **创建 GitHub 仓库**
   ```bash
   # 初始化并推送到你的 GitHub
   cd ybq-me
   git init
   git add .
   git commit -m "init: ybq.me 初始骨架"
   # 在 GitHub 创建 ybq-me 仓库，然后：
   git remote add origin https://github.com/bqyuen/ybq-me.git
   git branch -M main
   git push -u origin main
   ```

2. **Cloudflare 控制台 → Workers & Pages → 创建应用**
   - 选择 **Pages** → **Connect to Git**
   - 选择 `bqyuen/ybq-me` 仓库

3. **配置构建设置**
   - 构建命令：`hugo --minify`
   - 构建输出目录：`public`
   - 环境变量：
     - `HUGO_VERSION` = `0.124.1`

4. **绑定自定义域名**
   - Pages 项目 → Custom domains → **Set up a custom domain**
   - 输入 `ybq.me`
   - Cloudflare 自动配置 DNS + 签发 SSL

#### 可选：配置 GitHub Actions 自动部署（已写好 .github/workflows/deploy.yml）

如果想用 GitHub Actions 自动部署（而不是 Cloudflare 默认的 GitHub 集成），需要在 GitHub 仓库添加 Secrets：

- `CLOUDFLARE_API_TOKEN` —— Cloudflare API Token（含 Pages:Edit 权限）
- `CLOUDFLARE_ACCOUNT_ID` —— Cloudflare 账户 ID

> 💡 **建议**：先用 Cloudflare 默认 GitHub 集成（不需要 secrets），简单稳定。

## 🌐 域名 + 部署策略

**当前决策（Gary 2026-07-16 拍板）**：Cloudflare Pages 单一路径，不备案。

```
现在（已选定）
└─ ybq.me 解析到 Cloudflare Pages
   ├─ 5 分钟上线，无需备案
   ├─ 完全 Cloudflare 生态管理
   ├─ 大陆访问有 1-3 秒跨境延迟（真实代价）
   ├─ 百度 SEO 收录慢（真实代价）
   └─ 微信内打开偶尔受限（真实代价）

未来可选（如果需要大陆极速访问 / 百度 SEO / 微信生态）
├─ 备案 + 腾讯云大陆服务器
├─ Cloudflare DNS A 记录改指向腾讯云
└─ 域名不变，Cloudflare Pages 配置保留
```

**关键**：所有配置都是**备案无关**的——未来切到大陆服务器只需改 DNS A 记录，不需要重新搭建。

## ✍️ 内容架构

```
ybq.me                        ← 首页（个人品牌 / Hero）
├── /models/                  ← 思维模型（目标 103 篇）
├── /ai-learning/             ← AI 学习
├── /management/              ← 管理实战
├── /insights/                ← 决策洞察（行业观察 / 深度分析）
├── /daily/                   ← 每日核心（思考与决策日志）
└── /about/                   ← 关于我
```

## 🛠️ 维护节奏

| 任务 | 频率 |
|------|------|
| 新思维模型文章 | 每周 1 篇 |
| 博客长文 | 每月 2-4 篇 |
| 设计/功能优化 | 每季度 1 次 |
| Hugo 主题升级 | 半年 1 次 |

## 📜 License

内容版权归 © Gary 所有，代码部分基于 Hugo + PaperMod（各自遵循原始 license）。

## 🤝 反馈

发现问题 / 想讨论某篇文章 → 通过 ybq.me 网站留言或文章页评论
