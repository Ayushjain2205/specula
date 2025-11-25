import 'dotenv/config';
import {
  Account,
  Args,
  Mas,
  JsonRpcProvider,
} from '@massalabs/massa-web3';

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

if (!CONTRACT_ADDRESS) {
  console.error('Please set CONTRACT_ADDRESS in .env');
  process.exit(1);
}

const account = await Account.fromEnv();
const provider = JsonRpcProvider.buildnet(account);

const adminAddress = account.address.toString();
console.log('Adding admin:', adminAddress);
console.log('To contract:', CONTRACT_ADDRESS);

const args = new Args().addString(adminAddress);

const operation = await provider.callSC({
  func: 'addAdmin',
  target: CONTRACT_ADDRESS,
  parameter: args,
  coins: Mas.fromString('0'),
});

console.log('Operation ID:', operation.id);

const status = await operation.waitSpeculativeExecution();
console.log('Status:', status);

const events = await provider.getEvents({
  smartContractAddress: CONTRACT_ADDRESS,
});

for (const event of events.slice(-3)) {
  console.log('Event:', event.data);
}
