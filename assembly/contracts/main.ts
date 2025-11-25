import {
    Context, 
    generateEvent, 
    Storage, 
    transferredCoins, 
    transferCoins, 
    balance, 
    call,
    findCheapestSlot,
    Slot
} from '@massalabs/massa-as-sdk';
import { Args, bytesToString, bytesToF64, u64ToBytes, stringToBytes, bytesToU64, f64ToBytes } from '@massalabs/as-types';
import {
    ownerAddress,
    setOwner,
    onlyOwner
} from '@massalabs/sc-standards/assembly/contracts/utils/ownership';

// Storage keys
const MARKET_COUNTER_KEY = stringToBytes('MARKET_COUNTER');
const MARKET_PREFIX = 'MARKET_';
const USER_BET_PREFIX = 'USER_BET_';
const HOUSE_BALANCE_KEY = stringToBytes('HOUSE_BALANCE');
const ADMIN_PREFIX = 'ADMIN_';

// Market status enum
const MARKET_STATUS_ACTIVE: u8 = 0;
const MARKET_STATUS_SETTLED: u8 = 1;

// Constants
const MIN_BET_AMOUNT: u64 = 1_000_000_000;   // 1 MAS minimum bet
const HOUSE_INITIAL_BALANCE: u64 = 100_000_000_000; // 100 MAS house reserve
const VIRTUAL_LIQUIDITY: u64 = 1_000_000_000_000; // 1000 MAS virtual liquidity for AMM
const HOUSE_EDGE: f64 = 0.05; // 5% house edge

export function constructor(_: StaticArray<u8>): void {
    if (!Context.isDeployingContract()) return;
    setOwner(new Args().add(Context.caller()).serialize());

    Storage.set(MARKET_COUNTER_KEY, u64ToBytes(0));
    Storage.set(HOUSE_BALANCE_KEY, u64ToBytes(HOUSE_INITIAL_BALANCE));

    generateEvent(`Social Media Prediction Market initialized`);
}

// Add admin (only owner can call)
export function addAdmin(binaryArgs: StaticArray<u8>): void {
    onlyOwner();

    const args = new Args(binaryArgs);
    const updaterAddress = args.nextString().expect("Admin address is required");

    const key = stringToBytes(ADMIN_PREFIX + updaterAddress);
    Storage.set(key, stringToBytes("true"));

    generateEvent(`Admin added: ${updaterAddress}`);
}

// Remove admin (only owner can call)
export function removeAdmin(binaryArgs: StaticArray<u8>): void {
    onlyOwner();

    const args = new Args(binaryArgs);
    const updaterAddress = args.nextString().expect("Admin address is required");

    const key = stringToBytes(ADMIN_PREFIX + updaterAddress);
    Storage.del(key);

    generateEvent(`Admin removed: ${updaterAddress}`);
}

// Check if address is authorized admin
function isAdmin(address: string): bool {
    const key = stringToBytes(ADMIN_PREFIX + address);
    return Storage.has(key);
}

// AMM-style payout calculation
function calculateAMMPayout(
    betAmount: u64,
    betSide: bool, // true = YES/OVER, false = NO/UNDER
    totalUpBets: u64,
    totalDownBets: u64
): u64 { 
    const adjustedUpBets = totalUpBets + VIRTUAL_LIQUIDITY;
    const adjustedDownBets = totalDownBets + VIRTUAL_LIQUIDITY;
    const totalAdjusted = adjustedUpBets + adjustedDownBets;

    let probability: f64;
    if (betSide) { // YES/OVER bet
        probability = f64(adjustedUpBets) / f64(totalAdjusted);
    } else { // NO/UNDER bet
        probability = f64(adjustedDownBets) / f64(totalAdjusted);
    }

    // Calculate fair odds and apply house edge
    const fairOdds = 1.0 / probability;
    const houseOdds = fairOdds * (1.0 - HOUSE_EDGE);

    // Ensure reasonable bounds (minimum 1.1x, maximum 5.0x)
    const clampedOdds = Math.max(1.1, Math.min(5.0, houseOdds));

    return u64(f64(betAmount) * clampedOdds);
}

