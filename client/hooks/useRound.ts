import { useState, useEffect, useCallback } from 'react';
import { SmartContract, Args } from '@massalabs/massa-web3';

// Market status enum matching the contract
export const MARKET_STATUS = {
  ACTIVE: 0,
  SETTLED: 1,
} as const;

export interface MarketData {
  marketId: number;
  startTime: number;
  settlementTime: number;
  bettingEndTime: number;
  description: string;
  targetValue: number;
  finalValue: number;
  totalYesBets: number;
  totalNoBets: number;
  houseYesExposure: number;
  houseNoExposure: number;
  status: number;
  yesWins: boolean;
  // Computed properties
  isActive: boolean;
  isSettled: boolean;
  timeRemaining: number;
  bettingTimeRemaining: number;
  totalPool: number;
}

export interface UserBet {
  marketId: number;
  userAddress: string;
  yesBets: number;
  noBets: number;
  totalBet: number;
}

export interface AMMOdds {
  yesOdds: number;
  noOdds: number;
  yesPayout: number;
  noPayout: number;
  totalYesPool: number;
  totalNoPool: number;
}

export const useMarket = (contractAddress: string, provider: any) => {
  const [currentMarket, setCurrentMarket] = useState<MarketData | null>(null);
  const [marketHistory, setMarketHistory] = useState<MarketData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to parse market data from Args
  const parseMarketData = useCallback((marketArgs: Args, currentTime: number): MarketData => {
    const marketId = Number(marketArgs.nextU64());
    const startTime = Number(marketArgs.nextU64());
    const settlementTime = Number(marketArgs.nextU64());
    const bettingEndTime = Number(marketArgs.nextU64());
    const description = marketArgs.nextString();
    const targetValue = Number(marketArgs.nextU64());
    const finalValue = Number(marketArgs.nextU64());
    const totalYesBets = Number(marketArgs.nextU64());
    const totalNoBets = Number(marketArgs.nextU64());
    const houseYesExposure = Number(marketArgs.nextU64());
    const houseNoExposure = Number(marketArgs.nextU64());
    const status = marketArgs.nextU8();
    const yesWins = marketArgs.nextBool();

    const isActive = Number(status) === MARKET_STATUS.ACTIVE;
    const isSettled = Number(status) === MARKET_STATUS.SETTLED;
    const timeRemaining = Math.max(0, settlementTime - currentTime);
    const bettingTimeRemaining = Math.max(0, bettingEndTime - currentTime);
    const totalPool = totalYesBets + totalNoBets;

    return {
      marketId,
      startTime,
      settlementTime,
      bettingEndTime,
      description,
      targetValue,
      finalValue,
      totalYesBets: totalYesBets / 1_000_000_000, // Convert to MAS
      totalNoBets: totalNoBets / 1_000_000_000,
      houseYesExposure: houseYesExposure / 1_000_000_000,
      houseNoExposure: houseNoExposure / 1_000_000_000,
      status: Number(status),
      yesWins,
      isActive,
      isSettled,
      timeRemaining,
      bettingTimeRemaining,
      totalPool: totalPool / 1_000_000_000,
    };
  }, []);

  // Fetch current active market
  const fetchCurrentMarket = useCallback(async () => {
    if (!provider) return;

    try {
      setIsLoading(true);
      setError(null);

      const contract = new SmartContract(provider, contractAddress);
      // Note: We'll need to get the latest market ID from house status
      const statusResult = await contract.read('getHouseStatus', new Args());
      const statusArgs = new Args(statusResult.value);
      statusArgs.nextU64(); // balance
      const marketCounter = Number(statusArgs.nextU64());
      
      if (marketCounter === 0) {
        setCurrentMarket(null);
        return;
      }

      // Fetch the latest market
      const args = new Args().addU64(BigInt(marketCounter));
      const result = await contract.read('getMarketDetails', args);

      const marketArgs = new Args(result.value);
      const currentTime = Date.now();
      const marketData = parseMarketData(marketArgs, currentTime);

      setCurrentMarket(marketData);
    } catch (err: any) {
      console.error('Error fetching current market:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [provider, contractAddress, parseMarketData]);

  // Fetch specific market details
  const fetchMarketDetails = useCallback(async (marketId: number): Promise<MarketData | null> => {
    if (!provider) return null;

    try {
      const contract = new SmartContract(provider, contractAddress);
      const args = new Args().addU64(BigInt(marketId));
      const result = await contract.read('getMarketDetails', args);

      const marketArgs = new Args(result.value);
      const currentTime = Date.now();
      return parseMarketData(marketArgs, currentTime);
    } catch (err: any) {
      console.error('Error fetching market details:', err);
      throw err;
    }
  }, [provider, contractAddress, parseMarketData]);

  // Fetch market history (last N markets)
  const fetchMarketHistory = useCallback(async (count: number = 10) => {
    if (!provider || !currentMarket) return;

    try {
      const history: MarketData[] = [];
      const startId = Math.max(1, currentMarket.marketId - count);

      for (let i = currentMarket.marketId - 1; i >= startId; i--) {
        try {
          const market = await fetchMarketDetails(i);
          if (market) history.push(market);
        } catch {
          // Market might not exist, continue
        }
      }

      setMarketHistory(history);
    } catch (err: any) {
      console.error('Error fetching market history:', err);
    }
  }, [provider, currentMarket, fetchMarketDetails]);

  // Get AMM odds for a potential bet
  const getAMMOdds = useCallback(async (marketId: number, betAmount: number): Promise<AMMOdds | null> => {
    if (!provider) return null;

    try {
      const contract = new SmartContract(provider, contractAddress);
      const args = new Args()
        .addU64(BigInt(marketId))
        .addU64(BigInt(betAmount * 1_000_000_000)); // Convert to nanoMAS

      const result = await contract.read('getAMMOdds', args);
      const oddsArgs = new Args(result.value);

      return {
        yesOdds: oddsArgs.nextF64(),
        noOdds: oddsArgs.nextF64(),
        yesPayout: Number(oddsArgs.nextU64()) / 1_000_000_000,
        noPayout: Number(oddsArgs.nextU64()) / 1_000_000_000,
        totalYesPool: Number(oddsArgs.nextU64()) / 1_000_000_000,
        totalNoPool: Number(oddsArgs.nextU64()) / 1_000_000_000,
      };
    } catch (err: any) {
      console.error('Error fetching AMM odds:', err);
      return null;
    }
  }, [provider, contractAddress]);

  // Get user bet for specific market
  const getUserBet = useCallback(async (marketId: number, userAddress: string): Promise<UserBet | null> => {
    if (!provider) return null;

    try {
      const contract = new SmartContract(provider, contractAddress);
      const args = new Args()
        .addU64(BigInt(marketId))
        .addString(userAddress);

      const result = await contract.read('getUserBet', args);
      const betArgs = new Args(result.value);

      const storedMarketId = Number(betArgs.nextU64());
      const storedAddress = betArgs.nextString();
      const yesBets = Number(betArgs.nextU64()) / 1_000_000_000;
      const noBets = Number(betArgs.nextU64()) / 1_000_000_000;

      return {
        marketId: storedMarketId,
        userAddress: storedAddress,
        yesBets,
        noBets,
        totalBet: yesBets + noBets,
      };
    } catch (err: any) {
      console.error('Error fetching user bet:', err);
      return null;
    }
  }, [provider, contractAddress]);

  // Auto-refresh current market every 5 seconds
  useEffect(() => {
    fetchCurrentMarket();
    const interval = setInterval(fetchCurrentMarket, 5000);
    return () => clearInterval(interval);
  }, [fetchCurrentMarket]);
 
  // Fetch history when current market changes
  useEffect(() => {
    if (currentMarket && currentMarket.marketId > 1) {
      fetchMarketHistory(10);
    }
  }, [currentMarket?.marketId]);

  return {
    currentMarket,
    marketHistory,
    isLoading,
    error,
    fetchCurrentMarket,
    fetchMarketDetails,
    fetchMarketHistory,
    getAMMOdds,
    getUserBet,
  };
};
