import './style.css';
import React from 'react';
import yaml from 'js-yaml';
import { render } from 'react-dom';
import { SwaggerUI } from './components/swagger-ui';
import { MonacoEditor } from './components/monaco-editor';
import * as monaco from 'monaco-editor';
import { Bar } from './components/Bar';
import { CursorsState, RemoteCursors } from './editor/remote-cursors';
import { me } from './rtc/hmm';
import { TextCrdt, Operation, OperationResult } from './text-crdt';
import { OpKind } from '../kseq/src';
import { fixEditsForMonacoBug } from './hack/resolve-edits-for-monaco-bug';

interface State {
  value: string;
  spec: any;
  editor?: monaco.editor.IStandaloneCodeEditor;
  cursors: CursorsState;
}

class App extends React.Component<{}, State> {

  private locked = false;
  private crdt = new TextCrdt(me.id());

  state: State = {
    value: '',
    spec: {},
    editor: undefined,
    cursors: {},
  }

  componentDidMount() {
    me.events.on('cursorPosition', (event) => {
      this.setState({
        cursors: {
          ...this.state.cursors,
          [event.peerid]: event.payload,
        }
      });
    });
  }

  private onEditorChange = (event: monaco.editor.IModelContentChange) => {
    try {
      // this.setState({ spec: yaml.safeLoad() });
    } catch {}
  }

  private onEditor = (editor: monaco.editor.IStandaloneCodeEditor) => {
    console.log('on editor')
    editor.onDidChangeModelContent((event) => {
      if (!this.locked) {
        console.log('editor changes', event.changes);
        const operations = applyChangesToCrdt(this.crdt, event.changes);
        me.dispatch('changes', operations);
      }
    });

    editor.onDidChangeCursorPosition((event) => {
      console.info(`cursor position changed ${event.position}`)
      me.dispatch('cursorPosition', event.position)
    })

    me.events.on('requestInitial', () => {
      me.dispatch('initial', this.crdt.toJSON());
    })

    me.events.on('initial', (json) => {
      this.crdt.loadFromJSON(json.payload);
    })

    me.events.on('changes', (event) => {
      this.locked = true
      const results = this.crdt.applyMany(event.payload);
      applyOperationResultsToEditor(editor, results);
      editor.render();
      this.locked = false;
    });

    this.crdt.events.on('onChange', (value) => {
      this.locked = true;
      editor.setValue(value);
      this.locked = false;
    });

    this.setState({ editor });
  }

  render() {
    return (
      <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
        <Bar />
        <div style={{ display: 'flex', flex: 1 }}>
          <MonacoEditor
            onEditor={this.onEditor}
          />
          {this.state.editor &&
            <RemoteCursors editor={this.state.editor} cursors={this.state.cursors} />
          }
          <SwaggerUI spec={this.state.spec} />
        </div>
      </div>
    );
  }
}

function applyChangesToCrdt(crdt: TextCrdt, changes: monaco.editor.IModelContentChange[]) {
  let operations = new Array<Operation>();
  changes.forEach((change) => {
    const start = change.rangeOffset;
    const end = start + change.rangeLength - 1;
    const text = change.text;
    operations = operations.concat(...crdt.setText(text, start, end));
  });
  return operations;
}

function applyOperationResultsToEditor(editor: monaco.editor.IStandaloneCodeEditor, opResults: OperationResult[]) {
  const model = editor.getModel()!;
  let edits = opResults.map((opResult) => {
    const start = model.getPositionAt(opResult.position);
    const end = model.getPositionAt(opResult.position + (opResult.kind === OpKind.Remove ? 1 : 0));
    return {
      text: opResult.kind === OpKind.Remove ? '' : opResult.text as string | null,
      range: new monaco.Range(
        start.lineNumber,
        start.column,
        end.lineNumber,
        end.column,
      ),
    };
  });

  edits = fixEditsForMonacoBug(edits);

  edits.forEach((edit) => model.applyEdits([edit]));
}

render(<App />, document.getElementById('root'));
