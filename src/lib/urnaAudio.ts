/**
 * Sintetizador de Áudio da Urna Eletrônica (Estilo TSE) usando Web Audio API nativa
 * e reprodutor resiliente para áudio customizado configurado no condomínio.
 *
 * Regra do som TSE:
 * - Primeiro bip agudo curto (~1046 - 1100 Hz, ~120ms)
 * - Imediatamente seguido, sem pausa perceptível, de um bip mais grave (~500 Hz, ~130ms)
 * - Envelopes suaves de ataque/decaimento para evitar estalos (cliques).
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
   * Reproduz o clássico efeito sonoro da urna eletrônica do TSE:
   * Sequência característica "bip-bip":
   * 1. Bip agudo curto (~1050 Hz, 120ms)
   * 2. Imediatamente a seguir, bip mais grave (~500 Hz, 130ms)
   * Sem estalos (envelopes suaves).
   */
  public tocarSomConfirmacaoTSE(): void {
    if (!this.isSomAtivado()) return

    try {
      const ctx = this.getAudioContext()
      if (!ctx) return

      const now = ctx.currentTime

      // Tom 1: agudo (1050 Hz), duração ~120ms
      const dur1 = 0.12
      this.tocarTom(ctx, 1050, now, dur1, 'sine', 0.28)

      // Tom 2: grave (500 Hz), imediatamente subsequente sem pausa perceptível
      const inicio2 = now + dur1
      const dur2 = 0.13
      this.tocarTom(ctx, 500, inicio2, dur2, 'sine', 0.28)
    } catch (err) {
      console.warn('Falha ao sintetizar som da urna TSE:', err)
    }
  }

  /**
   * Reproduz um arquivo de áudio via URL (ex: som_voto enviado pelo admin).
   * Se a reprodução falhar (erro de rede, codec, etc.), faz fallback silencioso para o bip TSE sintetizado.
   */
  public async tocarAudioCustomizadoOuSintetizado(audioUrl?: string | null): Promise<void> {
    if (!this.isSomAtivado()) return

    if (!audioUrl || !audioUrl.trim()) {
      this.tocarSomConfirmacaoTSE()
      return
    }

    try {
      const audio = new Audio(audioUrl)
      audio.volume = 0.8
      await audio.play()
    } catch (err) {
      console.warn(
        'Falha ao carregar/reproduzir áudio personalizado, caindo para sintetizado:',
        err,
      )
      this.tocarSomConfirmacaoTSE()
    }
  }

  /**
   * Reproduz o som de erro / recusa (dois bips graves "buzz" distintos).
   */
  public tocarSomErro(): void {
    if (!this.isSomAtivado()) return

    try {
      const ctx = this.getAudioContext()
      if (!ctx) return

      const now = ctx.currentTime

      // Dois tons graves curtos
      this.tocarTom(ctx, 220, now, 0.12, 'sawtooth', 0.2)
      this.tocarTom(ctx, 164.8, now + 0.15, 0.2, 'sawtooth', 0.2)
    } catch (err) {
      console.warn('Falha ao sintetizar som de erro:', err)
    }
  }

  /**
   * Sintetiza um tom individual com envelope suave de ataque e decaimento para não estalar.
   */
  private tocarTom(
    ctx: AudioContext,
    frequencia: number,
    startTime: number,
    duracao: number,
    tipo: OscillatorType = 'sine',
    volumeMax = 0.28,
  ) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = tipo
    osc.frequency.setValueAtTime(frequencia, startTime)

    // Envelope suave para prevenir estalos/cliques
    // Começa praticamente em zero
    gain.gain.setValueAtTime(0.0001, startTime)
    // Ataque suave em 12ms
    const attackTime = 0.012
    gain.gain.exponentialRampToValueAtTime(volumeMax, startTime + attackTime)
    // Mantém e realiza decaimento exponencial até quase zero
    const releaseTime = Math.max(0.02, duracao - attackTime)
    gain.gain.setValueAtTime(volumeMax, startTime + duracao - releaseTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duracao)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(startTime)
    osc.stop(startTime + duracao + 0.02)
  }
}

export const urnaAudio = new UrnaAudioService()
