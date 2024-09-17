import React, { useEffect } from "react";
import { OsmosisChainInfo as SayveChainInfo } from "./constants"; // Renaming for SAYVE
import { Balances } from "./types/balance";
import { Dec, DecUtils } from "@keplr-wallet/unit";
import { burnTokens } from "./util/burn"; // Import burn function
import { api } from "./util/api";
import "./styles/container.css";
import "./styles/button.css";
import "./styles/item.css";

function App() {
  const [address, setAddress] = React.useState<string>("");
  const [balance, setBalance] = React.useState<string>("");
  const [amount, setAmount] = React.useState<string>("");
  const [memo, setMemo] = React.useState<string>(""); // Memo state

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const keplr = window.keplr;
    if (keplr) {
      try {
        await keplr.experimentalSuggestChain(SayveChainInfo); // Using SayveChainInfo instead of OsmosisChainInfo
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
    const key = await window.keplr?.getKey(SayveChainInfo.chainId);
    if (key) {
      setAddress(key.bech32Address);
    }
  };

  const getBalance = async () => {
    const key = await window.keplr?.getKey(SayveChainInfo.chainId);

    if (key) {
      const uri = `${SayveChainInfo.rest}/cosmos/bank/v1beta1/balances/${key.bech32Address}?pagination.limit=1000`;

      const data = await api<Balances>(uri);
      const balance = data.balances.find(
        (balance) => balance.denom === "uosmo" // Updated to SAYVE token denom
      );
      const sayveDecimal = SayveChainInfo.currencies.find(
        (currency) => currency.coinMinimalDenom === "uosmo"
      )?.coinDecimals;

      if (balance) {
        const amount = new Dec(balance.amount, sayveDecimal);
        setBalance(`${amount.toString(sayveDecimal)} SAYVE`);
      } else {
        setBalance(`0 SAYVE`);
      }
    }
  };

  const burnSayveTokens = async () => {
    if (window.keplr) {
      const key = await window.keplr?.getKey(SayveChainInfo.chainId);
      const gasFee = "236"; // Gas fee value in SAYVE's smallest denomination
      const burnAmount = DecUtils.getTenExponentN(6)
        .mul(new Dec(amount))
        .truncate()
        .toString();

      try {
        // Execute the burn operation
        await burnTokens(
          window.keplr,
          SayveChainInfo,
          key.bech32Address,
          SayveChainInfo.stakeCurrency.coinMinimalDenom, // CW20 Contract Address
          burnAmount, // Amount to burn
          {
            amount: [{ denom: "uosmo", amount: gasFee }],
            gas: gasFee,
          },
          memo // Include memo here
        );
      } catch (e) {
        if (e instanceof Error) {
          console.log(e.message);
        }
      }
    }
  };

  return (
    <div className="root-container">
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: "16px",
        }}
      >
        <img
          src="/keplr-logo.png"
          style={{ maxWidth: "200px" }}
          alt="keplr-logo"
        />
      </div>

      <h2 style={{ marginTop: "30px" }}>Sayve Merge to SkillProof</h2>

      <div className="item-container">
        <div className="item">
          <div className="item-title">Get SAYVE Address</div>

          <div className="item-content">
            <div>
              <button className="keplr-button" onClick={getKeyFromKeplr}>
                Get Address
              </button>
            </div>
            <div>Address: {address}</div>
          </div>
        </div>

        <div className="item">
          <div className="item-title">Get SAYVE Balance</div>

          <div className="item-content">
            <button className="keplr-button" onClick={getBalance}>
              Get Balance
            </button>

            <div>Balance: {balance}</div>
          </div>
        </div>

        <div className="item">
          <div className="item-title">Burn SAYVE Tokens</div>

          <div className="item-content">
            <div
              style={{
                display: "flex",
                flexDirection: "column",
              }}
            >
              Amount:
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            {/* Memo Field Added with ICP note */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
              }}
            >
              Memo:
              <input
                type="text"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="Enter transaction memo (Enter your ICP address)"
              />
              <small style={{ color: "#888" }}>
                * Enter your ICP address. You can create/find it{" "}
                <a
                  href="https://nns.ic0.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  here
                </a>
                .
              </small>
            </div>

            <button className="keplr-button" onClick={burnSayveTokens}>
              Burn Tokens
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
