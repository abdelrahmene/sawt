# Drop the voice clips here

One audio file per line of [`../truth.jsonl`](../truth.jsonl), named exactly as its
`clip` field — `01.m4a`, `02.m4a`, and so on. A phone voice memo is the right
recording: that is what a real customer sends.

```bash
npm run bench     # transcribes every clip, then measures what survived
```

## What the benchmark measures, and what it does not

It does **not** measure word error rate. Algerian darija has no standard
orthography, so there is no reference spelling to score against — and the
models read it well, so WER would be measuring the part that already works.

It measures what decides a sale:

- **intent** — price, sizes, delivery time, availability, objection, cancellation
- **entities** — wilaya, commune, quantity, size

A rough transcription that returns the right wilaya and the right size is a
commercial success. A perfect one that loses the wilaya is worthless.

## Two rules about the recordings themselves

**Never a real customer's audio.** Record your own voice, or someone who has
agreed. This repository is public: a voice is personal data, and nobody in it
consented to being published.

**Record the way people actually send them.** Hold the phone where you normally
hold it, in the room you are normally in. A clean studio take measures a
situation that never happens — and it is exactly the noisy, far-from-the-mouth
recording that breaks transcription in the field.

Anything you do not want published goes in `private/`, which is gitignored.
