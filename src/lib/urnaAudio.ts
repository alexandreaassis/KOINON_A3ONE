/**
 * Sintetizador de Áudio da Urna Eletrônica (Estilo TSE) usando Web Audio API nativa.
 * NÃO utiliza arquivos mp3 externos nem CDNs de terceiros.
 * Totalmente autônomo e resiliente a autoplay policies.
 */

const AUDIO_STORAGE_KEY = 'urna_som_confirmacao_ativo'

class UrnaAudioService {
  private audioCtx: AudioContext | null = null

  private getAudioContext(): AudioContext | null {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AudioContextClass) return null

      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        this.audioCtx = new AudioContextClass()
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {
          /* silencioso se bloqueado */
        })
      }

      return this.audioCtx
    } catch {
      return null
    }
  }

  /**
   * Verifica se o som está ativado nas preferências do usuário (localStorage).
   * Padrão: true (ligado).
   */
  public isSomAtivado(): boolean {
    try {
      const saved = localStorage.getItem(AUDIO_STORAGE_KEY)
      if (saved === null) return true
      return saved === 'true'
    } catch {
      return true
    }
  }

  /**
   * Altera a preferência de áudio no localStorage.
   */
  public setSomAtivado(ativado: boolean): void {
    try {
      localStorage.setItem(AUDIO_STORAGE_KEY, ativado ? 'true' : 'false')
    } catch {
      /* ignore */
    }
  }

  /**
   * Reproduz o clássico som de confirmação tipo Urna Eletrônica do TSE:
   * Sequência característica de bips curtos agudos ascendentes ou repetidos
   * seguidos do sinal longo de encerramento do voto ("pilili... pip!").
   * TSE: ~880Hz -> 1318.5Hz (Lá5 / Mi6) com envelope suave e fade out.
   */
  public tocarSomConfirmacaoTSE(): void {
    if (!this.isSomAtivado()) return

    try {
      const ctx = this.getAudioContext()
      if (!ctx) return

      const now = ctx.currentTime

      // Sequência de notas do clássico encerramento da urna
      // Nota 1: curta (1000Hz)
      this.tocarTom(ctx, 1046.5, now, 0.08, 'sine', 0.25)

      // Nota 2: curta (1046.5Hz)
      this.tocarTom(ctx, 1046.5, now + 0.1, 0.08, 'sine', 0.25)

      // Nota 3: prolongada aguda clássica da urna (1318.51 Hz - E6)
      this.tocarTom(ctx, 1318.5, now + 0.22, 0.55, 'sine', 0.35)
    } catch (err) {
      // Ignora silenciosamente qualquer erro de reprodução de áudio
      console.warn('Falha ao sintetizar som da urna:', err)
    }
  }

  /**
   * Reproduz o som de erro / recusa (tom grave duplo decrescente tipo "buzz").
   */
  public tocarSomErro(): void {
    if (!this.isSomAtivado()) return

    try {
      const ctx = this.getAudioContext()
      if (!ctx) return

      const now = ctx.currentTime

      // Dois bips graves curtos
      this.tocarTom(ctx, 220, now, 0.12, 'sawtooth', 0.2)
      this.tocarTom(ctx, 164.8, now + 0.16, 0.2, 'sawtooth', 0.2)
    } catch (err) {
      console.warn('Falha ao sintetizar som de erro:', err)
    }
  }

  /**
   * Sintetiza um tom individual com envelope Attack-Decay-Sustain-Release
   */
  private tocarTom(
    ctx: AudioContext,
    frequencia: number,
    startTime: number,
    duracao: number,
    tipo: OscillatorType = 'sine',
    volumeMax = 0.3,
  ) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = tipo
    osc.frequency.setValueAtTime(frequencia, startTime)

    // Envelope suave para evitar estalo no início e fim
    gain.gain.setValueAtTime(0.0001, startTime)
    // Ataque rápido
    gain.gain.exponentialRampToValueAtTime(volumeMax, startTime + 0.02)
    // Fade out ao final
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duracao)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(startTime)
    osc.stop(startTime + duracao + 0.05)
  }
}

export const urnaAudio = new UrnaAudioService()
