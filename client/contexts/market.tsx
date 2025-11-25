import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, ReactNode } from "react"
import { JsonRpcProvider, SmartContract, Args } from '@massalabs/massa-web3'

// Contract address 
export const CONTRACT_ADDRESS = "AS1i1qeq1YQ8gqJSp4k5v2RFF7svjCj8e9CwrgPBAX1YLoCFFC68"

export interface OraclePrice {
  price: number;
  lastUpdate: number;
  priceAge: number;
  isStale: boolean;
}

export interface HouseStatus {
  balance: number;
  roundCounter: number;
  houseEdge: number;
  minBetAmount: number;
  roundDuration: number;
  virtualLiquidity: number;
}

interface MarketState {
  oraclePrice: OraclePrice | null;
  houseStatus: HouseStatus | null;
  loading: boolean;
  error: string | null;
}

interface MarketContextType extends MarketState {
  provider: any;
  contract: any;
  fetchOraclePrice: () => Promise<void>;
  fetchHouseStatus: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

export const MarketContext = createContext<MarketContextType | undefined>(undefined);

interface ProviderProps {
  children: ReactNode;
}

const Provider = ({ children }: ProviderProps) => {
  const [contract, setContract] = useState<any>(null);
  const [provider, setProvider] = useState<any>(null);

  const [values, dispatch] = useReducer(
    (curVal: MarketState, newVal: Partial<MarketState>) => ({ ...curVal, ...newVal }),
    {
      oraclePrice: null,
      houseStatus: null,
      loading: false,
      error: null,
    }
  );

  // Initialize provider and contract
  useEffect(() => {
    const initializeWeb3 = async () => {
      try {
        const provider = JsonRpcProvider.buildnet();
        const contract = new SmartContract(provider, CONTRACT_ADDRESS);

        setProvider(provider);
        setContract(contract);
      } catch (err: any) {
        console.error('Failed to initialize Web3:', err);
        dispatch({ error: err.message });
      }
    };

    initializeWeb3();
  }, []);

  // Fetch current oracle price
  const fetchOraclePrice = useCallback(async () => {
    if (!contract) return;

    try {
      const result = await contract.read('getCurrentPrice', new Args());
      const priceArgs = new Args(result.value);

      const price = priceArgs.nextF64();
      const lastUpdate = Number(priceArgs.nextU64());
      const priceAge = Number(priceArgs.nextU64());
      const isStale = priceArgs.nextBool();

      dispatch({
        oraclePrice: {
          price,
          lastUpdate,
          priceAge,
          isStale,
        },
      });
    } catch (err: any) {
      console.error('Error fetching oracle price:', err);
      dispatch({ error: err.message });
    }
  }, [contract]);

  // Fetch house status
  const fetchHouseStatus = useCallback(async () => {
    if (!contract) return;

    try {
      const result = await contract.read('getHouseStatus', new Args());
      const statusArgs = new Args(result.value);

      const balance = Number(statusArgs.nextU64()) / 1_000_000_000; // Convert to MAS
      const marketCounter = Number(statusArgs.nextU64());
      const houseEdge = statusArgs.nextF64();
      const minBetAmount = Number(statusArgs.nextU64()) / 1_000_000_000;
      const virtualLiquidity = Number(statusArgs.nextU64()) / 1_000_000_000;

      dispatch({
        houseStatus: {
          balance,
          roundCounter: marketCounter, // Keep the old name for compatibility
          houseEdge,
          minBetAmount,
          roundDuration: 0, // Deprecated, set to 0
          virtualLiquidity,
        },
      });
    } catch (err: any) {
      console.error('Error fetching house status:', err);
      dispatch({ error: err.message });
    }
  }, [contract]);



  // Refresh all market data
  const refreshAll = useCallback(async () => {
    dispatch({ loading: true, error: null });
    try {
      await fetchHouseStatus();
    } catch (err: any) {
      dispatch({ error: err.message });
    } finally {
      dispatch({ loading: false });
    }
  }, [fetchHouseStatus]);

  // Auto-load data on mount and refresh periodically
  useEffect(() => {
    if (contract) {
      refreshAll();
    }
  }, [contract, refreshAll]);

  const marketContext: MarketContextType = useMemo(
    () => ({
      ...values,
      provider,
      contract,
      fetchOraclePrice,
      fetchHouseStatus,
      refreshAll,
    }),
    [
      values,
      provider,
      contract,
      fetchOraclePrice,
      fetchHouseStatus,
      refreshAll,
    ]
  );

  return (
    <MarketContext.Provider value={marketContext}>
      {children}
    </MarketContext.Provider>
  );
};

// Custom hook to use market context
export const useMarket = () => {
  const context = useContext(MarketContext);
  if (!context) {
    throw new Error('useMarket must be used within MarketProvider');
  }
  return context;
};

export default Provider;
