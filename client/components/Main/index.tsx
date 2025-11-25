'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Filter,
  Loader2,
  TrendingUp,
  AlertCircle,
  Search,
  SortDesc,
  SortAsc,
  LayoutGrid,
} from 'lucide-react';
import { toast } from 'sonner';
import MarketCard from '@/components/MarketCard';
import { SkeletonCard } from '@/components/SkeletonCard';

import { useMarket as useMarketHook } from '@/hooks/useRound';
import { useAccount } from '@/contexts/account';
import { useMarket, CONTRACT_ADDRESS } from '@/contexts/market';

type FilterType = 'all' | 'active' | 'settled';
type CategoryType =
  | 'all'
  | 'crypto'
  | 'sports'
  | 'politics'
  | 'tech'
  | 'pop culture';
type SortType = 'newest' | 'oldest' | 'highest-pool';

const CATEGORY_KEYWORDS: Record<CategoryType, string[]> = {
  all: [],
  crypto: [
    'bitcoin',
    'btc',
    'eth',
    'ethereum',
    'crypto',
    'token',
    'coin',
    'blockchain',
  ],
  sports: [
    'sport',
    'football',
    'soccer',
    'basketball',
    'nba',
    'nfl',
    'game',
    'match',
  ],
  politics: ['election', 'president', 'vote', 'politics', 'policy'],
  tech: ['tech', 'ai', 'apple', 'google', 'microsoft', 'software', 'hardware'],
  'pop culture': ['movie', 'music', 'celebrity', 'award', 'star'],
};

