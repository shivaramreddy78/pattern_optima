"use client";

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Trash2, 
  Loader2, 
  FileCode,
  Image as ImageIcon,
  File as FileIcon,
  Search,
  Download,
  FolderOpen
} from 'lucide-react';
import { apiClient } from '@/lib/api';

interface UploadedFileMetadata {
  id: string;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  upload_date: string;
  status: string;
}

interface LibraryTabProps {
  addToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  onOpenPattern: (file: UploadedFileMetadata) => void;
}

export default function LibraryTab({ addToast, onOpenPattern }: LibraryTabProps) {
  const [uploads, setUploads] = useState<UploadedFileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Expose backend static files path for download
  const API_STATIC_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '/static/uploads') || 'http://localhost:8000/static/uploads';

  const fetchUploads = async () => {
    try {
      const res = await apiClient.get('/uploads/');
      setUploads(res.data);
    } catch (err) {
      console.error('Failed to load library catalog', err);
      addToast('Could not sync library catalog.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUploads();
  }, []);

  const handleDeleteFile = async (id: string, name: string) => {
    try {
      await apiClient.delete(`/uploads/${id}`);
      addToast(`Deleted pattern file ${name}`, 'info');
      setUploads(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      addToast('Could not delete pattern file.', 'error');
    }
  };

  const handleDownload = (filename: string) => {
    window.open(`${API_STATIC_URL}/${filename}`, '_blank');
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredUploads = uploads.filter(file => 
    file.original_filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full flex flex-col gap-6 text-xs text-left">
      {/* HEADER CONTROLS */}
      <div className="glass-panel p-4 rounded-3xl flex items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-mutedText" />
          <input 
            type="text"
            placeholder="Search pattern files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-secondaryBg/50 border border-themeBorder rounded-2xl pl-11 pr-4 py-3 text-sm text-primaryText placeholder-gray-500 focus:outline-none focus:border-cyanAccent/50 transition-all"
          />
        </div>
        <div className="text-mutedText font-medium px-4">
          {filteredUploads.length} {filteredUploads.length === 1 ? 'file' : 'files'}
        </div>
      </div>

      {/* LIBRARY LISTING */}
      <section className="glass-panel rounded-3xl p-6 flex flex-col gap-4 min-h-[500px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 h-full">
            <Loader2 className="h-8 w-8 text-cyanAccent animate-spin" />
            <span className="text-mutedText text-sm">Syncing pattern library...</span>
          </div>
        ) : uploads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4 h-full">
            <div className="h-16 w-16 bg-white/5 border border-themeBorder rounded-full flex items-center justify-center text-gray-500">
              <FileIcon className="h-8 w-8" />
            </div>
            <p className="text-mutedText font-semibold text-sm">Your pattern library is empty.<br/>Upload some files to get started.</p>
          </div>
        ) : filteredUploads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center h-full">
            <p className="text-mutedText font-semibold text-sm">No patterns found matching "{searchQuery}"</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-max">
            {filteredUploads.map(file => (
              <div 
                key={file.id} 
                className="group p-5 rounded-2xl border border-themeBorder bg-background/60 hover:bg-white/5 hover:border-cyanAccent/30 transition-all flex flex-col gap-4 text-left shadow-lg relative overflow-hidden"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-themeBorder flex items-center justify-center shrink-0 shadow-inner">
                    {file.file_type === 'dxf' ? (
                      <FileCode className="h-6 w-6 text-cyanAccent" />
                    ) : ['png', 'jpg', 'jpeg'].includes(file.file_type) ? (
                      <ImageIcon className="h-6 w-6 text-purpleAccent" />
                    ) : (
                      <FileText className="h-6 w-6 text-emerald-400" />
                    )}
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="font-bold text-primaryText text-sm truncate" title={file.original_filename}>
                      {file.original_filename}
                    </span>
                    <span className="text-xs text-gray-500 font-medium mt-0.5">
                      {formatBytes(file.file_size)} • {file.file_type.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-2 pt-4 border-t border-themeBorder">
                  <button 
                    onClick={() => onOpenPattern(file)}
                    className="flex flex-col items-center gap-1.5 py-2 rounded-xl hover:bg-cyanAccent/10 text-mutedText hover:text-cyanAccent transition-colors"
                  >
                    <FolderOpen className="h-4 w-4" />
                    <span className="text-[10px] font-bold">Open</span>
                  </button>
                  <button 
                    onClick={() => handleDownload(file.filename)}
                    className="flex flex-col items-center gap-1.5 py-2 rounded-xl hover:bg-white/10 text-mutedText hover:text-primaryText transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    <span className="text-[10px] font-bold">Download</span>
                  </button>
                  <button 
                    onClick={() => handleDeleteFile(file.id, file.original_filename)}
                    className="flex flex-col items-center gap-1.5 py-2 rounded-xl hover:bg-red-500/10 text-mutedText hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="text-[10px] font-bold">Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
