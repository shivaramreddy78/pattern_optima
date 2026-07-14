"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  Trash2, 
  ExternalLink, 
  Copy, 
  Calendar,
  X,
  Sparkles,
  Info,
  FileCheck,
  Download
} from 'lucide-react';

interface Job {
  id: number;
  name: string;
  fabric_width: number;
  fabric_height?: number;
  status: string;
  utilization_percentage?: number;
  waste_percentage?: number;
  saved_area: number;
  saved_money: number;
  algorithm_used: string;
  created_at: string;
}

interface HistoryTabProps {
  jobs: Job[];
  onDeleteJob: (id: number) => void;
  onDuplicateJob: (job: Job) => void;
  addToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export default function HistoryTab({
  jobs,
  onDeleteJob,
  onDuplicateJob,
  addToast
}: HistoryTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAlgo, setFilterAlgo] = useState('all');
  const [filterUtil, setFilterUtil] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // Sorting Handler
  const getSortedJobs = (list: Job[]) => {
    return [...list].sort((a, b) => {
      if (sortBy === 'date_desc') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === 'date_asc') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortBy === 'util_desc') {
        return (b.utilization_percentage || 0) - (a.utilization_percentage || 0);
      }
      if (sortBy === 'util_asc') {
        return (a.utilization_percentage || 0) - (b.utilization_percentage || 0);
      }
      if (sortBy === 'money_desc') {
        return b.saved_money - a.saved_money;
      }
      return 0;
    });
  };

  // Filter Handler
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          job.id.toString().includes(searchQuery);
    
    const matchesAlgo = filterAlgo === 'all' || 
                        job.algorithm_used.toLowerCase().includes(filterAlgo.toLowerCase());
                        
    const util = job.utilization_percentage || 0;
    const matchesUtil = filterUtil === 'all' || 
                        (filterUtil === 'high' && util >= 92) ||
                        (filterUtil === 'mid' && util >= 85 && util < 92) ||
                        (filterUtil === 'low' && util < 85);

    return matchesSearch && matchesAlgo && matchesUtil;
  });

  const sortedAndFilteredJobs = getSortedJobs(filteredJobs);

  const handleDuplicate = (job: Job) => {
    onDuplicateJob(job);
    addToast(`Nesting settings for "${job.name}" duplicated to Sandbox`, "success");
  };

  const handleDelete = (id: number, name: string) => {
    onDeleteJob(id);
    addToast(`Successfully deleted history log for "${name}"`, "warning");
    if (selectedJob?.id === id) {
      setSelectedJob(null);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 relative">
      
      {/* Search and Filters panel */}
      <div className="glass-panel rounded-2xl p-5 flex flex-col xl:flex-row gap-4 items-center justify-between z-10">
        {/* Search bar */}
        <div className="relative w-full xl:w-80">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search by job name or Ref ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-background border border-themeBorder hover:border-themeBorder focus:border-electric rounded-xl py-2.5 pl-10 pr-4 text-primaryText text-xs outline-none transition-colors"
          />
        </div>

        {/* Filter selectors */}
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto text-xs">
          
          {/* Algo Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-gray-500" />
            <select
              value={filterAlgo}
              onChange={(e) => setFilterAlgo(e.target.value)}
              className="bg-background border border-themeBorder rounded-lg p-2 text-primaryText outline-none"
            >
              <option value="all">All Algorithms</option>
              <option value="skyline">Skyline Pack</option>
              <option value="guillotine">Guillotine Shear</option>
              <option value="shelf">Shelf Stack</option>
            </select>
          </div>

          {/* Util Filter */}
          <select
            value={filterUtil}
            onChange={(e) => setFilterUtil(e.target.value)}
            className="bg-background border border-themeBorder rounded-lg p-2 text-primaryText outline-none"
          >
            <option value="all">All Utilization Ranges</option>
            <option value="high">High Yield (92%+)</option>
            <option value="mid">Mid Yield (85%-92%)</option>
            <option value="low">Low Yield (&lt;85%)</option>
          </select>

          {/* Sort selector */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-3.5 w-3.5 text-gray-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-background border border-themeBorder rounded-lg p-2 text-primaryText outline-none font-bold"
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="util_desc">Highest Yield</option>
              <option value="util_asc">Lowest Yield</option>
              <option value="money_desc">Most Savings ($)</option>
            </select>
          </div>

        </div>
      </div>

      {/* Main Table logs list */}
      <div className="glass-panel rounded-2xl p-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-themeBorder text-gray-500 font-semibold">
                <th className="py-3.5 px-4">Job Details</th>
                <th className="py-3.5 px-4">Constraints</th>
                <th className="py-3.5 px-4">Algorithm</th>
                <th className="py-3.5 px-4 text-center">Yield</th>
                <th className="py-3.5 px-4 text-right">Saved Area</th>
                <th className="py-3.5 px-4 text-right">Saved Money</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-white/5">
              <AnimatePresence mode="popLayout">
                {sortedAndFilteredJobs.length === 0 ? (
                  <motion.tr 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <td colSpan={7} className="py-12 text-center text-gray-500 font-semibold">
                      No matching historical logs found. Try adjusting filters or run a new optimization.
                    </td>
                  </motion.tr>
                ) : (
                  sortedAndFilteredJobs.map((job) => (
                    <motion.tr
                      key={job.id}
                      layoutId={`job-row-${job.id}`}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="hover:bg-white/5 transition-colors group"
                    >
                      {/* Name & ID */}
                      <td className="py-4 px-4 font-semibold text-primaryText">
                        <div className="flex flex-col gap-0.5">
                          <span className="truncate max-w-[180px]">{job.name}</span>
                          <span className="text-[9px] text-gray-500 font-medium flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Ref #{job.id} • {new Date(job.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      
                      {/* Constraints */}
                      <td className="py-4 px-4 text-secondaryText">
                        {job.fabric_width}cm × {job.fabric_height ? `${Math.round(job.fabric_height)}cm` : 'Continuous'}
                      </td>

                      {/* Algo name */}
                      <td className="py-4 px-4 text-mutedText font-medium">
                        {job.algorithm_used.split(' + ')[0]}
                      </td>

                      {/* Yield */}
                      <td className="py-4 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-md font-bold font-mono ${
                          (job.utilization_percentage || 0) >= 92 
                            ? 'bg-emerald-500/10 text-emerald-400' 
                            : (job.utilization_percentage || 0) >= 85 
                              ? 'bg-cyan-500/10 text-cyanAccent' 
                              : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {job.utilization_percentage}%
                        </span>
                      </td>

                      {/* Saved Area */}
                      <td className="py-4 px-4 text-right text-secondaryText font-bold font-mono">
                        {job.saved_area} m²
                      </td>

                      {/* Saved Money */}
                      <td className="py-4 px-4 text-right font-bold text-cyanAccent font-mono">
                        +${job.saved_money}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedJob(job)}
                            className="h-7 w-7 rounded bg-white/5 border border-themeBorder hover:bg-cyanAccent/10 hover:border-cyanAccent/20 flex items-center justify-center text-mutedText hover:text-cyanAccent transition-all"
                            title="Open Report Overview"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDuplicate(job)}
                            className="h-7 w-7 rounded bg-white/5 border border-themeBorder hover:bg-purpleAccent/10 hover:border-purpleAccent/20 flex items-center justify-center text-mutedText hover:text-purpleAccent transition-all"
                            title="Load layout in Sandbox"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(job.id, job.name)}
                            className="h-7 w-7 rounded bg-white/5 border border-themeBorder hover:bg-rose-500/10 hover:border-rose-500/20 flex items-center justify-center text-gray-500 hover:text-rose-400 transition-all"
                            title="Delete log"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAILED REPORT VIEW MODAL OVERLAY */}
      <AnimatePresence>
        {selectedJob && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-background/70 backdrop-blur-md">
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="glass-panel w-full max-w-lg rounded-3xl p-6 flex flex-col gap-6 relative shadow-2xl border-themeBorder"
            >
              {/* Close Button */}
              <button 
                onClick={() => setSelectedJob(null)}
                className="absolute top-4 right-4 text-mutedText hover:text-primaryText transition-colors"
              >
                <X className="h-4.5 w-4.5" />
              </button>

              {/* Title */}
              <div className="flex flex-col gap-1 border-b border-themeBorder pb-4">
                <span className="text-[10px] text-cyanAccent font-bold uppercase tracking-wider">Report Ref #{selectedJob.id}</span>
                <h3 className="font-extrabold text-base text-primaryText">{selectedJob.name}</h3>
                <span className="text-[10px] text-gray-500">{new Date(selectedJob.created_at).toLocaleString()}</span>
              </div>

              {/* Metric stats columns */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-white/5 rounded-xl border border-themeBorder flex flex-col gap-0.5">
                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Fabric Yield</span>
                  <span className="text-base font-black text-emerald-400 font-sans">{selectedJob.utilization_percentage}%</span>
                </div>
                <div className="p-3 bg-white/5 rounded-xl border border-themeBorder flex flex-col gap-0.5">
                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Waste Percentage</span>
                  <span className="text-base font-black text-rose-400 font-sans">{selectedJob.waste_percentage}%</span>
                </div>
                <div className="p-3 bg-white/5 rounded-xl border border-themeBorder flex flex-col gap-0.5">
                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Fabric Saved</span>
                  <span className="text-base font-black text-cyanAccent font-sans">{selectedJob.saved_area} m²</span>
                </div>
                <div className="p-3 bg-white/5 rounded-xl border border-themeBorder flex flex-col gap-0.5">
                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Estimated Revenue Saved</span>
                  <span className="text-base font-black text-purpleAccent font-sans">${selectedJob.saved_money}</span>
                </div>
              </div>

              {/* Specs and info */}
              <div className="bg-background/60 p-4 rounded-xl border border-themeBorder text-[11px] flex flex-col gap-2.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Roll Width constraint:</span>
                  <span className="text-primaryText font-semibold">{selectedJob.fabric_width} cm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Nesting Roll length:</span>
                  <span className="text-primaryText font-semibold">{selectedJob.fabric_height ? `${selectedJob.fabric_height} cm` : 'Variable'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Core Pack Heuristic:</span>
                  <span className="text-primaryText font-semibold">{selectedJob.algorithm_used}</span>
                </div>
              </div>

              {/* Download Report Actions */}
              <div className="flex flex-col gap-2 border-t border-themeBorder pt-4">
                <span className="text-[9px] text-cyanAccent font-bold uppercase tracking-wider mb-1">Export Layout Audit Outputs</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { format: 'pdf', label: 'PDF Report', color: 'bg-rose-500/10 border-rose-500/20 text-rose-400' },
                    { format: 'svg', label: 'SVG CAD File', color: 'bg-cyanAccent/10 border-cyanAccent/20 text-cyanAccent' },
                    { format: 'png', label: 'PNG Preview', color: 'bg-purple-500/10 border-purple-500/20 text-purpleAccent' },
                    { format: 'csv', label: 'CSV Statistics', color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' }
                  ].map(btn => (
                    <button
                      key={btn.format}
                      onClick={() => {
                        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
                        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
                        const url = `${apiBase}/nesting/jobs/${selectedJob.id}/download/${btn.format}?token=${token}`;
                        window.open(url, '_blank');
                        addToast(`Exported ${btn.format.toUpperCase()} report download successfully!`, 'success');
                      }}
                      className={`py-2 px-3 border rounded-xl flex items-center justify-center gap-2 font-bold text-[10px] transition-all hover:scale-[1.02] active:scale-[0.98] ${btn.color}`}
                    >
                      <Download className="h-3.5 w-3.5" />
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3 mt-1 border-t border-themeBorder pt-4">
                <button
                  onClick={() => handleDuplicate(selectedJob)}
                  className="px-4 py-2 bg-purpleAccent/25 hover:bg-purpleAccent/35 text-purple-200 border border-purple-500/20 font-bold rounded-lg text-[10px] transition-all flex items-center gap-1"
                >
                  <Copy className="h-3.5 w-3.5" /> Duplicate Job
                </button>
                <button
                  onClick={() => setSelectedJob(null)}
                  className="px-4 py-2 bg-white/5 border border-themeBorder hover:bg-white/10 rounded-lg text-[10px] font-bold text-secondaryText transition-colors"
                >
                  Close
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
