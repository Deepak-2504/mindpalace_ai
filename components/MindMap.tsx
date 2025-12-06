import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { AppRoute, MemoryPalace, MindMapNode, Room } from '../types';
import { getPalaceById, savePalace } from '../services/storageService';
import { generateRoomDetails } from '../services/geminiService';

interface MindMapProps {
  palaceId: string;
  onNavigate: (route: AppRoute, params?: any) => void;
}

const MindMap: React.FC<MindMapProps> = ({ palaceId, onNavigate }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [palace, setPalace] = useState<MemoryPalace | null>(null);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // D3 Selection Ref for programmatic zoom
  const d3SvgRef = useRef<d3.Selection<SVGSVGElement, unknown, null, undefined> | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  useEffect(() => {
    const data = getPalaceById(palaceId);
    if (data) {
      setPalace(data);
    }
  }, [palaceId]);

  useEffect(() => {
    if (!palace || !palace.mindMap || !svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = Math.max(600, containerRef.current.clientHeight);
    const margin = { top: 20, right: 120, bottom: 30, left: 120 };

    // Clear previous SVG content
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .style("cursor", "grab");

    d3SvgRef.current = svg;

    // Add a group for the zoomable content
    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Creates a hierarchy from the data
    const root = d3.hierarchy(palace.mindMap);

    // Creates a tree layout with more vertical spacing
    const treeMap = d3.tree<MindMapNode>().size([height - margin.top - margin.bottom, width - margin.left - margin.right]);
    
    // Increase node separation
    treeMap.nodeSize([40, 250]); // Height, Width separation
    
    const treeData = treeMap(root);

    // Calculate initial position to center the root
    const initialTranslateX = 100;
    const initialTranslateY = height / 2;

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    
    zoomBehaviorRef.current = zoom;

    svg.call(zoom)
       .call(zoom.transform, d3.zoomIdentity.translate(initialTranslateX, initialTranslateY).scale(0.8));

    // Links
    g.selectAll(".link")
      .data(treeData.links())
      .enter().append("path")
      .attr("class", "link")
      .attr("d", d3.linkHorizontal<any, any>()
        .x(d => d.y)
        .y(d => d.x))
      .attr("fill", "none")
      .attr("stroke", "#cbd5e1")
      .attr("stroke-width", 2);

    // Nodes
    const node = g.selectAll(".node")
      .data(treeData.descendants())
      .enter().append("g")
      .attr("class", d => "node" + (d.children ? " node--internal" : " node--leaf"))
      .attr("transform", d => `translate(${d.y},${d.x})`);

    // Node Circles
    node.append("circle")
      .attr("r", 10)
      .attr("fill", d => d.depth === 0 ? "#4f46e5" : d.depth === 1 ? "#10b981" : "#f59e0b")
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .on("mouseover", function() {
          d3.select(this).attr("r", 14).attr("stroke", "#4f46e5");
      })
      .on("mouseout", function() {
          d3.select(this).attr("r", 10).attr("stroke", "#fff");
      });

    // Node Labels
    node.append("text")
      .attr("dy", ".35em")
      .attr("x", d => d.children ? -15 : 15)
      .style("text-anchor", d => d.children ? "end" : "start")
      .text(d => d.data.label)
      .attr("font-family", "sans-serif")
      .attr("font-size", "14px")
      .attr("font-weight", "500")
      .attr("fill", "#1e293b")
      .style("pointer-events", "none") // Let clicks pass through to group if needed
      .call(wrap, 150); // Optional text wrapping

    function wrap(text: any, width: number) {
        text.each(function(this: any) {
            // Simplified wrapping logic could go here if needed for very long labels
        });
    }

  }, [palace]);

  const zoomMap = (scaleFactor: number) => {
    if (d3SvgRef.current && zoomBehaviorRef.current) {
        d3SvgRef.current.transition().duration(300).call(zoomBehaviorRef.current.scaleBy, scaleFactor);
    }
  };

  const handleConvertToPalace = async () => {
    if (!palace) return;
    setConverting(true);
    setProgress(0);

    try {
        const roomNodes = palace.mindMap.children || [];
        const total = roomNodes.length + 1; // +1 for root/entrance

        // Use Promise.all for concurrency to speed up generation
        const promises = [];
        
        // Root
        promises.push(generateRoomDetails(palace.mindMap).then(data => ({
            id: `room-${palace.mindMap.id}`,
            ...data
        } as Room)));

        // Children
        roomNodes.forEach(node => {
            promises.push(generateRoomDetails(node).then(data => ({
                id: `room-${node.id}`,
                ...data
            } as Room)));
        });

        // Track progress roughly
        let completed = 0;
        const trackedPromises = promises.map(p => p.then(res => {
            completed++;
            setProgress(Math.round((completed / total) * 100));
            return res;
        }));

        const rooms = await Promise.all(trackedPromises);

        const updatedPalace: MemoryPalace = {
            ...palace,
            rooms: rooms,
            status: 'completed'
        };

        savePalace(updatedPalace);
        onNavigate(AppRoute.PALACE_OVERVIEW, { id: palace.id });

    } catch (error) {
        console.error("Conversion failed", error);
        alert("Failed to create palace details. Try again.");
        setConverting(false);
    }
  };

  if (!palace) return <div>Loading...</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-150px)]">
      <div className="flex justify-between items-center mb-4">
        <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                <button onClick={() => onNavigate(AppRoute.DASHBOARD)} className="hover:text-primary">Dashboard</button>
                <span>/</span>
                <span className="text-slate-800 font-medium">Mind Map</span>
            </div>
            <h1 className="text-2xl font-bold">{palace.title} - Structure</h1>
        </div>
        
        {converting ? (
            <div className="bg-white px-6 py-2 rounded-lg shadow border border-slate-200 flex items-center gap-3">
                <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-secondary transition-all duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
                <span className="text-sm font-medium text-slate-600">Building Palace...</span>
            </div>
        ) : (
            <button
                onClick={handleConvertToPalace}
                className="bg-secondary hover:bg-emerald-600 text-white font-bold py-2 px-6 rounded-lg shadow-lg transform transition hover:scale-105 flex items-center gap-2"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Convert to Memory Palace
            </button>
        )}
      </div>

      <div 
        ref={containerRef}
        className="flex-grow bg-slate-50 rounded-xl shadow border border-slate-200 overflow-hidden relative"
      >
        <svg ref={svgRef} className="w-full h-full"></svg>
        
        {/* Navigation Sidebar Controls */}
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-md border border-slate-200 p-2 flex flex-col gap-2 z-10">
            <span className="text-xs text-center font-bold text-slate-400 mb-1">ZOOM</span>
            
            <button onClick={() => zoomMap(1.2)} className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-primary hover:text-white rounded transition-colors" title="Zoom In">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="11" x2="11" y1="8" y2="14"/><line x1="8" x2="14" y1="11" y2="11"/></svg>
            </button>
            <button onClick={() => zoomMap(0.8)} className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-primary hover:text-white rounded transition-colors" title="Zoom Out">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="8" x2="14" y1="11" y2="11"/></svg>
            </button>
        </div>

        <div className="absolute bottom-4 right-4 bg-white/90 p-2 rounded text-xs text-slate-500 pointer-events-none border border-slate-200 shadow-sm">
            Drag to pan • Scroll to zoom
        </div>
      </div>
    </div>
  );
};

export default MindMap;