"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, Gift, Lock, Clock, CheckCircle, Activity } from 'lucide-react';
import { useMarket as useMarketHook } from '@/hooks/useRound';
import { useAccount } from '@/contexts/account';
import { useMarket, CONTRACT_ADDRESS } from '@/contexts/market';
import { MarketData } from '@/hooks/useRound';
import { SkeletonCard } from '../SkeletonCard';

// History Page Component
export const HistoryContainer = () => {
  const { provider } = useMarket();
  const { account, claimWinnings } = useAccount();
  const {
    currentMarket,
    marketHistory,
    fetchMarketDetails,
    getUserBet,
    isLoading
  } = useMarketHook(CONTRACT_ADDRESS, provider);

  const [filter, setFilter] = useState('mybets');
  const [allMarkets, setAllMarkets] = useState<MarketData[]>([]);
  const [userBetsMap, setUserBetsMap] = useState<{ [key: number]: any }>({});
  const [claiming, setClaiming] = useState<{ [key: number]: boolean }>({});
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [userStats, setUserStats] = useState({
    totalBets: 0,
    wins: 0,
    losses: 0,
    totalStaked: 0,
    totalWon: 0,
    netProfit: 0,
    winRate: 0
  });

  // Load all markets (active and settled)
  useEffect(() => {
    const loadAllMarkets = async () => {
      if (!currentMarket) return;

      setLoadingHistory(true);
      try {
        const markets: MarketData[] = [];
        
        // Add current market (whether active or settled)
        markets.push(currentMarket);
        
        // Add market history (both active and settled)
        if (marketHistory && marketHistory.length > 0) {
          markets.push(...marketHistory);
        }

        setAllMarkets(markets);
        setIsInitialLoad(false);
      } catch (err) {
        console.error('Error loading markets:', err);
        setIsInitialLoad(false);
      } finally {
        setLoadingHistory(false);
      }
    };

    if (currentMarket) {
      loadAllMarkets();
    }
  }, [currentMarket?.marketId, marketHistory]);

  // Load user bets if wallet connected
  useEffect(() => {
    const loadUserBets = async () => {
      if (!account || allMarkets.length === 0) return;

      try {
        const betsMap: { [key: number]: any } = {};

        for (const market of allMarkets) {
          const userBet = await getUserBet(market.marketId, account.address);
          if (userBet && userBet.totalBet > 0) {
            betsMap[market.marketId] = userBet;
          }
        }

        setUserBetsMap(betsMap);
        calculateUserStats(allMarkets, betsMap);
      } catch (err) {
        console.error('Error loading user bets:', err);
      }
    };

    if (account && allMarkets.length > 0) {
      loadUserBets();
    }
  }, [account, allMarkets.length, getUserBet]);

  // Calculate user statistics
  const calculateUserStats = (markets: MarketData[], betsMap: { [key: number]: any }) => {
    let totalBets = 0;
    let wins = 0;
    let losses = 0;
    let totalStaked = 0;
    let totalWon = 0;

    markets.forEach(market => {
      const userBet = betsMap[market.marketId];
      if (!userBet || userBet.totalBet === 0) return;

      const userWon = (market.yesWins && userBet.yesBets > 0) ||
        (!market.yesWins && userBet.noBets > 0);

      totalBets++;
      totalStaked += userBet.totalBet;

      if (userWon) {
        wins++;
        const payout = calculatePayout(market, userBet);
        totalWon += payout;
      } else {
        losses++;
      }
    });

    const netProfit = totalWon - totalStaked;
    const winRate = totalBets > 0 ? (wins / totalBets) * 100 : 0;

    setUserStats({
      totalBets,
      wins,
      losses,
      totalStaked,
      totalWon,
      netProfit,
      winRate
    });
  };

  // Calculate payout for a winning bet
  const calculatePayout = (market: MarketData, userBet: any) => {
    const userWon = (market.yesWins && userBet.yesBets > 0) ||
      (!market.yesWins && userBet.noBets > 0);

    if (!userWon) return 0;

    const winningBet = market.yesWins ? userBet.yesBets : userBet.noBets;
    const totalPool = market.totalYesBets + market.totalNoBets;

    if (totalPool === 0) return winningBet * 1.5;

    const winnerPool = market.yesWins ? market.totalYesBets : market.totalNoBets;
    const probability = winnerPool / totalPool;
    const fairOdds = 1.0 / probability;
    const houseOdds = fairOdds * 0.95;
    const clampedOdds = Math.max(1.1, Math.min(5.0, houseOdds));

    return winningBet * clampedOdds;
  };

  // Filter history based on selected filter
  const filteredHistory = useMemo(() => {
    // Don't show any markets if wallet not connected
    if (!account) return [];

    switch (filter) {
      case 'wins':
        return allMarkets.filter(market => {
          const userBet = userBetsMap[market.marketId];
          if (!userBet || userBet.totalBet === 0) return false;
          return market.isSettled && (
            (market.yesWins && userBet.yesBets > 0) ||
            (!market.yesWins && userBet.noBets > 0)
          );
        });
      case 'losses':
        return allMarkets.filter(market => {
          const userBet = userBetsMap[market.marketId];
          if (!userBet || userBet.totalBet === 0) return false;
          return market.isSettled && !(
            (market.yesWins && userBet.yesBets > 0) ||
            (!market.yesWins && userBet.noBets > 0)
          );
        });
      case 'mybets':
      default:
        // Only show markets where user has placed bets
        return allMarkets.filter(market => {
          const userBet = userBetsMap[market.marketId];
          return userBet && userBet.totalBet > 0;
        });
    }
  }, [allMarkets, filter, account, userBetsMap]);

  // Handle claim winnings
  const handleClaim = async (marketId: number) => {
    if (!account) {
      alert('Please connect your wallet to claim winnings');
      return;
    }

    try {
      setClaiming({ ...claiming, [marketId]: true });
      const result = await claimWinnings(marketId);
      alert(`Successfully claimed ${result.winnings.toFixed(2)} MAS!`);

      const updatedBet = await getUserBet(marketId, account.address);
      setUserBetsMap(prev => ({
        ...prev,
        [marketId]: updatedBet
      }));
    } catch (err: any) {
      alert(`Error claiming: ${err.message}`);
    } finally {
      setClaiming({ ...claiming, [marketId]: false });
    }
  };

  // Format timestamp
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate odds from pool data
  const calculateOddsFromPool = (market: MarketData, direction: 'YES' | 'NO') => {
    const totalPool = market.totalYesBets + market.totalNoBets;
    if (totalPool === 0) return 1.5;

    const sidePool = direction === 'YES' ? market.totalYesBets : market.totalNoBets;
    const probability = sidePool / totalPool;
    const fairOdds = 1.0 / probability;
    const houseOdds = fairOdds * 0.95;
    const clampedOdds = Math.max(1.1, Math.min(5.0, houseOdds));

    return clampedOdds;
  };

  if (isInitialLoad && (loadingHistory || isLoading)) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Stats */}
      <div className="bg-white border-4 border-black shadow-[8px_8px_0px_#000] p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          {/* Left: Title */}
          <div className="flex-1">
            <h1 className="text-3xl font-black uppercase tracking-tight mb-2">My Betting History</h1>
            <p className="text-sm font-bold text-gray-600">
              {account
                ? 'Track all your bets and claim winnings'
                : 'Connect wallet to see your betting history'}
            </p>
          </div>

          {/* Right: Stats Card */}
          {account && userStats.totalBets > 0 && (
            <div className="bg-gray-100 border-2 border-black p-4 md:min-w-[500px]">
              <div className="flex items-center justify-around gap-6">
                <div className="text-center">
                  <div className={`text-2xl font-black ${userStats.winRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                    {userStats.winRate.toFixed(1)}%
                  </div>
                  <div className="text-xs font-bold text-gray-600 uppercase">Win Rate</div>
                  <div className="text-xs text-gray-500 font-bold">{userStats.wins}W / {userStats.losses}L</div>
                </div>
                <div className="h-12 w-px bg-black"></div>
                <div className="text-center">
                  <div className="text-2xl font-black text-purple-600">{userStats.totalBets}</div>
                  <div className="text-xs font-bold text-gray-600 uppercase">Total Bets</div>
                  <div className="text-xs text-gray-500 font-bold">{userStats.totalStaked.toFixed(2)} MAS</div>
                </div>
                <div className="h-12 w-px bg-black"></div>
                <div className="text-center">
                  <div className={`text-2xl font-black ${userStats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {userStats.netProfit >= 0 ? '+' : ''}{userStats.netProfit.toFixed(2)}
                  </div>
                  <div className="text-xs font-bold text-gray-600 uppercase">Net Profit</div>
                  <div className="text-xs text-gray-500 font-bold">{userStats.totalWon.toFixed(2)} won</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filter Tabs - Only show if wallet connected */}
      {account && (
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_#000]">
          <div className="flex space-x-0 border-b-4 border-black overflow-x-auto">
            <button
              onClick={() => setFilter('mybets')}
              className={`px-6 py-3 font-black text-sm uppercase transition-all border-r-4 border-black ${
                filter === 'mybets'
                  ? 'bg-black text-white'
                  : 'bg-white hover:bg-gray-100'
              }`}
            >
              My Bets
              <span className="ml-2 text-xs">({userStats.totalBets})</span>
            </button>
            <button
              onClick={() => setFilter('wins')}
              className={`px-6 py-3 font-black text-sm uppercase transition-all border-r-4 border-black ${
                filter === 'wins'
                  ? 'bg-green-400 text-black'
                  : 'bg-white hover:bg-gray-100'
              }`}
            >
              Wins
              <span className="ml-2 text-xs">({userStats.wins})</span>
            </button>
            <button
              onClick={() => setFilter('losses')}
              className={`px-6 py-3 font-black text-sm uppercase transition-all ${
                filter === 'losses'
                  ? 'bg-red-400 text-black'
                  : 'bg-white hover:bg-gray-100'
              }`}
            >
              Losses
              <span className="ml-2 text-xs">({userStats.losses})</span>
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredHistory.length === 0 && !loadingHistory && (
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_#000] p-12 text-center">
          {!account ? (
            <>
              <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-gray-600 text-lg font-black mb-2 uppercase">Connect Your Wallet</h3>
              <p className="text-gray-500 font-bold">
                Connect your wallet to view your betting history
              </p>
            </>
          ) : (
            <>
              <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-gray-600 text-lg font-black mb-2 uppercase">No Bets Found</h3>
              <p className="text-gray-500 font-bold">
                {filter === 'mybets'
                  ? 'You haven\'t placed any bets yet'
                  : 'You have no bets matching this filter'}
              </p>
            </>
          )}
        </div>
      )}

      {/* History Cards */}
      {filteredHistory.length > 0 && (
        <div className="space-y-4">
          {filteredHistory.map((market) => {
            const userBet = userBetsMap[market.marketId];
            const hasUserBet = userBet && userBet.totalBet > 0;
            const userWon = hasUserBet && market.isSettled && (
              (market.yesWins && userBet.yesBets > 0) ||
              (!market.yesWins && userBet.noBets > 0)
            );
            const userBetDirection = hasUserBet ? (userBet.yesBets > 0 ? 'YES' : 'NO') : null;
            const payout = hasUserBet && market.isSettled ? calculatePayout(market, userBet) : 0;
            const canClaim = account && userWon && payout > 0;

            const yesOdds = calculateOddsFromPool(market, 'YES');
            const noOdds = calculateOddsFromPool(market, 'NO');

            return (
              <div
                key={market.marketId}
                className={`bg-white border-4 border-black shadow-[8px_8px_0px_#000] p-6 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[10px_10px_0px_#000] transition-all ${
                  hasUserBet ? 'border-blue-500' : ''
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  {/* Left: Market Info */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-xs font-black bg-black text-white px-2 py-1">
                        MARKET #{market.marketId}
                      </span>
                      <span className={`text-xs font-black px-2 py-1 border-2 border-black ${
                        market.isSettled ? 'bg-gray-400 text-black' : 
                        market.isActive ? 'bg-green-400 text-black' : 'bg-orange-400 text-black'
                      }`}>
                        {market.isSettled ? 'SETTLED' : market.isActive ? 'ACTIVE' : 'PENDING'}
                      </span>
                    </div>
                    <h3 className="text-xl font-black uppercase mb-2">{market.description}</h3>
                    <div className="flex items-center space-x-4 text-sm font-bold text-gray-600 mb-3">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>
                          {market.isSettled 
                            ? `Settled: ${formatTime(market.settlementTime)}`
                            : `Settles: ${formatTime(market.settlementTime)}`
                          }
                        </span>
                      </div>
                      <div>Target: {market.targetValue.toLocaleString()}</div>
                      {market.isSettled && <div>Final: {market.finalValue.toLocaleString()}</div>}
                    </div>

                    {/* Result (only for settled markets) */}
                    {market.isSettled && (
                      <div className="flex items-center space-x-4 mb-3">
                        <div className={`flex items-center space-x-2 font-black ${market.yesWins ? 'text-green-600' : 'text-red-600'}`}>
                          {market.yesWins ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                          <span>{market.yesWins ? 'YES WINS' : 'NO WINS'}</span>
                        </div>
                        <div className="text-sm font-bold text-gray-600">
                          Pool: {market.totalPool.toFixed(2)} MAS
                          <span className="text-green-600 ml-2">{market.totalYesBets.toFixed(1)}</span> /
                          <span className="text-red-600 ml-1">{market.totalNoBets.toFixed(1)}</span>
                        </div>
                      </div>
                    )}

                    {/* Pool info for active markets */}
                    {!market.isSettled && (
                      <div className="text-sm font-bold text-gray-600 mb-3">
                        Pool: {market.totalPool.toFixed(2)} MAS
                        <span className="text-green-600 ml-2">{market.totalYesBets.toFixed(1)}</span> /
                        <span className="text-red-600 ml-1">{market.totalNoBets.toFixed(1)}</span>
                      </div>
                    )}

                    {/* Odds */}
                    <div className="flex items-center space-x-4 text-xs font-bold">
                      <div className={market.isSettled && market.yesWins ? 'text-green-600' : 'text-gray-500'}>
                        YES: {yesOdds.toFixed(2)}x
                      </div>
                      <div className={market.isSettled && !market.yesWins ? 'text-red-600' : 'text-gray-500'}>
                        NO: {noOdds.toFixed(2)}x
                      </div>
                    </div>
                  </div>

                  {/* Right: User Bet Info */}
                  {account && (
                    <div className="md:w-64 bg-gray-100 border-2 border-black p-4">
                      {hasUserBet ? (
                        <div>
                          <div className="text-xs font-black uppercase text-gray-600 mb-2">Your Bet</div>
                          <div className={`flex items-center space-x-2 mb-2 ${userBetDirection === 'YES' ? 'text-green-600' : 'text-red-600'}`}>
                            {userBetDirection === 'YES' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                            <span className="font-black text-lg">{userBetDirection}</span>
                          </div>
                          <div className="text-sm font-bold mb-1">Amount: {userBet.totalBet.toFixed(2)} MAS</div>
                          
                          {/* Settled market outcomes */}
                          {market.isSettled && (
                            <>
                              {userWon && (
                                <div className="text-green-600 font-black mb-3">
                                  Payout: +{payout.toFixed(2)} MAS
                                </div>
                              )}
                              {!userWon && (
                                <div className="text-red-600 font-bold mb-3">
                                  Lost
                                </div>
                              )}
                              {canClaim && (
                                <button
                                  onClick={() => handleClaim(market.marketId)}
                                  disabled={claiming[market.marketId]}
                                  className="w-full flex items-center justify-center space-x-2 bg-green-400 border-2 border-black py-2 font-black uppercase text-sm hover:bg-green-500 transition-colors disabled:opacity-50"
                                >
                                  <Gift className="w-4 h-4" />
                                  <span>{claiming[market.marketId] ? 'CLAIMING...' : 'CLAIM WINNINGS'}</span>
                                </button>
                              )}
                              {hasUserBet && !userWon && (
                                <div className="text-gray-500 text-xs font-bold text-center">No winnings</div>
                              )}
                              {hasUserBet && userWon && !canClaim && (
                                <div className="text-gray-500 text-xs font-bold text-center">Already claimed</div>
                              )}
                            </>
                          )}

                          {/* Active market - show potential payout */}
                          {!market.isSettled && (
                            <div className="text-blue-600 font-bold mb-3">
                              Potential: {(userBet.totalBet * (userBetDirection === 'YES' ? yesOdds : noOdds)).toFixed(2)} MAS
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-gray-500 text-sm font-bold text-center">No bet placed</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