// Create new market
export function createMarket(binaryArgs: StaticArray<u8>): StaticArray<u8> {
    // Check authorization (Owner or Admin)
    const caller = Context.caller().toString();
    const isOwner = caller === ownerAddress([]).toString();
    const isAuthorized = isAdmin(caller);
    assert(isOwner || isAuthorized, "Caller not authorized to create market");

    const args = new Args(binaryArgs);
    const description = args.nextString().expect("Description is required");
    const targetValue = args.nextU64().expect("Target value is required");
    const duration = args.nextU64().expect("Duration is required"); // in milliseconds
    const bettingCutoffOffset = args.nextU64().expect("Betting cutoff offset is required"); // in milliseconds before end

    const currentTime = Context.timestamp();
    
    // Generate market ID
    const marketCounter = bytesToU64(Storage.get(MARKET_COUNTER_KEY));
    const newMarketCounter = marketCounter + 1;
    const marketId = newMarketCounter;

    const settlementTime = currentTime + duration;
    const bettingEndTime = settlementTime - bettingCutoffOffset;

    assert(bettingEndTime > currentTime, "Betting end time must be in the future");

    // Create market data
    const marketData = new Args()
        .add(marketId)                   // Market ID
        .add(currentTime)                // Start time
        .add(settlementTime)             // Settlement time
        .add(bettingEndTime)             // Betting end time
        .add(description)                // Description (e.g. "Tweet 123 likes")
        .add(targetValue)                // Target value (e.g. 500)
        .add(u64(0))                     // Final value (set at settlement)
        .add(u64(0))                     // Total YES/OVER bets
        .add(u64(0))                     // Total NO/UNDER bets
        .add(u64(0))                     // House YES/OVER exposure
        .add(u64(0))                     // House NO/UNDER exposure
        .add(MARKET_STATUS_ACTIVE)       // Status
        .add(false)                      // YES/OVER wins (set at settlement)
        .serialize();

    // Store market
    const marketKey = stringToBytes(MARKET_PREFIX + marketId.toString());
    Storage.set(marketKey, marketData);
    Storage.set(MARKET_COUNTER_KEY, u64ToBytes(newMarketCounter));
    
    generateEvent(`Market ${marketId.toString()} created: "${description}" Target: ${targetValue.toString()}, Ends: ${settlementTime.toString()}`);

    return new Args().add(marketId).serialize();
}

// Place bet on active market
export function placeBet(binaryArgs: StaticArray<u8>): StaticArray<u8> {
    const args = new Args(binaryArgs);
    const marketId = args.nextU64().expect("Market ID is required");
    const betYes = args.nextBool().expect("Bet direction is required"); // true = YES/OVER, false = NO/UNDER

    const betAmount = transferredCoins();
    assert(betAmount >= MIN_BET_AMOUNT, "Bet amount below minimum");

    const user = Context.caller().toString();
    const currentTime = Context.timestamp();

    // Get market data
    const marketKey = stringToBytes(MARKET_PREFIX + marketId.toString());
    const marketData = Storage.get(marketKey);
    assert(marketData.length > 0, "Market not found");

    const marketArgs = new Args(marketData);
    const storedMarketId = marketArgs.nextU64().unwrap();
    const startTime = marketArgs.nextU64().unwrap();
    const settlementTime = marketArgs.nextU64().unwrap();
    const bettingEndTime = marketArgs.nextU64().unwrap();
    const description = marketArgs.nextString().unwrap();
    const targetValue = marketArgs.nextU64().unwrap();
    const finalValue = marketArgs.nextU64().unwrap();
    let totalYesBets = marketArgs.nextU64().unwrap();
    let totalNoBets = marketArgs.nextU64().unwrap();
    let houseYesExposure = marketArgs.nextU64().unwrap();
    let houseNoExposure = marketArgs.nextU64().unwrap();
    const status = marketArgs.nextU8().unwrap();
    const yesWins = marketArgs.nextBool().unwrap();

    // Validate betting is allowed
    assert(status === MARKET_STATUS_ACTIVE, "Market not active");
    assert(currentTime <= bettingEndTime, "Betting period ended");

    // Calculate AMM-style payout based on current pool balance
    const potentialPayout = calculateAMMPayout(betAmount, betYes, totalYesBets, totalNoBets);
    const houseRisk = potentialPayout > betAmount ? potentialPayout - betAmount : u64(0); // House's potential loss

    // Check house has sufficient balance
    const houseBalance = bytesToU64(Storage.get(HOUSE_BALANCE_KEY));
    const newHouseExposure = betYes ? houseYesExposure + houseRisk : houseNoExposure + houseRisk;
    assert(newHouseExposure <= houseBalance, "House insufficient liquidity");

    // Update market data
    if (betYes) {
        totalYesBets += betAmount;
        houseYesExposure += houseRisk;
    } else {
        totalNoBets += betAmount;
        houseNoExposure += houseRisk;
    }

    const updatedMarketData = new Args()
        .add(storedMarketId)
        .add(startTime)
        .add(settlementTime)
        .add(bettingEndTime)
        .add(description)
        .add(targetValue)
        .add(finalValue)
        .add(totalYesBets)
        .add(totalNoBets)
        .add(houseYesExposure)
        .add(houseNoExposure)
        .add(status)
        .add(yesWins)
        .serialize();

    Storage.set(marketKey, updatedMarketData);

    // Store user bet
    const betKey = stringToBytes(USER_BET_PREFIX + marketId.toString() + "_" + user);

    let userYesBets: u64 = 0;
    let userNoBets: u64 = 0;

    if (Storage.has(betKey)) {
        const existingBetData = Storage.get(betKey);
        const existingBetArgs = new Args(existingBetData);
        existingBetArgs.nextU64(); // marketId
        existingBetArgs.nextString(); // user
        userYesBets = existingBetArgs.nextU64().unwrap();
        userNoBets = existingBetArgs.nextU64().unwrap();
    }

    if (betYes) {
        userYesBets += betAmount;
    } else {
        userNoBets += betAmount;
    }

    const userBetData = new Args()
        .add(marketId)
        .add(user)
        .add(userYesBets)
        .add(userNoBets)
        .serialize();

    Storage.set(betKey, userBetData);

    // House collects the bet immediately
    const newHouseBalance = houseBalance + betAmount;
    Storage.set(HOUSE_BALANCE_KEY, u64ToBytes(newHouseBalance));

    const direction = betYes ? "YES/OVER" : "NO/UNDER";
    generateEvent(`Bet placed: Market ${marketId.toString()}, User ${user}, ${direction}, Amount ${betAmount.toString()}, Potential payout ${potentialPayout.toString()}`);

    return new Args().add(betAmount).add(potentialPayout).serialize();
}

