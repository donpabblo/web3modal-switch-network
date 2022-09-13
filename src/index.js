import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import reportWebVitals from './reportWebVitals';
import { sendToVercelAnalytics } from './vitals';
import 'bootstrap/dist/css/bootstrap.css';
import Web3Modal from "web3modal";
import WalletConnectProvider from "@walletconnect/web3-provider";
import { ethers } from "ethers";

const networks = [
  {
    "id": "1",
    "name": "Ethereum",
    "nativeCurrency": {
      name: "Ethers",
      symbol: "ETH",
      decimals: 18
    }
  },
  {
    "id": "5",
    "name": "Goerli",
    "rpcUrls": ["https://goerli.infura.io/v3/"],
    "nativeCurrency": {
      name: "Goerli ETH",
      symbol: "GoeETH",
      decimals: 18
    },
    "blockExplorerUrls": ["https://goerli.etherscan.io"]
  },
  {
    "id": "4",
    "name": "Rinkeby",
    "rpcUrls": ["https://rinkeby.infura.io/v3/"],
    "nativeCurrency": {
      name: "Rinkeby ETH",
      symbol: "RinETH",
      decimals: 18
    },
    "blockExplorerUrls": ["https://rinkeby.etherscan.io"]
  },
  {
    "id": "3",
    "name": "Ropsten",
    "rpcUrls": ["https://ropsten.infura.io/v3/"],
    "nativeCurrency": {
      name: "Ropsten ETH",
      symbol: "RopETH",
      decimals: 18
    },
    "blockExplorerUrls": ["https://ropsten.etherscan.io"]
  },
  {
    "id": "42",
    "name": "Kovan",
    "rpcUrls": ["https://kovan.infura.io/v3/"],
    "nativeCurrency": {
      name: "Kovan ETH",
      symbol: "KovETH",
      decimals: 18
    },
    "blockExplorerUrls": ["https://kovan.etherscan.io"]
  }
];

const INITIAL_STATE = {
  connect: true,
  action: false,
  card: false,
  loading: false,
  error: null
};

const providerOptions = {
  walletconnect: {
    package: WalletConnectProvider,
    options: {
      infuraId: "3acc6072870e46c6b7af6c8d22055baa"
    }
  },
};

class Loader extends React.Component {
  render() {
    return (
      <div className="overlay">
        <div className="overlay__inner">
          <div className="overlay__content"><span className="spinner"></span></div>
        </div>
      </div>
    );
  }
}

class App extends React.Component {

  web3Modal;
  ethers;

  constructor(props) {
    super(props);
    this.state = {
      ...INITIAL_STATE
    };

    this.web3Modal = new Web3Modal({
      disableInjectedProvider: false,
      cacheProvider: true,
      providerOptions: providerOptions
    });
  }

  async onConnect() {
    try {
      const provider = await this.web3Modal.connect();
      this.subscribeProvider(provider);
      //await provider.enable();
      this.ethers = new ethers.providers.Web3Provider(provider, "any");
      this.fetchAccountData();
    } catch (err) {
      this.setState({ error: err });
    }
  }

  async onSwitch(networkToSwitch) {
    this.setState({ error: null });
    let networkToSwitchHex = '0x' + parseInt(networkToSwitch).toString(16);
    try {
      if (this.state.networkId != networkToSwitch) {
        await this.ethers.send("wallet_switchEthereumChain", [{ chainId: networkToSwitchHex }]);
        await this.fetchAccountData();
      } else {
        this.setState({ error: "Already connected to " + networks.find(network => network.id == networkToSwitch).name + "! Choose a different network" });
      }
    } catch (err) {
      if (err.code === 4902) {
        try {
          let networkObject = networks.find(network => network.id == networkToSwitch);
          await this.ethers.send("wallet_addEthereumChain",
            [
              {
                chainId: networkToSwitchHex,
                chainName: networkObject.name,
                rpcUrls: networkObject.rpcUrls,
                nativeCurrency: networkObject.nativeCurrency,
                blockExplorerUrls: networkObject.blockExplorerUrls,
              },
            ],
          );
          await this.ethers.send("wallet_switchEthereumChain", [{ chainId: networkToSwitchHex }]);
          await this.fetchAccountData();
        } catch (error) {
          this.setState({ error: err });
        }
      }
    }
  }

