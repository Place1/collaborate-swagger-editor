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


## groups:

- leader creates a "room id" and a share link for it
    - the share link encodes the room id and the leader's peer id
- when a peer joins the leader it remembers the room id and it's current peer list
- if a peer is in a room then it can create a share link that encodes the room id and it's own peer id
- if a leader leaves the room (closes the browser) it can re-join by receiving a share link
  from a peer currently active in the room
    - this sucks though, they should be able to just ctrl+r or click the old share link they gave someone
