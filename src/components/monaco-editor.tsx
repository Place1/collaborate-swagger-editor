import React, { useEffect } from 'react';
import * as monaco from 'monaco-editor';
import { me } from '../rtc/hmm';
import './monaco-editor.css';
import { hashCode } from '../utils';
import { TextCrdt, Operation, OperationResult } from '../text-crdt';
import { OpKind } from '../../kseq/src';

window.MonacoEnvironment = {
	getWorkerUrl: function (moduleId: string, label: string) {
    if (label === 'yaml') {
      return './yaml.js';
    }
    return './editor.worker.js'
	},
};

interface CursorsState {
  [key: string]: monaco.Position;
}

interface Props {
  onChange: (value: string) => void;
}

export const MonacoEditor = React.memo((props: Props) => {
  useEffect(() => {
    const editor = monaco.editor.create(document.getElementById('monacoEditor')!, {
      language: 'yaml',
      minimap: { enabled: false },
      theme: 'vs-dark',
      fontSize: 20,
    });

    // hack
    let locked = false

    const textCrdt = new TextCrdt(me.id());

    me.events.on('requestInitial', () => {
      me.dispatch('initial', textCrdt.toJSON());
    })

    me.events.on('initial', (json) => {
      textCrdt.loadFromJSON(json.payload);
    })

    textCrdt.events.on('onChange', (value) => {
      locked = true;
      editor.setValue(value);
      props.onChange(value);
      locked = false;
    });

    const onChangeDisposer = editor.onDidChangeModelContent((event) => {
      if (!locked) {
        console.log('editor changes', event.changes);
        const operations = applyChangesToCrdt(textCrdt, editor.getValue(), event.changes);
        me.dispatch('changes', operations);
      }
    });

    editor.onDidChangeCursorPosition((event) => {
      console.info(`cursor position changed ${event.position}`)
      me.dispatch('cursorPosition', event.position)
    })

    let decorations = new Array<string>();
    const cursors: CursorsState = {};

    function renderCursors() {
      // map the cursor state into a list of editor decorations
      const newDecorations = Object.entries(cursors).map(([ peerid, position ]) => {
        const { lineNumber, column } = position;
        const colorNumber = hashCode(peerid) % 10 + 1; // consistent hash to get a stable color number
        return {
          range: new monaco.Range(lineNumber, column, lineNumber, column),
          options: {
            afterContentClassName: `another-cursor cursor-color-${colorNumber} peer-cursor-${peerid}`,
            zIndex: 10,
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          }
        };
      });

      // apply the decorations
      decorations = editor.getModel()!.deltaDecorations(decorations, newDecorations);

      // we need to tell the editor to render because
      // we need to manually draw a dom node to show which
      // user is typing at a cursor
      editor.render()

      // remove all the old cursors
      document.body.querySelectorAll('.peer-cursor-name').forEach((element) => element.remove())

      // find all the cursors and render the correct user's
      // name in a html span element.
      Object.entries(cursors).map(([ peerid, position ]) => {
        const colorNumber = hashCode(peerid) % 10 + 1; // consistent hash to get a stable color number
        const element = editor.getDomNode()!.querySelector<HTMLElement>(`.peer-cursor-${peerid}`)!;
        element.style.opacity = '1'
        // const rect = element.getBoundingClientRect();
        // const nameElement = document.createElement('span');
        // nameElement.className = `peer-cursor-name cursor-color-${colorNumber}`
        // nameElement.innerHTML = peerid;
        // nameElement.style.fontFamily = 'Consolas, "Courier New", monospace';
        // nameElement.style.fontSize = '16px';
        // nameElement.style.fontWeight = 'bold';
        // nameElement.style.top = `${rect.top - 27}px`; // 27px is the height of the bubble
        // nameElement.style.left = `${rect.left}px`;
        // document.body.appendChild(nameElement);
      });
    }

    me.events.on('cursorPosition', (event) => {
      cursors[event.peerid] = event.payload;
      // renderCursors();
    })

    // Testing the decorations
    // editor.getModel()!.deltaDecorations([], [
    //   {
    //     range: new monaco.Range(1, 2, 1, 2),
    //     options: {
    //       afterContentClassName: 'another-cursor',
    //       hoverMessage: { value: 'hello' },
    //       stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
    //     }
    //   }
    // ])
    editor.onDidChangeModelDecorations(() => {

    })

    me.events.on('changes', (event) => {
      locked = true
      const results = textCrdt.applyMany(event.payload);
      applyOperationResultsToEditor(editor, results);
      editor.render();
      props.onChange(textCrdt.getValue());
      locked = false;
    });

    return () => {
      onChangeDisposer.dispose();
      editor.dispose()
      textCrdt.events.removeAllListeners();
    };
  });

  return <div id="monacoEditor" style={{ flex: 1 }} />;
});

function applyChangesToCrdt(crdt: TextCrdt, editorValue: string, changes: monaco.editor.IModelContentChange[]) {
  let operations = new Array<Operation>();
  changes.forEach((change) => {
    const start = change.rangeOffset;
    const end = start + change.rangeLength - 1;
    const text = change.text.replace(/\r\n/g, '\n'); // TODO figure out how to handle new lines
    operations = operations.concat(...crdt.setText(text, start, end));
  });
  return operations;
}

function applyOperationResultsToEditor(editor: monaco.editor.IStandaloneCodeEditor, opResults: OperationResult[]) {
  const model = editor.getModel()!;
  opResults.forEach((opResult) => {
    const start = model.getPositionAt(opResult.position);
    const end = model.getPositionAt(opResult.position + (opResult.kind === OpKind.Remove ? 1 : 0));
    const edit = {
      text: opResult.kind === OpKind.Remove ? '' : opResult.text,
      range: new monaco.Range(
        start.lineNumber,
        start.column,
        end.lineNumber,
        end.column,
      ),
    };
    model.applyEdits([edit]);
  });
}
