"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { createClient } from "@supabase/supabase-js";
import { X, LogOut, History, User, Settings } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface UserProfile {
  id: string;
  email?: string;
  user_metadata?: {
    name?: string;
    avatar_url?: string;
  };
}

interface SideHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onSignOut: () => void;
}

interface SavedSearch {
  id: number;
  query: string;
  created_at: string;
  html_url: string;
}

export const SideHistory: React.FC<SideHistoryProps> = ({ 
  isOpen, 
  onClose, 
  user, 
  onSignOut 
}) => {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [scrollTop, setScrollTop] = useState(0);

  // Track scroll position to position the sidebar
  useEffect(() => {
    const updateScrollPosition = () => {
      setScrollTop(window.pageYOffset || document.documentElement.scrollTop);
    };

    updateScrollPosition();
    window.addEventListener('scroll', updateScrollPosition);
    return () => window.removeEventListener('scroll', updateScrollPosition);
  }, []);

  const fetchSavedSearches = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('search_history')
        .select('id, query, created_at, html_url')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedSearches(data || []);
    } catch (error) {
      console.error('Error fetching saved searches:', error);
    }
  }, [user.id]);

  useEffect(() => {
    if (user && isOpen) {
      fetchSavedSearches();
    }
  }, [user, isOpen, fetchSavedSearches]);

  const openSnapshot = (url: string) => {
    if (url) {
      window.open(`/snapshot?url=${encodeURIComponent(url)}`, '_blank');
    }
  };

  const deleteSearch = async (searchId: number) => {
    try {
      const { error } = await supabase
        .from('search_history')
        .delete()
        .eq('id', searchId);

      if (error) throw error;
      setSavedSearches(prev => prev.filter(search => search.id !== searchId));
    } catch (error) {
      console.error('Error deleting search:', error);
    }
  };

  const goToSettings = () => {
    window.location.href = '/settings';
  };

  return (
    <div 
      className={`absolute left-0 w-80 h-screen bg-black/90 backdrop-blur-md z-40 transform transition-transform duration-300 flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      style={{ 
        top: `${scrollTop}px`
      }}
    >
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex justify-between items-center flex-shrink-0">
        <div className="flex items-center text-white">
          <History size={20} className="mr-2" />
          <span className="font-medium">History</span>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={goToSettings}
            className="text-white/60 hover:text-white transition-colors"
            title="Settings"
          >
            <Settings size={20} />
          </button>
          <button 
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        {savedSearches.length === 0 ? (
          <p className="text-white/40 text-center py-8 text-sm">No saved searches</p>
        ) : (
          <div className="space-y-2">
            {savedSearches.map((search) => (
              <div 
                key={search.id}
                className="group bg-white/5 hover:bg-white/10 p-3 rounded-lg transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div 
                    onClick={() => openSnapshot(search.html_url)}
                    className="flex-1 cursor-pointer"
                  >
                    <p className="text-white text-sm font-medium truncate hover:text-blue-300 transition-colors">
                      {search.query}
                    </p>
                    <p className="text-white/40 text-xs mt-1">
                      {new Date(search.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button 
                    onClick={() => deleteSearch(search.id)}
                    className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-red-400 transition-all ml-2"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/5 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="relative">
              {user.user_metadata?.avatar_url ? (
                <Image 
                  src={user.user_metadata.avatar_url} 
                  alt="Profile" 
                  width={36} 
                  height={36} 
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-white/10"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center ring-2 ring-white/10">
                  <User size={18} className="text-white" />
                </div>
              )}
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full ring-2 ring-black/90"></div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {user.user_metadata?.name || user.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-white/40 text-xs truncate">
                {user.email}
              </p>
            </div>
          </div>
        </div>
        <button 
          onClick={onSignOut}
          className="w-full bg-white/5 hover:bg-red-500/20 hover:border-red-500/30 border border-white/10 text-white p-2.5 rounded-lg flex items-center justify-center transition-all text-sm group"
        >
          <LogOut size={16} className="mr-2 group-hover:text-red-400 transition-colors" />
          <span className="group-hover:text-red-400 transition-colors">Sign Out</span>
        </button>
      </div>
    </div>
  );
};