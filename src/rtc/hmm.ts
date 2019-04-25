import { Me } from './me';

const queryParams = new URLSearchParams(window.location.search);

export const me = new Me(queryParams.get('testid') || undefined);
console.info(`my peerid ${me.id()}`)

const existingPeerID = queryParams.get('peerid');
if (existingPeerID) {
  me.join(existingPeerID);
}
