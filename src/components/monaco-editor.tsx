import React, { useEffect } from 'react';
import * as monaco from 'monaco-editor';
import { me } from '../rtc/hmm';

window.MonacoEnvironment = {
	getWorkerUrl: function (moduleId: string, label: string) {
    if (label === 'yaml') {
      return './yaml.js';
    }
    return './editor.worker.js'
	},
};

interface Props {
  onChange: (value: string, changes: monaco.editor.IModelContentChange[]) => void;
}

export const MonacoEditor = React.memo((props: Props) => {
  useEffect(() => {
    const editor = monaco.editor.create(document.getElementById('monacoEditor')!, {
      language: 'yaml',
      minimap: { enabled: false },
      theme: 'vs-dark',
    });

    // this is a hack
    // i only want to call props.onChange when the user
    // causes an edit, not if an rtc event triggers an edit.
    let lock = false

    const onChangeDisposer = editor.onDidChangeModelContent((event: monaco.editor.IModelContentChangedEvent) => {
      if (!lock) {
        props.onChange(editor.getValue(), event.changes);
      } else {
        props.onChange(editor.getValue(), []);
      }
    });

    me.events.on('changes', (changes) => {
      const edits = changes.map((change) => ({
        ...change,
        range: monaco.Range.lift(change.range),
      }))
      lock = true
      editor.getModel()!.applyEdits(edits);
      lock = false
    });

    return () => {
      onChangeDisposer.dispose();
      editor.dispose()
    };
  });

  return <div id="monacoEditor" style={{ flex: 1 }} />;
});
