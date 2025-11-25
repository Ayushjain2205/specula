import { Args, f64ToBytes } from '@massalabs/as-types';
import { 
    setDeployContext, 
    resetStorage, 
    Context, 
    mockTransferredCoins, 
    mockBalance, 
    mockTimestamp,
    generateEvent
} from '@massalabs/massa-as-sdk';

// Import functions from main contract
import {
    constructor,
    createRound,
    placeBet,
    settleRound,
    claimWinnings,
    getCurrentRound,
    getRoundDetails,
    getUserBet,
    getHouseStatus,
    getAMMOdds,
    updateOraclePrice,
    addHouseFunds
} from '../contracts/main';

// Test addresses
const OWNER_ADDRESS = "AU1MVG69Rh1eMpg9pi5c7gX8Uh61dqpN5W3u4fQSWmR4PZJPHJbA";
const USER1_ADDRESS = "AU1wYW2i79TYcGwjgz5R8x3k7Vtp8Y5rPw3jdNu9nM8e7XzpFqV1";
const USER2_ADDRESS = "AU1zKp5Y8qW3m9L7jN2eR5xT6vP1qY4rM8k3dN7uV9cE2XfGhI0s";

describe('AMM Prediction Market Tests', () => {

    beforeEach(() => {
        // Clear storage
        resetStorage();
        
        // Set owner context and initialize
        setDeployContext(OWNER_ADDRESS);
        constructor(new Args().serialize());
        
        // Add house funds
        mockBalance(OWNER_ADDRESS, 100_000_000_000)
        mockTransferredCoins(100_000_000_000); // 100 MAS
        addHouseFunds();
        
        // Set initial price
        mockTimestamp(1640000000000); // Fixed timestamp
        updateOraclePrice(new Args()
            .add<f64>(110000.0) // 110K
            .add<u64>(1640000000000)
            .serialize()
        );
    });

    describe('Basic Functionality', () => {
        
        test('should initialize contract correctly', () => {
            const statusResult = getHouseStatus();
            const status = new Args(statusResult);
            
            const houseBalance = status.nextU64().unwrap();
            const roundCounter = status.nextU64().unwrap();
            const houseEdge = status.nextF64().unwrap();
            const minBet = status.nextU64().unwrap();
            const roundDuration = status.nextU64().unwrap();
            const virtualLiquidity = status.nextU64().unwrap();
            
            expect((houseBalance)).toBeGreaterThan(0);
            expect((roundCounter)).toBe(0);
            expect(houseEdge).toBe(0.05); // 5%
            expect((minBet)).toBe(1_000_000_000); // 1 MAS
            expect((roundDuration)).toBe(10 * 60 * 1000); // 10 min
            expect((virtualLiquidity)).toBe(1_000_000_000_000); // 1000 MAS
        });
        
        test('should create round successfully', () => {
            const result = createRound();
            const roundId = new Args(result).nextU64().unwrap();
            
            expect((roundId)).toBe(1);
            
            // Check round was created
            const roundResult = getCurrentRound();
            expect(roundResult.length).toBeGreaterThan(8); // Has data
            
            const roundArgs = new Args(roundResult);
            const currentRoundId = roundArgs.nextU64().unwrap();
            const startTime = roundArgs.nextU64().unwrap();
            const settlementTime = roundArgs.nextU64().unwrap();
            const bettingEndTime = roundArgs.nextU64().unwrap(); 
            const startPrice = roundArgs.nextF64().unwrap();
            
            expect((currentRoundId)).toBe(1);
 
            expect(startPrice).toBe(110000.0);
            expect((settlementTime - startTime)).toBe(10 * 60 * 1000);
        });
    });
    
    describe('AMM Odds System', () => {
        
        test('should calculate balanced odds for empty pools', () => {
            // Create round
            createRound();
            
            // Check initial odds
            const oddsResult = getAMMOdds(new Args()
                .add<u64>(1) // roundId
                .add<u64>(10_000_000_000) // 10 MAS bet
                .serialize()
            );
            
            const odds = new Args(oddsResult);
            const upOdds = odds.nextF64().unwrap();
            const downOdds = odds.nextF64().unwrap();
            const upPayout = odds.nextU64().unwrap();
            const downPayout = odds.nextU64().unwrap();
            const upPool = odds.nextU64().unwrap();
            const downPool = odds.nextU64().unwrap();
            
            // With empty pools, should use virtual liquidity
            expect((upPool)).toBe(0);
            expect((downPool)).toBe(0);

            // Odds should be similar (balanced)
            expect(Math.abs(upOdds - downOdds)).toBeLessThan(0.1);
            
            // Should be around 1.9x (1/0.5 * 0.95 house edge)
            expect(upOdds).toBeCloseTo(1.9, 1);
            expect(downOdds).toBeCloseTo(1.9, 1);
        });
        
        test('should handle simple betting flow', () => {
            // Create round
            createRound();
            
            // Place bet
            setDeployContext(USER1_ADDRESS);
            mockBalance(USER1_ADDRESS, 10_000_000_000);
            mockTransferredCoins(10_000_000_000); // 10 MAS
            
            const betResult = placeBet(new Args()
                .add<u64>(1) // roundId
                .add<bool>(true) // UP bet
                .serialize()
            );
            
            const bet = new Args(betResult);
            const betAmount = bet.nextU64().unwrap();
            const payout = bet.nextU64().unwrap();
            
            expect((betAmount)).toBe(10_000_000_000);
            expect((payout)).toBeGreaterThan((betAmount)); // Should win more than bet
            
            // Check user bet was recorded
            const userBetResult = getUserBet(new Args()
                .add<u64>(1) // roundId
                .add(USER1_ADDRESS)
                .serialize()
            );
            
            const userBet = new Args(userBetResult);
            userBet.nextU64(); // roundId
            userBet.nextString(); // user
            const upBets = userBet.nextU64().unwrap();
            const downBets = userBet.nextU64().unwrap();
            
            expect((upBets)).toBe(10_000_000_000);
            expect((downBets)).toBe(0);
        });
        
        test('should show different odds after imbalance', () => {
            // Create round
            createRound();
            
            // Place large UP bet to create imbalance
            setDeployContext(USER1_ADDRESS);
            mockBalance(USER1_ADDRESS, 1_000_000_000_000);
            mockTransferredCoins(50_000_000_000); // 50 MAS UP
            
            placeBet(new Args().add<u64>(1).add<bool>(true).serialize());
            
            // Check odds after imbalance
            const oddsResult = getAMMOdds(new Args()
                .add<u64>(1)
                .add<u64>(10_000_000_000) // 10 MAS potential bet
                .serialize()
            );
            
            const odds = new Args(oddsResult);
            const upOdds = odds.nextF64().unwrap();
            const downOdds = odds.nextF64().unwrap();
            
            // DOWN should have better odds (minority)
            // UP should have worse odds (majority) 
            expect(downOdds).toBeGreaterThan(upOdds);
            expect(downOdds).toBeGreaterThan(1.9); // Better than balanced
            expect(upOdds).toBeLessThan(1.9); // Worse than balanced
        });
    });
    
    describe('Settlement System', () => {
        
        test('should settle round correctly', () => {
            // Create round
            createRound();
            
            // Place some bets
            setDeployContext(USER1_ADDRESS);
            mockBalance(USER1_ADDRESS, 1_000_000_000_000);
            mockTransferredCoins(10_000_000_000); // 10 MAS UP
            placeBet(new Args().add<u64>(1).add<bool>(true).serialize());
            
            setDeployContext(USER2_ADDRESS);
            mockBalance(USER2_ADDRESS, 1_000_000_000_000);
            mockTransferredCoins(5_000_000_000); // 5 MAS DOWN  
            placeBet(new Args().add<u64>(1).add<bool>(false).serialize());
            
            // Fast forward to settlement time
            const settlementTime = 1640000000000 + (60 * 60 * 1000); // 60 min later
            mockTimestamp(settlementTime + 1000);
            
            // Update price (UP wins)
            setDeployContext(OWNER_ADDRESS);
            updateOraclePrice(new Args()
                .add<f64>(120000.0) // Higher price = UP wins
                .add<u64>((settlementTime + 1000))
                .serialize()
            );
            
            // Settle round
            const settleResult = settleRound(new Args().add<u64>(1).serialize());
            const settle = new Args(settleResult);
            const upWins = settle.nextBool().unwrap();
            const endPrice = settle.nextF64().unwrap();
            
            expect(upWins).toBe(true); // UP should win (120000 > 110000)
            expect(endPrice).toBe(120000.0);
        });
    });
      
});