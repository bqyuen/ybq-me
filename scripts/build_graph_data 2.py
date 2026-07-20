#!/usr/bin/env python3
"""生成思维模型图谱数据 static/data/graph.json。

数据源：
  - content/models/*.md 的 frontmatter（title / description / categories）
  - static/data/related.json（每篇 5 条相关推荐，去重为无向边）

输出结构：
  {
    "nodes": [{"id","num","name","cat","desc"}...],
    "links": [{"source","target"}...],
    "categories": [{"name","count"}...]
  }
"""
import json
import re
import glob
import os
import collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(ROOT, "content", "models")
RELATED_JSON = os.path.join(ROOT, "static", "data", "related.json")
OUT_JSON = os.path.join(ROOT, "static", "data", "graph.json")


def parse_frontmatter(text):
    """极简 frontmatter 解析：只取需要的字段。"""
    m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    if not m:
        return {}
    fm = m.group(1)
    out = {}

    def grab(key):
        mm = re.search(rf'^{key}:\s*"(.*?)"\s*$', fm, re.M)
        return mm.group(1) if mm else None

    out["title"] = grab("title")
    out["description"] = grab("description")
    cm = re.search(r'^categories:\s*\["([^"]+)"\]', fm, re.M)
    out["category"] = cm.group(1) if cm else "其他"
    return out


def main():
    with open(RELATED_JSON, encoding="utf-8") as f:
        related = json.load(f)

    nodes = []
    for path in sorted(glob.glob(os.path.join(MODELS_DIR, "*.md"))):
        slug = os.path.splitext(os.path.basename(path))[0]
        if slug.startswith("_"):
            continue
        num = slug.split("-")[0]
        fm = parse_frontmatter(open(path, encoding="utf-8").read())
        name = None
        if fm.get("title"):
            parts = fm["title"].split("·", 1)
            name = parts[1].strip() if len(parts) == 2 else fm["title"].strip()
        if not name:
            name = slug.split("-", 1)[1] if "-" in slug else slug
        nodes.append({
            "id": slug,
            "num": num,
            "name": name,
            "cat": fm.get("category", "其他"),
            "desc": (fm.get("description") or "")[:60],
        })

    known = {n["id"] for n in nodes}

    # 去重为无向边
    seen = set()
    links = []
    for src, targets in related.items():
        if src not in known:
            continue
        for t in targets:
            tgt = t["slug"]
            if tgt not in known or tgt == src:
                continue
            key = tuple(sorted((src, tgt)))
            if key in seen:
                continue
            seen.add(key)
            links.append({"source": src, "target": tgt})

    cats = collections.Counter(n["cat"] for n in nodes)
    categories = [{"name": c, "count": n} for c, n in cats.most_common()]

    payload = {"nodes": nodes, "links": links, "categories": categories}
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))

    print(f"nodes={len(nodes)} links={len(links)} categories={len(categories)}")
    print(f"written: {OUT_JSON}")


if __name__ == "__main__":
    main()
