## setup
```
# pull submodules
git submodule init
git submodule update
```

## TODO:

- heartbeat for checking connection availability and keep-alive
- broadcast buffering
  - if a message fails to be sent to a peer we need to remember
    so that if the peer reconnects we can re-send the message.

- reconnecting...
  - when a peer drops, it can buffer it's operations and then broadcast them when it reconnects.
  - the peer must connect to an up-to-date peerlist before rebroadcasting
    so that peers that connected while it was offline also see it's buffered operations.
  - there's a window of 5 seconds before the `me.connections.get('2').raw.peerConnection.iceConnectionState` becomes disconnected
