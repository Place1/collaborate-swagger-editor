import React from 'react';
import * as monaco from 'monaco-editor';
import './editor.css';

window.MonacoEnvironment = {
	getWorker: function (moduleId: string, label: string) {
    console.log('loading', moduleId, label)
    if (label === 'yaml') {
      return new Worker('/yamlWorker.bundle.js');
    }
    return new Worker('/editorWorker.bundle.js');
	},
};

interface Props {
  onEditor: (editor: monaco.editor.IStandaloneCodeEditor) => void;
}

export class MonacoEditor extends React.Component<Props> {

  private editor!: monaco.editor.IStandaloneCodeEditor;

  componentDidMount() {
    console.info('editor mounted');

    this.editor = monaco.editor.create(document.getElementById('monacoEditor')!, {
      language: 'yaml',
      minimap: { enabled: false },
      theme: 'vs-dark',
      fontSize: 20,
    });

    this.props.onEditor(this.editor);
  }

  render() {
    return <div id="monacoEditor" style={{ flex: 1 }} />;
  }
}
