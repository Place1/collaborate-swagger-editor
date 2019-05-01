import React from 'react';
import * as monaco from 'monaco-editor';
import { TextCrdt, Operation, OperationResult } from '../../text-crdt';
import { Me } from '../../rtc/me';
import { MonacoEditor } from '../monaco-editor';
import { CursorsState, RemoteCursors } from '../../editor/remote-cursors';
import { OpKind } from '../../../kseq/src';
import { fixEditsForMonacoBug } from '../../hack/resolve-edits-for-monaco-bug';

interface Props {
  crdt: TextCrdt;
  me: Me;
  onChange: (value: string) => void;
}

interface State {
  editor?: monaco.editor.IStandaloneCodeEditor;
  cursors: CursorsState;
}

export class RemoteMonaco extends React.Component<Props, State> {
  /**
   * this flag is set to true when changing the editor model
   * content programatically (i.e. not by typing).
   * when the flag is true the event handler for a human typing
   * will no-op
   */
  private locked = false;

  state: State = {
    editor: undefined,
    cursors: {},
  }

  private onEditor = (editor: monaco.editor.IStandaloneCodeEditor) => {
    console.log('on editor')
    editor.onDidChangeModelContent((event) => {
      if (!this.locked) {
        console.log('editor changes', event.changes);
        const operations = applyChangesToCrdt(this.props.crdt, event.changes);
        this.props.me.dispatch('changes', operations);
        this.props.onChange(this.props.crdt.getValue());
      }
    });

    editor.onDidChangeCursorPosition((event) => {
      console.info(`cursor position changed ${event.position}`)
      this.props.me.dispatch('cursorPosition', event.position)
    })

    this.props.me.events.on('cursorPosition', (event) => {
      this.setState({
        cursors: {
          ...this.state.cursors,
          [event.peerid]: event.payload,
        }
      });
    });

    this.props.me.events.on('requestInitial', () => {
      this.props.me.dispatch('initial', this.props.crdt.toJSON());
    })

    this.props.me.events.on('initial', (json) => {
      this.props.crdt.loadFromJSON(json.payload);
      editor.setValue(this.props.crdt.getValue());
    })

    this.props.me.events.on('changes', (event) => {
      this.locked = true
      const results = this.props.crdt.applyMany(event.payload);
      applyOperationResultsToEditor(editor, results);
      this.locked = false;
    });

    this.setState({ editor });
  }

  render() {
    return (
      <>
        <MonacoEditor onEditor={this.onEditor} />
        {this.state.editor &&
          <RemoteCursors editor={this.state.editor} cursors={this.state.cursors} />
        }
      </>
    )
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
