import React from 'react';
import { me } from '../rtc/hmm';

function onShare() {
  window.open(`http://localhost:3000/?peerid=${me.id()}`);
}

export function Bar() {
  return (
    <div style={{ height: 60, background: '#1e1e1e', display: 'flex' }}>
      <button onClick={onShare}>Share</button>
    </div>
  );
}
