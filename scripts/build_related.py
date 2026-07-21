# -*- coding: utf-8 -*-
"""
预计算 ybq.me 100 篇思维模型文章的相关文章映射。
基于：标题关键词重叠 + category 相同 + content 2-gram 相似度。
输出：static/data/related.json
"""
import os, re, json, glob
from collections import Counter

ROOT = "/Users/apple/Library/Mobile Documents/com~apple~CloudDocs/网页开发项目/ybq-me"
MODEL_DIR = os.path.join(ROOT, "content/models")
OUT = os.path.join(ROOT, "static/data/related.json")

def tokenize_cn(text):
    """中文 2-gram + 3-gram 分词"""
    tokens = []
    segs = re.split(r'[\s,，。！？、；：""''（）()\[\]【】\-\n·「」《》]+', text)
    for seg in segs:
        seg = seg.strip()
        if not seg:
            continue
        if re.search(r'[\u4e00-\u9fff]', seg):
            if len(seg) <= 6:
                tokens.append(seg)
            for i in range(len(seg) - 1):
                tokens.append(seg[i:i+2])
                if i < len(seg) - 2:
                    tokens.append(seg[i:i+3])
        else:
            tokens.append(seg.lower())
    return tokens

def load_articles():
    articles = []
    for f in sorted(glob.glob(os.path.join(MODEL_DIR, "*.md"))):
        if f.endswith("_index.md"):
            continue
        slug = os.path.basename(f)[:-3]
        with open(f, encoding="utf-8") as fh:
            content = fh.read()

        # extract frontmatter
        fm_match = re.match(r'^---\n(.*?)\n---\n', content, re.S)
        fm = fm_match.group(1) if fm_match else ""

        title_m = re.search(r'^title:\s*"?([^"\n]+)"?', fm, re.M)
        title = title_m.group(1).strip() if title_m else slug

        cat_m = re.search(r'^category:\s*"?([^"\n]+)"?', fm, re.M)
        category = cat_m.group(1).strip() if cat_m else ""

        tags_m = re.search(r'^tags:\s*\[([^\]]*)\]', fm, re.M)
        tags = [t.strip().strip('"') for t in tags_m.group(1).split(",")] if tags_m else []

        # body text (without frontmatter and images)
        body = re.sub(r'^---\n.*?\n---\n', '', content, flags=re.S)
        body = re.sub(r'!\[.*?\]\(.*?\)', '', body)
        body = re.sub(r'#+ ', '', body)
        body = body[:3000]  # first 3000 chars

        articles.append({
            "slug": slug,
            "title": title,
            "category": category,
            "tags": tags,
            "body": body,
            "tokens": Counter(tokenize_cn(title + " " + " ".join(tags) + " " + body)),
        })
    return articles

def compute_related(articles):
    result = {}
    for i, a in enumerate(articles):
        scores = []
        for j, b in enumerate(articles):
            if i == j:
                continue
            score = 0

            # category match: +10
            if a["category"] and a["category"] == b["category"]:
                score += 10

            # tag overlap: +5 per shared tag
            shared_tags = set(a["tags"]) & set(b["tags"])
            score += len(shared_tags) * 5

            # token overlap (title-weighted tokens already in Counter)
            overlap = a["tokens"] & b["tokens"]
            score += sum(overlap.values())

            scores.append((score, b["slug"], b["title"]))

        scores.sort(reverse=True)
        top5 = [{"slug": s[1], "title": s[2]} for s in scores[:5]]
        result[a["slug"]] = top5

    return result

if __name__ == "__main__":
    print("Loading articles...")
    articles = load_articles()
    print(f"Loaded {len(articles)} articles")

    print("Computing related articles...")
    related = compute_related(articles)

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(related, f, ensure_ascii=False, indent=2)

    # 同步一份到 Hugo data 目录，供 .Site.Data.related（文章页相关推荐卡片）使用
    DATA_OUT = os.path.join(ROOT, "data/related.json")
    os.makedirs(os.path.dirname(DATA_OUT), exist_ok=True)
    with open(DATA_OUT, "w", encoding="utf-8") as f:
        json.dump(related, f, ensure_ascii=False, indent=2)

    print(f"Written to {OUT}")
    print(f"Written to {DATA_OUT}")
    # sample
    for slug in ["001-机会成本", "057-复利效应", "075-飞轮效应"]:
        if slug in related:
            print(f"\n{slug} →")
            for r in related[slug]:
                print(f"  {r['slug']}: {r['title']}")