// Resolve market (called by admin/oracle)
export function resolveMarket(binaryArgs: StaticArray<u8>): StaticArray<u8> {
    const caller = Context.caller().toString();
    const isOwner = caller === ownerAddress([]).toString();
    const isAuthorized = isAdmin(caller);
    assert(isOwner || isAuthorized, "Caller not authorized to resolve market");

    const args = new Args(binaryArgs);
    const marketId = args.nextU64().expect("Market ID is required");
    const actualFinalValue = args.nextU64().expect("Final value is required");

    const currentTime = Context.timestamp();

    // Get market data
    const marketKey = stringToBytes(MARKET_PREFIX + marketId.toString());
    const marketData = Storage.get(marketKey);
    assert(marketData.length > 0, "Market not found");

    const marketArgs = new Args(marketData);
    const storedMarketId = marketArgs.nextU64().unwrap();
    const startTime = marketArgs.nextU64().unwrap();
    const settlementTime = marketArgs.nextU64().unwrap();
    const bettingEndTime = marketArgs.nextU64().unwrap();
    const description = marketArgs.nextString().unwrap();
    const targetValue = marketArgs.nextU64().unwrap();
    let finalValue = marketArgs.nextU64().unwrap();
    const totalYesBets = marketArgs.nextU64().unwrap();
    const totalNoBets = marketArgs.nextU64().unwrap();
    const houseYesExposure = marketArgs.nextU64().unwrap();
    const houseNoExposure = marketArgs.nextU64().unwrap();
    let status = marketArgs.nextU8().unwrap();
    let yesWins = marketArgs.nextBool().unwrap();

    // Validate settlement is allowed
    assert(status !== MARKET_STATUS_SETTLED, "Market already settled");
    // Note: We allow early resolution if the event happened, or we can enforce time. 
    // For now, let's trust the Oracle to resolve when appropriate.
    
    // Determine winner
    // YES/OVER wins if actual value >= target value
    yesWins = actualFinalValue >= targetValue;
    status = MARKET_STATUS_SETTLED;
    finalValue = actualFinalValue;

    // Calculate house P&L using AMM payouts
    let housePayout: u64 = 0;
    if (yesWins && totalYesBets > 0) {
        // YES wins - calculate total payout for all YES bettors using AMM
        housePayout = houseYesExposure; // Use pre-calculated exposure
    } else if (!yesWins && totalNoBets > 0) {
        // NO wins - calculate total payout for all NO bettors using AMM
        housePayout = houseNoExposure; // Use pre-calculated exposure
    }

    // Update house balance
    const houseBalance = bytesToU64(Storage.get(HOUSE_BALANCE_KEY));
    let newHouseBalance = houseBalance;

    if (housePayout > 0) {
        assert(houseBalance >= housePayout, "House insufficient balance for payout");
        newHouseBalance = houseBalance - housePayout;
    }

    Storage.set(HOUSE_BALANCE_KEY, u64ToBytes(newHouseBalance));

    // Update market data
    const settledMarketData = new Args()
        .add(storedMarketId)
        .add(startTime)
        .add(settlementTime)
        .add(bettingEndTime)
        .add(description)
        .add(targetValue)
        .add(finalValue)
        .add(totalYesBets)
        .add(totalNoBets)
        .add(houseYesExposure)
        .add(houseNoExposure)
        .add(status)
        .add(yesWins)
        .serialize();

    Storage.set(marketKey, settledMarketData);

    const winDirection = yesWins ? "YES/OVER" : "NO/UNDER";
    const housePnL = i64(houseBalance + totalYesBets + totalNoBets - newHouseBalance - housePayout);

    generateEvent(`Market ${marketId.toString()} settled: Result ${finalValue.toString()}, Winner ${winDirection}, House P&L ${housePnL.toString()}`);

    return new Args().add(yesWins).add(finalValue).add(housePayout).serialize();
}

