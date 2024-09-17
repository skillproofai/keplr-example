import { BroadcastMode, ChainInfo, Keplr, StdFee } from "@keplr-wallet/types";
import { Any } from "../proto-types-gen/src/google/protobuf/any";
import { AuthInfo, Fee, TxBody, TxRaw } from "../proto-types-gen/src/cosmos/tx/v1beta1/tx";
import { SignMode } from "../proto-types-gen/src/cosmos/tx/signing/v1beta1/signing";
import { PubKey } from "../proto-types-gen/src/cosmos/crypto/secp256k1/keys";
import { api } from "./api";
import { AccountResponse } from "../types/account";
import Long from "long";
import { Buffer } from "buffer";
import { TendermintTxTracer } from "@keplr-wallet/cosmos";
import { Uint128 } from "cw20";
import { MsgExecuteContract } from "../proto-types-gen/src/cosmwasm/wasm/v1/tx";

// Function to burn CW20 tokens
export const burnTokens = async (
  keplr: Keplr,
  chainInfo: ChainInfo,
  sender: string,
  contractAddress: string, // CW20 contract address
  amount: Uint128, // Amount of tokens to burn
  fee: StdFee,
  memo: string = ""
) => {
  // Fetch account info
  const account = await fetchAccountInfo(chainInfo, sender);
  const { pubKey } = await keplr.getKey(chainInfo.chainId);

  if (account) {
    // Construct burn message (based on CW20 spec for burning)
    const burnMessage: MsgExecuteContract = {
      sender,
      contract: contractAddress,
      msg: Buffer.from(
        JSON.stringify({
          burn: {
            amount: amount.toString(), // Burn amount as string
          },
        })
      ),
      funds: [],
    };

    const protoMessage: Any = {
      typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
      value: MsgExecuteContract.encode(burnMessage).finish(),
    };

    // Construct TxBody for the burn message
    const signDoc = {
      bodyBytes: TxBody.encode(
        TxBody.fromPartial({
          messages: [protoMessage],
          memo,
        })
      ).finish(),
      authInfoBytes: AuthInfo.encode({
        signerInfos: [
          {
            publicKey: {
              typeUrl: "/cosmos.crypto.secp256k1.PubKey",
              value: PubKey.encode({
                key: pubKey,
              }).finish(),
            },
            modeInfo: {
              single: {
                mode: SignMode.SIGN_MODE_DIRECT,
              },
              multi: undefined,
            },
            sequence: account.sequence,
          },
        ],
        fee: Fee.fromPartial({
          amount: fee.amount.map((coin) => {
            return {
              denom: coin.denom,
              amount: coin.amount.toString(),
            };
          }),
          gasLimit: fee.gas,
        }),
      }).finish(),
      chainId: chainInfo.chainId,
      accountNumber: Long.fromString(account.account_number),
    };

    // Sign the transaction
    const signed = await keplr.signDirect(chainInfo.chainId, sender, signDoc);

    // Encode the signed transaction
    const signedTx = {
      tx: TxRaw.encode({
        bodyBytes: signed.signed.bodyBytes,
        authInfoBytes: signed.signed.authInfoBytes,
        signatures: [Buffer.from(signed.signature.signature, "base64")],
      }).finish(),
      signDoc: signed.signed,
    };

    // Broadcast the transaction
    const txHash = await broadcastTxSync(keplr, chainInfo.chainId, signedTx.tx);

    // Trace the transaction
    const txTracer = new TendermintTxTracer(chainInfo.rpc, "/websocket");
    txTracer.traceTx(txHash).then(() => {
      alert("Burn transaction committed successfully.");
    });
  }
};

// Function to fetch account information
export const fetchAccountInfo = async (chainInfo: ChainInfo, address: string) => {
  try {
    const uri = `${chainInfo.rest}/cosmos/auth/v1beta1/accounts/${address}`;
    const response = await api<AccountResponse>(uri);

    return response.account;
  } catch (e) {
    console.error("This may be a new account. Please send some tokens to this account first.");
    return undefined;
  }
};

// Function to broadcast the transaction
export const broadcastTxSync = async (
  keplr: Keplr,
  chainId: string,
  tx: Uint8Array
): Promise<Uint8Array> => {
  return keplr.sendTx(chainId, tx, "sync" as BroadcastMode);
};
