---
title: "思维模型星图"
layout: "single"
description: "100 个思维模型 · 10 大分类 · 353 组关联 —— 一张可以探索的知识星图"
---

<div class="graph-bleed">
<div id="graph-wrap">
  <div id="graph-toolbar">
    <div id="graph-legend"></div>
    <div id="graph-tools">
      <div id="graph-search-box">
        <input id="graph-search" type="search" placeholder="🔍 搜模型，回车直达…" autocomplete="off" aria-label="搜索思维模型">
        <div id="graph-search-list"></div>
      </div>
      <div id="graph-stats"></div>
    </div>
  </div>
  <div id="graph-container">
    <div class="nebula nebula-a"></div>
    <div class="nebula nebula-b"></div>
    <div id="graph-loading"><div class="graph-spinner"></div><div class="graph-loading-text">正在绘制知识星图…</div></div>
    <div id="graph-vignette"></div>
    <div id="graph-hint">滚轮缩放 · 拖动平移 · 单击节点查看详情</div>
    <div id="graph-zoomctl">
      <button id="gz-in" type="button" aria-label="放大">＋</button>
      <button id="gz-out" type="button" aria-label="缩小">－</button>
      <button id="gz-reset" type="button" aria-label="复位">⟲</button>
    </div>
    <div id="graph-panel">
      <button id="gp-close" type="button" aria-label="关闭">×</button>
      <span id="gp-cat"></span>
      <div id="gp-name"></div>
      <div id="gp-desc"></div>
      <div id="gp-meta"></div>
      <div id="gp-rel-title">与之联动</div>
      <div id="gp-rel"></div>
      <a id="gp-cta" href="#">阅读原文 →</a>
    </div>
  </div>
</div>
</div>
<div id="graph-tooltip"></div>