// Claim winnings from settled market
export function claimWinnings(binaryArgs: StaticArray<u8>): StaticArray<u8> {
    const args = new Args(binaryArgs);
    const marketId = args.nextU64().expect("Market ID is required");

    const user = Context.caller().toString();

    // Get market data for AMM calculation
    const marketKey = stringToBytes(MARKET_PREFIX + marketId.toString());
    const marketData = Storage.get(marketKey);
    assert(marketData.length > 0, "Market not found");

    const marketArgs = new Args(marketData);
    marketArgs.nextU64(); // marketId
    marketArgs.nextU64(); // startTime
    marketArgs.nextU64(); // settlementTime
    marketArgs.nextU64(); // bettingEndTime
    marketArgs.nextString(); // description
    marketArgs.nextU64(); // targetValue
    marketArgs.nextU64(); // finalValue
    const totalYesBets = marketArgs.nextU64().unwrap();
    const totalNoBets = marketArgs.nextU64().unwrap();
    marketArgs.nextU64(); // houseYesExposure
    marketArgs.nextU64(); // houseNoExposure
    const status = marketArgs.nextU8().unwrap();
    const yesWins = marketArgs.nextBool().unwrap();

    assert(status === MARKET_STATUS_SETTLED, "Market not settled yet");

    // Get user bet
    const betKey = stringToBytes(USER_BET_PREFIX + marketId.toString() + "_" + user);

    assert(Storage.has(betKey), "No bet found for user");
    const betData = Storage.get(betKey);

    const betArgs = new Args(betData);
    betArgs.nextU64(); // marketId
    betArgs.nextString(); // user
    const userYesBets = betArgs.nextU64().unwrap();
    const userNoBets = betArgs.nextU64().unwrap();

    // Calculate winnings using AMM odds at time of bet
    let winnings: u64 = 0;
    if (yesWins && userYesBets > 0) {
        // Calculate what the payout would have been for this YES bet
        winnings = calculateAMMPayout(userYesBets, true, totalYesBets - userYesBets, totalNoBets);
    } else if (!yesWins && userNoBets > 0) {
        // Calculate what the payout would have been for this NO bet
        winnings = calculateAMMPayout(userNoBets, false, totalYesBets, totalNoBets - userNoBets);
    }

    assert(winnings > 0, "No winnings to claim");

    // Check if already claimed
    const claimedKey = stringToBytes(USER_BET_PREFIX + marketId.toString() + "_" + user + "_claimed");
    assert(!Storage.has(claimedKey), "Winnings already claimed");

    // Mark as claimed
    Storage.set(claimedKey, stringToBytes("true"));

    // Transfer winnings
    transferCoins(Context.caller(), winnings);

    generateEvent(`Winnings claimed: Market ${marketId.toString()}, User ${user}, Amount ${winnings.toString()}`);

    return new Args().add(winnings).serialize();
}

// Get market details
export function getMarketDetails(binaryArgs: StaticArray<u8>): StaticArray<u8> {
    const args = new Args(binaryArgs);
    const marketId = args.nextU64().expect("Market ID is required");

    const marketKey = stringToBytes(MARKET_PREFIX + marketId.toString());
    const marketData = Storage.get(marketKey);
    assert(marketData.length > 0, "Market not found");

    return marketData; // Return complete market data
}

// Get user bet for specific market
export function getUserBet(binaryArgs: StaticArray<u8>): StaticArray<u8> {
    const args = new Args(binaryArgs);
    const marketId = args.nextU64().expect("Market ID is required");
    const userAddress = args.nextString().expect("User address is required");

    const betKey = stringToBytes(USER_BET_PREFIX + marketId.toString() + "_" + userAddress);

    if (Storage.has(betKey)) {
        const betData = Storage.get(betKey);
        return betData;
    } else {
        // Return empty bet
        return new Args().add(marketId).add(userAddress).add(u64(0)).add(u64(0)).serialize();
    }  
}

