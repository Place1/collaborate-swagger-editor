import { TextCrdt } from "../src/text-crdt";

describe('document handling by crdt during reconnect', () => {

  test('crdt is working', () => {
    const initialDocument = "hello world";
    const alice = new TextCrdt('alice');
    const bob = new TextCrdt('bob');
    bob.applyMany(alice.setText(initialDocument, 0, 0));
    expect(alice.getValue().length).toEqual(initialDocument.length);
    expect(alice.getValue()).toEqual(bob.getValue());
  });

  test('basic reconnect and sync', () => {
    const initialDocument = "hello world";

    const alice = new TextCrdt('alice');
    const bob = new TextCrdt('bob');
    bob.applyMany(alice.setText(initialDocument, 0, 0));

    const reconnectedBob = new TextCrdt('bob');
    reconnectedBob.loadFromJSON(alice.toJSON());
    expect(alice.getValue()).toEqual(bob.getValue());

    alice.applyMany(reconnectedBob.setText('!', 3, -1));
    expect(alice.getValue()).toEqual(reconnectedBob.getValue());
  });

  test('reconnect with concurrent edits and out-of-order delivery', () => {
    const initialDocument = "hello world";

    const alice = new TextCrdt('alice');
    const bob = new TextCrdt('bob');
    bob.applyMany(alice.setText(initialDocument, 0, 0));

    const reconnectedBob = new TextCrdt('bob');
    const alicesCrdt = alice.toJSON();

    // alice concurrently edited while the CRDT was being sent to bob
    const edit1 = alice.setText('1', 5, -1);
    const edit2 = alice.setText('2', 6, -1);
    const edit3 = alice.setText('3', 7, -1);

    // bob reconnected with an out-of-date crdt
    reconnectedBob.loadFromJSON(alicesCrdt);

    // reconnected bob shouldn't match current alice because concurrent edits are missing
    expect(reconnectedBob.getValue()).not.toEqual(alice.getValue());

    // alice re-transmits her concurrent edits
    // and they arrive out-of-order with duplicate deliveries!
    reconnectedBob.applyMany(edit2);
    reconnectedBob.applyMany(edit1);
    reconnectedBob.applyMany(edit3);
    reconnectedBob.applyMany(edit1);

    // at-least-once delivery sematics have been achieved so the documents are
    // now expected to match
    expect(reconnectedBob.getValue()).toEqual(alice.getValue());
  });

});
