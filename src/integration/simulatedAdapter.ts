import type { BiofingerAdapter, ExternalPunch } from './biofingerAdapter';
// Development dependency only. Never establishes a real synchronization.
export class SimulatedBiofingerAdapter implements BiofingerAdapter {
  readonly source = 'simulation' as const;
  constructor(private records: ExternalPunch[]) {}
  async query() { return { records: structuredClone(this.records), completedAt: new Date().toISOString() }; }
}
