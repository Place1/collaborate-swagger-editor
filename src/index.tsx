import './style.css';
import React from 'react';
import yaml from 'js-yaml';
import { render } from 'react-dom';
import { SwaggerUI } from './components/swagger-ui';
import { MonacoEditor } from './components/monaco-editor';
import { Bar } from './components/Bar';

class App extends React.Component {

  state = {
    value: '',
    spec: {},
  }

  private onCrdtChange = (value: string) => {
    this.setState({ value });
  };

  private onEditorChange = (value: string) => {
    try {
      this.setState({ spec: yaml.safeLoad(value) });
    } catch {}
  }

  render() {
    return (
      <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
        <Bar />
        <div style={{ display: 'flex', flex: 1 }}>
          <MonacoEditor onChange={this.onEditorChange} />
          <SwaggerUI spec={this.state.spec} />
        </div>
      </div>
    );
  }
}

render(<App />, document.getElementById('root'));
