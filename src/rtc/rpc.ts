import * as monaco from 'monaco-editor';
import { EventEmitter } from 'events';
import StrictEventEmitter, { StrictBroadcast } from 'strict-event-emitter-types';
import { Operation, SerializedCrdt } from '../text-crdt';

export type RtcEmitter = StrictEventEmitter<EventEmitter, RtcInEvents, RtcOutEvents>
export type RtcBroadcast = StrictBroadcast<RtcEmitter>

export interface RtcOutEvents {
  requestInitial: void;
  initial: SerializedCrdt;
  changes: Operation[];
  cursorPosition: monaco.Position;

  // private section (perhaps move to another emitter)
  peerList: string[];
}

export type RtcInEvents = {
  [K in keyof RtcOutEvents]: RtcInboundEvent<RtcOutEvents[K]>;
}

export interface RtcInboundEvent<T> {
  peerid: string;
  payload: T;
}
