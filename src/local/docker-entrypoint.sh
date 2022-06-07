echo "PeerId: $BOOT_NODE_PEER_ID"
if [ -z ${BOOT_NODE_PEER_ID} ]
then
  echo "BOOT ID NOT SET!"
else
  ALICE_IP=$(getent hosts alice | awk '{print $1;}')
  # ALICE_IP=$(getent hosts host.docker.internal | awk '{print $1;}')
  BOOT_NODE=--bootnodes=/ip4/${ALICE_IP}/tcp/30333/p2p/${BOOT_NODE_PEER_ID}
  echo "Set boot nodes to: ${BOOT_NODE}"
  sleep 3
fi

echo "First: $1"

/usr/local/bin/polymesh \
--unsafe-ws-external \
--unsafe-rpc-external \
-d /var/lib/polymesh \
--wasm-execution=compiled \
--no-prometheus --no-telemetry --pruning=archive --no-mdns --validator --rpc-cors=all --rpc-methods=unsafe --force-authoring --port 30333 $1 ${BOOT_NODE}