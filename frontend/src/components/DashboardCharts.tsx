"use client";

import React, { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  Legend
} from 'recharts';

interface ChartProps {
  utilizationData: Array<{ date: string; utilization: number }>;
  algorithmData: Array<{ name: string; count: number }>;
}

export default function DashboardCharts({ utilizationData, algorithmData }: ChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-64 w-full bg-secondaryBg/20 rounded-xl animate-pulse" />;
  }

  // Custom tooltips to match dark/glassmorphic theme
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 border border-themeBorder p-3 rounded-lg backdrop-blur-md shadow-xl text-xs text-secondaryText">
          <p className="font-semibold text-primaryText mb-1">{label}</p>
          <p className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-cyanAccent" />
            Utilization: <span className="text-primaryText font-bold">{payload[0].value}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 border border-themeBorder p-3 rounded-lg backdrop-blur-md shadow-xl text-xs text-secondaryText">
          <p className="font-semibold text-primaryText mb-1">{label}</p>
          <p className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-purpleAccent" />
            Jobs: <span className="text-primaryText font-bold">{payload[0].value} runs</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const barColors = ['#3b82f6', '#a855f7', '#06b6d4', '#ec4899'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
      {/* 1. Utilization Trend Chart (Line / Area) */}
      <div className="lg:col-span-2 glass-panel rounded-2xl p-6 flex flex-col gap-4">
        <div>
          <h4 className="font-semibold text-base text-primaryText">Fabric Utilization Progression</h4>
          <p className="text-xs text-mutedText">Average historical yield efficiency (%) over recent jobs</p>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={utilizationData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorUtil" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="rgba(255,255,255,0.3)" 
                fontSize={10} 
                tickLine={false}
              />
              <YAxis 
                stroke="rgba(255,255,255,0.3)" 
                fontSize={10} 
                tickLine={false} 
                domain={[70, 100]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="utilization" 
                stroke="#06b6d4" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorUtil)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Algorithm Popularity (Bar Chart) */}
      <div className="glass-panel rounded-2xl p-6 flex flex-col gap-4">
        <div>
          <h4 className="font-semibold text-base text-primaryText">Algorithm Popularity</h4>
          <p className="text-xs text-mutedText">Total runs dispatched by packing algorithm type</p>
        </div>
        <div className="h-64 w-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={algorithmData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="rgba(255,255,255,0.3)" 
                fontSize={9} 
                tickLine={false}
              />
              <YAxis 
                stroke="rgba(255,255,255,0.3)" 
                fontSize={10} 
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomBarTooltip />} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {algorithmData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
