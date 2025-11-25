import 'dotenv/config';
import {
  Account,
  Args,
  Mas,
  SmartContract,
  JsonRpcProvider,
} from '@massalabs/massa-web3';

// Contract address from deployment (User needs to update this or we can pass it)
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

if (!CONTRACT_ADDRESS) {
  console.error('Please set CONTRACT_ADDRESS in .env');
  process.exit(1);
}

const account = await Account.fromEnv();
const provider = JsonRpcProvider.buildnet(account);

console.log('Using account:', account.address);
console.log('Creating market on contract:', CONTRACT_ADDRESS);

const description = "Will this tweet get 500 likes?";
const targetValue = BigInt(500);
const duration = BigInt(60 * 60 * 1000); // 1 hour
const bettingCutoff = BigInt(10 * 60 * 1000); // 10 mins before end

const args = new Args()
  .addString(description)
  .addU64(targetValue)
  .addU64(duration)
  .addU64(bettingCutoff);

const operation = await provider.callSC({
  func: 'createMarket',
  target: CONTRACT_ADDRESS,
  parameter: args,
  coins: Mas.fromString('0'),
});

console.log('Operation ID:', operation.id);

// Wait for finality
const status = await operation.waitSpeculativeExecution();
console.log('Speculative execution status:', status);

const events = await provider.getEvents({
  smartContractAddress: CONTRACT_ADDRESS,
});

// Filter for recent events
const recentEvents = events.filter(e => e.context.call_stack.includes(CONTRACT_ADDRESS));
for (const event of recentEvents.slice(-3)) {
  console.log('Recent Event:', event.data);
}
