export function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

export function hashCode(str: string) {
	let hash = 0;
	if (str.length == 0) {
    return hash;
  }
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = ((hash << 5) - hash) + char;
		hash = hash & hash; // Convert to 32bit integer
	}
	return Math.abs(hash);
}

export function invarient(condition: boolean, message: string) {
	if (!condition) {
		console.warn(`invariant has been broken: ${message}`);
	}
}
