import {JSONSchema, Model, Pojo} from 'objection';
import {SignatureEntry, State, signState} from '@statechannels/wallet-core';
import {ethers} from 'ethers';

import {Address, Bytes32} from '../type-aliases';

export class SigningWallet extends Model {
  readonly id!: number;
  readonly privateKey: Bytes32;
  readonly address: Address;

  static tableName = 'signing_wallets';

  $beforeValidate(jsonSchema, json, _opt): JSONSchema {
    super.$beforeValidate(jsonSchema, json, _opt);

    if (!json.address) {
      const {address} = new ethers.Wallet(json.privateKey);
      json.address = address;
    }

    return json;
  }

  $validate(json): Pojo {
    super.$validate(json);

    const w = new ethers.Wallet(json.privateKey);
    if (w.address !== json.address) {
      throw new SigningWalletError('Invalid address', {
        given: json.address,
        correct: w.address,
      });
    }

    return json;
  }

  signState(state: State): SignatureEntry {
    return {
      signer: this.address,
      signature: signState(state, this.privateKey),
    };
  }
}

class SigningWalletError extends Error {
  readonly type = 'SigningWalletError';

  constructor(reason: string, public readonly data = undefined) {
    super(reason);
  }
}