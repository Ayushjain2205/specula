"use client"

import React, { useState } from 'react';
import { History, BarChart3, TrendingUp, TrendingDown, Clock, Trophy, Target, Zap, Shield, Code, Globe, Bitcoin, Activity, Users, Database } from 'lucide-react';

export const StatsContainer = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black font-mono">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-black border-2 border-purple-500 mb-8">
          <div className="bg-purple-500/20 border-b border-purple-500/50 p-4">
            <div className="flex items-center space-x-3">
              <BarChart3 className="w-6 h-6 text-purple-500" />
              <h1 className="text-2xl font-bold text-purple-500 tracking-wider">SYSTEM STATISTICS</h1>
            </div>
            <p className="text-gray-400 text-sm mt-1">Real-time network and user analytics</p>
          </div>
        </div>

        {/* Global Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-black border-2 border-cyan-500/50 p-6">
            <div className="text-center">
              <Users className="w-10 h-10 text-cyan-500 mx-auto mb-3" />
              <div className="text-3xl font-bold text-cyan-500">2,847</div>
              <div className="text-gray-400 text-sm">ACTIVE USERS</div>
            </div>
          </div>
          <div className="bg-black border-2 border-green-500/50 p-6">
            <div className="text-center">
              <Database className="w-10 h-10 text-green-500 mx-auto mb-3" />
              <div className="text-3xl font-bold text-green-500">127.4K</div>
              <div className="text-gray-400 text-sm">TOTAL VOLUME</div>
            </div>
          </div>
          <div className="bg-black border-2 border-yellow-500/50 p-6">
            <div className="text-center">
              <Trophy className="w-10 h-10 text-yellow-500 mx-auto mb-3" />
              <div className="text-3xl font-bold text-yellow-500">89,247</div>
              <div className="text-gray-400 text-sm">PREDICTIONS</div>
            </div>
          </div>
          <div className="bg-black border-2 border-red-500/50 p-6">
            <div className="text-center">
              <Activity className="w-10 h-10 text-red-500 mx-auto mb-3" />
              <div className="text-3xl font-bold text-red-500">99.97%</div>
              <div className="text-gray-400 text-sm">UPTIME</div>
            </div>
          </div>
        </div>

        {/* Detailed Stats Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Market Stats */}
          <div className="bg-black border-2 border-blue-500/50">
            <div className="bg-blue-500/20 border-b border-blue-500/50 p-4">
              <h3 className="text-blue-300 font-bold tracking-wider">MARKET DATA</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">24H VOLUME:</span>
                <span className="text-white font-bold">8,743.2 MAS</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">ACTIVE ROUNDS:</span>
                <span className="text-cyan-500 font-bold">12</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">AVG BET SIZE:</span>
                <span className="text-white font-bold">42.7 MAS</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">LARGEST BET:</span>
                <span className="text-yellow-500 font-bold">2,500 MAS</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">WIN/LOSS RATIO:</span>
                <span className="text-green-500 font-bold">52.3% / 47.7%</span>
              </div>
            </div>
          </div>

          {/* Network Stats */}
          <div className="bg-black border-2 border-orange-500/50">
            <div className="bg-orange-500/20 border-b border-orange-500/50 p-4">
              <h3 className="text-orange-300 font-bold tracking-wider">NETWORK STATUS</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">BLOCK HEIGHT:</span>
                <span className="text-white font-bold">2,847,293</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">GAS PRICE:</span>
                <span className="text-cyan-500 font-bold">0.01 MAS</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">TRANSACTIONS:</span>
                <span className="text-white font-bold">127,483</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">VALIDATORS:</span>
                <span className="text-purple-500 font-bold">847</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">NETWORK TPS:</span>
                <span className="text-green-500 font-bold">10,000+</span>
              </div>
            </div>
          </div>
        </div>

        {/* Price Chart Placeholder */}
        <div className="bg-black border-2 border-green-500/50 mt-8">
          <div className="bg-green-500/20 border-b border-green-500/50 p-4">
            <h3 className="text-green-300 font-bold tracking-wider">BTC PRICE CHART (24H)</h3>
          </div>
          <div className="p-8 h-64 flex items-center justify-center">
            <div className="text-center">
              <Activity className="w-16 h-16 text-green-500/50 mx-auto mb-4" />
              <p className="text-gray-400">Price chart visualization will be implemented here</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};