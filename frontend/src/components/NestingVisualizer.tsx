"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, HelpCircle, Eye, EyeOff, Settings, Download, Info } from 'lucide-react';

interface Shape {
  id: string;
  points: number[][];
  x?: number;
  y?: number;
  rotation?: number;
}

interface NestingVisualizerProps {
  originalShapes: Shape[];
  nestedShapes: Shape[];
  fabricWidth: number;
  fabricHeight: number;
  isOptimizing: boolean;
  utilization: number;
  waste: number;
}

export default function NestingVisualizer({
  originalShapes,
  nestedShapes,
  fabricWidth,
  fabricHeight,
  isOptimizing,
  utilization,
  waste
}: NestingVisualizerProps) {
  const [heatmapMode, setHeatmapMode] = useState(false);
  const [hoveredShapeId, setHoveredShapeId] = useState<string | null>(null);

  // Auto-scale shapes to fit inside SVGs
  const viewWidth = 600;
  const padding = 20;
  
  // Find boundaries of original shapes to fit them inside the "Before" box
  let minX = 0, maxX = 100, minY = 0, maxY = 100;
  originalShapes.forEach(shape => {
    shape.points.forEach(([px, py]) => {
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
    });
  });

  const origWidth = maxX - minX;
  const origHeight = maxY - minY;
  const origScale = Math.min((viewWidth - padding * 2) / (origWidth || 1), 220 / (origHeight || 1));

  // Scale for Nested output (fits inside the fabric layout dimensions)
  const nestedScale = Math.min((viewWidth - padding * 2) / (fabricWidth || 1), 320 / (fabricHeight || 1));
  const renderFabricHeight = fabricHeight > 0 ? fabricHeight * nestedScale : 320;
  const renderFabricWidth = fabricWidth * nestedScale;

  // Convert points array to SVG path string
  const getSvgPath = (points: number[][], scale: number, offsetX = 0, offsetY = 0) => {
    if (!points || points.length === 0) return '';
    return points
      .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${(pt[0] + offsetX) * scale} ${(pt[1] + offsetY) * scale}`)
      .join(' ') + ' Z';
  };

  // Color generator for shapes
  const getShapeColor = (id: string, index: number, isNested: boolean) => {
    if (heatmapMode) {
      // Density representation: Red/Orange for tight nesting, Blue/Teal for outer
      const density = (index % 5) / 5;
      if (density > 0.7) return 'rgba(239, 68, 68, 0.7)'; // red
      if (density > 0.4) return 'rgba(249, 115, 22, 0.7)'; // orange
      return 'rgba(234, 179, 8, 0.7)'; // yellow
    }
    
    // Cyberpunk themed gradients
    const colors = [
      'rgba(59, 130, 246, 0.55)',  // Cyan/Blue
      'rgba(168, 85, 247, 0.55)', // Purple
      'rgba(6, 182, 212, 0.55)',  // Electric Cyan
      'rgba(236, 72, 153, 0.55)', // Pink
      'rgba(99, 102, 241, 0.55)', // Indigo
    ];
    return colors[index % colors.length];
  };

  const getShapeStroke = (id: string, index: number) => {
    if (hoveredShapeId === id) return '#ffffff';
    
    const strokes = [
      '#60a5fa', // Blue
      '#c084fc', // Purple
      '#22d3ee', // Cyan
      '#f472b6', // Pink
      '#818cf8', // Indigo
    ];
    return strokes[index % strokes.length];
  };

  // Preset Traditional (Wasteful) nested positions for visual comparison
  const mockBeforeLayout = originalShapes.map((shape, idx) => {
    // Stagger them linearly with large spacing gaps (representing manual placement)
    const spacing = 15;
    const row = Math.floor(idx / 3);
    const col = idx % 3;
    const px = col * 40 + spacing;
    const py = row * 30 + spacing;
    return {
      ...shape,
      x: px,
      y: py
    };
  });

  return (
    <div className="w-full flex flex-col gap-8">
      {/* Visual Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-themeBorder pb-4">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-electric" />
          <h3 className="font-semibold text-lg">Nesting Layout Optimization View</h3>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setHeatmapMode(!heatmapMode)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              heatmapMode 
                ? 'bg-cyanAccent/20 border-cyanAccent text-cyanAccent' 
                : 'bg-white/5 border-themeBorder hover:bg-white/10 text-secondaryText'
            }`}
          >
            {heatmapMode ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            Heatmap Mode
          </button>
        </div>
      </div>

      {/* Grid before vs after */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-center gap-8">
        
        {/* BEFORE VIEW (Traditional Manual Nesting) */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-mutedText font-medium">Traditional Method (Loose Placement)</span>
            <span className="text-red-400 font-semibold">Utilization: ~75.4% (24.6% Waste)</span>
          </div>
          
          <div className="relative glass-panel rounded-xl p-4 overflow-hidden h-[380px] flex items-center justify-center">
            {/* Visual background grid */}
            <div className="absolute inset-0 mesh-grid opacity-20 pointer-events-none" />
            
            <svg 
              viewBox={`0 0 ${viewWidth} 340`} 
              className="w-full max-h-[320px] drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
            >
              {/* Dummy fabric sheet area */}
              <rect 
                x="0" 
                y="0" 
                width={viewWidth} 
                height="320" 
                fill="none" 
                stroke="rgba(239, 68, 68, 0.3)" 
                strokeWidth="2" 
                strokeDasharray="4 4"
                className="transition-all"
              />
              
              {/* Shapes grid */}
              {mockBeforeLayout.map((shape, idx) => {
                const pathStr = getSvgPath(shape.points, origScale, shape.x, shape.y);
                return (
                  <path 
                    key={`before-${shape.id}-${idx}`}
                    d={pathStr}
                    fill="rgba(255, 255, 255, 0.05)"
                    stroke="rgba(255, 255, 255, 0.2)"
                    strokeWidth="1.5"
                  />
                );
              })}
            </svg>
          </div>
        </div>

        {/* MIDDLE DIVIDER: AI Optimization Progress Status */}
        <div className="flex lg:flex-col items-center justify-center gap-2 text-center py-4 lg:py-0">
          <span className="text-gray-600 font-black text-lg select-none">↓</span>
          <span className="text-[10px] text-cyanAccent uppercase font-extrabold tracking-wider bg-cyanAccent/10 border border-cyanAccent/20 px-3 py-1 rounded-full whitespace-nowrap">
            AI Optimization
          </span>
          <span className="text-gray-600 font-black text-lg select-none">↓</span>
          <span className="text-[9px] text-emerald-400 uppercase font-black tracking-wider bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded">
            Completed
          </span>
        </div>

        {/* AFTER VIEW (Pattern Optima AI Pack) */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-cyanAccent font-semibold flex items-center gap-1">
              <Info className="h-4 w-4" />
              Pattern Optima (Compacted Nesting)
            </span>
            <span className="text-emerald-400 font-bold">
              Utilization: {utilization}% ({waste}% Waste)
            </span>
          </div>

          <div className="relative glass-panel rounded-xl p-4 overflow-hidden h-[380px] flex items-center justify-center">
            <div className="absolute inset-0 mesh-grid opacity-40 pointer-events-none" />
            
            {isOptimizing ? (
              <div className="flex flex-col items-center justify-center gap-3">
                {/* Custom animated loader */}
                <div className="h-10 w-10 rounded-full border-t-2 border-r-2 border-electric animate-spin" />
                <span className="text-xs text-mutedText animate-pulse">AI Engine compacting shapes...</span>
              </div>
            ) : nestedShapes.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center p-6 gap-2 text-gray-500">
                <Settings className="h-10 w-10 text-gray-600 animate-spin-slow" />
                <p className="text-sm font-medium">No active nesting layout.</p>
                <p className="text-xs">Adjust configuration and click "Start Optimizing".</p>
              </div>
            ) : (
              <svg 
                viewBox={`0 0 ${viewWidth} 340`} 
                className="w-full max-h-[320px] drop-shadow-[0_10px_20px_rgba(59,130,246,0.15)]"
              >
                {/* Scaled fabric sheet outline */}
                <rect 
                  x="0" 
                  y="0" 
                  width={renderFabricWidth} 
                  height={renderFabricHeight} 
                  fill="rgba(59, 130, 246, 0.03)" 
                  stroke="rgba(6, 182, 212, 0.4)" 
                  strokeWidth="2.5"
                  className="transition-all duration-500"
                />

                {/* Grid ruler metrics */}
                <text 
                  x={renderFabricWidth + 10} 
                  y="20" 
                  fill="#06b6d4" 
                  fontSize="12" 
                  fontWeight="bold"
                >
                  Width: {fabricWidth}cm
                </text>
                <text 
                  x="10" 
                  y={renderFabricHeight + 18} 
                  fill="#a855f7" 
                  fontSize="12" 
                  fontWeight="bold"
                >
                  Height: {Math.round(fabricHeight)}cm
                </text>

                {/* Render packed shapes with sliding entrance animations */}
                <AnimatePresence>
                  {nestedShapes.map((shape, idx) => {
                    // Extract coordinates
                    const pathStr = getSvgPath(shape.points, nestedScale);
                    return (
                      <motion.path
                        key={`nested-${shape.id}-${idx}`}
                        d={pathStr}
                        initial={{ opacity: 0, scale: 0.8, x: 200, y: 150 }}
                        animate={{ 
                          opacity: 1, 
                          scale: 1, 
                          x: 0, 
                          y: 0,
                          transition: { 
                            type: "spring", 
                            stiffness: 80, 
                            damping: 15,
                            delay: idx * 0.08 
                          } 
                        }}
                        exit={{ opacity: 0 }}
                        fill={getShapeColor(shape.id, idx, true)}
                        stroke={getShapeStroke(shape.id, idx)}
                        strokeWidth={hoveredShapeId === shape.id ? "3" : "1.5"}
                        onMouseEnter={() => setHoveredShapeId(shape.id)}
                        onMouseLeave={() => setHoveredShapeId(null)}
                        className="cursor-pointer transition-colors duration-150"
                      />
                    );
                  })}
                </AnimatePresence>
              </svg>
            )}

            {/* Hover details bubble */}
            {hoveredShapeId && (
              <div className="absolute bottom-3 right-3 bg-secondaryBg/90 border border-themeBorder rounded-lg p-2.5 text-[11px] backdrop-blur-md text-secondaryText pointer-events-none shadow-2xl flex flex-col gap-0.5">
                <span className="font-semibold text-primaryText">Piece: {hoveredShapeId.split('_')[0].toUpperCase()}</span>
                <span>ID: {hoveredShapeId}</span>
                <span>Placement X: {Math.round(nestedShapes.find(s => s.id === hoveredShapeId)?.x || 0)}mm</span>
                <span>Placement Y: {Math.round(nestedShapes.find(s => s.id === hoveredShapeId)?.y || 0)}mm</span>
                <span>Rotation: {nestedShapes.find(s => s.id === hoveredShapeId)?.rotation || 0}°</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