<style>
.graph-bleed { width: min(1160px, 94vw); position: relative; left: 50%; transform: translateX(-50%); margin: 1.2rem 0 2.4rem; }
#graph-toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
#graph-legend { display: flex; flex-wrap: wrap; gap: 6px; }
.legend-chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; border: 1px solid var(--border, #e5e5e5); background: var(--theme, #fff); color: var(--content, #333); font-size: 12px; cursor: pointer; transition: all .22s cubic-bezier(.34,1.4,.44,1); user-select: none; }
.legend-chip:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,.1); }
.legend-chip .dot { width: 9px; height: 9px; border-radius: 50%; flex: none; }
.legend-chip .cnt { color: var(--secondary, #999); font-size: 11px; }
.legend-chip.active { border-color: #C89F65; box-shadow: 0 3px 12px rgba(200,159,101,.4); font-weight: 600; }
#graph-tools { display: flex; align-items: center; gap: 14px; }
#graph-stats { font-size: 12px; color: var(--secondary, #999); white-space: nowrap; }
#graph-search-box { position: relative; }
#graph-search { width: 200px; padding: 7px 12px; border: 1px solid var(--border, #ddd); border-radius: 999px; background: var(--theme, #fff); color: var(--content, #333); font-size: 13px; outline: none; transition: border-color .2s, box-shadow .2s, width .3s cubic-bezier(.3,1.2,.4,1); }
#graph-search:focus { border-color: #C89F65; box-shadow: 0 0 0 3px rgba(200,159,101,.18); width: 230px; }
#graph-search-list { display: none; opacity: 0; transform: translateY(-6px); transition: opacity .22s ease, transform .22s cubic-bezier(.3,1.3,.4,1); position: absolute; top: calc(100% + 6px); right: 0; width: 260px; max-height: 300px; overflow-y: auto; background: var(--theme, #fff); border: 1px solid var(--border, #e5e5e5); border-radius: 12px; box-shadow: 0 14px 36px rgba(0,0,0,.16); z-index: 50; }
#graph-search-list.show { display: block; }
#graph-search-list.open { opacity: 1; transform: translateY(0); }
.gs-item { display: flex; align-items: center; gap: 8px; padding: 9px 14px; cursor: pointer; font-size: 13px; color: var(--content, #333); transition: background .12s; }
.gs-item:hover, .gs-item.sel { background: var(--tertiary, #f3f3f3); }
.gs-item .gs-dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
.gs-item .gs-num { color: var(--secondary, #999); font-size: 12px; }
.gs-item .gs-cat { margin-left: auto; color: var(--secondary, #999); font-size: 11px; }
#graph-container { width: 100%; height: 82vh; min-height: 560px; border-radius: 18px; background: var(--code-bg, #f8f8f8); border: 1px solid var(--border, #eee); position: relative; overflow: hidden; box-shadow: 0 12px 44px rgba(20, 30, 50, .07); }
.nebula { position: absolute; width: 520px; height: 520px; border-radius: 50%; filter: blur(40px); pointer-events: none; z-index: 1; }
.nebula-a { top: -160px; right: -100px; background: radial-gradient(circle, rgba(200,159,101,.12), transparent 62%); }
.nebula-b { bottom: -180px; left: -120px; background: radial-gradient(circle, rgba(52,100,122,.11), transparent 62%); }
body.dark .nebula-a { background: radial-gradient(circle, rgba(200,159,101,.07), transparent 62%); }
body.dark .nebula-b { background: radial-gradient(circle, rgba(52,100,122,.07), transparent 62%); }
#graph-loading { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; z-index: 5; }
.graph-spinner { width: 34px; height: 34px; border-radius: 50%; border: 3px solid var(--border, #e5e5e5); border-top-color: #C89F65; animation: gspin .9s cubic-bezier(.5,.15,.5,.85) infinite; }
@keyframes gspin { to { transform: rotate(360deg); } }
.graph-loading-text { color: var(--secondary, #999); font-size: 14px; letter-spacing: 1px; }
#graph-vignette { position: absolute; inset: 0; pointer-events: none; z-index: 2; background: radial-gradient(ellipse at center, transparent 52%, rgba(20,30,50,.07) 100%); }
body.dark #graph-vignette { background: radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,.4) 100%); }
#graph-hint { position: absolute; left: 14px; bottom: 12px; font-size: 11px; color: var(--secondary, #999); opacity: .85; pointer-events: none; z-index: 3; }
#graph-zoomctl { position: absolute; right: 14px; bottom: 14px; display: flex; flex-direction: column; gap: 6px; z-index: 6; }
#graph-zoomctl button { width: 34px; height: 34px; border-radius: 10px; border: 1px solid var(--border, #e5e5e5); background: var(--theme, #fff); color: var(--content, #333); font-size: 16px; cursor: pointer; transition: all .22s cubic-bezier(.34,1.4,.44,1); box-shadow: 0 2px 10px rgba(0,0,0,.08); }
#graph-zoomctl button:hover { border-color: #C89F65; color: #C89F65; transform: translateY(-2px); box-shadow: 0 5px 14px rgba(200,159,101,.3); }
#graph-zoomctl button:active { transform: translateY(0) scale(.94); }
#graph-container svg { display: block; cursor: grab; }
#graph-container svg:active { cursor: grabbing; }
.graph-breathe { animation: breathe 9s ease-in-out infinite alternate; transform-box: fill-box; transform-origin: center; }
@keyframes breathe { from { transform: scale(1) translate(0, 0); } to { transform: scale(1.012) translate(-5px, 4px); } }
.grid-dot { fill: var(--border, #e2e2e2); opacity: .5; }
.graph-link { fill: none; stroke: var(--secondary, #9aa3af); transition: stroke-opacity .35s ease, stroke-width .35s ease; }
.graph-link.hl { stroke: #C89F65; stroke-opacity: .95 !important; stroke-width: 2.2px !important; }
.graph-link.dim { stroke-opacity: .05 !important; }
.graph-node { cursor: pointer; transition: opacity .35s ease; }
.graph-node.dim { opacity: .1; }
.graph-node circle.core { stroke: var(--theme, #fff); stroke-width: 1.5; transition: transform .3s cubic-bezier(.34,1.56,.64,1), filter .25s ease; transform-box: fill-box; transform-origin: center; }
.graph-node.hovered circle.core, .graph-node.pinned circle.core { stroke: #C89F65; stroke-width: 2.5; transform: scale(1.3); filter: drop-shadow(0 0 7px rgba(200,159,101,.85)); }
.graph-node .halo { animation: haloPulse 4.5s ease-in-out infinite; pointer-events: none; }
@keyframes haloPulse { 0%, 100% { opacity: .07; } 50% { opacity: .17; } }
.graph-label { font-size: 10.5px; fill: var(--content, #333); paint-order: stroke; stroke: var(--code-bg, #f8f8f8); stroke-width: 3px; stroke-linejoin: round; pointer-events: none; display: none; font-weight: 500; letter-spacing: .3px; }
.graph-label.hi { display: block; }
#graph-container.zoomed .graph-label { display: block; }
.pulse-ring { fill: none; stroke: #C89F65; stroke-width: 2; pointer-events: none; transform-box: fill-box; transform-origin: center; animation: pulseRing 1.15s cubic-bezier(.2,.6,.3,1) 2; }
@keyframes pulseRing { 0% { transform: scale(1); opacity: .9; } 100% { transform: scale(3.4); opacity: 0; } }
#graph-panel { position: absolute; top: 16px; right: 16px; width: 300px; max-height: calc(100% - 32px); overflow-y: auto; padding: 20px 20px 18px; border-radius: 16px; background: var(--theme, #fff); background: color-mix(in srgb, var(--theme, #fff) 92%, transparent); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid var(--border, #e5e5e5); box-shadow: 0 16px 48px rgba(15, 25, 45, .16); z-index: 8; transform: translateX(calc(100% + 24px)) scale(.97); transition: transform .45s cubic-bezier(.3,1.35,.4,1); }
#graph-panel.open { transform: translateX(0) scale(1); }
#gp-close { position: absolute; top: 10px; right: 12px; width: 26px; height: 26px; border: none; background: transparent; color: var(--secondary, #999); font-size: 18px; cursor: pointer; border-radius: 8px; transition: all .15s; }
#gp-close:hover { color: var(--content, #333); background: var(--tertiary, #f0f0f0); transform: rotate(90deg); }
#gp-cat { display: inline-block; padding: 3px 10px; border-radius: 999px; color: #fff; font-size: 11px; font-weight: 600; letter-spacing: 1px; }
#gp-name { margin-top: 10px; font-size: 19px; font-weight: 800; color: var(--content, #222); line-height: 1.4; }
#gp-desc { margin-top: 8px; font-size: 13px; line-height: 1.75; color: var(--secondary, #666); }
#gp-meta { margin-top: 10px; font-size: 12px; color: #C89F65; font-weight: 600; letter-spacing: .5px; }
#gp-rel-title { margin-top: 14px; font-size: 11px; font-weight: 700; letter-spacing: 2px; color: var(--secondary, #999); }
#gp-rel { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.gp-chip { padding: 5px 10px; border-radius: 8px; border: 1px solid var(--border, #e5e5e5); background: var(--theme, #fff); color: var(--content, #333); font-size: 12px; cursor: pointer; transition: all .2s cubic-bezier(.34,1.4,.44,1); }
.gp-chip:hover { border-color: #C89F65; color: #C89F65; transform: translateY(-2px); box-shadow: 0 3px 8px rgba(200,159,101,.25); }
#gp-cta { display: block; margin-top: 16px; padding: 10px 0; text-align: center; border-radius: 10px; background: #1E3A5F; color: #FAF9F6 !important; font-size: 14px; font-weight: 600; text-decoration: none; transition: all .2s; }
#gp-cta:hover { background: #274a77; box-shadow: 0 8px 20px rgba(30,58,95,.35); transform: translateY(-1px); }
#graph-tooltip { display: none; opacity: 0; transform: translateY(5px); transition: opacity .2s ease, transform .2s cubic-bezier(.3,1.3,.4,1); position: fixed; padding: 10px 14px; border-radius: 10px; background: #16223a; color: #fff; font-size: 13px; pointer-events: none; z-index: 100; max-width: 260px; box-shadow: 0 6px 20px rgba(0,0,0,.32); line-height: 1.6; }
#graph-tooltip.show { opacity: 1; transform: translateY(0); }
#graph-tooltip .tt-name { font-weight: 700; font-size: 14px; }
#graph-tooltip .tt-meta { color: #C89F65; font-size: 12px; margin-top: 2px; }
#graph-tooltip .tt-desc { color: rgba(255,255,255,.75); font-size: 12px; margin-top: 4px; }
@media (prefers-reduced-motion: reduce) {
  .graph-breathe, .graph-node .halo { animation: none; }
}
@media (max-width: 680px) {
  .graph-bleed { width: 100%; left: 0; transform: none; }
  #graph-container { height: 68vh; min-height: 440px; }
  #graph-hint, #graph-stats { display: none; }
  #graph-search { width: 150px; }
  #graph-search:focus { width: 170px; }
  #graph-panel { top: auto; bottom: 12px; left: 12px; right: 12px; width: auto; max-height: 46%; transform: translateY(calc(100% + 16px)) scale(.98); }
  #graph-panel.open { transform: translateY(0) scale(1); }
}
</style>

<script src="https://d3js.org/d3.v7.min.js"></script>
<script>
(function () {
  var CATEGORY_COLORS = {
    '认知决策': '#1E3A5F', '系统战略': '#34647a', '分析诊断': '#3e8e7e',
    '成本投资': '#C89F65', '学习成长': '#4b6e3c', '执行效率': '#c96f2e',
    '创新突破': '#6e5a8e', '管理框架': '#7a4b3c', '沟通影响': '#a03e5c',
    '心理自我': '#5f7a8c', '其他': '#8a8a8a'
  };

  var container = document.getElementById('graph-container');
  var loadingEl = document.getElementById('graph-loading');
  var tooltip = document.getElementById('graph-tooltip');
  var legendEl = document.getElementById('graph-legend');
  var statsEl = document.getElementById('graph-stats');
  var panel = document.getElementById('graph-panel');
  var searchInput = document.getElementById('graph-search');
  var searchList = document.getElementById('graph-search-list');
  var activeCat = null;
  var resizeTimer = null;
  var ttTimer = null;

  function fail(msg) {
    loadingEl.innerHTML = '<div class="graph-loading-text">' + msg + '</div>';
  }

  function ensureD3(cb) {
    if (window.d3) return cb();
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/d3@7';
    s.onload = function () { window.d3 ? cb() : fail('星图引擎加载失败，请刷新重试'); };
    s.onerror = function () { fail('星图引擎加载失败，请检查网络后刷新'); };
    document.head.appendChild(s);
  }

  function color(cat) { return CATEGORY_COLORS[cat] || '#8a8a8a'; }

  function showTooltip(html, x, y) {
    clearTimeout(ttTimer);
    tooltip.innerHTML = html;
    tooltip.style.display = 'block';
    tooltip.style.left = Math.min(x + 14, window.innerWidth - 280) + 'px';
    tooltip.style.top = (y - 20) + 'px';
    void tooltip.offsetHeight;
    tooltip.classList.add('show');
  }
  function moveTooltip(x, y) {
    tooltip.style.left = Math.min(x + 14, window.innerWidth - 280) + 'px';
    tooltip.style.top = (y - 20) + 'px';
  }
  function hideTooltip() {
    tooltip.classList.remove('show');
    clearTimeout(ttTimer);
    ttTimer = setTimeout(function () { tooltip.style.display = 'none'; }, 200);
  }

  function render(data) {
    container.querySelectorAll('svg').forEach(function (s) { s.remove(); });
    panel.classList.remove('open');

    var width = container.clientWidth;
    var height = container.clientHeight;
    var nodes = data.nodes.map(function (d) { return Object.assign({}, d); });
    var links = data.links.map(function (d) { return Object.assign({}, d); });
    var nodeById = {};
    nodes.forEach(function (n) { nodeById[n.id] = n; n.deg = 0; });

    var adj = {};
    nodes.forEach(function (n) { adj[n.id] = new Set(); });
    links = links.filter(function (l) { return nodeById[l.source] && nodeById[l.target]; });
    links.forEach(function (l, i) {
      nodeById[l.source].deg++; nodeById[l.target].deg++;
      adj[l.source].add(l.target); adj[l.target].add(l.source);
      l.curve = (i % 2 === 0) ? 1 : -1;
    });

    var topIds = nodes.slice().sort(function (a, b) { return b.deg - a.deg; })
      .slice(0, 18).map(function (n) { return n.id; });
    var alwaysLabel = new Set(topIds);

    var cats = data.categories.map(function (c) { return c.name; });
    var cx = width / 2, cy = height / 2;
    var clusterR = Math.min(width, height) * 0.30;
    var catCenter = {};
    cats.forEach(function (c, i) {
      var a = (i / cats.length) * Math.PI * 2 - Math.PI / 2;
      catCenter[c] = { x: cx + clusterR * Math.cos(a), y: cy + clusterR * Math.sin(a) };
    });

    // 初始位置：从各自分类的星团中心绽放
    nodes.forEach(function (d) {
      var c = catCenter[d.cat] || { x: cx, y: cy };
      d.x = c.x + (Math.random() - 0.5) * 46;
      d.y = c.y + (Math.random() - 0.5) * 46;
    });

    var svg = d3.select(container).append('svg')
      .attr('width', width).attr('height', height);

    var defs = svg.append('defs');
    var pat = defs.append('pattern')
      .attr('id', 'graph-dotgrid').attr('width', 26).attr('height', 26)
      .attr('patternUnits', 'userSpaceOnUse');
    pat.append('circle').attr('cx', 1.2).attr('cy', 1.2).attr('r', 1.2).attr('class', 'grid-dot');
    svg.append('rect').attr('width', width).attr('height', height).attr('fill', 'url(#graph-dotgrid)');

    var gZoom = svg.append('g');
    var g = gZoom.append('g').attr('class', 'graph-breathe');

    var zoom = d3.zoom()
      .scaleExtent([0.35, 4])
      .on('zoom', function (event) {
        gZoom.attr('transform', event.transform);
        container.classList.toggle('zoomed', event.transform.k > 1.5);
      });
    svg.call(zoom);

    var simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(function (d) { return d.id; }).distance(50).strength(0.55))
      .force('charge', d3.forceManyBody().strength(-85))
      .force('collision', d3.forceCollide().radius(function (d) { return radius(d) + 7; }))
      .force('x', d3.forceX(function (d) { return (catCenter[d.cat] || { x: cx }).x; }).strength(0.09))
      .force('y', d3.forceY(function (d) { return (catCenter[d.cat] || { y: cy }).y; }).strength(0.09))
      .force('center', d3.forceCenter(cx, cy))
      .alpha(0.9)
      .alphaDecay(0.02)
      .velocityDecay(0.5);

    function radius(d) { return 4.5 + Math.sqrt(d.deg || 1) * 2.1; }

    var link = g.append('g').selectAll('path')
      .data(links).enter().append('path')
      .attr('class', 'graph-link')
      .attr('stroke-width', function (d) { return d.w === 2 ? 1.6 : 0.8; })
      .attr('stroke-opacity', function (d) { return d.w === 2 ? 0.4 : 0.22; });

    var node = g.append('g').selectAll('g')
      .data(nodes).enter().append('g')
      .attr('class', 'graph-node')
      .call(d3.drag()
        .on('start', function (event, d) {
          if (!event.active) simulation.alphaTarget(0.22).restart();
          d.fx = d.x; d.fy = d.y;
        })
        .on('drag', function (event, d) { d.fx = event.x; d.fy = event.y; })
        .on('end', function (event, d) {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null; d.fy = null;
        }));

    // 高连接节点的星光光晕（先画，垫在核心下面）
    node.filter(function (d) { return alwaysLabel.has(d.id); })
      .append('circle')
      .attr('class', 'halo')
      .attr('r', function (d) { return radius(d) * 2.2; })
      .attr('fill', function (d) { return color(d.cat); })
      .style('animation-delay', function (d, i) { return (i * 0.33) + 's'; });

    node.append('circle')
      .attr('class', 'core')
      .attr('r', 0)
      .attr('fill', function (d) { return color(d.cat); });

    node.append('text')
      .attr('class', function (d) { return 'graph-label' + (alwaysLabel.has(d.id) ? ' hi' : ''); })
      .attr('dx', function (d) { return radius(d) + 4; })
      .attr('dy', 4)
      .style('opacity', 0)
      .text(function (d) { return d.name; });

    // 入场：节点弹性绽放，光晕淡入，标签最后浮现，连线缓缓显现
    node.select('circle.core')
      .transition().delay(function (d, i) { return 140 + i * 5; }).duration(620)
      .ease(d3.easeBackOut.overshoot(1.7))
      .attr('r', radius);
    node.selectAll('.halo')
      .style('opacity', 0)
      .transition().delay(function (d, i) { return 500 + i * 40; }).duration(900)
      .style('opacity', 1)
      .on('end', function () { d3.select(this).style('opacity', null); });
    node.select('text')
      .transition().delay(950).duration(700)
      .style('opacity', 1)
      .on('end', function () { d3.select(this).style('opacity', null); });
    link.style('opacity', 0)
      .transition().delay(700).duration(1100)
      .style('opacity', 1)
      .on('end', function () { d3.select(this).style('opacity', null); });

    var pinned = null;

    function linkIds(l) {
      return [typeof l.source === 'object' ? l.source.id : l.source,
              typeof l.target === 'object' ? l.target.id : l.target];
    }

    function showHighlight(d) {
      var nb = adj[d.id];
      node.classed('dim', function (n) { return n.id !== d.id && !nb.has(n.id); });
      node.classed('hovered', function (n) { return n.id === d.id; });
      link.classed('hl', function (l) { var ids = linkIds(l); return ids[0] === d.id || ids[1] === d.id; });
      link.classed('dim', function (l) { var ids = linkIds(l); return ids[0] !== d.id && ids[1] !== d.id; });
      node.select('text').classed('hi', function (n) {
        return n.id === d.id || nb.has(n.id) || alwaysLabel.has(n.id);
      });
    }

    function applyFilter() {
      node.classed('hovered', false);
      link.classed('hl', false);
      if (!activeCat) {
        node.classed('dim', false);
        link.classed('dim', false);
      } else {
        node.classed('dim', function (d) { return d.cat !== activeCat; });
        link.classed('dim', function (l) {
          var ids = linkIds(l);
          return !(nodeById[ids[0]].cat === activeCat && nodeById[ids[1]].cat === activeCat);
        });
      }
      node.select('text').classed('hi', function (n) { return alwaysLabel.has(n.id); });
    }

    function restoreView() {
      if (pinned) showHighlight(pinned); else applyFilter();
    }

    function focusNode(d, k) {
      k = k || 1.9;
      var t = d3.zoomIdentity.translate(width / 2 - d.x * k, height / 2 - d.y * k).scale(k);
      svg.transition().duration(950).ease(d3.easeCubicInOut).call(zoom.transform, t);
    }

    function pulse(d) {
      var sel = node.filter(function (n) { return n.id === d.id; });
      var ring = sel.append('circle')
        .attr('class', 'pulse-ring')
        .attr('r', radius(d) + 4);
      setTimeout(function () { ring.remove(); }, 2500);
    }

    function openPanel(d) {
      document.getElementById('gp-cat').textContent = d.cat;
      document.getElementById('gp-cat').style.background = color(d.cat);
      document.getElementById('gp-name').textContent = '#' + d.num + ' ' + d.name;
      document.getElementById('gp-desc').textContent = d.desc || '';
      document.getElementById('gp-meta').textContent = d.deg + ' 条关联 · 第 ' + d.num + ' 号模型';
      var rel = Array.from(adj[d.id]).map(function (id) { return nodeById[id]; })
        .sort(function (a, b) { return b.deg - a.deg; }).slice(0, 7);
      var relEl = document.getElementById('gp-rel');
      relEl.innerHTML = '';
      rel.forEach(function (n) {
        var chip = document.createElement('button');
        chip.className = 'gp-chip';
        chip.type = 'button';
        chip.textContent = n.name;
        chip.addEventListener('click', function (ev) {
          ev.stopPropagation();
          selectNode(n, true);
        });
        relEl.appendChild(chip);
      });
      document.getElementById('gp-cta').setAttribute('href', '/models/' + d.id + '/');
      panel.classList.add('open');
    }

    function closePanel(silent) {
      panel.classList.remove('open');
      pinned = null;
      node.classed('pinned', false);
      if (!silent) applyFilter();
    }

    function selectNode(d, withPulse) {
      pinned = d;
      node.classed('pinned', function (n) { return n.id === d.id; });
      showHighlight(d);
      openPanel(d);
      focusNode(d);
      if (withPulse) pulse(d);
    }

    node.on('mouseover', function (event, d) {
      showHighlight(d);
      showTooltip('<div class="tt-name">#' + d.num + ' ' + d.name + '</div>' +
        '<div class="tt-meta">' + d.cat + ' · ' + d.deg + ' 条关联</div>' +
        (d.desc ? '<div class="tt-desc">' + d.desc + '</div>' : ''),
        event.clientX, event.clientY);
    }).on('mousemove', function (event) {
      moveTooltip(event.clientX, event.clientY);
    }).on('mouseout', function () {
      restoreView();
      hideTooltip();
    }).on('click', function (event, d) {
      event.stopPropagation();
      selectNode(d, false);
    });

    svg.on('click', function () {
      if (pinned) { closePanel(); return; }
      if (activeCat) {
        activeCat = null;
        legendEl.querySelectorAll('.legend-chip').forEach(function (c) { c.classList.remove('active'); });
        applyFilter();
      }
    });

    document.getElementById('gp-close').addEventListener('click', function (ev) {
      ev.stopPropagation();
      closePanel();
    });

    document.getElementById('gz-in').addEventListener('click', function (ev) {
      ev.stopPropagation();
      svg.transition().duration(420).ease(d3.easeCubicOut).call(zoom.scaleBy, 1.4);
    });
    document.getElementById('gz-out').addEventListener('click', function (ev) {
      ev.stopPropagation();
      svg.transition().duration(420).ease(d3.easeCubicOut).call(zoom.scaleBy, 0.7);
    });
    document.getElementById('gz-reset').addEventListener('click', function (ev) {
      ev.stopPropagation();
      svg.transition().duration(650).ease(d3.easeCubicInOut).call(zoom.transform, d3.zoomIdentity);
    });

    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') {
        closePanel();
        searchList.classList.remove('show');
        searchList.classList.remove('open');
      }
    });

    // 搜索直达
    var searchSel = -1;
    function openSearchList() {
      searchList.classList.add('show');
      void searchList.offsetHeight;
      searchList.classList.add('open');
    }
    function closeSearchList() {
      searchList.classList.remove('open');
      setTimeout(function () { searchList.classList.remove('show'); }, 220);
    }
    function doSearch() {
      var q = searchInput.value.trim().toLowerCase();
      searchSel = -1;
      if (!q) { closeSearchList(); return; }
      var matches = nodes.filter(function (n) {
        return n.name.toLowerCase().indexOf(q) !== -1 || n.num.indexOf(q) !== -1;
      }).slice(0, 8);
      searchList.innerHTML = '';
      if (!matches.length) { closeSearchList(); return; }
      matches.forEach(function (n) {
        var item = document.createElement('div');
        item.className = 'gs-item';
        item.innerHTML = '<span class="gs-dot" style="background:' + color(n.cat) + '"></span>' +
          '<span class="gs-num">#' + n.num + '</span> ' + n.name +
          '<span class="gs-cat">' + n.cat + '</span>';
        item.addEventListener('mousedown', function (ev) {
          ev.preventDefault();
          closeSearchList();
          searchInput.value = '';
          selectNode(n, true);
        });
        searchList.appendChild(item);
      });
      openSearchList();
    }
    searchInput.addEventListener('input', doSearch);
    searchInput.addEventListener('keydown', function (ev) {
      var items = searchList.querySelectorAll('.gs-item');
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
        ev.preventDefault();
        if (!items.length) return;
        searchSel += (ev.key === 'ArrowDown' ? 1 : -1);
        searchSel = (searchSel + items.length) % items.length;
        items.forEach(function (it, i) { it.classList.toggle('sel', i === searchSel); });
      } else if (ev.key === 'Enter') {
        var target = (searchSel >= 0 && items[searchSel]) ? items[searchSel] : items[0];
        if (target) { ev.preventDefault(); target.dispatchEvent(new Event('mousedown')); }
      } else if (ev.key === 'Escape') {
        closeSearchList();
      }
    });
    searchInput.addEventListener('blur', function () {
      setTimeout(closeSearchList, 150);
    });
    searchInput.addEventListener('click', function (ev) { ev.stopPropagation(); });

    simulation.on('tick', function () {
      link.attr('d', function (d) {
        var dx = d.target.x - d.source.x, dy = d.target.y - d.source.y;
        var dist = Math.sqrt(dx * dx + dy * dy) || 1;
        var mx = (d.source.x + d.target.x) / 2, my = (d.source.y + d.target.y) / 2;
        var k = dist * 0.1 * d.curve;
        return 'M' + d.source.x + ',' + d.source.y +
               ' Q' + (mx - dy / dist * k) + ',' + (my + dx / dist * k) +
               ' ' + d.target.x + ',' + d.target.y;
      });
      node.attr('transform', function (d) { return 'translate(' + d.x + ',' + d.y + ')'; });
    });

    // 分类图例
    legendEl.innerHTML = '';
    data.categories.forEach(function (c) {
      var chip = document.createElement('span');
      chip.className = 'legend-chip' + (activeCat === c.name ? ' active' : '');
      chip.innerHTML = '<span class="dot" style="background:' + color(c.name) + '"></span>' +
        c.name + ' <span class="cnt">' + c.count + '</span>';
      chip.addEventListener('click', function (ev) {
        ev.stopPropagation();
        activeCat = (activeCat === c.name) ? null : c.name;
        legendEl.querySelectorAll('.legend-chip').forEach(function (x) { x.classList.remove('active'); });
        if (activeCat) chip.classList.add('active');
        closePanel(true);
        applyFilter();
      });
      legendEl.appendChild(chip);
    });

    statsEl.textContent = data.nodes.length + ' 个模型 · ' + data.links.length + ' 组关联 · ' + data.categories.length + ' 大分类';
    loadingEl.style.display = 'none';
  }

  function load() {
    fetch('/data/graph.json')
      .then(function (r) {
        if (!r.ok) throw new Error('http ' + r.status);
        return r.json();
      })
      .then(function (data) {
        ensureD3(function () { render(data); });
      })
      .catch(function () { fail('星图数据加载失败，请刷新重试'); });
  }

  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      fetch('/data/graph.json').then(function (r) { return r.json(); })
        .then(function (data) { if (window.d3) render(data); });
    }, 350);
  });

  load();
})();
</script>
