import PeerJS from 'peerjs';
import { random } from './utils';
import { Connection, ConnectionBroadcast, ConnectionEmitter } from './connection';
import { EventEmitter } from 'events';



export class Me {

  events: ConnectionEmitter = new EventEmitter();

  private peerid: string;
  private peer: PeerJS;
  private connections = new Map<string, Connection>();

  constructor() {
    this.peerid = random();
    this.peer = new PeerJS(this.peerid, {
      secure: false,
      host: 'localhost',
      port: 8000,
      path: '/rtc'
    });
    this.peer.on('connection', this.onConnection);
    this.peer.on('disconnected', this.onDisconnected);
    this.peer.on('error', this.onError);
    this.peer.on('close', this.onClose);
  }

  id() {
    return this.peerid;
  }

  dispatch: ConnectionBroadcast = (event: any, payload?: any) => {
    for (const connection of this.connections.values()) {
      connection.send(event, payload);
    }
  }

  join(id: string) {
    const connection = new Connection(this.peer.connect(id), this.events);
    this.connections.set(connection.id(), connection);
  }

  private onConnection = (connection: PeerJS.DataConnection) => {
    console.info(`connected to ${connection.peer}`)
    this.connections.set(connection.peer, new Connection(connection, this.events));
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
}