// Get current AMM odds for a potential bet (read-only)
export function getAMMOdds(binaryArgs: StaticArray<u8>): StaticArray<u8> {
    const args = new Args(binaryArgs);
    const marketId = args.nextU64().expect("Market ID is required");
    const betAmount = args.nextU64().expect("Bet amount is required");

    // Get market data
    const marketKey = stringToBytes(MARKET_PREFIX + marketId.toString());
    
    assert(Storage.has(marketKey), "Market not found");
    const marketData = Storage.get(marketKey);

    const marketArgs = new Args(marketData);
    marketArgs.nextU64(); // marketId
    marketArgs.nextU64(); // startTime
    marketArgs.nextU64(); // settlementTime
    marketArgs.nextU64(); // bettingEndTime
    marketArgs.nextString(); // description
    marketArgs.nextU64(); // targetValue
    marketArgs.nextU64(); // finalValue
    const totalYesBets = marketArgs.nextU64().unwrap();
    const totalNoBets = marketArgs.nextU64().unwrap();

    // Calculate potential payouts for both directions
    const yesPayout = calculateAMMPayout(betAmount, true, totalYesBets, totalNoBets);
    const noPayout = calculateAMMPayout(betAmount, false, totalYesBets, totalNoBets);

    // Calculate odds (payout / bet amount)
    const yesOdds = f64(yesPayout) / f64(betAmount);
    const noOdds = f64(noPayout) / f64(betAmount);

    return new Args()
        .add(yesOdds)         // YES odds multiplier
        .add(noOdds)          // NO odds multiplier  
        .add(yesPayout)       // YES potential payout
        .add(noPayout)        // NO potential payout
        .add(totalYesBets)    // Current YES pool
        .add(totalNoBets)     // Current NO pool
        .serialize();
}

// Get house status
export function getHouseStatus(): StaticArray<u8> {
    const houseBalance = bytesToU64(Storage.get(HOUSE_BALANCE_KEY));
    const marketCounter = bytesToU64(Storage.get(MARKET_COUNTER_KEY));

    return new Args()
        .add(houseBalance)
        .add(marketCounter)
        .add(HOUSE_EDGE)           // House edge percentage
        .add(MIN_BET_AMOUNT)
        .add(VIRTUAL_LIQUIDITY)    // Virtual liquidity for AMM
        .serialize();
}

// Add funds to house (only admin)
export function addHouseFunds(): StaticArray<u8> {

    const caller = Context.caller().toString();
    const isOwner = caller === ownerAddress([]).toString();
    const isAuthorized = isAdmin(caller);

    assert(isOwner || isAuthorized, "Caller not authorized to add funds");

    const additionalFunds = transferredCoins();
    assert(additionalFunds > 0, "Must send MAS to add funds");

    const currentBalance = bytesToU64(Storage.get(HOUSE_BALANCE_KEY));
    const newBalance = currentBalance + additionalFunds;

    Storage.set(HOUSE_BALANCE_KEY, u64ToBytes(newBalance));

    generateEvent(`House funds added: ${additionalFunds.toString()}, New balance: ${newBalance.toString()}`);

    return new Args().add(newBalance).serialize();
}

// Withdraw house funds (only admin)
export function withdrawHouseFunds(binaryArgs: StaticArray<u8>): StaticArray<u8> {
    const caller = Context.caller().toString();
    const isOwner = caller === ownerAddress([]).toString();
    const isAuthorized = isAdmin(caller);

    assert(isOwner || isAuthorized, "Caller not authorized to withdraw funds");

    const args = new Args(binaryArgs);
    const amount = args.nextU64().expect("Amount is required");

    const currentBalance = bytesToU64(Storage.get(HOUSE_BALANCE_KEY));
    assert(amount <= currentBalance, "Insufficient house balance");

    // Keep minimum reserve for ongoing markets
    const minReserve = HOUSE_INITIAL_BALANCE / 10; // 10% of initial
    assert(currentBalance - amount >= minReserve, "Cannot withdraw below minimum reserve");

    const newBalance = currentBalance - amount;
    Storage.set(HOUSE_BALANCE_KEY, u64ToBytes(newBalance));

    transferCoins(Context.caller(), amount);

    generateEvent(`House funds withdrawn: ${amount.toString()}, Remaining balance: ${newBalance.toString()}`);

    return new Args().add(newBalance).serialize();
}
