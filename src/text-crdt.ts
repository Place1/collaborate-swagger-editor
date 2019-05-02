import { KSeq, Op, OpKind, SerializedKSeq } from "../kseq/src";

export type SerializedCrdt = any;

export type Operation = string;

export interface OperationResult {
  kind: OpKind,
  text: string,
  position: number,
}

export class TextCrdt {

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
      console.info(`applying operation ${operation}`)
      const pos = this.crdt.apply(operation);
      if (pos !== -1) {
        edits.push({
          kind: operation.kind,
          text: this.crdt.get(pos),
          position: pos,
        });
      }
    }
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

    return operations.map(op => op.toString());
  }

  toJSON(): SerializedKSeq<string> {
    return this.crdt.toJSON();
  }

  loadFromJSON(json: SerializedKSeq<string>) {
    this.crdt.fromJSON(json);
  }
}
