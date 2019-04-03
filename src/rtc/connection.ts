import PeerJS from 'peerjs';
import { editor } from 'monaco-editor';
import { EventEmitter } from 'events';
import StrictEventEmitter, { StrictBroadcast } from 'strict-event-emitter-types';

export type ConnectionEmitter = StrictEventEmitter<EventEmitter, Events>
export type ConnectionBroadcast = StrictBroadcast<ConnectionEmitter>

interface Events {
  changes: editor.IModelContentChange[];
  error: Error;
}

export class Connection {
  constructor(private raw: PeerJS.DataConnection, private events: ConnectionEmitter) {
    raw.on('data', this.onData);
    raw.on('error', this.onError);
    raw.on('close', this.onClose);
  }

  id() {
    return this.raw.peer;
  }

  send: ConnectionBroadcast = (event: string, payload?: any) => {
    console.info(`sending data to ${this.id()}`, { event, payload })
    this.raw.send({ event, payload });
  }

  private onData = (data: any) => {
    console.log(`received data from ${this.id()}`, data);
    this.events.emit(data.event, data.payload);
  }

  private onError = (error: Error) => {
    console.info(`received error from ${this.id()} ${error}`);
    this.events.emit('error', error);
  }

  private onClose = () => {
    console.info(`connection closed from ${this.id()}`);
  }
}
