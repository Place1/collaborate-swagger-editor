import { Me } from './me';

export const me = new Me();
console.info(`my peerid ${me.id()}`)

const queryParams = new URLSearchParams(window.location.search);
const existingPeerID = queryParams.get('peerid');
if (existingPeerID) {
  me.join(existingPeerID);
}
