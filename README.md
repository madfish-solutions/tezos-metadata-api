# Token metadata resolver API for Tezos-based FA1.2 and FA2 tokens

This microservice is used to provide ultimately simple API for fetching token metadata for FA1.2 and FA2 tokens.
Metadata fetching algorithm relies on Taquito's [TZIP-12](https://tezostaquito.io/docs/tzip12)/[TZIP-16](https://tezostaquito.io/docs/metadata-tzip16) libraries.

# Configuration

The service can accept the following `ENV` variables:

|  Variable  |  Default  | Description |
|---|---|---|
| `PORT`   | `3000`  | Expected server port |
| `RPC_URL` |  `"https://mainnet-tezos.giganode.io/"` | RPC URL to be used |
| `READ_ONLY_SIGNER_PK`  | `edpkvWbk81uh1DEvdWKR4g1bjyTGhdu1mDvznPUFE2zDwNsLXrEb9K` | Public key of account with balance used for dry-running |
| `READ_ONLY_SIGNER_PK_HASH`  | `tz1fVQangAfb9J1hRRMP2bSB6LvASD6KpY8A` | Public key hash of account with balance used for dry-running |

For default mainnet configuration, they might be left unchanged.

# API
The following endpoints are currently available:

- `/healthz`

```json
{"message":"OK"}
```

- `/metadata/:address/:tokenId`, where `:address` is a token contract address (e.g. `KT1A5P4ejnLix13jtadsfV9GCnXLMNnab8UT`) and `:tokenId` is a token ID for FA2 or **always** `0` for FA1.2 tokens. Response is received in the following format:

```json
{
  "decimals": 10,
  "symbol": "KALAM",
  "name": "Kalamint",
  "thumbnailUri": "ipfs://Qme9FX9M7o2PZt9h6rvkUbfXoLpQr1HsuMQi6sL5Y75g3A"
}
```

# Running the service
- NodeJS and yarn:
```bash
yarn && yarn start
```
- Docker:
```bash
docker build -t tez-metadata .
docker run -p 3000:3000 tez-metadata
```