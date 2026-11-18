let sharedContext: AudioContext | null = null

function getContext() {
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextClass) return null
  sharedContext ??= new AudioContextClass()
  return sharedContext
}

/** Browsers only allow audio after a user gesture; call this from any tap to arm the chime. */
export function unlockChime() {
  const context = getContext()
  if (context?.state === 'suspended') void context.resume()
}

export function playChime() {
  const context = getContext()
  if (!context) return
  if (context.state === 'suspended') void context.resume()
  const start = context.currentTime
  ;[[740, 0], [1040, 0.18]].forEach(([frequency, offset]) => {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(frequency, start + offset)
    gain.gain.setValueAtTime(0.0001, start + offset)
    gain.gain.exponentialRampToValueAtTime(0.12, start + offset + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.32)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start(start + offset)
    oscillator.stop(start + offset + 0.34)
  })
}
