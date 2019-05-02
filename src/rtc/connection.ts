import PeerJS from 'peerjs';
import { EventEmitter } from 'events';
import StrictEventEmitter from 'strict-event-emitter-types';
import { RtcEmitter, RtcBroadcast, RtcInboundEvent } from './rpc';

export interface ConnectionEvents {
  open: void;
  error: Error;
  close: void;
}

export type ConnectionEmitter = StrictEventEmitter<EventEmitter, ConnectionEvents>;

export class Connection {

  events: ConnectionEmitter = new EventEmitter();

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
      this.raw.send({ event, payload });
    } else {
      console.warn(`unable to send data to ${this.id()}. connection is not open.`, { event, payload });
    }
  }

  private onOpen = () => {
    console.log(`connection open ${this.id()}`);
    this.events.emit('open');
  }

  private onData = (data: any) => {
    console.log(`received data from ${this.id()}`, data);
    const event: RtcInboundEvent<any> = {
      peerid: this.id(),
      payload: data.payload,
    }
    this.dataEvents.emit(data.event, event);
  }

  private onError = (error: Error) => {
    console.info(`received error from ${this.id()} ${error}`);
    this.events.emit('error', error);
  }

  private onClose = () => {
    console.info(`connection closed from ${this.id()}`);
    this.events.emit('close');
  }
}
