---
title: "思维模型图谱"
layout: "single"
description: "100 个思维模型 · 10 大分类 · 353 组关联 —— 一张可以探索的知识网络"
---

<div id="graph-wrap">
  <div id="graph-toolbar">
    <div id="graph-legend"></div>
    <div id="graph-stats"></div>
  </div>
  <div id="graph-container">
    <div id="graph-loading">正在绘制知识网络…</div>
    <div id="graph-hint">拖动空白移动 · 滚轮缩放 · 悬停查看关联 · 点击节点阅读原文</div>
  </div>
</div>
<div id="graph-tooltip"></div>

<style>
#graph-wrap { margin: 1rem 0 2rem; }
#graph-toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
#graph-legend { display: flex; flex-wrap: wrap; gap: 6px; }
.legend-chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; border: 1px solid var(--border, #e5e5e5); background: var(--theme, #fff); color: var(--content, #333); font-size: 12px; cursor: pointer; transition: all .15s; user-select: none; }
.legend-chip:hover { transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,0,0,.08); }
.legend-chip .dot { width: 9px; height: 9px; border-radius: 50%; flex: none; }
.legend-chip .cnt { color: var(--secondary, #999); font-size: 11px; }
.legend-chip.active { border-color: var(--content, #333); box-shadow: 0 2px 10px rgba(0,0,0,.12); font-weight: 600; }
#graph-stats { font-size: 12px; color: var(--secondary, #999); white-space: nowrap; }
#graph-container { width: 100%; height: 78vh; min-height: 520px; border-radius: 14px; background: var(--code-bg, #f8f8f8); border: 1px solid var(--border, #eee); position: relative; overflow: hidden; }
#graph-loading { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); color: var(--secondary, #999); font-size: 15px; }
#graph-hint { position: absolute; right: 12px; bottom: 10px; font-size: 11px; color: var(--secondary, #999); opacity: .8; pointer-events: none; }
#graph-container svg { display: block; }
.graph-link { stroke: var(--secondary, #9aa3af); stroke-opacity: .28; transition: stroke-opacity .15s; }
.graph-link.hl { stroke: #c5a24b; stroke-opacity: .95; }
.graph-link.dim { stroke-opacity: .05; }
.graph-node { cursor: pointer; transition: opacity .15s; }
.graph-node.dim { opacity: .12; }
.graph-node circle { stroke: var(--theme, #fff); stroke-width: 1.5; }
.graph-node.hovered circle { stroke: var(--content, #222); stroke-width: 2.5; }
.graph-label { font-size: 10.5px; fill: var(--content, #333); paint-order: stroke; stroke: var(--code-bg, #f8f8f8); stroke-width: 3px; stroke-linejoin: round; pointer-events: none; display: none; font-weight: 500; }
.graph-label.hi { display: block; }
#graph-container.zoomed .graph-label { display: block; }
#graph-tooltip { display: none; position: fixed; padding: 10px 14px; border-radius: 10px; background: #1a1a1a; color: #fff; font-size: 13px; pointer-events: none; z-index: 100; max-width: 260px; box-shadow: 0 4px 16px rgba(0,0,0,.3); line-height: 1.6; }
#graph-tooltip .tt-name { font-weight: 700; font-size: 14px; }
#graph-tooltip .tt-meta { color: #c5a24b; font-size: 12px; margin-top: 2px; }
#graph-tooltip .tt-desc { color: rgba(255,255,255,.75); font-size: 12px; margin-top: 4px; }
@media (max-width: 680px) {
  #graph-container { height: 64vh; min-height: 420px; }
  #graph-hint { display: none; }
  #graph-stats { display: none; }
}
</style>

<script src="https://d3js.org/d3.v7.min.js"></script>
<script>
(function () {
  var CATEGORY_COLORS = {
    '认知决策': '#1a2640', '系统战略': '#34647a', '分析诊断': '#3e8e7e',
    '成本投资': '#c5a24b', '学习成长': '#4b6e3c', '执行效率': '#c96f2e',
    '创新突破': '#6e5a8e', '管理框架': '#7a4b3c', '沟通影响': '#a03e5c',
    '心理自我': '#5f7a8c', '其他': '#8a8a8a'
  };

  var container = document.getElementById('graph-container');
  var loadingEl = document.getElementById('graph-loading');
  var tooltip = document.getElementById('graph-tooltip');
  var legendEl = document.getElementById('graph-legend');
  var statsEl = document.getElementById('graph-stats');
  var activeCat = null;
  var resizeTimer = null;

  function fail(msg) {
    loadingEl.textContent = msg;
  }

  function ensureD3(cb) {
    if (window.d3) return cb();
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/d3@7';
    s.onload = function () { window.d3 ? cb() : fail('图谱引擎加载失败，请刷新重试'); };
    s.onerror = function () { fail('图谱引擎加载失败，请检查网络后刷新'); };
    document.head.appendChild(s);
  }

  function color(cat) { return CATEGORY_COLORS[cat] || '#8a8a8a'; }

  function render(data) {
    container.querySelectorAll('svg').forEach(function (s) { s.remove(); });

    var width = container.clientWidth;
    var height = container.clientHeight;
    var nodes = data.nodes.map(function (d) { return Object.assign({}, d); });
    var links = data.links.map(function (d) { return Object.assign({}, d); });
    var nodeById = {};
    nodes.forEach(function (n) { nodeById[n.id] = n; n.deg = 0; });

    var adj = {};
    nodes.forEach(function (n) { adj[n.id] = new Set(); });
    links = links.filter(function (l) { return nodeById[l.source] && nodeById[l.target]; });
    links.forEach(function (l) {
      nodeById[l.source].deg++; nodeById[l.target].deg++;
      adj[l.source].add(l.target); adj[l.target].add(l.source);
    });

    // 高频节点默认显示标签（前 18 个）
    var topIds = nodes.slice().sort(function (a, b) { return b.deg - a.deg; })
      .slice(0, 18).map(function (n) { return n.id; });
    var alwaysLabel = new Set(topIds);

    // 分类聚类中心：圆周分布
    var cats = data.categories.map(function (c) { return c.name; });
    var cx = width / 2, cy = height / 2;
    var clusterR = Math.min(width, height) * 0.30;
    var catCenter = {};
    cats.forEach(function (c, i) {
      var a = (i / cats.length) * Math.PI * 2 - Math.PI / 2;
      catCenter[c] = { x: cx + clusterR * Math.cos(a), y: cy + clusterR * Math.sin(a) };
    });

    var svg = d3.select(container).append('svg')
      .attr('width', width).attr('height', height);
    var g = svg.append('g');

    var zoom = d3.zoom()
      .scaleExtent([0.35, 4])
      .on('zoom', function (event) {
        g.attr('transform', event.transform);
        container.classList.toggle('zoomed', event.transform.k > 1.5);
      });
    svg.call(zoom);

    var simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(function (d) { return d.id; }).distance(48).strength(0.55))
      .force('charge', d3.forceManyBody().strength(-80))
      .force('collision', d3.forceCollide().radius(function (d) { return radius(d) + 7; }))
      .force('x', d3.forceX(function (d) { return (catCenter[d.cat] || { x: cx }).x; }).strength(0.09))
      .force('y', d3.forceY(function (d) { return (catCenter[d.cat] || { y: cy }).y; }).strength(0.09))
      .force('center', d3.forceCenter(cx, cy))
      .alphaDecay(0.022);

    function radius(d) { return 4.5 + Math.sqrt(d.deg || 1) * 2.1; }

    var link = g.append('g').selectAll('line')
      .data(links).enter().append('line')
      .attr('class', 'graph-link')
      .attr('stroke-width', 1);

    var node = g.append('g').selectAll('g')
      .data(nodes).enter().append('g')
      .attr('class', 'graph-node')
      .call(d3.drag()
        .on('start', function (event, d) {
          if (!event.active) simulation.alphaTarget(0.25).restart();
          d.fx = d.x; d.fy = d.y;
        })
        .on('drag', function (event, d) { d.fx = event.x; d.fy = event.y; })
        .on('end', function (event, d) {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null; d.fy = null;
        }));

    node.append('circle')
      .attr('r', radius)
      .attr('fill', function (d) { return color(d.cat); });

    node.append('text')
      .attr('class', function (d) { return 'graph-label' + (alwaysLabel.has(d.id) ? ' hi' : ''); })
      .attr('dx', function (d) { return radius(d) + 4; })
      .attr('dy', 4)
      .text(function (d) { return d.name; });

    function applyFilter() {
      if (!activeCat) {
        node.classed('dim', false);
        link.classed('dim', false);
        return;
      }
      node.classed('dim', function (d) { return d.cat !== activeCat; });
      link.classed('dim', function (l) {
        var s = typeof l.source === 'object' ? l.source.id : l.source;
        var t = typeof l.target === 'object' ? l.target.id : l.target;
        return !(nodeById[s].cat === activeCat && nodeById[t].cat === activeCat);
      });
    }

    node.on('mouseover', function (event, d) {
      var nb = adj[d.id];
      node.classed('dim', function (n) { return n.id !== d.id && !nb.has(n.id); });
      node.classed('hovered', function (n) { return n.id === d.id; });
      link.classed('hl', function (l) {
        var s = typeof l.source === 'object' ? l.source.id : l.source;
        var t = typeof l.target === 'object' ? l.target.id : l.target;
        return s === d.id || t === d.id;
      });
      link.classed('dim', function (l) {
        var s = typeof l.source === 'object' ? l.source.id : l.source;
        var t = typeof l.target === 'object' ? l.target.id : l.target;
        return s !== d.id && t !== d.id;
      });
      node.select('text').classed('hi', function (n) {
        return n.id === d.id || nb.has(n.id) || alwaysLabel.has(n.id);
      });
      tooltip.style.display = 'block';
      tooltip.innerHTML = '<div class="tt-name">#' + d.num + ' ' + d.name + '</div>' +
        '<div class="tt-meta">' + d.cat + ' · ' + d.deg + ' 条关联</div>' +
        (d.desc ? '<div class="tt-desc">' + d.desc + '</div>' : '');
    }).on('mousemove', function (event) {
      tooltip.style.left = Math.min(event.clientX + 14, window.innerWidth - 280) + 'px';
      tooltip.style.top = (event.clientY - 20) + 'px';
    }).on('mouseout', function () {
      node.classed('hovered', false);
      link.classed('hl', false);
      applyFilter();
      node.select('text').classed('hi', function (n) { return alwaysLabel.has(n.id); });
      tooltip.style.display = 'none';
    }).on('click', function (event, d) {
      window.location.href = '/models/' + d.id + '/';
    });

    svg.on('click', function () {
      if (activeCat) {
        activeCat = null;
        legendEl.querySelectorAll('.legend-chip').forEach(function (c) { c.classList.remove('active'); });
        applyFilter();
      }
    });

    simulation.on('tick', function () {
      link
        .attr('x1', function (d) { return d.source.x; })
        .attr('y1', function (d) { return d.source.y; })
        .attr('x2', function (d) { return d.target.x; })
        .attr('y2', function (d) { return d.target.y; });
      node.attr('transform', function (d) { return 'translate(' + d.x + ',' + d.y + ')'; });
    });

    // 图例
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
      .catch(function () { fail('图谱数据加载失败，请刷新重试'); });
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
