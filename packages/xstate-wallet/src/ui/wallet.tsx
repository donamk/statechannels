import React from 'react';
import {useService} from '@xstate/react';
import './wallet.scss';
import {ApplicationWorkflow} from './application-workflow';
import {EnableEthereum} from './enable-ethereum-workflow';
import {Layout} from './layout';
import {ApproveBudgetAndFund} from './approve-budget-and-fund-workflow';

import {CloseLedgerAndWithdraw} from './close-ledger-and-withdraw';
import {Workflow} from 'channel-wallet';

interface Props {
  workflows: Workflow[];
}

export const Wallet = (props: Props) => {
  function chooseWorkflowToDisplay(workflows: Workflow[]): Workflow {
    return workflows[workflows.length - 1];
  }

  const workflow = chooseWorkflowToDisplay(props.workflows);
  const [current, send] = useService(workflow.service);

  return (
    <Layout>
      {workflow.id === 'application-workflow' && (
        <ApplicationWorkflow current={current} send={send} />
      )}
      {workflow.id === 'enable-ethereum' && <EnableEthereum current={current} send={send} />}
      {workflow.id === 'approve-budget-and-fund' && (
        <ApproveBudgetAndFund service={workflow.service} />
      )}
      {workflow.id === 'close-and-withdraw' && (
        <CloseLedgerAndWithdraw service={workflow.service} />
      )}
    </Layout>
  );
};
