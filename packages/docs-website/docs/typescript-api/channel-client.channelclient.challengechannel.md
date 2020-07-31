---
id: channel-client.channelclient.challengechannel
title: ChannelClient.challengeChannel() method
hide_title: true
---
<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[@statechannels/channel-client](./channel-client.md) &gt; [ChannelClient](./channel-client.channelclient.md) &gt; [challengeChannel](./channel-client.channelclient.challengechannel.md)

## ChannelClient.challengeChannel() method

> This API is provided as a preview for developers and may change based on feedback that we receive. Do not use this API in a production environment.
> 

Requests a challenge for a channel

<b>Signature:</b>

```typescript
challengeChannel(channelId: string): Promise<ChannelResult>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  channelId | string | id for the state channel |

<b>Returns:</b>

Promise&lt;ChannelResult&gt;

A promise that resolves to a ChannelResult.