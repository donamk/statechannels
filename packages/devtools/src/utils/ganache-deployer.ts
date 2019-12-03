import {CompiledContract, EtherlimeGanacheDeployer} from 'etherlime-lib';
import log from 'loglevel';

export class GanacheDeployer {
  etherlimeDeployer: EtherlimeGanacheDeployer;

  constructor(port: number, privateKey?: string) {
    this.etherlimeDeployer = new EtherlimeGanacheDeployer(privateKey, port);
  }

  public async deploy(
    contract: CompiledContract,
    libraries: Record<string, string> = {},
    ...args
  ): Promise<string> {
    const deployedContract = await this.etherlimeDeployer.deploy(contract, libraries, ...args);
    log.info(`Contract ${contract.contractName} deployed to ganache`);
    return deployedContract.contractAddress;
  }
}