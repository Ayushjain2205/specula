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

console.log('Checking history...');

// Get events to see the market ID
const events = await provider.getEvents({
    smartContractAddress: CONTRACT_ADDR
});

for (const event of events) {
    console.log(
        `Event: "${event.data}" `,
    );
}