import { EventEmitter } from 'events';
import StrictEventEmitter, { StrictBroadcast, VoidKeys } from 'strict-event-emitter-types';
import { KSeq, Op, InsertOp, RemoveOp, OpKind } from "../kseq/src";
import { invarient } from './utils';
import { Ident, Segment } from '../kseq/src/idents';

interface CrdtOutEvents {
  onChange: string;
}

type TextCrdtEvents = StrictEventEmitter<EventEmitter, CrdtOutEvents>;

export class TextCrdt {

  events: TextCrdtEvents = new EventEmitter()

  private crdt: KSeq<string>;

  constructor(id: string) {
    this.crdt = new KSeq<string>(id);
  }

  applyMany(operations: Operation[]) {
    for (const operation of operations.map(parseOp)) {
      console.log(`applying operation ${operation}`)
      this.crdt.apply(operation);
    }
    this.events.emit('onChange', this.crdt.toArray().join(''));
  }

  setText(text: string, start: number, end: number): Operation[] {
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

    this.events.emit('onChange', this.crdt.toArray().join(''));

    return operations.map(stringifyOp);
  }
}

/**
 * there's a tiny by with the KSeq Op.toString and Op.parse methods. They
 * don't pass the correct "id" to the Ident.parse algorithm.
 * So i've implemented the methods here with the fix.
 * TODO: submit a PR
 */

type Operation = string;

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
