Inter, by Rasmus Andersson — https://rsms.me/inter/

SIL Open Font License 1.1. Full text: https://openfontlicense.org

Vendored here, not loaded from a CDN, for one reason: this app has to run
with no network at all. A webfont fetched from fonts.gstatic.com stalls the
page on a slow connection and breaks it entirely for a judge running offline.

Latin subset only (U+0000-00FF and friends). Arabic deliberately falls through
to the system stack, which is what the unicode-range in app.css arranges — the
darija interface must not wait on a Latin font it will never use.
