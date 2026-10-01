"""
Builds the app's sound effects from the source recordings in assets/sounds/source, each timed to its
animation:

- heatmap-collapse.wav: the Welcome heatmap collapsing. The blocks-falling recording, trimmed so its first
  impact is at 0 ms; the collapse releases one row per impact, so the impact times below ARE the motion
  tokens (motion.heatmapRebuild.impactsMs).
- heatmap-stack.wav: the Welcome heatmap stacking back up. Single wooden clacks (cut from the stacking
  recording) mixed onto the rebuild's timeline: one on each landing that's heard.
- logo-flip.wav: the login mark flipping like a tossed coin. The coin's flick as the flip starts, its spin
  (shortened to the flip), its catch as the flip lands; then a wooden clack as each diagonal of the new
  face stacks in.
- page-clack.wav: one wooden clack, for a page of the onboarding pager settling into place.
- date-tick.wav: a small, dry, single wooden tick, for each date that crosses the date picker's centre. The
  very start of a clack (its knock, not its ring), high-passed so it sounds small, decaying fast, and much
  quieter than the other effects: it can play many times in a row.

It also writes sound-timings.json with the timings it used; a Jest test checks them against the motion
tokens, so the sounds and the animations can't drift apart silently. Re-run it after changing those tokens:

    python -m pip install miniaudio numpy
    python scripts/sounds/build-sounds.py
"""

import json
import wave
from pathlib import Path

import miniaudio
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
SOUNDS = ROOT / "assets" / "sounds"
SOURCE = SOUNDS / "source"
RATE = 44100
PEAK = 0.6  # every effect at the same loudness

# --- Timelines (must match the motion tokens; the test checks them) ---
STEP_MS = 70  # motion.heatmapReveal.waveStepMs: one diagonal after another
STACK_MS = 260  # motion.heatmapRebuild.stackMs: a block's drop, which lands at its end
HEATMAP_COLUMNS, HEATMAP_ROWS = 14, 7  # the Welcome heatmap
FLIP_MS = 560  # motion.hold.flipMs: the login mark's flip, edge-on halfway
MARK_SIDE = 3  # the login mark is a 3 x 3 patch of heatmap
# motion.heatmapRebuild.audioLeadMs: sound leaves a phone's speaker about this long after it's started. The
# flip itself doesn't wait for its sound, so the coin's catch is placed this much early to land with it.
AUDIO_LEAD_MS = 60

# The falling recording's impacts (measured: onsets where the level jumps sharply), in ms from the file's
# start. The seven strongest, one per row; the faint ones in between stay in the sound as texture.
FALL_IMPACTS_IN_FILE = [160, 200, 240, 316, 360, 440, 556]
FALL_PREROLL_MS = 3  # keep the first transient's attack intact

# The stacking recording holds three usable clacks: [start, end) ms of each.
CLACKS_IN_FILE = [(300, 352), (352, 408), (408, 520)]
LOUDEST_CLACK = 1

# The date tick: how much of a clack's attack to keep, how fast it dies away, and how loud it is.
TICK_MS = 26
TICK_DECAY_MS = 6  # the envelope falls by e every this many ms: a knock, no ring
TICK_PEAK = 0.3  # half the other effects

# The coin-toss recording: the thumb's flick, a long quiet spin, then the catch (right at the file's end).
COIN_FLICK_IN_FILE = 28
COIN_CATCH_IN_FILE = 944
COIN_PREROLL_MS = 3


def load(path: Path) -> np.ndarray:
    decoded = miniaudio.decode_file(str(path), output_format=miniaudio.SampleFormat.SIGNED16, sample_rate=RATE)
    samples = np.array(decoded.samples, dtype=np.float32).reshape(-1, decoded.nchannels).mean(axis=1)
    return samples / 32768


def ms(value: float) -> int:
    return int(round(value * RATE / 1000))


def fade(signal: np.ndarray, in_ms: float, out_ms: float) -> np.ndarray:
    out = signal.copy()
    n_in, n_out = ms(in_ms), ms(out_ms)
    if n_in:
        out[:n_in] *= np.linspace(0, 1, n_in)
    if n_out:
        out[-n_out:] *= np.linspace(1, 0, n_out)
    return out


def write(path: Path, signal: np.ndarray, peak: float = PEAK) -> None:
    signal = signal * (peak / max(1e-9, float(np.max(np.abs(signal)))))
    pcm = (np.clip(signal, -1, 1) * 32767).astype("<i2")
    with wave.open(str(path), "wb") as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(RATE)
        out.writeframes(pcm.tobytes())


def landing(diagonal: int) -> int:
    """When a diagonal of blocks lands, from the start of its stacking (heatmapRebuild.landingMs)."""
    return diagonal * STEP_MS + STACK_MS


def sounded_diagonals(diagonals: int) -> list[int]:
    """Every other diagonal is heard (a stacking rhythm, not a rattle), plus the last: the final block."""
    heard = list(range(0, diagonals, 2))
    if heard[-1] != diagonals - 1:
        heard.append(diagonals - 1)
    return heard


