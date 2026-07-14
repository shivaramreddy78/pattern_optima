"use client";

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  RotateCw, 
  Trash2, 
  Copy, 
  Plus, 
  Minus, 
  RefreshCw,
  Sparkles,
  Maximize2,
  FileCheck,
  FolderOpen
} from 'lucide-react';

interface Shape {
  id: string;
  name: string;
  points: number[][];
  quantity: number;
  allow_rotation: boolean;
  scale?: number;     // visual editing scale multiplier (defaults to 1)
  rotation?: number;  // visual editing rotation in degrees (defaults to 0)
}

interface PatternEditorProps {
  uploadedShapes: Shape[];
  setUploadedShapes: React.Dispatch<React.SetStateAction<Shape[]>>;
  addToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  onProceedToOptimize: () => void;
}

export default function PatternEditor({
  uploadedShapes,
  setUploadedShapes,
  addToast,
  onProceedToOptimize
}: PatternEditorProps) {
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Core Presets templates
  const presetGarments = [
    { id: "tshirt_front", name: "T-Shirt Front Panel", points: [[0,0], [40,0], [40,15], [50,20], [50,60], [40,65], [40,80], [0,80]], quantity: 1, allow_rotation: true },
    { id: "tshirt_back", name: "T-Shirt Back Panel", points: [[0,0], [40,0], [40,10], [50,15], [50,60], [40,65], [40,80], [0,80]], quantity: 1, allow_rotation: true },
    { id: "sleeve_left", name: "Sleeve Left", points: [[0,0], [20,0], [30,15], [20,35], [0,20]], quantity: 2, allow_rotation: true },
    { id: "sleeve_right", name: "Sleeve Right", points: [[0,0], [20,0], [30,20], [10,35], [0,15]], quantity: 2, allow_rotation: true },
    { id: "collar", name: "Classic Collar", points: [[0,0], [25,0], [20,6], [5,6]], quantity: 2, allow_rotation: true },
    { id: "pant_leg", name: "Trouser Leg Panel", points: [[5,0], [25,0], [30,30], [20,90], [0,90], [10,30]], quantity: 1, allow_rotation: true },
    { id: "front_pocket", name: "Front Pocket Patch", points: [[0,0], [12,0], [12,10], [6,15], [0,10]], quantity: 2, allow_rotation: true }
  ];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  // Mock file parsing - maps uploaded files into visual CAD models
  const parsePatternFile = (fileName: string) => {
    const nameLower = fileName.toLowerCase();
    let selectedPreset = presetGarments[Math.floor(Math.random() * presetGarments.length)];
    
    // Attempt intelligent mapping by filename keywords
    if (nameLower.includes('sleeve')) {
      selectedPreset = presetGarments[2];
    } else if (nameLower.includes('collar')) {
      selectedPreset = presetGarments[4];
    } else if (nameLower.includes('pocket')) {
      selectedPreset = presetGarments[6];
    } else if (nameLower.includes('pant') || nameLower.includes('trouser')) {
      selectedPreset = presetGarments[5];
    } else if (nameLower.includes('back')) {
      selectedPreset = presetGarments[1];
    } else if (nameLower.includes('front') || nameLower.includes('shirt')) {
      selectedPreset = presetGarments[0];
    }

    const uniqueId = `${selectedPreset.id}_up_${Date.now()}`;
    const newShape: Shape = {
      ...selectedPreset,
      id: uniqueId,
      name: `${fileName.split('.')[0]} (${selectedPreset.name})`,
      scale: 1,
      rotation: 0
    };

    setUploadedShapes(prev => [...prev, newShape]);
    setSelectedShapeId(uniqueId);
    addToast(`Successfully parsed and loaded vector paths from ${fileName}`, 'success');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const validTypes = ['.svg', '.dxf', '.pdf', '.png', '.jpeg', '.jpg'];
      const isExtensionValid = validTypes.some(ext => file.name.toLowerCase().endsWith(ext));
      
      if (isExtensionValid) {
        parsePatternFile(file.name);
      } else {
        addToast('Unsupported file type. Please upload SVG, DXF, PDF, or image files.', 'error');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      parsePatternFile(e.target.files[0].name);
    }
  };

  const addPresetShape = (preset: typeof presetGarments[0]) => {
    const uniqueId = `${preset.id}_pre_${Date.now()}`;
    setUploadedShapes(prev => [
      ...prev, 
      { ...preset, id: uniqueId, scale: 1, rotation: 0 }
    ]);
    setSelectedShapeId(uniqueId);
    addToast(`Added Preset: ${preset.name}`, 'info');
  };

  // Editing Action Functions
  const handleRotate = () => {
    if (!selectedShapeId) return;
    setUploadedShapes(prev => prev.map(s => {
      if (s.id === selectedShapeId) {
        const nextRot = ((s.rotation || 0) + 90) % 360;
        return { ...s, rotation: nextRot };
      }
      return s;
    }));
    addToast('Shape rotated 90 degrees', 'info');
  };

  const handleScaleChange = (multiplier: number) => {
    if (!selectedShapeId) return;
    setUploadedShapes(prev => prev.map(s => {
      if (s.id === selectedShapeId) {
        const nextScale = Math.min(2.0, Math.max(0.4, (s.scale || 1) * multiplier));
        return { ...s, scale: parseFloat(nextScale.toFixed(2)) };
      }
      return s;
    }));
  };

  const handleDuplicate = () => {
    if (!selectedShapeId) return;
    const activeShape = uploadedShapes.find(s => s.id === selectedShapeId);
    if (activeShape) {
      const uniqueId = `${activeShape.id.split('_')[0]}_dup_${Date.now()}`;
      const clone = {
        ...activeShape,
        id: uniqueId,
        name: `${activeShape.name} (Copy)`
      };
      setUploadedShapes(prev => [...prev, clone]);
      setSelectedShapeId(uniqueId);
      addToast('Duplicated selected pattern shape', 'success');
    }
  };

  const handleDelete = () => {
    if (!selectedShapeId) return;
    setUploadedShapes(prev => prev.filter(s => s.id !== selectedShapeId));
    setSelectedShapeId(null);
    addToast('Pattern shape deleted', 'warning');
  };

  const updateQuantity = (id: string, diff: number) => {
    setUploadedShapes(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, quantity: Math.max(1, s.quantity + diff) };
      }
      return s;
    }));
  };

  const getSvgPath = (points: number[][]) => {
    if (!points || points.length === 0) return '';
    return points
      .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt[0] * 3} ${pt[1] * 3}`)
      .join(' ') + ' Z';
  };

  const activeShape = uploadedShapes.find(s => s.id === selectedShapeId);

  return (
    <div className="w-full grid grid-cols-1 xl:grid-cols-4 gap-8">
      
      {/* LEFT COLUMN: Upload Box and Presets */}
      <div className="xl:col-span-1 flex flex-col gap-6">
        
        {/* Upload drag drop */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`glass-panel border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
            dragOver 
              ? 'border-cyanAccent bg-cyanAccent/5 shadow-[0_0_20px_rgba(6,182,212,0.1)]' 
              : 'border-themeBorder hover:border-themeBorder hover:bg-white/5'
          }`}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            accept=".svg,.dxf,.pdf,.png,.jpg,.jpeg"
            className="hidden" 
          />
          <div className="h-10 w-10 rounded-xl bg-white/5 border border-themeBorder flex items-center justify-center text-mutedText mb-3">
            <Upload className="h-5 w-5" />
          </div>
          <span className="text-xs font-semibold text-primaryText">Drag & drop files</span>
          <span className="text-[10px] text-gray-500 mt-1">SVG, DXF, PDF, PNG or JPEG</span>
          <button className="mt-3 px-3 py-1.5 rounded-lg bg-white/5 border border-themeBorder text-[10px] font-semibold text-secondaryText hover:text-primaryText transition-colors">
            Browse Files
          </button>
        </div>

        {/* Presets block */}
        <div className="glass-panel rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-themeBorder pb-2">
            <span className="text-xs font-bold text-primaryText flex items-center gap-1.5">
              <FolderOpen className="h-4 w-4 text-purpleAccent" />
              CAD Presets Library
            </span>
          </div>

          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
            {presetGarments.map((preset) => (
              <button
                key={preset.id}
                onClick={() => addPresetShape(preset)}
                className="flex items-center justify-between p-2.5 rounded-xl border border-themeBorder bg-background/40 hover:bg-white/5 text-left text-[11px] group transition-all"
              >
                <div className="flex flex-col">
                  <span className="font-semibold text-secondaryText group-hover:text-primaryText truncate">{preset.name}</span>
                  <span className="text-[9px] text-gray-600">Points: {preset.points.length}</span>
                </div>
                <div className="h-5 w-5 rounded bg-white/5 border border-themeBorder flex items-center justify-center text-mutedText group-hover:bg-electric group-hover:text-primaryText group-hover:border-electric transition-all shrink-0">
                  <Plus className="h-3 w-3" />
                </div>
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* CENTER & RIGHT COLUMN: Canvas Workspace and Parameters */}
      <div className="xl:col-span-3 flex flex-col lg:flex-row gap-6">
        
        {/* Workspace Canvas */}
        <div className="flex-1 glass-panel rounded-2xl p-4 flex flex-col gap-4 min-h-[460px] relative overflow-hidden">
          <div className="absolute inset-0 mesh-grid opacity-10 pointer-events-none" />
          
          {/* Top toolbar */}
          <div className="flex items-center justify-between z-10">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Workspace Draftsman Canvas</span>
            
            {uploadedShapes.length > 0 && (
              <div className="flex items-center gap-2 bg-background/80 border border-themeBorder rounded-lg p-1 text-[10px]">
                <button 
                  onClick={() => setZoomLevel(prev => Math.max(0.6, prev - 0.2))}
                  className="p-1 rounded hover:bg-white/5 text-mutedText hover:text-primaryText"
                  title="Zoom Out"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="px-2 font-mono font-bold text-cyanAccent">{Math.round(zoomLevel * 100)}%</span>
                <button 
                  onClick={() => setZoomLevel(prev => Math.min(1.8, prev + 0.2))}
                  className="p-1 rounded hover:bg-white/5 text-mutedText hover:text-primaryText"
                  title="Zoom In"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Active Canvas Editor Area */}
          <div className="flex-1 border border-themeBorder bg-background/30 rounded-xl relative flex items-center justify-center overflow-hidden">
            
            <AnimatePresence mode="wait">
              {uploadedShapes.length === 0 ? (
                // Premium Empty State
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col items-center justify-center p-6 text-center max-w-sm gap-4"
                >
                  <div className="h-16 w-16 rounded-full bg-electric/5 border border-electric/15 flex items-center justify-center text-cyanAccent animate-pulse-slow">
                    <Maximize2 className="h-7 w-7" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-primaryText">Upload your first pattern to start</h4>
                    <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                      Import garment blueprints in SVG, DXF, or PDF format. Alternatively, populate the canvas using our pre-designed templates on the left.
                    </p>
                  </div>
                </motion.div>
              ) : (
                // Selected Shape SVG Preview Editor
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="w-full h-full flex items-center justify-center p-6 relative cursor-default"
                >
                  {/* Visual CAD Grid bounds indicators */}
                  <div className="absolute top-2 left-2 text-[9px] font-mono text-gray-600">Canvas Roll Limit</div>
                  <div className="absolute bottom-2 right-2 text-[9px] font-mono text-gray-600">Autoscaled view</div>

                  {activeShape ? (
                    <div className="relative transition-all duration-300">
                      <svg 
                        viewBox="-20 -20 200 300"
                        className="max-h-[360px] max-w-[280px] drop-shadow-[0_12px_24px_rgba(37,99,235,0.25)] transition-all"
                        style={{
                          transform: `scale(${zoomLevel})`,
                          transformOrigin: 'center center'
                        }}
                      >
                        {/* Waved mesh polygon path */}
                        <g 
                          style={{
                            transform: `rotate(${activeShape.rotation || 0}deg) scale(${activeShape.scale || 1})`,
                            transformOrigin: '60px 120px',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                          }}
                        >
                          <path 
                            d={getSvgPath(activeShape.points)}
                            fill="rgba(37, 99, 235, 0.15)"
                            stroke="#06b6d4"
                            strokeWidth="2.5"
                          />
                          {/* Point vertices visual indicators */}
                          {activeShape.points.map((pt, pIdx) => (
                            <circle 
                              key={pIdx}
                              cx={pt[0] * 3}
                              cy={pt[1] * 3}
                              r="3.5"
                              fill="#fff"
                              stroke="#3b82f6"
                              strokeWidth="1.5"
                            />
                          ))}
                        </g>
                      </svg>
                    </div>
                  ) : (
                    <span className="text-[11px] text-gray-500 font-semibold animate-pulse">Select a pattern piece from the right table to edit.</span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Quick tool buttons */}
          {activeShape && (
            <div className="flex flex-wrap items-center justify-center gap-2 mt-2 bg-background/60 p-2 rounded-xl border border-themeBorder z-10 w-fit self-center">
              <button 
                onClick={handleRotate}
                className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-white/5 rounded-lg text-[10px] font-semibold text-secondaryText hover:text-primaryText transition-colors"
                title="Rotate 90 degrees"
              >
                <RotateCw className="h-3.5 w-3.5 text-cyanAccent" />
                Rotate 90°
              </button>
              <div className="h-4 w-px bg-white/10" />
              <button 
                onClick={() => handleScaleChange(1.1)}
                className="flex items-center gap-1 px-2.5 py-1.5 hover:bg-white/5 rounded-lg text-[10px] font-semibold text-secondaryText hover:text-primaryText transition-colors"
                title="Scale Up"
              >
                Scale +
              </button>
              <button 
                onClick={() => handleScaleChange(0.9)}
                className="flex items-center gap-1 px-2.5 py-1.5 hover:bg-white/5 rounded-lg text-[10px] font-semibold text-secondaryText hover:text-primaryText transition-colors"
                title="Scale Down"
              >
                Scale -
              </button>
              <div className="h-4 w-px bg-white/10" />
              <button 
                onClick={handleDuplicate}
                className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-white/5 rounded-lg text-[10px] font-semibold text-secondaryText hover:text-primaryText transition-colors"
                title="Clone Shape"
              >
                <Copy className="h-3.5 w-3.5 text-purpleAccent" />
                Duplicate
              </button>
              <div className="h-4 w-px bg-white/10" />
              <button 
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-red-500/10 rounded-lg text-[10px] font-semibold text-red-400 hover:text-red-300 transition-colors"
                title="Delete Shape"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            </div>
          )}
        </div>

        {/* Shape List Manager Grid */}
        {uploadedShapes.length > 0 && (
          <div className="w-full lg:w-72 glass-panel rounded-2xl p-5 flex flex-col justify-between gap-6">
            <div className="flex flex-col gap-4">
              <span className="text-xs font-bold text-primaryText uppercase tracking-wider">Canvas Parts ({uploadedShapes.length})</span>
              
              <div className="flex flex-col gap-2 overflow-y-auto max-h-[290px] pr-1">
                {uploadedShapes.map((shape) => (
                  <div
                    key={shape.id}
                    onClick={() => setSelectedShapeId(shape.id)}
                    className={`p-2.5 rounded-xl border text-left text-[11px] cursor-pointer flex flex-col gap-2 transition-all ${
                      selectedShapeId === shape.id 
                        ? 'bg-electric/10 border-electric/40 shadow-sm' 
                        : 'bg-background/40 border-themeBorder hover:border-themeBorder'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-primaryText truncate max-w-[140px]">{shape.name}</span>
                      <span className="text-[9px] font-bold text-cyanAccent">{shape.rotation || 0}°</span>
                    </div>

                    <div className="flex items-center justify-between border-t border-themeBorder pt-2">
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            updateQuantity(shape.id, -1);
                          }}
                          className="h-5 w-5 bg-white/5 rounded border border-themeBorder flex items-center justify-center hover:bg-white/10"
                        >
                          -
                        </button>
                        <span className="font-bold text-primaryText px-1">Qty: {shape.quantity}</span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            updateQuantity(shape.id, 1);
                          }}
                          className="h-5 w-5 bg-white/5 rounded border border-themeBorder flex items-center justify-center hover:bg-white/10"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-[9px] text-gray-500">Scale: {shape.scale || 1}x</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action dispatch button */}
            <button
              onClick={onProceedToOptimize}
              className="w-full py-3 px-4 bg-gradient-to-r from-electric to-cyanAccent hover:from-blue-700 hover:to-cyan-600 text-primaryText font-bold rounded-xl text-xs transition-all shadow-[0_4px_14px_rgba(6,182,212,0.2)] flex items-center justify-center gap-1.5"
            >
              <Sparkles className="h-4 w-4" />
              Proceed to AI Optimization
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
