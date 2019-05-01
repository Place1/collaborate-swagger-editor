import * as monaco from 'monaco-editor';
import { hashCode } from '../utils';
import React from 'react';

export interface CursorsState {
  [key: string]: monaco.Position;
}

interface Props {
  editor: monaco.editor.IStandaloneCodeEditor;
  cursors: CursorsState;
}

export class RemoteCursors extends React.Component<Props> {

  private decorations = new Array<string>();

  componentDidUpdate() {
    const newDecorations = Object.entries(this.props.cursors).map(([ peerid, position ]) => {
      const { lineNumber, column } = position;
      const colorNumber = hashCode(peerid) % 10 + 1; // consistent hash to get a stable color number (we have colors from [1, 10])
      return {
        range: new monaco.Range(lineNumber, column, lineNumber, column),
        options: {
          afterContentClassName: `another-cursor cursor-color-${colorNumber}`,
          zIndex: 10,
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        }
      };
    });

    // apply the decorations
    this.decorations = this.props.editor.getModel()!.deltaDecorations(this.decorations, newDecorations);
  }

  render() {
    return null;
  }
}
