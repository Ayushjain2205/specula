import { createContext, useCallback, useContext, useMemo, useReducer, ReactNode } from "react"
import { Mas, SmartContract, OperationStatus, Args } from '@massalabs/massa-web3'
import { CONTRACT_ADDRESS } from './market'

interface AccountState {
  account: any;
  provider: any;
}

interface BetResult {
  betAmount: number;
  potentialPayout: number;
}

interface ClaimResult {
  winnings: number;
}

interface CreateMarketResult {
  marketId: number;
}

interface AccountContextType extends AccountState {
  connect: (account: any) => void;
  disconnect: () => void;
  setProvider: (provider: any) => void;
  placeBet: (roundId: number, betUp: boolean, amount: string) => Promise<BetResult>;
  claimWinnings: (roundId: number) => Promise<ClaimResult>;
  createMarket: (description: string, targetValue: number, duration: number, bettingCutoff: number) => Promise<CreateMarketResult>;
  addAdmin: (adminAddress: string) => Promise<void>;
}

export const AccountContext = createContext<AccountContextType | undefined>(undefined);

interface ProviderProps {
  children: ReactNode;
}

const Provider = ({ children }: ProviderProps) => {
  const [values, dispatch] = useReducer(
    (curVal: AccountState, newVal: Partial<AccountState>) => ({ ...curVal, ...newVal }),
    {
      account: undefined,
      provider: undefined,
    }
  );

  const { provider, account } = values;

  const disconnect = useCallback(() => {
    dispatch({
      account: undefined,
    });
  }, []);

  const connect = useCallback((account: any) => {
    dispatch({
      account,
    });
  }, []);

  const setProvider = useCallback((provider: any) => {
    dispatch({
      provider,
    });
  }, []);

  /**
   * Place a bet on the current round
   * @param roundId - The round ID to bet on
   * @param betUp - true for UP, false for DOWN
   * @param amount - Bet amount in MAS (as string)
   * @returns Promise with bet amount and potential payout
   */
  const placeBet = useCallback(async (
    roundId: number,
    betUp: boolean,
    amount: string
  ): Promise<BetResult> => {
    if (!account) {
      throw new Error("Wallet not connected");
    }

    if (!provider) {
      throw new Error("Provider not available");
    }

    console.log('Placing bet:', {
      roundId,
      direction: betUp ? 'UP' : 'DOWN',
      amount: `${amount} MAS`,
    });

    // Validate bet amount
    const betAmountNum = parseFloat(amount);
    if (isNaN(betAmountNum) || betAmountNum < 1) {
      throw new Error("Minimum bet is 1 MAS");
    }

    // Create bet arguments
    const betArgs = new Args()
      .addU64(BigInt(roundId))
      .addBool(betUp);

    const contract = new SmartContract(account, CONTRACT_ADDRESS);

    // Call placeBet with the bet amount
    const operation: any = await contract.call(
      'placeBet',
      betArgs,
      { coins: Mas.fromString(amount) }
    );

    console.log('Bet transaction submitted, operation id:', operation.id);

    // Wait for operation to be finalized
    console.log('Waiting for operation to be finalized...');
    const status = await operation.waitFinalExecution();
    console.log('Operation status:', OperationStatus[status]);

    if (status !== OperationStatus.Success) {
      throw new Error("Bet transaction failed");
    }

    // Parse the result to get bet amount and potential payout
    // The contract returns: betAmount, potentialPayout
    const resultArgs = new Args(operation.events?.[0]?.data || new Uint8Array());
    let betAmount = 0;
    let potentialPayout = 0;

    try {
      betAmount = Number(resultArgs.nextU64()) / 1_000_000_000;
      potentialPayout = Number(resultArgs.nextU64()) / 1_000_000_000;
    } catch {
      // If parsing fails, use the input amount
      betAmount = betAmountNum;
      potentialPayout = betAmountNum; // Fallback
    }

    console.log('Bet placed successfully:', {
      betAmount: `${betAmount} MAS`,
      potentialPayout: `${potentialPayout} MAS`,
    });

    return {
      betAmount,
      potentialPayout,
    };
  }, [account, provider]);

  /**
   * Claim winnings from a settled round
   * @param roundId - The round ID to claim from
   * @returns Promise with winnings amount
   */
  const claimWinnings = useCallback(async (roundId: number): Promise<ClaimResult> => {
    if (!account) {
      throw new Error("Wallet not connected");
    }

    if (!provider) {
      throw new Error("Provider not available");
    }

    console.log('Claiming winnings for round:', roundId);

    const claimArgs = new Args().addU64(BigInt(roundId));

    const contract = new SmartContract(account, CONTRACT_ADDRESS);

    // Call claimWinnings
    const operation: any = await contract.call(
      'claimWinnings',
      claimArgs,
      { coins: Mas.fromString('0') } // No coins needed for claiming
    );

    console.log('Claim transaction submitted, operation id:', operation.id);

    // Wait for operation to be finalized
    console.log('Waiting for operation to be finalized...');
    const status = await operation.waitFinalExecution();
    console.log('Operation status:', OperationStatus[status]);

    if (status !== OperationStatus.Success) {
      throw new Error("Claim transaction failed");
    }

    // Parse the result to get winnings
    const resultArgs = new Args(operation.events?.[0]?.data || new Uint8Array());
    let winnings = 0;

    try {
      winnings = Number(resultArgs.nextU64()) / 1_000_000_000;
    } catch {
      console.warn('Could not parse winnings from result');
    }

    console.log('Winnings claimed successfully:', `${winnings} MAS`);

    return {
      winnings,
    };
  }, [account, provider]);

  /**
   * Create a new prediction market
   * @param description - Market description (e.g., "Will Bitcoin reach $100k?")
   * @param targetValue - Target value to compare against
   * @param duration - Market duration in milliseconds
   * @param bettingCutoff - Betting cutoff time in milliseconds before settlement
   * @returns Promise with new market ID
   */
  const createMarket = useCallback(async (
    description: string,
    targetValue: number,
    duration: number,
    bettingCutoff: number
  ): Promise<CreateMarketResult> => {
    if (!account) {
      throw new Error("Wallet not connected");
    }

    if (!provider) {
      throw new Error("Provider not available");
    }

    console.log('Creating market:', {
      description,
      targetValue,
      duration,
      bettingCutoff,
    });

    // Validate inputs
    if (!description || description.trim().length === 0) {
      throw new Error("Market description is required");
    }

    if (targetValue <= 0) {
      throw new Error("Target value must be greater than 0");
    }

    if (duration <= 0) {
      throw new Error("Duration must be greater than 0");
    }

    if (bettingCutoff <= 0 || bettingCutoff >= duration) {
      throw new Error("Betting cutoff must be greater than 0 and less than duration");
    }

    // Create market arguments
    const marketArgs = new Args()
      .addString(description)
      .addU64(BigInt(targetValue))
      .addU64(BigInt(duration))
      .addU64(BigInt(bettingCutoff));

    const contract = new SmartContract(account, CONTRACT_ADDRESS);

    // Call createMarket
    const operation: any = await contract.call(
      'createMarket',
      marketArgs,
      { coins: Mas.fromString('0') } // No coins needed for creating market
    );

    console.log('Market creation transaction submitted, operation id:', operation.id);

    // Wait for operation to be finalized
    console.log('Waiting for operation to be finalized...');
    const status = await operation.waitFinalExecution();
    console.log('Operation status:', OperationStatus[status]);

    if (status !== OperationStatus.Success) {
      throw new Error("Market creation transaction failed");
    }

    // Parse the result to get market ID
    const resultArgs = new Args(operation.events?.[0]?.data || new Uint8Array());
    let marketId = 0;

    try {
      marketId = Number(resultArgs.nextU64());
    } catch {
      console.warn('Could not parse market ID from result');
    }

    console.log('Market created successfully with ID:', marketId);

    return {
      marketId,
    };
  }, [account, provider]);

  /**
   * Add a new admin to the contract
   * @param adminAddress - The wallet address to add as admin
   */
  const addAdmin = useCallback(async (adminAddress: string): Promise<void> => {
    if (!account) {
      throw new Error("Wallet not connected");
    }

    if (!provider) {
      throw new Error("Provider not available");
    }

    console.log('Adding admin:', adminAddress);

    if (!adminAddress || adminAddress.trim().length === 0) {
      throw new Error("Admin address is required");
    }

    const args = new Args().addString(adminAddress);

    const contract = new SmartContract(account, CONTRACT_ADDRESS);

    const operation: any = await contract.call(
      'addAdmin',
      args,
      { coins: Mas.fromString('0') }
    );

    console.log('Add admin transaction submitted, operation id:', operation.id);

    console.log('Waiting for operation to be finalized...');
    const status = await operation.waitFinalExecution();
    console.log('Operation status:', OperationStatus[status]);

    if (status !== OperationStatus.Success) {
      throw new Error("Add admin transaction failed");
    }

    console.log('Admin added successfully');
  }, [account, provider]);

  const accountContext: AccountContextType = useMemo(
    () => ({
      account,
      provider,
      connect,
      disconnect,
      setProvider,
      placeBet,
      claimWinnings,
      createMarket,
      addAdmin,
    }),
    [
      account,
      provider,
      connect,
      disconnect,
      setProvider,
      placeBet,
      claimWinnings,
      createMarket,
      addAdmin,
    ]
  );

  return (
    <AccountContext.Provider value={accountContext}>
      {children}
    </AccountContext.Provider>
  );
};

// Custom hook to use account context
export const useAccount = () => {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error('useAccount must be used within AccountProvider');
  }
  return context;
};

export default Provider;