const MainPanel = () => {
  const { provider } = useMarket();
  const { account, placeBet } = useAccount();
  const {
    currentMarket,
    marketHistory,
    isLoading: marketLoading,
  } = useMarketHook(CONTRACT_ADDRESS, provider);

  const [filter, setFilter] = useState<FilterType>('all');
  const [category, setCategory] = useState<CategoryType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortType>('newest');
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    if (currentMarket && isInitialLoad) {
      setIsInitialLoad(false);
    }
  }, [currentMarket, isInitialLoad]);

  const handleQuickBet = async (
    marketId: number,
    isYes: boolean,
    amount: string,
  ) => {
    if (!account) {
      toast.error('Please connect your wallet first');
      return;
    }

    const betAmount = parseFloat(amount);
    if (isNaN(betAmount) || betAmount < 1) {
      toast.error('Minimum bet is 1 MAS');
      return;
    }

    try {
      const result = await placeBet(marketId, isYes, amount);
      toast.success(
        `Bet placed successfully! Potential payout: ${result.potentialPayout.toFixed(
          2,
        )} MAS`,
      );
    } catch (err: any) {
      toast.error(`Error placing bet: ${err.message}`);
    }
  };

  const allMarkets = useMemo(() => {
    const markets = [];
    if (currentMarket) {
      markets.push(currentMarket);
    }
    if (marketHistory) {
      // Filter out the current market from history to avoid duplicates
      const historyWithoutCurrent = marketHistory.filter(
        (m) => !currentMarket || m.marketId !== currentMarket.marketId,
      );
      markets.push(...historyWithoutCurrent);
    }
    return markets;
  }, [currentMarket, marketHistory]);

  const filteredMarkets = useMemo(() => {
    let result = [...allMarkets];

    // 1. Status Filter
    if (filter === 'active') {
      result = result.filter((m) => m.isActive);
    } else if (filter === 'settled') {
      result = result.filter((m) => m.isSettled);
    }

    // 2. Category Filter
    if (category !== 'all') {
      const keywords = CATEGORY_KEYWORDS[category];
      result = result.filter((m) => {
        const desc = m.description.toLowerCase();
        return keywords.some((k) => desc.includes(k));
      });
    }

    // 3. Search Filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.description.toLowerCase().includes(query) ||
          m.marketId.toString().includes(query),
      );
    }

    // 4. Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return b.marketId - a.marketId;
        case 'oldest':
          return a.marketId - b.marketId;
        case 'highest-pool':
          return b.totalPool - a.totalPool;
        default:
          return 0;
      }
    });

    return result;
  }, [allMarkets, filter, category, searchQuery, sortBy]);

  const showSkeleton = isInitialLoad && (marketLoading || !currentMarket);

  if (!currentMarket && !showSkeleton) {
    return (
      <section className="relative flex items-center justify-center min-h-[600px]">
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_#000] p-8 text-center">
          <div className="text-red-500 text-xl font-bold mb-2">
            CONNECTION ERROR
          </div>
          <div className="text-gray-500 mb-4">Unable to load market data</div>
          <button
            onClick={() => window.location.reload()}
            className="bg-yellow-300 border-2 border-black px-4 py-2 font-black uppercase hover:bg-yellow-400 transition-colors"
          >
            RETRY
          </button>
        </div>
      </section>
    );
  }

  const activeCount = allMarkets.filter((m) => m.isActive).length;
  const settledCount = allMarkets.filter((m) => m.isSettled).length;

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="bg-white border-4 border-black shadow-[8px_8px_0px_#000] p-6">
        <div className="space-y-6">
          {/* Top Row: Title & Search */}
          <div className="flex flex-col md:flex-row gap-4 justify-between md:items-center">
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tight mb-1">
                Featured Markets
              </h1>
            </div>

            <div className="relative md:w-96">
              <input
                type="text"
                placeholder="Search markets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-12 pl-12 pr-4 border-4 border-black font-bold placeholder:text-gray-400 focus:outline-none focus:ring-0"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
          </div>

          {/* Bottom Row: Filters & Sort */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border-t-2 border-gray-100 pt-4">
            <div className="flex flex-wrap gap-2">
              {/* Status Filter */}
              <div className="flex border-2 border-black bg-white">
                {(['all', 'active', 'settled'] as FilterType[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 font-bold text-xs uppercase transition-colors ${
                      filter === f
                        ? 'bg-black text-white'
                        : 'bg-white hover:bg-gray-100 text-black'
                    } ${f !== 'all' ? 'border-l-2 border-black' : ''}`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {/* Category Filter */}
              <div className="flex border-2 border-black bg-white overflow-x-auto max-w-[200px] md:max-w-none">
                {(
                  [
                    'all',
                    'crypto',
                    'sports',
                    'tech',
                    'politics',
                  ] as CategoryType[]
                ).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`px-3 py-1.5 font-bold text-xs uppercase whitespace-nowrap transition-colors ${
                      category === c
                        ? 'bg-blue-500 text-white'
                        : 'bg-white hover:bg-gray-100 text-black'
                    } ${c !== 'all' ? 'border-l-2 border-black' : ''}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-gray-500">
                Sort by:
              </span>
              <div className="flex border-2 border-black bg-white">
                <button
                  onClick={() => setSortBy('newest')}
                  className={`p-2 hover:bg-gray-100 ${
                    sortBy === 'newest'
                      ? 'bg-black text-white hover:bg-black'
                      : ''
                  }`}
                  title="Newest"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSortBy('highest-pool')}
                  className={`p-2 border-l-2 border-black hover:bg-gray-100 ${
                    sortBy === 'highest-pool'
                      ? 'bg-black text-white hover:bg-black'
                      : ''
                  }`}
                  title="Highest Pool"
                >
                  <TrendingUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSortBy('oldest')}
                  className={`p-2 border-l-2 border-black hover:bg-gray-100 ${
                    sortBy === 'oldest'
                      ? 'bg-black text-white hover:bg-black'
                      : ''
                  }`}
                  title="Oldest"
                >
                  <SortAsc className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div>
        {showSkeleton ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-8">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : filteredMarkets.length === 0 ? (
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_#000] p-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-black uppercase mb-2">
              No Markets Found
            </h3>
            <p className="text-gray-600 font-bold">
              Try adjusting your filters or search query
            </p>
            <button
              onClick={() => {
                setFilter('all');
                setCategory('all');
                setSearchQuery('');
              }}
              className="mt-4 text-sm font-black underline hover:text-blue-600"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMarkets.map((market) => (
              <MarketCard
                key={market.marketId}
                market={market}
                onQuickBet={handleQuickBet}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MainPanel;
