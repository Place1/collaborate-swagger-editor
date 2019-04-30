import { EventEmitter } from 'events';
import StrictEventEmitter, { StrictBroadcast, VoidKeys } from 'strict-event-emitter-types';
import { KSeq, Op, InsertOp, RemoveOp, OpKind } from "../kseq/src";
import { invarient } from './utils';
import { Ident, Segment } from '../kseq/src/idents';
import { ArrayAtomList, Atom, AtomList } from '../kseq/src/storage';

interface CrdtOutEvents {
  onChange: string;
}

type TextCrdtEvents = StrictEventEmitter<EventEmitter, CrdtOutEvents>;

export type SerializedCrdt = any;

export interface OperationResult {
  kind: OpKind,
  text: string,
  position: number,
}

export class TextCrdt {

  events: TextCrdtEvents = new EventEmitter()

  private crdt: KSeq<string>;

  constructor(id: string) {
    this.crdt = new KSeq<string>(id);
  }

  getValue() {
    return this.crdt.toArray().join('');
  }

  applyMany(operations: Operation[]) {
    const edits = [];
    for (const operation of operations.map(op => Op.parse(op))) {
      console.log(`applying operation ${operation}`)
      const pos = this.crdt.apply(operation);
      if (pos !== -1) {
        edits.push({
          kind: operation.kind,
          text: this.crdt.get(pos),
          position: pos,
        });
      }
    }
    // this.events.emit('onChange', this.getValue());
    return edits;
  }

  setText(text: string, start: number, end: number): Operation[] {
    console.info('set text', JSON.stringify(text));
    const operations = new Array<Op>();

    // delete the range
    for (let i = end; i >= start; i--) {
      // console.log(`removing ${i}`)
      operations.push(this.crdt.remove(i));
    }

    // insert the new text
    for (let i = 0; i < text.length; i++) {
      // console.log(`inserting ${text[i]} at ${start + i}`)
      operations.push(this.crdt.insert(text[i], start + i));
    }

    this.events.emit('onChange', this.getValue());

    return operations.map(op => op.toString());
  }

  toJSON(): SerializedCrdt {
    return this.crdt.toJSON();
  }

  loadFromJSON(json: SerializedCrdt) {
    for (const atom of json.s) {
      ((this.crdt as any).atoms as AtomList<string>).add(parseIdent(atom[0]), atom[1]);

    }
    (this.crdt as any).time = json.t;
    this.events.emit('onChange', this.getValue());
  }
}

/**
 * there's a tiny by with the KSeq Op.toString and Op.parse methods. They
 * don't pass the correct "id" to the Ident.parse algorithm.
 * So i've implemented the methods here with the fix.
 * TODO: submit a PR
 */

export type Operation = string;

function stringifyOp(op: Op): string {
  if (op instanceof InsertOp) {
    return `+${op.timestamp}/${op.replica}/${op.id.toString()}/${op.value}`;
  }
  if (op instanceof RemoveOp) {
    return `-${op.timestamp}/${op.replica}/${op.id.toString()}`;
  }
  throw new Error(`unknown operation ${op}`);
}

function parseOp(str: string): Op {
  const kind = str[0];
  let [timestamp, replica, id, value] = str.substr(1).split('/', 4);
  switch(kind) {
    case '+':
      return new InsertOp(replica, Number(timestamp), parseIdent(id), value);

    case '-':
      return new RemoveOp(replica, Number(timestamp), parseIdent(id));
  }
  throw new Error(`unknown operation ${str}`);
}

function parseIdent(str: string): Ident {
  const [time, pathstr] = str.split('#');
  if (time === undefined || time.length == 0) {
    throw new Error("The ident is missing a timestamp");
  }
  if (pathstr === undefined || pathstr.length == 0) {
    throw new Error("The ident is missing a path");
  }
  let prev: string | undefined = undefined;
  const path = pathstr.split('.').map((token) => {
    let [ digit, replica ] = token.split(':', 2);
    if (replica === undefined) {
      replica = prev!;
    } else {
      prev = replica;
    }
    return Segment(Number(digit), replica);
  });
  return new Ident(Number(time), path);
}
