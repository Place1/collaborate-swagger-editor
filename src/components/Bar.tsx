import React from 'react';
import { me } from '../rtc/hmm';

function onShare() {
  window.open(`http://localhost:3000/?peerid=${me.id()}`);
}

interface Props {
  children: React.ReactNode;
}

export function Bar(props: Props) {
  return (
    <div style={{ height: 60, background: '#1e1e1e', display: 'flex', color: 'white' }}>
      <button onClick={onShare}>Share</button>
      <h3>{me.id()}</h3>
      {props.children}
    </div>
  );
}
