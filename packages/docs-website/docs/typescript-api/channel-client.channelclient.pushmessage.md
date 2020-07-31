---
id: channel-client.channelclient.pushmessage
title: ChannelClient.pushMessage() method
hide_title: true
---
<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[@statechannels/channel-client](./channel-client.md) &gt; [ChannelClient](./channel-client.channelclient.md) &gt; [pushMessage](./channel-client.channelclient.pushmessage.md)

## ChannelClient.pushMessage() method

> This API is provided as a preview for developers and may change based on feedback that we receive. Do not use this API in a production environment.
> 

Accepts inbound messages from other state channel participants.

<b>Signature:</b>

```typescript
pushMessage(message: Message): Promise<PushMessageResult>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  message | Message | An inbound message. |

<b>Returns:</b>

Promise&lt;PushMessageResult&gt;

A promise that resolves to a PushMessageResult

## Remarks

This method should be hooked up to your applications's messaging layer.