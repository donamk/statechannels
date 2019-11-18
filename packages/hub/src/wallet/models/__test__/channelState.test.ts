import {encodeConsensusData, State} from '@statechannels/nitro-protocol';
import {
  allocationOutcome2,
  DUMMY_RULES_ADDRESS,
  guaranteeOutcome2
} from '../../../test/test-constants';
import {
  consensus_app_data2,
  FUNDED_NONCE_CHANNEL_ID,
  FUNDED_NONCE_GUARANTOR_CHANNEL_ID,
  fundedChannel,
  fundedGuarantorChannel
} from '../../../test/test_data';
import Channel from '../channel';
import ChannelState from '../channelState';

async function getChannelStates(channelId): Promise<State> {
  const channel = await Channel.query()
    .where({channel_id: channelId})
    .select('id')
    .first();
  expect(channel).toBeTruthy();
  const channelState: ChannelState = await ChannelState.query()
    .where({
      channel_id: channel.id,
      turn_num: 0
    })
    .eager('[channel.[participants], outcome.[allocation]]')
    .select()
    .first();
  return channelState.asStateObject();
}

describe('asStateObject', () => {
  it('allocation channelState relation to object conversion', async () => {
    const state = await getChannelStates(FUNDED_NONCE_CHANNEL_ID);

    const expectedState: State = {
      turnNum: 0,
      isFinal: false,
      channel: fundedChannel,
      challengeDuration: 1000,
      outcome: allocationOutcome2,
      appDefinition: DUMMY_RULES_ADDRESS,
      appData: encodeConsensusData(consensus_app_data2(2))
    };

    expect(state).toMatchObject(expectedState);
  });

  it('guarantor channelState relation to object conversion', async () => {
    const state = await getChannelStates(FUNDED_NONCE_GUARANTOR_CHANNEL_ID);

    const expectedState: State = {
      turnNum: 0,
      isFinal: false,
      channel: fundedGuarantorChannel,
      challengeDuration: 1000,
      outcome: guaranteeOutcome2,
      appDefinition: DUMMY_RULES_ADDRESS,
      appData: encodeConsensusData(consensus_app_data2(2))
    };

    expect(state).toMatchObject(expectedState);
  });
});