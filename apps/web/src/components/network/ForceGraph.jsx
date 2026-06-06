import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export default function ForceGraph({ nodes, links, onNodeClick, height = 400 }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || !nodes.length) return;
    const el = ref.current;
    el.innerHTML = '';
    const width = el.clientWidth || 600;

    const svg = d3.select(el).append('svg').attr('width', width).attr('height', height);
    const g = svg.append('g');

    const zoom = d3.zoom().scaleExtent([0.3, 3]).on('zoom', (e) => g.attr('transform', e.transform));
    svg.call(zoom);

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d) => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2));

    const link = g.append('g').selectAll('line').data(links).join('line')
      .attr('stroke', (d) => d.color || '#94a3b8')
      .attr('stroke-width', (d) => d.width || 1.5)
      .attr('stroke-dasharray', (d) => d.dashed ? '4 4' : 'none');

    const node = g.append('g').selectAll('g').data(nodes).join('g')
      .call(d3.drag()
        .on('start', (e, d) => { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on('end', (e, d) => { if (!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }))
      .on('click', (_, d) => onNodeClick?.(d));

    node.each(function (d) {
      const sel = d3.select(this);
      if (d.shape === 'diamond') {
        sel.append('rect').attr('width', 12).attr('height', 12).attr('x', -6).attr('y', -6)
          .attr('transform', 'rotate(45)').attr('fill', d.color || '#2563eb');
      } else if (d.shape === 'square') {
        sel.append('rect').attr('width', 10).attr('height', 10).attr('x', -5).attr('y', -5).attr('fill', d.color || '#d97706');
      } else {
        sel.append('circle').attr('r', 8).attr('fill', d.color || '#16a34a');
      }
      sel.append('text').text(d.label?.slice(0, 12) || '').attr('y', 20).attr('text-anchor', 'middle')
        .attr('font-size', '8px').attr('fill', '#374151');
    });

    simulation.on('tick', () => {
      link.attr('x1', (d) => d.source.x).attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x).attr('y2', (d) => d.target.y);
      node.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    return () => simulation.stop();
  }, [nodes, links, height, onNodeClick]);

  return <div ref={ref} className="w-full" style={{ height }} />;
}
