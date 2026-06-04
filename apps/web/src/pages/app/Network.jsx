import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
import {
  Network as NetworkIcon,
  Filter,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Info,
} from 'lucide-react';

import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { getNetworkGraph } from '../../lib/api';
import { formatINR } from '../../utils/format';

// ─── D3 IMPORT (DYNAMIC) ───────────────────────────────────
let d3 = null;

// ─── DEMO GRAPH DATA ───────────────────────────────────────
const DEMO_GRAPH = {
  nodes: [
    { id: 'inv-cotton', type: 'inventory', name: 'Cotton Stock', value: 600, commodity: 'Cotton', lat: 21.15, lng: 79.09 },
    { id: 'inv-soybean', type: 'inventory', name: 'Soybean Stock', value: 120, commodity: 'Soybean', lat: 22.72, lng: 75.86 },
    { id: 'inv-wheat', type: 'inventory', name: 'Wheat Stock', value: 150, commodity: 'Wheat', lat: 26.85, lng: 80.95 },
    { id: 'inv-onion', type: 'inventory', name: 'Onion Stock', value: 200, commodity: 'Onion', lat: 19.99, lng: 73.79 },
    { id: 'cp-ramesh', type: 'buyer', name: 'Ramesh Cotton Traders', value: 832000, commodity: 'Cotton', lat: 21.15, lng: 79.09 },
    { id: 'cp-balaji', type: 'buyer', name: 'Balaji Agro Industries', value: 840000, commodity: 'Groundnut', lat: 23.02, lng: 72.57 },
    { id: 'cp-guntur', type: 'buyer', name: 'Guntur Chilli Exporters', value: 1520000, commodity: 'Chilli', lat: 16.30, lng: 80.44 },
    { id: 'cp-saikrupa', type: 'buyer', name: 'Sai Kripa Warehousing', value: 660000, commodity: 'Onion', lat: 28.64, lng: 77.21 },
    { id: 'cp-vikas', type: 'buyer', name: 'Vikas Grain Co.', value: 1351000, commodity: 'Soybean', lat: 22.72, lng: 75.86 },
    { id: 'mandi-nagpur', type: 'mandi', name: 'Nagpur Mandi', value: 7250, commodity: 'Cotton', lat: 21.15, lng: 79.09 },
    { id: 'mandi-indore', type: 'mandi', name: 'Indore APMC', value: 4800, commodity: 'Soybean', lat: 22.72, lng: 75.86 },
    { id: 'mandi-azadpur', type: 'mandi', name: 'Azadpur Mandi', value: 2400, commodity: 'Onion', lat: 28.70, lng: 77.17 },
    { id: 'mandi-guntur', type: 'mandi', name: 'Guntur Market', value: 18500, commodity: 'Chilli', lat: 16.30, lng: 80.44 },
    { id: 'mandi-rajkot', type: 'mandi', name: 'Rajkot Mandi', value: 6900, commodity: 'Groundnut', lat: 22.30, lng: 70.80 },
    { id: 'mandi-lucknow', type: 'mandi', name: 'Lucknow Grain Hub', value: 2450, commodity: 'Wheat', lat: 26.85, lng: 80.95 },
  ],
  links: [
    { source: 'inv-cotton', target: 'cp-ramesh', type: 'contract', value: 320000, status: 'confirmed', pnl: 20000 },
    { source: 'inv-cotton', target: 'cp-ramesh', type: 'contract', value: 520000, status: 'confirmed', pnl: 24000 },
    { source: 'inv-soybean', target: 'cp-vikas', type: 'contract', value: 735000, status: 'in_transit', pnl: -15000 },
    { source: 'inv-onion', target: 'cp-saikrupa', type: 'contract', value: 660000, status: 'confirmed', pnl: -60000 },
    { source: 'cp-guntur', target: 'inv-cotton', type: 'contract', value: 1520000, status: 'draft', pnl: -40000 },
    { source: 'inv-cotton', target: 'mandi-nagpur', type: 'dispatch', value: 50, status: 'in_transit', pnl: 0 },
    { source: 'inv-soybean', target: 'mandi-indore', type: 'dispatch', value: 150, status: 'in_transit', pnl: 0 },
    { source: 'mandi-nagpur', target: 'cp-ramesh', type: 'opportunity', value: 120, status: 'open', pnl: 0 },
    { source: 'mandi-rajkot', target: 'cp-balaji', type: 'opportunity', value: 80, status: 'open', pnl: 0 },
    { source: 'mandi-lucknow', target: 'inv-wheat', type: 'contract', value: 490000, status: 'settled', pnl: -20000 },
    { source: 'cp-balaji', target: 'mandi-rajkot', type: 'contract', value: 840000, status: 'delivered', pnl: 12000 },
    { source: 'cp-vikas', target: 'mandi-indore', type: 'opportunity', value: 250, status: 'open', pnl: 0 },
  ],
};

