import {ethers} from 'ethers';
import {expectRevert} from 'magmo-devtools';
// @ts-ignore
import ETHAssetHolderArtifact from '../../build/contracts/ETHAssetHolder.json';
import {setupContracts, newDepositedEvent} from '../test-helpers';

const provider = new ethers.providers.JsonRpcProvider(
  `http://localhost:${process.env.DEV_GANACHE_PORT}`,
);
const signer = provider.getSigner(0);
let ETHAssetHolder: ethers.Contract;
let depositedEvent;

beforeAll(async () => {
  ETHAssetHolder = await setupContracts(provider, ETHAssetHolderArtifact);
});

const description1 = 'Deposits ETH (msg.value = amount , expectedHeld = 0)';
const description2 = 'Reverts deposit of ETH (msg.value = amount, expectedHeld > holdings)';
const description3 = 'Deposits ETH (msg.value = amount, expectedHeld + amount < holdings)';
const description4 =
  'Deposits ETH (msg.value = amount,  amount < holdings < amount + expectedHeld)';

// amounts are valueString represenationa of wei
describe('deposit', () => {
  it.each`
    description     | destinationType       | held   | expectedHeld | amount | msgValue | heldAfter | reasonString
    ${description1} | ${'randomEOABytes32'} | ${'0'} | ${'0'}       | ${'1'} | ${'1'}   | ${'1'}    | ${undefined}
    ${description2} | ${'randomEOABytes32'} | ${'0'} | ${'1'}       | ${'2'} | ${'2'}   | ${'0'}    | ${'Deposit | holdings[destination] is less than expected'}
    ${description3} | ${'randomEOABytes32'} | ${'3'} | ${'1'}       | ${'1'} | ${'1'}   | ${'3'}    | ${'Deposit | holdings[destination] already meets or exceeds expectedHeld + amount'}
    ${description4} | ${'randomEOABytes32'} | ${'3'} | ${'2'}       | ${'2'} | ${'2'}   | ${'4'}    | ${undefined}
  `(
    '$description', // for the purposes of this test, chainId and participants are fixed, making channelId 1-1 with channelNonce
    async ({destinationType, held, expectedHeld, amount, msgValue, reasonString, heldAfter}) => {
      held = ethers.utils.parseUnits(held, 'wei');
      expectedHeld = ethers.utils.parseUnits(expectedHeld, 'wei');
      amount = ethers.utils.parseUnits(amount, 'wei');
      msgValue = ethers.utils.parseUnits(msgValue, 'wei');
      heldAfter = ethers.utils.parseUnits(heldAfter, 'wei');

      let destination;
      if (destinationType === 'randomEOABytes32') {
        const randomAddress = ethers.Wallet.createRandom().address;
        destination = randomAddress.padEnd(66, '0');
      }

      // set holdings by depositing in the 'safest' way
      if (held > 0) {
        await (await ETHAssetHolder.deposit(destination, 0, held, {
          value: held,
        })).wait();
        expect(await ETHAssetHolder.holdings(destination)).toEqual(held);
      }

      // call method in a slightly different way if expecting a revert
      if (reasonString) {
        const regex = new RegExp(
          '^' + 'VM Exception while processing transaction: revert ' + reasonString + '$',
        );
        await expectRevert(
          () =>
            ETHAssetHolder.deposit(destination, expectedHeld, amount, {
              value: msgValue,
            }),
          regex,
        );
      } else {
        depositedEvent = newDepositedEvent(ETHAssetHolder, destination);
        const balanceBefore = await signer.getBalance();
        const tx = await ETHAssetHolder.deposit(destination, expectedHeld, amount, {
          value: msgValue,
        });
        // wait for tx to be mined
        const receipt = await tx.wait();

        // catch Deposited event
        const [eventDestination, eventAmountDeposited, eventHoldings] = await depositedEvent;
        expect(eventDestination.toUpperCase()).toMatch(destination.toUpperCase());
        expect(eventAmountDeposited).toEqual(heldAfter.sub(held));
        expect(eventHoldings).toEqual(heldAfter);

        const allocatedAmount = await ETHAssetHolder.holdings(destination);
        await expect(allocatedAmount).toEqual(heldAfter);

        // check for any partial refund
        const gasCost = await tx.gasPrice.mul(receipt.cumulativeGasUsed);
        await expect(await signer.getBalance()).toEqual(
          balanceBefore.sub(eventAmountDeposited).sub(gasCost),
        );
      }
    },
  );
});
