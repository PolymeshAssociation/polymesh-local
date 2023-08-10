# If given a boot node, resolve "alice" IP and create a lib p2p multi address
if [[ -n ${BOOT_NODE_PEER_ID} ]]
then
  ALICE_IP=$(getent hosts alice | awk '{print $1;}')
  BOOT_NODE=--bootnodes=/ip4/${ALICE_IP}/tcp/30333/p2p/${BOOT_NODE_PEER_ID}
  echo "boot nodes set to: ${BOOT_NODE}"
  sleep 3 # give some time for primary to start up
fi

# Link libfaketime instead of real time, don't fake monotonic time as it can cause the process to hang
FAKETIME_DONT_FAKE_MONOTONIC=1 \
LD_PRELOAD=/usr/lib/x86_64-linux-gnu/faketime/libfaketime.so.1 \
/usr/local/bin/polymesh \
-d /var/lib/polymesh \
--unsafe-ws-external --unsafe-rpc-external --wasm-execution=compiled \
--no-prometheus --no-telemetry --pruning=archive --no-mdns \
--validator --rpc-cors=all --rpc-methods=unsafe --force-authoring \
${WAL_ARGS} --port 30333 $1 ${BOOT_NODE}
