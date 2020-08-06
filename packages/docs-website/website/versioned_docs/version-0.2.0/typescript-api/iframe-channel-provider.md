---
id: version-0.2.0-iframe-channel-provider
title: iframe-channel-provider package
hide_title: true
original_id: iframe-channel-provider
---
<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[@statechannels/iframe-channel-provider](./iframe-channel-provider.md)

## iframe-channel-provider package

Communicate with a statechannels wallet via JSON-RPC over postMessage

## Remarks

Attaches a channelProvider to the window object.

## Classes

|  Class | Description |
|  --- | --- |
|  [IFrameChannelProvider](./iframe-channel-provider.iframechannelprovider.md) | <b><i>(BETA)</i></b> Class for interacting with a statechannels wallet |

## Interfaces

|  Interface | Description |
|  --- | --- |
|  [ChannelProviderInterface](./iframe-channel-provider.channelproviderinterface.md) | <b><i>(BETA)</i></b> The generic JsonRPC provider interface that mimics [EIP-1193](https://eips.ethereum.org/EIPS/eip-1193) and the window.ethereum object in the browser. |
|  [IFrameChannelProviderInterface](./iframe-channel-provider.iframechannelproviderinterface.md) | <b><i>(BETA)</i></b> For environments where the wallet is proxied within an iFrame embedded on the application's DOM. |
|  [Web3ChannelProviderInterface](./iframe-channel-provider.web3channelproviderinterface.md) | <b><i>(BETA)</i></b> For environments where the destinationAddress is secret until the wallet is "enabled". |

## Variables

|  Variable | Description |
|  --- | --- |
|  [channelProvider](./iframe-channel-provider.channelprovider.md) | <b><i>(BETA)</i></b> Class instance that is attached to the window object |

## Type Aliases

|  Type Alias | Description |
|  --- | --- |
|  [WalletJsonRpcAPI](./iframe-channel-provider.walletjsonrpcapi.md) | <b><i>(BETA)</i></b> |