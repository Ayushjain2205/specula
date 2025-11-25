import 'dotenv/config';
import {
    Account,
    Args,
    Mas,
    SmartContract,
    OperationStatus,
    JsonRpcProvider,
} from '@massalabs/massa-web3';

const CONTRACT_ADDR = process.env.CONTRACT_ADDRESS || "AS12qRyc2fXDde1fqLXyDLTqUGR7dytiCQzd5V382ubyPCLcoHbu3";

// BTC Price to set (you can change this or pass as command line argument)
const BTC_PRICE = process.argv[2] ? parseFloat(process.argv[2]) : 114574.36;

const account = await Account.fromEnv();
const provider = JsonRpcProvider.buildnet(account);

console.log('Setting oracle price...');
console.log('Contract:', CONTRACT_ADDR);
console.log('New BTC Price:', BTC_PRICE);

// Get current timestamp
const currentTimestamp = Date.now() - 60 * 1000;
console.log('Timestamp:', currentTimestamp);

// Create arguments: price (f64) and timestamp (u64)
const args = new Args()
    .addF64(BTC_PRICE)
    .addU64(BigInt(currentTimestamp))
    .serialize();

const mainContract = new SmartContract(provider, CONTRACT_ADDR);
 
const operation = await mainContract.call(
    'updateOraclePrice',
    args,
    { coins: Mas.fromString('0') }
);

console.log('Operation submitted:', operation.id);
console.log('Waiting for operation to be finalized...');

const status = await operation.waitFinalExecution();
console.log('Operation status:', OperationStatus[status]);

if (status !== OperationStatus.Success) {
    throw new Error('Operation failed');
}

// Get events to confirm the update
const events = await provider.getEvents({
    smartContractAddress: CONTRACT_ADDR,
    operationId: operation.id,
});

console.log('\nEvents:');
for (const event of events) {
    console.log(
        `Event: "${event.data}" received for operation: ${event.context.origin_operation_id}`,
    );
}

console.log('\n✅ Oracle price updated successfully!');
console.log(`New BTC Price: $${BTC_PRICE}`);
