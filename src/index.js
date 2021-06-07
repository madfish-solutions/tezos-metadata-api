const express = require("express");
const cors = require("cors");
const consola = require("consola");
const getMetadata = require("./metadata");
const { port } = require("./config");
const { isNumeric, isValidContract } = require("./utils");
const fixtures = require("./mainnet-fixtures.json");

const app = express();

app.use(cors());
app.use(express.json());
app.get("/healthz", (_, res) => {
  res.send({ message: "OK" }).status(200);
});

app.get("/metadata/:address/:tokenId", async (req, res) => {
  const { address, tokenId } = req.params;
  if (!address || !isValidContract(address) || !isNumeric(tokenId)) {
    consola.error(
      `Validation failed for contract ${address} and tokenId:${tokenId}`
    );
    return res
      .send({ message: "Please, provide a valid token address and token id" })
      .status(400);
  }

  try {
    const metadata = await getMetadata(address, tokenId);
    const fixture = fixtures.find(
      ({ tokenId: id, contractAddress }) =>
        id === parseInt(tokenId) && contractAddress === address
    );

    res
      .send({
        ...metadata,
        ...(fixture ? fixture.metadata : {}),
      })
      .status(200);
  } catch (e) {
    res
      .send({ message: "Could not fetch metadata for provided token" })
      .status(400);
  }
});

app.listen(port, () =>
  consola.success(`Tezos token metadata server is listening on port ${port}`)
);