// ─── NODE SHAPE DRAWING ─────────────────────────────────────
const drawNode = (ctx, node, r) => {
  const { type } = node;
  if (type === 'buyer') {
    // Diamond
    ctx.beginPath();
    ctx.moveTo(node.x, node.y - r);
    ctx.lineTo(node.x + r, node.y);
    ctx.lineTo(node.x, node.y + r);
    ctx.lineTo(node.x - r, node.y);
    ctx.closePath();
  } else if (type === 'mandi') {
    // Square
    ctx.beginPath();
    ctx.rect(node.x - r * 0.8, node.y - r * 0.8, r * 1.6, r * 1.6);
  } else {
    // Circle (inventory)
    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
  }
};

const NODE_COLORS = {
  inventory: '#059669',
  buyer: '#3b82f6',
  mandi: '#f59e0b',
};

const LINK_STYLES = {
  contract: { dash: [], opacity: 0.7 },
  dispatch: { dash: [6, 4], opacity: 0.85 },
  opportunity: { dash: [2, 4], opacity: 0.35 },
};

// ─── MAIN COMPONENT ────────────────────────────────────────
export const Network = () => {
  const navigate = useNavigate();
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const simulationRef = useRef(null);
  const zoomRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [d3Loaded, setD3Loaded] = useState(false);
  const [graphData, setGraphData] = useState(null);
  const [tooltip, setTooltip] = useState(null);

  // Filters
  const [showContracts, setShowContracts] = useState(true);
  const [showDispatches, setShowDispatches] = useState(true);
  const [showOpportunities, setShowOpportunities] = useState(true);
  const [commodityFilter, setCommodityFilter] = useState('all');

  const GRAPH_HEIGHT = 560;

  // Load D3 dynamically
  useEffect(() => {
    import('d3').then((mod) => {
      d3 = mod;
      setD3Loaded(true);
    }).catch(() => {
      setD3Loaded(false);
      setLoading(false);
    });
  }, []);

  // Fetch data
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await getNetworkGraph();
        setGraphData(data && data.nodes?.length > 0 ? data : DEMO_GRAPH);
      } catch {
        setGraphData(DEMO_GRAPH);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Extract unique commodities
  const commodities = useMemo(() => {
    if (!graphData) return [];
    const set = new Set(graphData.nodes.map(n => n.commodity).filter(Boolean));
    return [...set].sort();
  }, [graphData]);

  // Filtered graph
  const filtered = useMemo(() => {
    if (!graphData) return { nodes: [], links: [] };

    let filteredLinks = [...graphData.links];
    if (!showContracts) filteredLinks = filteredLinks.filter(l => l.type !== 'contract');
    if (!showDispatches) filteredLinks = filteredLinks.filter(l => l.type !== 'dispatch');
    if (!showOpportunities) filteredLinks = filteredLinks.filter(l => l.type !== 'opportunity');

    let filteredNodes = [...graphData.nodes];
    if (commodityFilter !== 'all') {
      filteredNodes = filteredNodes.filter(n => n.commodity === commodityFilter);
      const nodeIds = new Set(filteredNodes.map(n => n.id));
      filteredLinks = filteredLinks.filter(l => {
        const srcId = typeof l.source === 'object' ? l.source.id : l.source;
        const tgtId = typeof l.target === 'object' ? l.target.id : l.target;
        return nodeIds.has(srcId) && nodeIds.has(tgtId);
      });
    }

    // Re-add connected nodes
    const connectedIds = new Set();
    filteredLinks.forEach(l => {
      connectedIds.add(typeof l.source === 'object' ? l.source.id : l.source);
      connectedIds.add(typeof l.target === 'object' ? l.target.id : l.target);
    });

    if (commodityFilter === 'all') {
      return { nodes: filteredNodes, links: filteredLinks };
    }

    const allNodes = graphData.nodes.filter(n => connectedIds.has(n.id) || filteredNodes.some(fn => fn.id === n.id));
    return { nodes: allNodes, links: filteredLinks };
  }, [graphData, showContracts, showDispatches, showOpportunities, commodityFilter]);

  // Build D3 simulation
  useEffect(() => {
    if (!d3Loaded || !d3 || !svgRef.current || filtered.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    const container = containerRef.current;
    const width = container?.clientWidth || 900;
    const height = GRAPH_HEIGHT;

    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height);

    // Deep clone nodes/links for simulation
    const nodes = filtered.nodes.map(n => ({ ...n }));
    const links = filtered.links.map(l => ({
      ...l,
      source: typeof l.source === 'object' ? l.source.id : l.source,
      target: typeof l.target === 'object' ? l.target.id : l.target,
    }));

    const g = svg.append('g');

    // Zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.3, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    svg.call(zoom);
    zoomRef.current = zoom;

    // Arrow markers
    const defs = svg.append('defs');
    ['#059669', '#3b82f6', '#ef4444', '#94a3b8'].forEach((color, i) => {
      defs.append('marker')
        .attr('id', `arrow-${i}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 25)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', color);
    });

    // CSS animation for dispatch links
    const style = svg.append('style');
    style.text(`
      .dispatch-link { animation: dash-flow 1s linear infinite; }
      @keyframes dash-flow { to { stroke-dashoffset: -20; } }
    `);

    // Force simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(140))
      .force('charge', d3.forceManyBody().strength(-350))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(45))
      .force('x', d3.forceX(width / 2).strength(0.05))
      .force('y', d3.forceY(height / 2).strength(0.05));

    simulationRef.current = simulation;

    // Draw links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', d => {
        if (d.type === 'dispatch') return '#3b82f6';
        if (d.pnl > 0) return '#059669';
        if (d.pnl < 0) return '#ef4444';
        return '#94a3b8';
      })
      .attr('stroke-width', d => {
        if (d.type === 'contract') return Math.max(1.5, Math.min(d.value / 200000, 5));
        return 1.5;
      })
      .attr('stroke-opacity', d => LINK_STYLES[d.type]?.opacity || 0.5)
      .attr('stroke-dasharray', d => {
        const style = LINK_STYLES[d.type];
        return style?.dash?.length > 0 ? style.dash.join(',') : 'none';
      })
      .classed('dispatch-link', d => d.type === 'dispatch' && d.status === 'in_transit');

    // Draw nodes
    const nodeGroup = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(d3.drag()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      );

    // Node shapes
    nodeGroup.each(function (d) {
      const el = d3.select(this);
      const color = NODE_COLORS[d.type] || '#94a3b8';
      const r = d.type === 'inventory' ? Math.max(14, Math.min(d.value / 20, 28))
        : d.type === 'buyer' ? 18
        : 16;

      if (d.type === 'buyer') {
        // Diamond
        el.append('polygon')
          .attr('points', `0,${-r} ${r},0 0,${r} ${-r},0`)
          .attr('fill', color)
          .attr('fill-opacity', 0.15)
          .attr('stroke', color)
          .attr('stroke-width', 2);
      } else if (d.type === 'mandi') {
        // Square
        el.append('rect')
          .attr('x', -r * 0.8)
          .attr('y', -r * 0.8)
          .attr('width', r * 1.6)
          .attr('height', r * 1.6)
          .attr('rx', 3)
          .attr('fill', color)
          .attr('fill-opacity', 0.15)
          .attr('stroke', color)
          .attr('stroke-width', 2);
      } else {
        // Circle
        el.append('circle')
          .attr('r', r)
          .attr('fill', color)
          .attr('fill-opacity', 0.15)
          .attr('stroke', color)
          .attr('stroke-width', 2);
      }

      // Inner icon dot
      el.append('circle')
        .attr('r', 4)
        .attr('fill', color);

      // Label
      el.append('text')
        .text(d.name.length > 16 ? d.name.slice(0, 14) + '…' : d.name)
        .attr('dy', d.type === 'mandi' ? r + 14 : r + 14)
        .attr('text-anchor', 'middle')
        .attr('fill', '#475569')
        .attr('font-size', '10px')
        .attr('font-weight', '600')
        .attr('font-family', 'Inter, sans-serif');
    });

    // Hover / click
    nodeGroup
      .on('mouseover', (event, d) => {
        const rect = container.getBoundingClientRect();
        setTooltip({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top - 10,
          name: d.name,
          type: d.type,
          commodity: d.commodity,
          value: d.value,
        });
      })
      .on('mouseout', () => setTooltip(null))
      .on('click', (event, d) => {
        if (d.type === 'buyer') navigate('/app/contracts');
        else if (d.type === 'mandi') navigate('/app/markets');
        else if (d.type === 'inventory') navigate('/app/inventory');
      });

    // Tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      nodeGroup.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [d3Loaded, filtered, navigate]);

  // Zoom controls
  const handleZoom = useCallback((direction) => {
    if (!d3 || !svgRef.current || !zoomRef.current) return;
    const svg = d3.select(svgRef.current);
    const currentZoom = d3.zoomTransform(svgRef.current);
    const factor = direction === 'in' ? 1.4 : 0.7;
    svg.transition().duration(300).call(
      zoomRef.current.scaleTo, currentZoom.k * factor
    );
  }, []);

  const handleReset = useCallback(() => {
    if (!d3 || !svgRef.current || !zoomRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(500).call(
      zoomRef.current.transform, d3.zoomIdentity
    );
  }, []);

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!d3Loaded) {
    return (
      <div className="space-y-6 pb-12 text-slate-700">
        <PageHeader title="Supply Chain Network" subtitle="Live visualization of your trade flows" />
        <Card>
          <div className="p-12 text-center space-y-3">
            <NetworkIcon className="w-12 h-12 mx-auto text-slate-300" />
            <h3 className="text-base font-bold text-slate-700">D3.js Not Loaded</h3>
            <p className="text-xs text-slate-400 font-medium">
              Install d3: <code className="bg-slate-100 px-2 py-0.5 rounded">npm install d3</code> and restart dev server.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 text-slate-700">
      <PageHeader
        title="Supply Chain Network"
        subtitle="Live visualization of your trade flows"
        actions={
          <Button variant="secondary" size="sm" onClick={() => {
            setGraphData(null);
            setTimeout(() => setGraphData(DEMO_GRAPH), 100);
            toast.success('Network refreshed');
          }} className="flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        }
      />

      {/* CONTROLS ROW */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left: Filter toggles */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Filter className="w-3 h-3" /> Show:
          </span>
          {[
            { label: 'Contracts', checked: showContracts, set: setShowContracts, color: '#059669' },
            { label: 'Dispatches', checked: showDispatches, set: setShowDispatches, color: '#3b82f6' },
            { label: 'Opportunities', checked: showOpportunities, set: setShowOpportunities, color: '#f59e0b' },
          ].map(f => (
            <label key={f.label} className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={f.checked}
                onChange={(e) => f.set(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
              />
              <span className="text-xs font-semibold text-slate-600">{f.label}</span>
              <span className="w-3 h-0.5 rounded" style={{ backgroundColor: f.color }} />
            </label>
          ))}

          <select
            value={commodityFilter}
            onChange={(e) => setCommodityFilter(e.target.value)}
            className="text-xs font-semibold border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-green"
            style={{ borderColor: 'var(--border)' }}
          >
            <option value="all">All Commodities</option>
            {commodities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Right: Zoom controls */}
        <div className="flex items-center gap-1">
          <button onClick={() => handleZoom('in')} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={() => handleZoom('out')} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
            <ZoomOut className="w-4 h-4" />
          </button>
          <button onClick={handleReset} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* GRAPH CANVAS */}
      <Card>
        <div
          ref={containerRef}
          className="relative w-full overflow-hidden rounded-xl bg-gradient-to-br from-slate-50 to-white"
          style={{ height: GRAPH_HEIGHT }}
        >
          <svg ref={svgRef} className="w-full h-full" />

          {/* Legend */}
          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm border rounded-xl p-3 space-y-2 shadow-sm" style={{ borderColor: 'var(--border)' }}>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Legend</p>
            <div className="space-y-1.5">
              {[
                { shape: 'circle', color: '#059669', label: 'Inventory' },
                { shape: 'diamond', color: '#3b82f6', label: 'Buyer / Counterparty' },
                { shape: 'square', color: '#f59e0b', label: 'Mandi / Market' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2">
                  {item.shape === 'circle' && (
                    <span className="w-3 h-3 rounded-full border-2 shrink-0" style={{ borderColor: item.color, backgroundColor: item.color + '25' }} />
                  )}
                  {item.shape === 'diamond' && (
                    <span className="w-3 h-3 shrink-0 rotate-45 border-2" style={{ borderColor: item.color, backgroundColor: item.color + '25' }} />
                  )}
                  {item.shape === 'square' && (
                    <span className="w-3 h-3 shrink-0 rounded-sm border-2" style={{ borderColor: item.color, backgroundColor: item.color + '25' }} />
                  )}
                  <span className="text-[10px] font-semibold text-slate-500">{item.label}</span>
                </div>
              ))}
              <hr className="border-slate-100" />
              {[
                { label: 'Profitable', color: '#059669', dash: '' },
                { label: 'Loss-making', color: '#ef4444', dash: '' },
                { label: 'In Transit', color: '#3b82f6', dash: '4,3' },
                { label: 'Opportunity', color: '#94a3b8', dash: '2,3' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2">
                  <svg width="16" height="4" className="shrink-0">
                    <line
                      x1="0" y1="2" x2="16" y2="2"
                      stroke={item.color}
                      strokeWidth="2"
                      strokeDasharray={item.dash || 'none'}
                    />
                  </svg>
                  <span className="text-[10px] font-semibold text-slate-500">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tooltip */}
          {tooltip && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute pointer-events-none z-20 bg-white border rounded-lg shadow-lg p-3 space-y-1"
              style={{
                left: tooltip.x + 12,
                top: tooltip.y - 40,
                borderColor: 'var(--border)',
                maxWidth: 220,
              }}
            >
              <p className="text-xs font-bold text-slate-900">{tooltip.name}</p>
              <div className="flex items-center gap-2">
                <Badge variant={tooltip.type === 'inventory' ? 'success' : tooltip.type === 'buyer' ? 'info' : 'warning'}>
                  {tooltip.type}
                </Badge>
                {tooltip.commodity && (
                  <span className="text-[10px] text-slate-500 font-semibold">{tooltip.commodity}</span>
                )}
              </div>
              <p className="text-[11px] text-slate-600 font-semibold">
                {tooltip.type === 'mandi' ? `₹${tooltip.value?.toLocaleString('en-IN')}/q` :
                  tooltip.type === 'buyer' ? formatINR(tooltip.value) :
                    `${tooltip.value} quintals`}
              </p>
            </motion.div>
          )}

          {/* Node count badge */}
          <div className="absolute bottom-4 right-4">
            <Badge variant="neutral" className="flex items-center gap-1">
              <Info className="w-3 h-3" />
              {filtered.nodes.length} nodes • {filtered.links.length} links
            </Badge>
          </div>
        </div>
      </Card>

      {/* STATS BELOW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Nodes', value: filtered.nodes.length, color: 'var(--brand-green)' },
          { label: 'Trade Links', value: filtered.links.filter(l => l.type === 'contract').length, color: '#059669' },
          { label: 'In Transit', value: filtered.links.filter(l => l.status === 'in_transit').length, color: '#3b82f6' },
          { label: 'Opportunities', value: filtered.links.filter(l => l.type === 'opportunity').length, color: '#f59e0b' },
        ].map((s, i) => (
          <Card key={i}>
            <div className="p-4 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
              <p className="text-2xl font-black font-display mt-1" style={{ color: s.color }}>{s.value}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Network;
