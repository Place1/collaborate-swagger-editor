import PeerJS from 'peerjs';
import { random } from './utils';
import { Connection, RawMessage } from './connection';
import { EventEmitter } from 'events';
import { RtcEmitter, RtcBroadcast, RtcInboundEvent } from './rpc';
import { sleep } from '../utils';
import { type } from 'os';

export class Me {

  events: RtcEmitter = new EventEmitter();

  private peerid: string;
  private peer: PeerJS;
  private connections = new Map<string, Connection>();
  private outboundHistory = new Map<string, Array<RawMessage>>();

  constructor(id: string | PeerJS = random()) {
    if (typeof(id) === 'string') {
      this.peerid = id;
      this.peer = new PeerJS(this.peerid, {
        secure: false,
        host: window.location.host.split(':')[0],
        port: 8000,
        path: '/rtc'
      });
    } else {
      this.peerid = id.id;
      this.peer = id;
    }
    this.peer.on('open', this.onOpen);
    this.peer.on('connection', this.onConnection);
    this.peer.on('disconnected', this.onDisconnected);
    this.peer.on('error', this.onError);
    this.peer.on('close', this.onClose);
    this.events.on('peerList', this.onPeerList);
  }

  id() {
    return this.peerid;
  }

  dispatch: RtcBroadcast = (event: any, payload?: any) => {
    console.info(`dispatching to peers`, event, payload);
    for (const connection of this.connections.values()) {
      if (payload !== undefined) {
        payload = JSON.parse(JSON.stringify(payload));
      }
      this.outboundHistory.get(connection.id())!.push({ event, payload });
      connection.send(event, payload);
    }
  }

  /**
   * connect to a remote peer
   */
  join(id: string) {
    console.info(`joining peer ${id}`);
    const connection = this.createConnection(this.peer.connect(id))
    connection.events.once('open', () => {
      connection.send('requestInitial');
    });
  }

  currentPeers() {
    return Array.from(this.connections.keys());
  }

  disconnect() {
    this.peer.disconnect(); // disconnects from the signalling server
    for (const connection of this.connections.values()) {
      connection.disconnect();
    }
  }

  async reconnect() {
    await sleep(1000);
    if (this.peer.disconnected) {
      console.log('attempting to reconnect...');
      this.peer.reconnect(); // if this fails then onDisconnect will happen and we'll endup re-trying
    }
  }

  private onOpen = () => {
    console.info('i have connected to the signalling server');
    for (const connection of this.connections.values()) {
      if (!connection.isOpen()) {
        console.info(`reconnecting to ${connection.id()}`)
        this.createConnection(this.peer.connect(connection.id()));
      }
    }
  }

  /**
   * handle a peer connecting to us
   */
  private onConnection = (connection: PeerJS.DataConnection) => {
    console.info(`connected to ${connection.peer}`);
    this.createConnection(connection);
  }

  private onDisconnected = () => {
    console.info('i have disconnected from the signalling server');
    // this.reconnect();
  }

  private onError = (err: Error) => {
    console.info(`i had an error ${err}`)
  }

  private onClose = () => {
    console.info('i have closed')
  }

  private onPeerList = (event: RtcInboundEvent<string[]>) => {
    for (const peer of event.payload) {
      if (!this.connections.has(peer) && peer !== this.id()) {
        this.join(peer);
      }
    }
  }

  private createConnection(raw: PeerJS.DataConnection) {
    const connection = new Connection(raw, this.events);
    connection.events.once('open', () => connection.send('peerList', Array.from(this.connections.keys())));
    // connection.events.once('close', () => this.connections.delete(connection.id()));
    // connection.events.once('error', () => this.connections.delete(connection.id()));
    this.connections.set(raw.peer, connection);
    if (!this.outboundHistory.has(connection.id())) {
      this.outboundHistory.set(connection.id(), []);
    }
    return connection;
  }
}
