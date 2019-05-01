import * as monaco from 'monaco-editor';

// @see: https://github.com/Microsoft/monaco-editor/issues/1427
export function fixEditsForMonacoBug(edits: monaco.editor.IIdentifiedSingleEditOperation[]) {
  return edits.reduce((accumulator, edit, i, edits) => {
    const prev = edits[i - 1];
    const next = edits[i + 1];
    if (edit.text === '\r' && next && next.text === '\n') {
      accumulator.push({ ...edit, text: '\r\n' });
    } else if (!(prev && prev.text === '\r' && edit.text === '\n')) {
      accumulator.push(edit);
    }
    return accumulator;
  }, new Array<monaco.editor.IIdentifiedSingleEditOperation>())
}
