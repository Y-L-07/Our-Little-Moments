"""Original score for Our Little Moments. Run with Python 3 to render the local WAV."""
from array import array
from math import exp, sin, tau
from pathlib import Path
import sys
import wave

rate = 22050
beat = 60 / 72
# Three-beat bars. Left hand plays the broken chord, right hand answers it.
bars = [
    ((50, 57, 66), [(0.5, 69), (1.5, 74), (2.5, 73)]),
    ((47, 54, 62), [(0, 69), (1.5, 66)]),
    ((43, 55, 59), [(0.5, 67), (1.5, 71), (2.5, 69)]),
    ((45, 57, 61), [(0, 64), (1.5, 66), (2.25, 64)]),
    ((50, 57, 66), [(0.5, 69), (1.5, 74), (2.25, 78)]),
    ((47, 54, 62), [(0, 76), (1.5, 73), (2.5, 69)]),
    ((43, 55, 62), [(0, 71), (1, 67), (2, 66)]),
    ((45, 52, 61), [(0.5, 64), (1.5, 62)]),
]
samples = array("d", [0]) * round(len(bars) * 3 * beat * rate)


def strike(midi, position, gain):
    frequency = 440 * 2 ** ((midi - 69) / 12)
    start = round(position * beat * rate)
    duration = 2.7
    for i in range(round(duration * rate)):
        time = i / rate
        phase = tau * frequency * time
        tone = sin(phase) + 0.24 * exp(-2.6 * time) * sin(2 * phase)
        tone += 0.10 * exp(-4 * time) * sin(3.005 * phase)
        envelope = (1 - exp(-70 * time)) * exp(-1.7 * time)
        envelope *= min(1, (duration - time) / 0.18)
        # Wrap the fading tail into the first bar so the loop joins smoothly.
        samples[(start + i) % len(samples)] += gain * envelope * tone


for bar_index, (chord, melody) in enumerate(bars):
    for beat_index, pitch in enumerate(chord):
        strike(pitch, bar_index * 3 + beat_index, 0.15)
    for offset, pitch in melody:
        strike(pitch, bar_index * 3 + offset, 0.23)

pcm = array("h", (round(sample * 32767) for sample in samples))
if sys.byteorder != "little":
    pcm.byteswap()
output = Path(__file__).resolve().parents[3] / "public/audio/moonlit-window.wav"
output.parent.mkdir(parents=True, exist_ok=True)
with wave.open(str(output), "wb") as track:
    track.setparams((1, 2, rate, len(pcm), "NONE", "not compressed"))
    track.writeframes(pcm.tobytes())