  onDisconnect() {
    this.resetApp();
  }

  subscribeProvider(provider) {
    if (!provider.on) {
      return;
    }
    provider.on("disconnect", () => this.resetApp());
    provider.on("accountsChanged", async (accounts) => {
      await this.fetchAccountData();
    });
    provider.on("chainChanged", async (chainId) => {
      await this.fetchAccountData();
    });
    //provider.on("networkChanged", async (networkId) => {
    //  await this.fetchAccountData();
    //});
  }

  async resetApp() {
    this.setState({ loading: true });
    await this.web3Modal.clearCachedProvider();
    this.ethers = null;
    this.setState({ ...INITIAL_STATE });
  };

  async fetchAccountData() {
    this.setState({ loading: true, error: null });
    let selectedAccount = (await this.ethers.listAccounts())[0];
    let currentNetwork = await this.ethers.getNetwork();
    let networkObject = networks.find(network => network.id == currentNetwork.chainId);
    let currentBalance = ethers.utils.formatEther(await this.ethers.getBalance(selectedAccount)).substring(0, 6);
    this.setState({
      connect: false,
      action: true,
      card: true,
      network: networkObject.name,
      networkId: currentNetwork.chainId,
      address: selectedAccount,
      balance: [currentBalance, networkObject.nativeCurrency.symbol].join(" "),
      loading: false
    });
  }

  render() {
    return (
      <div>
        <header>
          <div className="p-5 text-center bg-image header">
            <div className="mask title">
              <div className="d-flex justify-content-center align-items-center h-100">
                <div className="text-white">
                  <h2 className="mb-3">Web3modal</h2>
                  <h4 className="mb-3">How to switch network</h4>
                </div>
              </div>
            </div>
          </div>
        </header>
        <main>
          <div className="container action">
            {this.state.error && <div className="error">{this.state.error}</div>}
            {this.state.connect &&
              <div id="connect-section" className="row">
                <div className="col-md-12 text-center">
                  <a id="connect" className="btn btn-primary btn-lg btn-block main-btn" href="#!" role="button" onClick={() => this.onConnect()}>Connect Wallet</a>
                </div>
              </div>
            }
            {this.state.action &&
              <div id="action-section" className="row">
                <select value={this.state.networkId} onChange={(e) => this.onSwitch(e.target.value)} className="form-select-lg mb-3 col-md-6 main-btn">
                  {networks.map((network, i) => (
                    <option key={i} value={network.id}>{network.name}</option>
                  ))}
                </select>
                <div className="col-md-6 text-center">
                  <a id="disconnect" className="btn btn-primary btn-lg btn-block main-btn" href="#!" role="button" onClick={() => this.onDisconnect()}>Disconnect Wallet</a>
                </div>
              </div>
            }
            {this.state.card &&
              <div id="card-section" className="row action">
                <div className="card">
                  <div className="card-body">
                    <h5 className="card-title" id="card-title"></h5>
                    <h6 className="card-subtitle mb-2 text-muted" id="card-subtitle"></h6>
                    <div className="card-text">
                      <div id="address" className="truncate">Address: {this.state.address}</div>
                      <div id="network" className="truncate">Network: <strong>{this.state.network}</strong></div>
                      <div id="balance" className="truncate">Balance: {this.state.balance}</div>
                    </div>
                  </div>
                </div>
              </div>
            }
          </div>
        </main>
        {this.state.loading && <Loader />}
        <footer className="footer fixed-bottom">
          <div className="container">
            <span className="text-muted"><a href="https://medium.com/@donpablooooo" className="link-secondary">Follow me on Medium.com</a></span>
          </div>
        </footer>
      </div>
    );
  }
}

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(<App />);
reportWebVitals(sendToVercelAnalytics);
