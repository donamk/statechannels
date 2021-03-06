import {Wallet} from 'ethers';
import {AddressZero} from '@ethersproject/constants';
import {State, simpleEthAllocation, signState} from '@statechannels/wallet-core';
import _ from 'lodash';

import {participant} from '../../wallet/__test__/fixtures/participants';
import {fastSignState} from '../signatures';
import {logger} from '../../logger';

it('sign vs fastSign', async () => {
  _.range(5).map(async channelNonce => {
    const {address, privateKey} = Wallet.createRandom();
    const state: State = {
      chainId: '0x1',
      channelNonce,
      participants: [participant({signingAddress: address})],
      outcome: simpleEthAllocation([]),
      turnNum: 1,
      isFinal: false,
      appData: '0x0',
      appDefinition: AddressZero,
      challengeDuration: 0x5,
    };

    const signedState = signState(state, privateKey);
    const fastSignedState = fastSignState(state, privateKey);
    try {
      expect(signedState).toEqual((await fastSignedState).signature);
    } catch (error) {
      logger.info({error, state, privateKey});
      throw error;
    }
  });
});
