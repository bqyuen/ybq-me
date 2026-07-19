---
title: "思维模型图谱"
layout: "single"
description: "100 个思维模型之间的关联关系可视化"
---

<div id="graph-container" style="width:100%;height:80vh;min-height:500px;border-radius:12px;background:var(--entry,#f8f8f8);position:relative;overflow:hidden;">
  <div id="graph-loading" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:var(--secondary,#999);font-size:16px;">加载中...</div>
</div>
<div id="graph-tooltip" style="display:none;position:fixed;padding:8px 12px;border-radius:8px;background:var(--content,#333);color:var(--primary,#fff);font-size:13px;pointer-events:none;z-index:100;max-width:200px;"></div>

<style>
#graph-container svg { display: block; }
.graph-link { stroke: var(--border,#ccc); stroke-opacity: 0.4; }
.graph-node { cursor: pointer; }
.graph-node:hover circle { stroke-width: 3px; }
.graph-label { font-size: 11px; fill: var(--content,#333); pointer-events: none; }
</style>

<script src="https://d3js.org/d3.v7.min.js"></script>
<script>
(function() {
  var container = document.getElementById('graph-container');
  var tooltip = document.getElementById('graph-tooltip');
  var width = container.clientWidth;
  var height = container.clientHeight;

  // 从 related.json 构建图数据
  fetch('/data/related.json')
    .then(function(r) { return r.json(); })
    .then(function(related) {
      var nodes = [];
      var links = [];
      var nodeMap = {};

      // 创建节点
      Object.keys(related).forEach(function(slug) {
        var num = slug.split('-')[0];
        var name = slug.split('-').slice(1).join('-');
        var node = { id: slug, name: name, num: num, group: Math.floor(parseInt(num) / 20) };
        nodes.push(node);
        nodeMap[slug] = node;
      });

      // 创建链接
      Object.keys(related).forEach(function(slug) {
        (related[slug] || []).forEach(function(target) {
          if (nodeMap[target.slug]) {
            links.push({ source: slug, target: target.slug, value: 1 });
          }
        });
      });

      document.getElementById('graph-loading').style.display = 'none';

      var svg = d3.select('#graph-container')
        .append('svg')
        .attr('width', width)
        .attr('height', height);

      var color = d3.scaleOrdinal()
        .domain([0,1,2,3,4])
        .range(['#1a2640','#34647a','#c5a24b','#7a4b3c','#4b6e3c']);

      var simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(function(d) { return d.id; }).distance(80))
        .force('charge', d3.forceManyBody().strength(-120))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(20));

      var link = svg.append('g')
        .selectAll('line')
        .data(links)
        .enter().append('line')
        .attr('class', 'graph-link')
        .attr('stroke-width', 1);

      var node = svg.append('g')
        .selectAll('g')
        .data(nodes)
        .enter().append('g')
        .attr('class', 'graph-node')
        .call(d3.drag()
          .on('start', function(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x; d.fy = d.y;
          })
          .on('drag', function(event, d) {
            d.fx = event.x; d.fy = event.y;
          })
          .on('end', function(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null; d.fy = null;
          }));

      node.append('circle')
        .attr('r', function(d) { return 6 + parseInt(d.num) % 3; })
        .attr('fill', function(d) { return color(d.group); })
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5);

      node.append('text')
        .attr('class', 'graph-label')
        .attr('dx', 10)
        .attr('dy', 4)
        .text(function(d) { return d.name; });

      node.on('mouseover', function(event, d) {
        tooltip.style.display = 'block';
        tooltip.textContent = '#' + d.num + ' ' + d.name;
        tooltip.style.left = (event.clientX + 10) + 'px';
        tooltip.style.top = (event.clientY - 30) + 'px';
      }).on('mouseout', function() {
        tooltip.style.display = 'none';
      }).on('click', function(event, d) {
        window.location.href = '/models/' + d.id + '/';
      });

      simulation.on('tick', function() {
        link
          .attr('x1', function(d) { return d.source.x; })
          .attr('y1', function(d) { return d.source.y; })
          .attr('x2', function(d) { return d.target.x; })
          .attr('y2', function(d) { return d.target.y; });
        node.attr('transform', function(d) {
          d.x = Math.max(20, Math.min(width - 20, d.x));
          d.y = Math.max(20, Math.min(height - 20, d.y));
          return 'translate(' + d.x + ',' + d.y + ')';
        });
      });
    });
})();
</script>
