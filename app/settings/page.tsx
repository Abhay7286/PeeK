"use client";

import React, { useState, useEffect } from 'react';
import { getAllApiModels, getAvailableGroqModels, updateModelName, ApiModel, GroqModel } from '../api/main/models';

const ApiModelSettings = () => {
  const [currentModels, setCurrentModels] = useState<ApiModel[]>([]);
  const [availableModels, setAvailableModels] = useState<GroqModel[]>([]);
  const [draggedModel, setDraggedModel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [applyingToAll, setApplyingToAll] = useState(false);
  const [selectedModelForAll, setSelectedModelForAll] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [current, available] = await Promise.all([
        getAllApiModels(),
        getAvailableGroqModels()
      ]);
      setCurrentModels(current);
      setAvailableModels(available);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyToAll = async () => {
    if (!selectedModelForAll || currentModels.length === 0) return;

    setApplyingToAll(true);
    try {
      const updatePromises = currentModels.map(model => 
        updateModelName(model.api_name, selectedModelForAll)
      );
      
      await Promise.all(updatePromises);
      await loadData(); // Refresh data
      setSelectedModelForAll(null);
    } catch (error) {
      console.error('Error applying model to all APIs:', error);
    } finally {
      setApplyingToAll(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, modelId: string) => {
    setDraggedModel(modelId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, apiName: string) => {
    e.preventDefault();
    if (!draggedModel) return;

    setUpdating(apiName);
    try {
      const result = await updateModelName(apiName, draggedModel);
      if (result.success) {
        await loadData(); // Refresh data
      } else {
        console.error('Update failed:', result.message);
      }
    } catch (error) {
      console.error('Error updating model:', error);
    } finally {
      setUpdating(null);
      setDraggedModel(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl font-light mb-2">API Model Settings</h1>
          <p className="text-gray-400">Manage your API model configurations</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Current API Models */}
          <div className="space-y-6">
            <h2 className="text-xl font-light mb-6">Current API Models</h2>
            {currentModels.length === 0 ? (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6 text-center text-gray-400">
                No API models configured
              </div>
            ) : (
              currentModels.map((model) => (
                <div
                  key={model.api_name}
                  className={`bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6 transition-all duration-200 hover:bg-white/10 ${
                    updating === model.api_name ? 'animate-pulse' : ''
                  }`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, model.api_name)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-white">{model.api_name}</h3>
                      <p className="text-sm text-gray-400 mt-1">API Configuration</p>
                    </div>
                    {updating === model.api_name && (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    )}
                  </div>
                  
                  <div className="bg-white/5 rounded-md p-4 border border-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Current Model:</span>
                      <span className="text-white font-mono text-sm">{model.model_name}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 text-xs text-gray-500">
                    Drop a model here to update
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Available Groq Models */}
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-light">Available Groq Models</h2>
            </div>

            {/* Apply to All Section */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-light mb-4">Apply to All APIs</h3>
              <div className="space-y-4">
                <select
                  value={selectedModelForAll || ''}
                  onChange={(e) => setSelectedModelForAll(e.target.value || null)}
                  className="w-full bg-white/5 border border-white/10 rounded-md p-3 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-white/20"
                >
                  <option value="">Select a model</option>
                  {availableModels.map((model) => (
                    <option key={model.id} value={model.id} className="bg-black">
                      {model.id}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleApplyToAll}
                  disabled={!selectedModelForAll || applyingToAll || currentModels.length === 0}
                  className="w-full bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:text-gray-500 text-white py-3 px-4 rounded-md transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  {applyingToAll ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Applying...</span>
                    </>
                  ) : (
                    <span>Apply to All APIs</span>
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {availableModels.map((model) => (
                <div
                  key={model.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, model.id)}
                  className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4 cursor-move hover:bg-white/10 transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white font-mono text-sm">{model.id}</h4>
                      <p className="text-xs text-gray-400 mt-1">Drag to API to update</p>
                    </div>
                    <div className="text-gray-400">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6L6 10l4 4 1.5-1.5L9 10l2.5-2.5L10 6z"/>
                        <path d="M10 6L14 10l-4 4-1.5-1.5L11 10l-2.5-2.5L10 6z"/>
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-12 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6">
          <h3 className="text-lg font-light mb-3">How to use</h3>
          <ul className="text-sm text-gray-400 space-y-2">
            <li>• Drag any available Groq model from the right panel</li>
            <li>• Drop it onto any API configuration on the left to update the model</li>
            <li>• Use &quot;Apply to All&quot; to set the same model for all API configurations</li>
            <li>• Changes are applied immediately and saved to your database</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ApiModelSettings;