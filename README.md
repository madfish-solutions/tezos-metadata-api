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