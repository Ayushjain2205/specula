"use client"

import React, { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Clock, CheckCircle, Timer, Loader2 } from 'lucide-react';
import { MarketData } from '@/hooks/useRound';
import Link from 'next/link';

interface MarketCardProps {
  market: MarketData;
  isFeatured?: boolean;
  onQuickBet?: (marketId: number, isYes: boolean, amount: string) => Promise<void> | void;
}

const MarketCard: React.FC<MarketCardProps> = ({ market, isFeatured = false, onQuickBet }) => {
  const [showQuickBet, setShowQuickBet] = useState(false);
  const [betAmount, setBetAmount] = useState('10');
  const [selectedSide, setSelectedSide] = useState<'yes' | 'no' | null>(null);
  const [isBetting, setIsBetting] = useState(false);

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return 'Ended';
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${mins}m`;
    } else if (mins > 0) {
      return `${mins}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const calculateOdds = (direction: 'yes' | 'no') => {
    const totalPool = market.totalYesBets + market.totalNoBets;
    if (totalPool === 0) return 1.5;

    const sidePool = direction === 'yes' ? market.totalYesBets : market.totalNoBets;
    const probability = sidePool / totalPool;
    const fairOdds = 1.0 / probability;
    const houseOdds = fairOdds * 0.95;
    const clampedOdds = Math.max(1.1, Math.min(5.0, houseOdds));
    
    return clampedOdds;
  };

  const yesOdds = calculateOdds('yes');
  const noOdds = calculateOdds('no');
  const totalPool = market.totalPool;
  const yesPercentage = totalPool > 0 ? (market.totalYesBets / totalPool * 100) : 50;
  const noPercentage = totalPool > 0 ? (market.totalNoBets / totalPool * 100) : 50;

  const bettingTimeRemaining = Math.floor(market.bettingTimeRemaining / 1000);
  const settlementTimeRemaining = Math.floor(market.timeRemaining / 1000);

  const getStatus = () => {
    if (!market.isActive) {
      return { label: 'SETTLED', color: 'bg-gray-400', canBet: false };
    }
    if (bettingTimeRemaining > 0) {
      return { label: 'BETTING OPEN', color: 'bg-green-400', canBet: true };
    }
    if (settlementTimeRemaining > 0) {
      return { label: 'COOLDOWN', color: 'bg-orange-400', canBet: false };
    }
    return { label: 'SETTLING', color: 'bg-red-400', canBet: false };
  };

  const status = getStatus();

  const handleQuickBet = async () => {
    if (selectedSide && onQuickBet) {
      try {
        setIsBetting(true);
        await onQuickBet(market.marketId, selectedSide === 'yes', betAmount);
        setShowQuickBet(false);
        setSelectedSide(null);
        setBetAmount('10');
      } catch (error) {
        console.error("Bet failed", error);
      } finally {
        setIsBetting(false);
      }
    }
  };

  return (
    <div className={`bg-white border-4 border-black shadow-[8px_8px_0px_#000] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[10px_10px_0px_#000] ${isFeatured ? 'p-6' : 'p-4'}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 pr-4">
          <div className="flex items-center space-x-2 mb-2">
            <span className={`text-xs font-black ${status.color} text-black px-2 py-1 border-2 border-black`}>
              {status.label}
            </span>
          </div>
          <h3 className={`font-black uppercase tracking-tight ${isFeatured ? 'text-xl' : 'text-base'} line-clamp-2`}>
            {market.description}
          </h3>
        </div>
        
        {/* Time Remaining - Top Right */}
        {market.isActive && (
          <div className="flex items-center space-x-1 bg-gray-100 border-2 border-black px-2 py-1 shrink-0">
            <Clock className="w-3 h-3" />
            <span className="text-xs font-bold">
              {bettingTimeRemaining > 0 
                ? formatTime(bettingTimeRemaining)
                : formatTime(settlementTimeRemaining)
              }
            </span>
          </div>
        )}
      </div>



      {/* Settlement Result */}
      {market.isSettled && (
        <div className="flex items-center space-x-2 mb-4 bg-gray-100 border-2 border-black p-2">
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm font-bold">
            Result: {market.yesWins ? 'YES WINS' : 'NO WINS'} • Final: {market.finalValue.toLocaleString()}
          </span>
        </div>
      )}

      {/* Pool Distribution */}
      <div className="mb-4">
        <div className="flex justify-between text-xs font-bold mb-2">
          <span>POOL DISTRIBUTION</span>
          <span>{totalPool.toFixed(2)} MAS</span>
        </div>
        <div className="h-6 flex border-2 border-black overflow-hidden">
          <div 
            className="bg-green-400 flex items-center justify-center text-xs font-black"
            style={{ width: `${yesPercentage}%` }}
          >
            {yesPercentage > 15 && `${yesPercentage.toFixed(0)}%`}
          </div>
          <div 
            className="bg-red-400 flex items-center justify-center text-xs font-black"
            style={{ width: `${noPercentage}%` }}
          >
            {noPercentage > 15 && `${noPercentage.toFixed(0)}%`}
          </div>
        </div>
        <div className="flex justify-between text-xs font-bold mt-1 text-gray-600">
          <span>YES: {market.totalYesBets.toFixed(2)} MAS</span>
          <span>NO: {market.totalNoBets.toFixed(2)} MAS</span>
        </div>
      </div>

      {/* Odds Display & Quick Bet Trigger */ }
      {!showQuickBet ? (
        <>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-green-50 border-2 border-black p-2">
              <div className="flex items-center space-x-1 mb-1">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-xs font-black uppercase">YES</span>
              </div>
              <div className="text-lg font-black">{yesOdds.toFixed(2)}x</div>
            </div>
            <div className="bg-red-50 border-2 border-black p-2">
              <div className="flex items-center space-x-1 mb-1">
                <TrendingDown className="w-4 h-4 text-red-600" />
                <span className="text-xs font-black uppercase">NO</span>
              </div>
              <div className="text-lg font-black">{noOdds.toFixed(2)}x</div>
            </div>
          </div>

          {status.canBet && (
            <button
              onClick={() => setShowQuickBet(true)}
              className="w-full bg-yellow-300 border-2 border-black py-2 font-black uppercase text-sm hover:bg-yellow-400 transition-colors"
            >
              Quick Bet
            </button>
          )}
        </>
      ) : (
        /* Quick Bet Interface */
        <div className="space-y-2 mb-1">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSelectedSide('yes')}
              className={`border-2 border-black py-2 font-bold text-sm transition-colors flex flex-col items-center ${
                selectedSide === 'yes' ? 'bg-green-400' : 'bg-white hover:bg-green-50'
              }`}
            >
              <span>YES</span>
              <span className="text-xs">{yesOdds.toFixed(2)}x</span>
            </button>
            <button
              onClick={() => setSelectedSide('no')}
              className={`border-2 border-black py-2 font-bold text-sm transition-colors flex flex-col items-center ${
                selectedSide === 'no' ? 'bg-red-400' : 'bg-white hover:bg-red-50'
              }`}
            >
              <span>NO</span>
              <span className="text-xs">{noOdds.toFixed(2)}x</span>
            </button>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                className="w-full border-2 border-black p-2 pr-12 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                placeholder="AMT"
                min="1"
                disabled={isBetting}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-gray-500 pointer-events-none">
                MAS
              </span>
            </div>
            <button
              onClick={handleQuickBet}
              disabled={!selectedSide || isBetting}
              className="w-24 bg-yellow-300 border-2 border-black py-2 font-black uppercase text-sm hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isBetting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'BET'
              )}
            </button>
            <button
              onClick={() => {
                setShowQuickBet(false);
                setSelectedSide(null);
              }}
              disabled={isBetting}
              className="px-3 bg-white border-2 border-black font-bold uppercase text-sm hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              X
            </button>
          </div>
        </div>
      )}



      {/* View Details Link for Settled Markets */}
      {!status.canBet && !market.isActive && (
        <Link 
          href={`/market/${market.marketId}`}
          className="block w-full bg-gray-200 border-2 border-black py-2 font-black uppercase text-sm text-center hover:bg-gray-300 transition-colors"
        >
          View Details
        </Link>
      )}
    </div>
  );
};

export default MarketCard;
