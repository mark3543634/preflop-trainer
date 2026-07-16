/** Contextual source vocabulary shared by public community chart imports. */
export type RawAction = 'fold' | 'call' | 'raise' | 'allin';
export type RawCell = RawAction | RawAction[];
export type RawChart = Record<string, RawCell>;
