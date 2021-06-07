const { TezosToolkit, MichelCodecPacker } = require("@taquito/taquito");
const { Tzip16Module } = require("@taquito/tzip16");
const { Tzip12Module } = require("@taquito/tzip12");
const LambdaViewSigner = require("./signer");
const { rpcUrl } = require("./config");

const michelEncoder = new MichelCodecPacker();
const Tezos = new TezosToolkit(rpcUrl);

Tezos.addExtension(new Tzip16Module());
Tezos.addExtension(new Tzip12Module());
Tezos.setSignerProvider(new LambdaViewSigner());
Tezos.setPackerProvider(michelEncoder);

module.exports = Tezos;
