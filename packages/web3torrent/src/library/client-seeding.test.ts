import MemoryChunkStore from 'memory-chunk-store';
import {
  defaultFile,
  defaultFileMagnetURI,
  defaultSeedingOptions,
  defaultTorrentHash,
  mockMetamask
} from './testing/test-utils';
import WebTorrentPaidStreamingClient, {ClientEvents, PaidStreamingTorrent} from './web3torrent-lib';
import {PaymentChannelClient} from '../clients/payment-channel-client';
import {ChannelClient, FakeChannelProvider} from '@statechannels/channel-client';

async function defaultClient(): Promise<WebTorrentPaidStreamingClient> {
  const client = new WebTorrentPaidStreamingClient({
    dht: false,
    paymentChannelClient: new PaymentChannelClient(new ChannelClient(new FakeChannelProvider()))
  });
  client.on('error', err => fail(err));
  client.on('warning', err => fail(err));
  client.paymentChannelClient.channelCache = {};
  await client.enable();

  return client;
}

describe('Seeding and Leeching', () => {
  let seeder: WebTorrentPaidStreamingClient;
  let leecher: WebTorrentPaidStreamingClient;

  beforeAll(() => {
    mockMetamask();
  });

  beforeEach(async () => {
    seeder = await defaultClient();
    leecher = await defaultClient();
  });

  it('should throw when the client is not enabled', async done => {
    await seeder.disable();
    expect(() => {
      seeder.seed(defaultFile as File, defaultSeedingOptions(false));
    }).toThrow();
    done();
  });

  it('should seed and remove a Torrent', done => {
    seeder.seed(defaultFile as File, defaultSeedingOptions(false), seededTorrent => {
      expect(seeder.torrents.length).toEqual(1);
      expect(seededTorrent.infoHash).toEqual(defaultTorrentHash);
      expect(seededTorrent.magnetURI).toEqual(defaultFileMagnetURI);
      expect((seededTorrent as PaidStreamingTorrent).usingPaidStreaming).toBe(true);
      done();
    });
  });

  it('should perform the extended handshake between seeder and leecher', done => {
    seeder.seed(defaultFile as File, defaultSeedingOptions(), seededTorrent => {
      leecher.add(seededTorrent.magnetURI, {store: MemoryChunkStore}, () => {
        expect(leecher.torrents.length).toEqual(1);
        expect(seeder.torrents[0].wires.length).toEqual(1);
        expect(leecher.torrents[0].wires.length).toEqual(1);
        expect(
          leecher.torrents[0].wires.some(
            wire =>
              wire.paidStreamingExtension.peerAccount === seeder.pseAccount &&
              wire.paidStreamingExtension.pseAccount === leecher.pseAccount
          )
        ).toBe(true);
        done();
      });
    });
  }, 10000);

  it('should reach a ready-for-leeching, choked state', done => {
    seeder.seed(defaultFile as File, defaultSeedingOptions(), seededTorrent => {
      seeder.once(ClientEvents.PEER_STATUS_CHANGED, ({torrentPeers}) => {
        expect(torrentPeers[`${leecher.pseAccount}`].allowed).toEqual(false);
        done();
      });
      leecher.add(seededTorrent.magnetURI, {store: MemoryChunkStore});
    });
  }, 10000);

  it('should be able to unchoke and finish a download', async done => {
    seeder.seed(defaultFile as File, defaultSeedingOptions(), seededTorrent => {
      seeder.once(ClientEvents.PEER_STATUS_CHANGED, ({peerAccount}) => {
        seeder.once(ClientEvents.PEER_STATUS_CHANGED, ({torrentPeers}) => {
          expect(torrentPeers[`${leecher.pseAccount}`].allowed).toEqual(true);
        });
        seeder.togglePeer(seededTorrent.infoHash, peerAccount);

        leecher.once(ClientEvents.TORRENT_DONE, ({torrent: leechedTorrent}) => {
          expect(seededTorrent.files[0].done).toEqual(leechedTorrent.files[0].done);
          expect(seededTorrent.files[0].length).toEqual(leechedTorrent.files[0].length);
          expect(seededTorrent.files[0].name).toEqual(leechedTorrent.files[0].name);
          done();
        });
      });

      leecher.add(seededTorrent.magnetURI, {store: MemoryChunkStore});
    });
  }, 10000);

  it('should support multiple leechers finishing their downloads', async done => {
    const leecherA = await defaultClient();
    const leecherB = await defaultClient();
    let finishCount = 0;

    seeder.seed(defaultFile as File, defaultSeedingOptions(), seededTorrent => {
      seeder.once(ClientEvents.PEER_STATUS_CHANGED, ({peerAccount}) => {
        seeder.togglePeer(seededTorrent.infoHash, peerAccount);
      });
      leecherA.add(seededTorrent.magnetURI, {store: MemoryChunkStore});
      leecherB.add(seededTorrent.magnetURI, {store: MemoryChunkStore});
    });

    async function downloadFinished() {
      finishCount += 1;
      if (finishCount == 2) {
        done();
      }
    }

    leecherA.once(ClientEvents.TORRENT_DONE, downloadFinished);
    leecherB.once(ClientEvents.TORRENT_DONE, downloadFinished);
  }, 10000);

  afterEach(() => {
    seeder.destroy();
    leecher.destroy();
  });
});
