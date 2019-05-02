import './style.css';
import React from 'react';
// import yaml from 'js-yaml';
import { render } from 'react-dom';
// import { SwaggerUI } from './components/swagger';
import { Bar } from './components/Bar';
import { me } from './rtc/hmm';
import { TextCrdt } from './text-crdt';
import { RemoteMonaco } from './editor/remote-editor';

interface State {
  spec: any;
}

class App extends React.Component<{}, State> {

  private crdt = new TextCrdt(me.id());

  state: State = {
    spec: {},
  }

  private onEditorChange = (value: string) => {
    try {
      // this.setState({ spec: yaml.safeLoad(value) });
    } catch {}
  }

  render() {
    return (
      <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
        <Bar />
        <div style={{ display: 'flex', flex: 1 }}>
          <RemoteMonaco
            me={me}
            crdt={this.crdt}
            onChange={this.onEditorChange}
          />
          {/* <SwaggerUI spec={this.state.spec} /> */}
        </div>
      </div>
    );
  }
}


render(<App />, document.getElementById('root'));
