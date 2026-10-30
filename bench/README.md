# Darija benchmark

## Why not word error rate

Algerian darija has no standard orthography. The same sentence is spelled four
different ways by four speakers, and is written in Arabic script by some and
Latin script by others. WER would mostly measure spelling conventions that no
two people agree on.

What decides whether a sale happens is narrower and harder to fake:

- **intent** — price, sizes, availability, delivery time, delivery cost,
  quality objection, order, cancellation, complaint
- **entities** — wilaya, commune, quantity, size

A rough transcript that returns the right wilaya and the right size is a
commercial success. A perfect transcript that loses the wilaya is worthless.

## The corpus

`clips/` holds short voice notes in Algerian darija, recorded for this project.

**No real customer audio is used, anywhere.** A voice is not anonymisable — the
voice *is* the identifier — and customer messages obtained through a platform
integration are not mine to publish. Every clip here was recorded by me or by
someone who knew it would be published, for this purpose.

## Ground truth

`truth.jsonl`, one JSON object per line:

```json
{"clip":"01.m4a","text":"السلام، شحال الثمن تاعو؟ وواش كاين توصيل لـ وهران؟","intent":"price","wilaya":"Oran","commune":null,"quantity":null,"size":null}
{"clip":"02.m4a","text":"واش راه جلد حقيقي ولا ستيتيك؟","intent":"objection_quality","wilaya":null,"commune":null,"quantity":null,"size":null}
{"clip":"03.m4a","text":"ندير طلبية وحدة، بصح نحب بوانتير 42، كاين؟","intent":"order","wilaya":null,"commune":null,"quantity":1,"size":"42"}
```

`null` means the entity is absent and is not scored for that clip.

## Running it

```bash
npm run bench                      # every provider configured in .env
node bench/run.mjs --provider meta # just one
```

The table it prints goes straight into the README.
