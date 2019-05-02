import PeerJS from 'peerjs';
import { random } from './utils';
import { Connection } from './connection';
import { EventEmitter } from 'events';
import { RtcEmitter, RtcBroadcast, RtcInboundEvent } from './rpc';

export class Me {

  events: RtcEmitter = new EventEmitter();

  private peerid: string;
  private peer: PeerJS;
  private connections = new Map<string, Connection>();

  constructor(id = random()) {
    this.peerid = id;
    this.peer = new PeerJS(this.peerid, {
      secure: false,
      host: window.location.host.split(':')[0],
      port: 8000,
      path: '/rtc'
    });
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

  private onOpen = () => {
    console.info('i have connected');
  }

  /**
   * handle a peer connecting to us
   */
  private onConnection = (connection: PeerJS.DataConnection) => {
    console.info(`connected to ${connection.peer}`)
    this.createConnection(connection);
  }

  private onDisconnected = () => {
    console.info('i have disconnected')
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
    connection.events.once('close', () => this.connections.delete(connection.id()));
    connection.events.once('error', () => this.connections.delete(connection.id()));
    this.connections.set(raw.peer, connection);
    return connection;
  }
}
