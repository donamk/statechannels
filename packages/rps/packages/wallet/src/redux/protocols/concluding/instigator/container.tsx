import React from 'react';
import { PureComponent } from 'react';
import { connect } from 'react-redux';
import { InstigatorNonTerminalState as NonTerminalConcludingState } from './states';
import { unreachable } from '../../../../utils/reducer-utils';
import ApproveConcluding from './components/approve-concluding';
import ApproveDefunding from './components/approve-defunding';
import WaitForOpponentConclude from './components/wait-for-opponent-conclude';
import { Defunding } from '../../defunding/container';
import * as actions from './actions';
import Acknowledge from '../../shared-components/acknowledge';
import { ConsensusUpdate } from '../../consensus-update/container';
import WaitForOpponentDecision from './components/wait-for-opponent-decision';

interface Props {
  state: NonTerminalConcludingState;
  approve: typeof actions.concludeApproved;
  deny: typeof actions.cancelled;
  defund: typeof actions.defundChosen;
  keepOpen: typeof actions.keepOpenChosen;
  acknowledge: typeof actions.acknowledged;
}

class ConcludingContainer extends PureComponent<Props> {
  render() {
    const { state, deny, approve, defund, keepOpen, acknowledge } = this.props;
    const processId = state.processId;
    switch (state.type) {
      case 'ConcludingInstigator.AcknowledgeSuccess':
        return (
          <Acknowledge
            title="Concluding Succesful"
            description="Your channel was closed and defunded."
            acknowledge={() => acknowledge({ processId })}
          />
        );
      case 'ConcludingInstigator.AcknowledgeFailure':
        return (
          <Acknowledge
            title="Concluding Failed"
            description={state.reason}
            acknowledge={() => acknowledge({ processId })}
          />
        );
      case 'ConcludingInstigator.WaitForOpponentConclude':
        return <WaitForOpponentConclude />;
      case 'ConcludingInstigator.AcknowledgeConcludeReceived':
        return (
          <ApproveDefunding
            approve={() => defund({ processId })}
            keepOpen={() => keepOpen({ processId })}
          />
        );
      case 'ConcludingInstigator.WaitForDefund':
        return <Defunding state={state.defundingState} />;
      case 'ConcludingInstigator.ApproveConcluding':
        return (
          <ApproveConcluding
            deny={() => deny({ processId })}
            approve={() => approve({ processId })}
          />
        );
      case 'ConcludingInstigator.WaitForLedgerUpdate':
        return <ConsensusUpdate state={state.consensusUpdateState} />;
      case 'ConcludingInstigator.WaitForOpponentSelection':
        return <WaitForOpponentDecision />;
      default:
        return unreachable(state);
    }
  }
}

const mapDispatchToProps = {
  approve: actions.concludeApproved,
  deny: actions.cancelled,
  defund: actions.defundChosen,
  acknowledge: actions.acknowledged,
  keepOpen: actions.keepOpenChosen,
};

export const Concluding = connect(
  () => ({}),
  mapDispatchToProps,
)(ConcludingContainer);
