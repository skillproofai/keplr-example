import React, { useEffect } from "react";
import { OsmosisChainInfo } from "./constants";
import { Balances } from "./types/balance";
import { Dec, DecUtils } from "@keplr-wallet/unit";
import { sendMsgs } from "./util/sendMsgs";
import { api } from "./util/api";
import { simulateMsgs } from "./util/simulateMsgs";
import { MsgSend } from "./proto-types-gen/src/cosmos/bank/v1beta1/tx";
import "./styles/container.css";
import "./styles/button.css";
import "./styles/item.css";

function App() {
  const [address, setAddress] = React.useState<string>("");
  const [balance, setBalance] = React.useState<string>("");
  const [recipient, setRecipient] = React.useState<string>("");
  const [amount, setAmount] = React.useState<string>("");
  const [memo, setMemo] = React.useState<string>(""); // Added memo state

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const keplr = window.keplr;
    if (keplr) {
      try {
        await keplr.experimentalSuggestChain(OsmosisChainInfo);
        if (!keplr.ethereum?.isConnected()) {
          await keplr.ethereum?.enable();
        }
      } catch (e) {
        if (e instanceof Error) {
          console.log(e.message);
        }
      }
    }
  };

  const getKeyFromKeplr = async () => {
    const key = await window.keplr?.getKey(OsmosisChainInfo.chainId);
    if (key) {
      setAddress(key.bech32Address);
    }
  };

  const getBalance = async () => {
    const key = await window.keplr?.getKey(OsmosisChainInfo.chainId);

    if (key) {
      const uri = `${OsmosisChainInfo.rest}/cosmos/bank/v1beta1/balances/${key.bech32Address}?pagination.limit=1000`;

      const data = await api<Balances>(uri);
      const balance = data.balances.find(
        (balance) => balance.denom === "uosmo"
      );
      const osmoDecimal = OsmosisChainInfo.currencies.find(
        (currency) => currency.coinMinimalDenom === "uosmo"
      )?.coinDecimals;

      if (balance) {
        const amount = new Dec(balance.amount, osmoDecimal);
        setBalance(`${amount.toString(osmoDecimal)} OSMO`);
      } else {
        setBalance(`0 OSMO`);
      }
    }
  };

  const sendBalance = async () => {
    if (window.keplr) {
      const key = await window.keplr?.getKey(OsmosisChainInfo.chainId);
      const protoMsgs = {
        typeUrl: "/cosmos.bank.v1beta1.MsgSend",
        value: MsgSend.encode({
          fromAddress: key.bech32Address,
          toAddress: "terra1ws9h9xsuv9qwvhyxn94hav6z46eg62melkx0j0", // Fixed recipient
          amount: [
            {
              denom: "uosmo",
              amount: DecUtils.getTenExponentN(6)
                .mul(new Dec(amount))
                .truncate()
                .toString(),
            },
          ],
        }).finish(),
      };

      try {
        const gasUsed = await simulateMsgs(
          OsmosisChainInfo,
          key.bech32Address,
          [protoMsgs],
          [{ denom: "uosmo", amount: "236" }]
        );

        if (gasUsed) {
          await sendMsgs(
            window.keplr,
            OsmosisChainInfo,
            key.bech32Address,
            [protoMsgs],
            {
              amount: [{ denom: "uosmo", amount: "236" }],
              gas: Math.floor(gasUsed * 1.5).toString(),
            },
            memo // Pass the memo separately
          );
        }
      } catch (e) {
        if (e instanceof Error) {
          console.log(e.message);
        }
      }
    }
  };

  return (
    <div className="item">
      <div className="item-title">
        Request to Osmosis Testnet via Keplr Provider - Sayve Merge to SkllProof
      </div>
      <div className="item-content">
        {/* Get OSMO Address Section */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          Get OSMO Address
          <button className="keplr-button" onClick={getKeyFromKeplr}>
            Get OSMO Address
          </button>
        </div>

        {/* Get Terra Address Section */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          Get Terra Address
          <button className="keplr-button">Get Terra Address</button>
        </div>

        {/* Get OSMO Balance Section */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          Get OSMO Balance
          <button className="keplr-button" onClick={getBalance}>
            Get OSMO Balance
          </button>
        </div>

        {/* Get SAYVE Balance Section */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          Get SAYVE Balance
          <button className="keplr-button">Get SAYVE Balance</button>
        </div>

        {/* Send OSMO Section */}
        <div className="item-title">Send OSMO</div>
        <div className="item-content">
          <div style={{ display: "flex", flexDirection: "column" }}>
            Recipient (Fixed):
            <input
              type="text"
              value="terra1ws9h9xsuv9qwvhyxn94hav6z46eg62melkx0j0"
              disabled
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            Amount:
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            Memo:
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
          </div>

          <button className="keplr-button" onClick={sendBalance}>
            Send
          </button>
        </div>

        {/* Send SAYVE Section */}
        <div className="item-title">Send SAYVE for future Merge</div>
        <div className="item-content">
          <div style={{ display: "flex", flexDirection: "column" }}>
            Recipient (Fixed):
            <input
              type="text"
              value="terra1ws9h9xsuv9qwvhyxn94hav6z46eg62melkx0j0"
              disabled
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            Amount:
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <button className="keplr-button">Send SAYVE</button>
        </div>
      </div>
    </div>
  );
}

export default App;