def load_clacks() -> list[np.ndarray]:
    source = load(SOURCE / "wood-block-stack.mp3")
    clacks = []
    for begin, end in CLACKS_IN_FILE:
        clack = fade(source[ms(begin) : ms(end)], 0.5, 25)
        clacks.append(clack / max(1e-9, float(np.max(np.abs(clack)))))
    return clacks


def place(track: np.ndarray, sound: np.ndarray, at_ms: float, gain: float) -> None:
    begin = ms(at_ms)
    track[begin : begin + len(sound)] += gain * sound


def main() -> None:
    clacks = load_clacks()

    # Welcome heatmap, collapse: start on the first impact, end once the clatter has died away.
    fall = load(SOURCE / "wood-blocks-falling.mp3")
    start = FALL_IMPACTS_IN_FILE[0] - FALL_PREROLL_MS
    write(SOUNDS / "heatmap-collapse.wav", fade(fall[ms(start) : ms(FALL_IMPACTS_IN_FILE[-1] + 260)], 1, 120))
    impacts = [t - FALL_IMPACTS_IN_FILE[0] for t in FALL_IMPACTS_IN_FILE]

    # Welcome heatmap, stack: one clack per heard landing, rotating through the three for a hand-placed feel.
    diagonals = HEATMAP_COLUMNS + HEATMAP_ROWS - 1
    heard = sounded_diagonals(diagonals)
    stack_clacks = [landing(d) for d in heard]
    track = np.zeros(ms(stack_clacks[-1] + 300))
    for index, (diagonal, at) in enumerate(zip(heard, stack_clacks)):
        last = diagonal == diagonals - 1
        clack = clacks[LOUDEST_CLACK] if last else clacks[index % len(clacks)]
        place(track, clack, at, 1.0 if last else (0.72, 0.84, 0.78, 0.9)[index % 4])
    write(SOUNDS / "heatmap-stack.wav", track)

    # Login mark: tossed like a coin (flick at 0, spin, catch as the flip lands), then its five diagonals
    # clacking into place, building up.
    coin = load(SOURCE / "coin-toss.mp3")
    coin = coin / max(1e-9, float(np.max(np.abs(coin))))
    catch_at = FLIP_MS - AUDIO_LEAD_MS
    catch_onset = COIN_CATCH_IN_FILE - 14  # the catch segment starts 14 ms before its onset
    spin = fade(coin[ms(COIN_FLICK_IN_FILE - COIN_PREROLL_MS) : ms(COIN_FLICK_IN_FILE + catch_at - 40)], 1, 60)
    catch = fade(coin[ms(catch_onset) :], 1, 20)
    turn = FLIP_MS / 2
    mark_diagonals = 2 * MARK_SIDE - 1
    flip_clacks = [turn + landing(d) for d in range(mark_diagonals)]
    track = np.zeros(ms(flip_clacks[-1] + 300))
    place(track, spin, 0, 0.9)
    place(track, catch, catch_at - 14, 0.8)
    for index, at in enumerate(flip_clacks):
        last = index == mark_diagonals - 1
        clack = clacks[LOUDEST_CLACK] if last else clacks[index % len(clacks)]
        place(track, clack, at, 0.72 + 0.28 * index / (mark_diagonals - 1))
    write(SOUNDS / "logo-flip.wav", track)

    # Pager: a page settling into place is one block set down.
    write(SOUNDS / "page-clack.wav", np.concatenate([clacks[LOUDEST_CLACK], np.zeros(ms(40))]))

    # Date picker: one small wooden tick. The first moments of the shortest clack, with its low body taken
    # out (a first-difference high-pass) so it reads as a tick, not a block; then a fast exponential decay.
    knock = clacks[0][: ms(TICK_MS)]
    knock = np.concatenate([[knock[0]], np.diff(knock)]) * 0.6 + knock * 0.4
    knock = knock * np.exp(-np.arange(len(knock)) / ms(TICK_DECAY_MS))
    write(SOUNDS / "date-tick.wav", np.concatenate([fade(knock, 0.3, 4), np.zeros(ms(20))]), TICK_PEAK)

    (SOUNDS / "sound-timings.json").write_text(
        json.dumps(
            {
                "note": "Generated by scripts/sounds/build-sounds.py; checked against the motion tokens.",
                "heatmapCollapse": {"impactsMs": impacts},
                "heatmapStack": {
                    "columns": HEATMAP_COLUMNS,
                    "rows": HEATMAP_ROWS,
                    "stepMs": STEP_MS,
                    "stackMs": STACK_MS,
                    "soundedDiagonals": heard,
                    "clacksMs": stack_clacks,
                },
                "logoFlip": {
                    "flipMs": FLIP_MS,
                    "side": MARK_SIDE,
                    "audioLeadMs": AUDIO_LEAD_MS,
                    "coinFlickMs": COIN_PREROLL_MS,
                    "coinCatchMs": catch_at,
                    "clacksMs": flip_clacks,
                },
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print("heatmap collapse impacts (ms):", impacts)
    print("heatmap stack clacks (ms):", stack_clacks)
    print("logo flip: coin catch at", catch_at, "ms; clacks (ms):", flip_clacks)


if __name__ == "__main__":
    main()
