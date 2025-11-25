import 'dotenv/config';
import {
    Account,
    Args,
    Mas,
    SmartContract,
    OperationStatus,
    JsonRpcProvider,
    bytesToStr
} from '@massalabs/massa-web3';

const CONTRACT_ADDR = process.env.CONTRACT_ADDRESS || "AS12qRyc2fXDde1fqLXyDLTqUGR7dytiCQzd5V382ubyPCLcoHbu3";

const account = await Account.fromEnv();
const provider = JsonRpcProvider.buildnet(account);

console.log('Enabling automation...');

// Create arguments
const args = new Args()
    .addBool(true)
    .serialize();

const mainContract = new SmartContract(provider, CONTRACT_ADDR);
 
const operation = await mainContract.call(
    'setAutomation',
    args,
    { coins: Mas.fromString('0.1') }  
);

console.log('Waiting for operation to be finalized...');
const status = await operation.waitFinalExecution();
console.log('Operation status:', OperationStatus[status]);

if (status !== OperationStatus.Success) {
    throw new Error('Operation failed');
}

// Get events to see the market ID
const events = await provider.getEvents({
    smartContractAddress: CONTRACT_ADDR,
    operationId: operation.id,
});

for (const event of events) {
    console.log(
        `Event: "${event.data}" received for operation: ${event.context.origin_operation_id}`,
    );
}