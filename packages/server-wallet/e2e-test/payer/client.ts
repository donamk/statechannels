import {AddressZero} from '@ethersproject/constants';
import axios from 'axios';
import {ChannelResult, Participant} from '@statechannels/client-api-schema';
import {Wallet} from 'ethers';
import {makeDestination, BN, Message} from '@statechannels/wallet-core';
import {Message as WireMessage} from '@statechannels/wire-format';

import walletConfig from '../../src/config';
import {Wallet as ServerWallet} from '../../src';
import {Bytes32, Address} from '../../src/type-aliases';

export default class PayerClient {
  private readonly wallet: ServerWallet = new ServerWallet();

  constructor(private readonly pk: Bytes32, private readonly receiverHttpServerURL: string) {}

  public readonly participantId = 'payer';

  public get address(): Address {
    return new Wallet(this.pk).address;
  }

  public get destination(): Address {
    return makeDestination(this.address);
  }

  public get me(): Participant {
    const {address: signingAddress, destination, participantId} = this;
    return {
      signingAddress,
      destination,
      participantId,
    };
  }

  public async getReceiversParticipantInfo(): Promise<Participant> {
    const {data: participant} = await axios.get<Participant>(
      `${this.receiverHttpServerURL}/participant`
    );
    return participant;
  }

  public async getChannel(channelId: string): Promise<ChannelResult> {
    const {channelResult: channel} = await this.wallet.getState({channelId});

    return channel;
  }

  public async getChannels(): Promise<ChannelResult[]> {
    const {channelResults} = await this.wallet.getChannels();
    return channelResults;
  }

  public async createPayerChannel(receiver: Participant): Promise<ChannelResult> {
    const {
      outbox: [{params}],
      channelResult: {channelId},
    } = await this.wallet.createChannel({
      appData: '0x',
      appDefinition: AddressZero,
      fundingStrategy: 'Direct',
      participants: [this.me, receiver],
      allocations: [
        {
          token: AddressZero,
          allocationItems: [
            {
              amount: BN.from(0),
              destination: this.destination,
            },
            {amount: BN.from(0), destination: receiver.destination},
          ],
        },
      ],
    });

    const reply = await this.messageReceiverAndExpectReply((params as WireMessage).data as Message);

    await this.wallet.pushMessage(reply);

    const {channelResult} = await this.wallet.getState({channelId});

    return channelResult;
  }

  public async makePayment(channelId: string): Promise<void> {
    const channel = await time(`get channel ${channelId}`, async () => this.getChannel(channelId));

    // Assuming MessageQueued inside the outbox
    const {
      outbox: [{params}],
    } = await time(`update ${channelId}`, async () => this.wallet.updateChannel(channel));

    const reply = await time(`send message ${channelId}`, async () =>
      this.messageReceiverAndExpectReply((params as WireMessage).data as Message)
    );

    await time(`push message ${channelId}`, async () => this.wallet.pushMessage(reply));
  }

  public emptyMessage(): Promise<Message> {
    return this.messageReceiverAndExpectReply({
      signedStates: [],
      objectives: [],
    });
  }

  private async messageReceiverAndExpectReply(message: Message): Promise<Message> {
    const {data: reply} = await axios.post(this.receiverHttpServerURL + '/inbox', {message});
    return reply;
  }
}

async function time<T>(label: string, cb: () => Promise<T>): Promise<T> {
  if (walletConfig.timingMetrics) {
    console.time(label);
    const result = await cb();
    console.timeEnd(label);
    return result;
  } else {
    return await cb();
  }
}
