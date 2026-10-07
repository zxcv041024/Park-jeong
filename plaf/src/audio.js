export class Foley {
  constructor() { this.enabled = false; this.context = null; }
  async enable(value) {
    this.enabled = value;
    if (value) { this.context ||= new AudioContext(); await this.context.resume(); }
  }
  play(kind, strength = 1) {
    if (!this.enabled || !this.context || this.context.state !== 'running') return;
    const ctx = this.context, t = ctx.currentTime;
    const impact = kind === 'land' || kind === 'stomp';
    const duration = impact ? .23 : .10;
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = impact ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(impact ? 150 : 680, t);
    osc.frequency.exponentialRampToValueAtTime(impact ? 38 : 270, t + duration);
    gain.gain.setValueAtTime(.0001, t);
    gain.gain.exponentialRampToValueAtTime((impact ? .16 : .018) * strength, t + .007);
    gain.gain.exponentialRampToValueAtTime(.0001, t + duration);
    osc.connect(gain).connect(ctx.destination); osc.start(t); osc.stop(t + duration);
    if (impact) {
      const n = ctx.createBuffer(1, Math.floor(ctx.sampleRate * .12), ctx.sampleRate);
      const data = n.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), g = ctx.createGain();
      source.buffer = n; filter.type = 'lowpass'; filter.frequency.value = 900;
      g.gain.setValueAtTime(.09 * strength, t); g.gain.exponentialRampToValueAtTime(.0001, t + .12);
      source.connect(filter).connect(g).connect(ctx.destination); source.start(t);
    }
  }
  dispose() { this.context?.close(); }
}
