"use client";

import React, { useState } from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { 
  TrendingUp, 
  Leaf, 
  DollarSign, 
  Globe2, 
  HelpCircle, 
  HelpCircle as ShieldAlert, 
  Compass, 
  Activity 
} from 'lucide-react';

export default function AnalyticsTab() {
  const [benchmarkYield, setBenchmarkYield] = useState(82); // default generic manual nested yield

  // Mock analytical data
  const utilizationTrends = [
    { date: "Week 01", utilization: 86.4 },
    { date: "Week 02", utilization: 89.2 },
    { date: "Week 03", utilization: 91.5 },
    { date: "Week 04", utilization: 88.9 },
    { date: "Week 05", utilization: 93.4 },
    { date: "Week 06", utilization: 95.2 }
  ];

  const monthlySavings = [
    { name: "Feb", value: 420 },
    { name: "Mar", value: 680 },
    { name: "Apr", value: 950 },
    { name: "May", value: 1120 },
    { name: "Jun", value: 1380 },
    { name: "Jul", value: 1650 }
  ];

  const wasteReduction = [
    { date: "Feb", waste: 18.2 },
    { date: "Mar", waste: 14.5 },
    { date: "Apr", waste: 11.2 },
    { date: "May", waste: 9.8 },
    { date: "Jun", waste: 5.6 },
    { date: "Jul", waste: 4.8 }
  ];

  const successPieData = [
    { name: "Completed", value: 88, color: "#06b6d4" },
    { name: "Manual Tweaked", value: 10, color: "#a855f7" },
    { name: "Failed", value: 2, color: "#f43f5e" }
  ];

  // Grid density data for mock Heat Map
  const heatmapRows = 6;
  const heatmapCols = 10;
  const generateHeatmapGrid = () => {
    const grid = [];
    for (let r = 0; r < heatmapRows; r++) {
      for (let c = 0; c < heatmapCols; c++) {
        // High density near bottom left (r >= 3, c <= 4)
        let density = 0.95 - (r * 0.1) - (c * 0.05) + (Math.random() * 0.1);
        density = Math.max(0.1, Math.min(0.99, density));
        grid.push({ row: r, col: c, val: density });
      }
    }
    return grid;
  };

  const heatmapGrid = generateHeatmapGrid();

  const getHeatmapColor = (val: number) => {
    if (val > 0.8) return 'bg-cyanAccent/70 shadow-[0_0_10px_rgba(6,182,212,0.3)]';
    if (val > 0.6) return 'bg-cyan-500/50';
    if (val > 0.4) return 'bg-purpleAccent/40';
    if (val > 0.2) return 'bg-purple-950/30';
    return 'bg-white/5';
  };

  return (
    <div className="w-full flex flex-col gap-8">
      
      {/* Analytics Overview Hero */}
      <div className="glass-panel rounded-2xl p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
        <div className="lg:col-span-2 flex flex-col gap-2">
          <h3 className="font-extrabold text-base text-primaryText">Efficiency Insights & Benchmarks</h3>
          <p className="text-[11px] text-mutedText leading-relaxed">
            Nesting yield audit metrics compiled across all factories. Optima algorithms save material yards, lowering your carbon footprint while multiplying gross operating margins.
          </p>
        </div>

        {/* Dynamic benchmark calculation widget */}
        <div className="bg-background/70 border border-themeBorder rounded-xl p-4 text-xs flex flex-col gap-2">
          <div className="flex justify-between font-semibold text-secondaryText">
            <span>Your Custom Baseline Yield:</span>
            <span className="text-cyanAccent font-bold">{benchmarkYield}%</span>
          </div>
          <input 
            type="range" 
            min="65" 
            max="88" 
            value={benchmarkYield} 
            onChange={(e) => setBenchmarkYield(Number(e.target.value))}
            className="w-full accent-cyanAccent cursor-pointer bg-white/10 rounded-lg h-1.5"
          />
          <span className="text-[9px] text-emerald-400 font-medium">
            Pattern Optima improves yield by **+{95 - benchmarkYield}%** compared to your baseline.
          </span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* 1. Fabric Utilization Trends (Area Chart) */}
        <div className="glass-panel rounded-2xl p-6 flex flex-col gap-4">
          <div>
            <h4 className="font-bold text-sm text-primaryText">Fabric Utilization Progression</h4>
            <p className="text-[10px] text-gray-500">Yield efficiency metrics averaged weekly (%)</p>
          </div>
          <div className="h-64 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={utilizationTrends} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaUtilGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" tickLine={false} />
                <YAxis stroke="rgba(255,255,255,0.3)" tickLine={false} domain={[70, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(3,7,18,0.95)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '10px' }}
                  labelStyle={{ fontWeight: 'bold', color: '#fff' }}
                />
                <Area type="monotone" dataKey="utilization" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#areaUtilGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Monthly Savings (Bar Chart) */}
        <div className="glass-panel rounded-2xl p-6 flex flex-col gap-4">
          <div>
            <h4 className="font-bold text-sm text-primaryText">Cumulative Monthly Savings ($)</h4>
            <p className="text-[10px] text-gray-500">Incremental cost metrics saved on fabric roll waste</p>
          </div>
          <div className="h-64 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlySavings} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" tickLine={false} />
                <YAxis stroke="rgba(255,255,255,0.3)" tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(3,7,18,0.95)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '10px' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {monthlySavings.map((entry, idx) => (
                    <Cell key={idx} fill={idx % 2 === 0 ? '#3b82f6' : '#a855f7'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Waste Reduction Progression (Line Chart) */}
        <div className="glass-panel rounded-2xl p-6 flex flex-col gap-4">
          <div>
            <h4 className="font-bold text-sm text-primaryText">Waste Curve Progression (%)</h4>
            <p className="text-[10px] text-gray-500">Total fabric waste percentages per month</p>
          </div>
          <div className="h-64 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={wasteReduction} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" tickLine={false} />
                <YAxis stroke="rgba(255,255,255,0.3)" tickLine={false} domain={[0, 25]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(3,7,18,0.95)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '10px' }}
                />
                <Line type="monotone" dataKey="waste" stroke="#f43f5e" strokeWidth={3} dot={{ stroke: '#f43f5e', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. Optimization Success Ratios (Pie Chart) */}
        <div className="glass-panel rounded-2xl p-6 flex flex-col gap-4">
          <div>
            <h4 className="font-bold text-sm text-primaryText">Nesting Dispatch Outcome Ratio</h4>
            <p className="text-[10px] text-gray-500">Historical performance outcomes across runs</p>
          </div>
          <div className="h-64 w-full flex items-center justify-center text-xs">
            <ResponsiveContainer width="70%" height="100%">
              <PieChart>
                <Pie 
                  data={successPieData} 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={60} 
                  outerRadius={80} 
                  paddingAngle={5} 
                  dataKey="value"
                >
                  {successPieData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Pie Labels */}
            <div className="flex flex-col gap-2 shrink-0">
              {successPieData.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-[10px] text-mutedText font-semibold">{d.name} ({d.value}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Fabric Density Heatmap Preview */}
      <div className="glass-panel rounded-2xl p-6 flex flex-col gap-6">
        <div>
          <h4 className="font-bold text-sm text-primaryText">Planar Utilization Density Heatmap</h4>
          <p className="text-[10px] text-gray-500">Visual mapping of fabric density distribution across the cutting roll coordinates (0,0 to width,height).</p>
        </div>

        <div className="flex flex-col gap-1 w-full bg-background/40 p-4 rounded-xl border border-themeBorder overflow-x-auto">
          <div className="flex flex-col gap-1.5 min-w-[500px]">
            {Array.from({ length: heatmapRows }).map((_, rIdx) => (
              <div key={rIdx} className="flex gap-1.5 justify-between">
                {heatmapGrid.filter(cell => cell.row === rIdx).map((cell, cIdx) => (
                  <div 
                    key={cIdx}
                    className={`flex-1 h-8 rounded transition-all duration-300 ${getHeatmapColor(cell.val)}`}
                    title={`Density: ${Math.round(cell.val * 100)}%`}
                  />
                ))}
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center text-[9px] text-gray-500 mt-3 pt-2 border-t border-themeBorder">
            <span>Bottom Left (High Compaction)</span>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded bg-white/5" /> Low (0-20%)
              <span className="h-2.5 w-2.5 rounded bg-purpleAccent/40" /> Mid (40-60%)
              <span className="h-2.5 w-2.5 rounded bg-cyanAccent/70" /> High (80-99%)
            </div>
            <span>Top Right (Margins)</span>
          </div>
        </div>
      </div>

    </div>
  );
}
