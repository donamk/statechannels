const config = {
  key: 'ledger-defunding',
  initial: 'concludeTarget',
  states: {
    concludeTarget: {
      invoke: {
        src: 'concludeChannel',
        data: function(context) {
          return { channelID: context.ledgerChannelID };
        },
        onDone: 'defundTarget',
      },
    },
    defundTarget: {
      invoke: {
        src: 'ledgerUpdate',
        data: function(context) {
          return {
            channelID: context.ledgerChannelID,
            outcome: defundedOutcome(
              context.ledgerChannelID,
              context.targetChannelID
            ),
          };
        },
        onDone: 'success',
      },
    },
    success: { type: 'final' },
  },
};
const guards = {};
const customActions = {};
const machine = Machine(config, { guards, actions: customActions });
