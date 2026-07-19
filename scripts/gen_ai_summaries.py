# -*- coding: utf-8 -*-
"""
用 MiMo v2.5 批量生成 100 篇思维模型文章的一句话摘要。
写入 frontmatter 的 summary 字段（不覆盖已有值）。
"""
import os, re, json, glob, time, urllib.request

ROOT = "/Users/apple/Library/Mobile Documents/com~apple~CloudDocs/网页开发项目/ybq-me"
MODEL_DIR = os.path.join(ROOT, "content/models")
API_URL = "https://token-plan-cn.xiaomimimo.com/v1/chat/completions"
API_KEY = "tp-c5lrtz9vq8kd1r2kvyq1p1ru4g9n2wx9xd19gkvyvjx3v6e4"

def call_mimo(title, content):
    """调 MiMo 生成一句话摘要"""
    prompt = f"请用一句精炼的中文（不超过 30 字）概括以下思维模型的核心含义，直接输出概括文字，不要加引号或前缀：\n\n标题：{title}\n内容：{content[:1500]}"

    body = json.dumps({
        "model": "mimo-v2.5",
        "messages": [
            {"role": "system", "content": "你是一个精准的文本概括助手。只输出概括文字，不要加任何前缀、引号或解释。"},
            {"role": "user", "content": prompt}
        ],
        "max_completion_tokens": 100,
        "temperature": 0.3,
        "stream": False,
        "thinking": {"type": "disabled"},
    }).encode()

    req = urllib.request.Request(API_URL, data=body, headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}",
    })

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
            return data["choices"][0]["message"]["content"].strip().strip('"').strip("'")
    except Exception as e:
        print(f"  ERROR: {e}")
        return None

def process_file(filepath):
    """处理单个文件"""
    slug = os.path.basename(filepath)[:-3]
    with open(filepath, encoding="utf-8") as f:
        content = f.read()

    # 提取 frontmatter
    fm_match = re.match(r'^(---\n)(.*?)(\n---\n)', content, re.S)
    if not fm_match:
        print(f"SKIP {slug}: no frontmatter")
        return False

    fm = fm_match.group(2)

    # 检查是否已有 summary
    if re.search(r'^summary:', fm, re.M):
        print(f"SKIP {slug}: already has summary")
        return False

    # 提取 title
    title_m = re.search(r'^title:\s*"?([^"\n]+)"?', fm, re.M)
    title = title_m.group(1).strip() if title_m else slug.split("-", 1)[1]

    # 提取正文（不含 frontmatter 和图片）
    body = content[fm_match.end():]
    body = re.sub(r'!\[.*?\]\(.*?\)', '', body)
    body = body[:2000]

    # 调 MiMo
    print(f"Processing {slug}...", end=" ", flush=True)
    summary = call_mimo(title, body)
    if not summary:
        return False

    print(f"→ {summary}")

    # 写入 frontmatter：在最后的 --- 前插入 summary
    new_fm = fm + f'\nsummary: "{summary}"'
    new_content = content[:fm_match.start(2)] + new_fm + content[fm_match.start(3):]

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(new_content)

    return True

if __name__ == "__main__":
    files = sorted(glob.glob(os.path.join(MODEL_DIR, "*.md")))
    files = [f for f in files if not f.endswith("_index.md")]

    total = 0
    updated = 0
    for f in files:
        total += 1
        if process_file(f):
            updated += 1
            time.sleep(0.5)  # rate limit

    print(f"\nDone: {updated}/{total} articles updated with AI summaries")
