import PeerJS from 'peerjs';
import { EventEmitter } from 'events';
import StrictEventEmitter from 'strict-event-emitter-types';
import { RtcEmitter, RtcBroadcast, RtcInboundEvent } from './rpc';
import { getRandomInt } from '../utils';

export interface ConnectionEvents {
  open: void;
  error: Error;
  close: void;
}

export type ConnectionEmitter = StrictEventEmitter<EventEmitter, ConnectionEvents>;

interface RawMessage {
  event: string;
  payload: any; // a JSON object
}

export class Connection {

  events: ConnectionEmitter = new EventEmitter();

  private heartbeatIntervalID?: NodeJS.Timeout;

  constructor(
    private raw: PeerJS.DataConnection,
    private dataEvents: RtcEmitter,
  ) {
    raw.on('open', this.onOpen);
    raw.on('data', this.onData);
    raw.on('error', this.onError);
    raw.on('close', this.onClose);
  }

  id() {
    return this.raw.peer;
  }

  send: RtcBroadcast = (event: string, payload?: any) => {
    console.info(`sending data to ${this.id()}`, { event, payload })
    if (this.raw.open) {
      const rawMessage: RawMessage = { event, payload }; // using a variable here for type safety. we must send a RawMessage
      this.raw.send(rawMessage);
    } else {
      console.warn(`unable to send data to ${this.id()}. connection is not open.`, { event, payload });
    }
  }

  isOpen() {
    return this.raw.dataChannel.readyState === 'connecting'
      || this.raw.dataChannel.readyState === 'open';
  }

  disconnect() {
    console.info(`closing connection with ${this.id()}`);
    this.raw.close();
  }

  private onOpen = () => {
    console.log(`connection open ${this.id()}`);
    this.startHeartbeat();
    this.events.emit('open');
  }

  private onData = (data: RawMessage) => {
    console.log(`received data from ${this.id()}`, data);
    switch (data.event) {
      case '__heartbeat':
        // when a heartbeat is received we don't need to do anything.
        break;

      default:
        // by default, we'll pass all inbound data up via the event interface
        const event: RtcInboundEvent<any> = {
          peerid: this.id(),
          payload: data.payload,
        }
        this.dataEvents.emit(data.event as any, event);
        break;
    }
  }

  private onError = (error: Error) => {
    console.info(`trace received error from ${this.id()} ${error}`);
    // this.events.emit('error', error);
    this.disconnect();
  }

  private onClose = () => {
    console.info(`connection with ${this.id()} was closed`);
    this.events.emit('close');
    this.events.removeAllListeners();
    this.raw.off('open', this.onOpen);
    this.raw.off('data', this.onData);
    this.raw.off('error', this.onError);
    this.raw.off('close', this.onClose);
    this.stopHeartbeat();
  }

  private startHeartbeat() {
    console.info(`starting heartbeat with ${this.id()}`)
    this.heartbeatIntervalID = setInterval(() => {
      const rawMessage: RawMessage = { event: '__heartbeat', payload: undefined };
      console.info(`sending data to ${this.id()}`, rawMessage);
      this.raw.send(rawMessage);
    }, getRandomInt(4000, 5000)) as any;
  }

  private stopHeartbeat() {
    if (this.heartbeatIntervalID !== undefined) {
      clearInterval(this.heartbeatIntervalID);
    }
  }
}
