# John Elijah Band mark, first pass (2026-09-04)

Built to blend with the official Lone Star Beer shield (palette sampled from Pabst's keyline file: red #b01f25, gold #c7a660, cream #f0efeb).

- A-crest: companion shield, JOHN / ELIJAH / BAND mirrors LONE / STAR / BEER. Rye + Alfa Slab One + Bebas Neue.
- B-stack: layered marquee wordmark (cream fill, gold edge, deep red shadow), red BAND bar, Yellowtail script, co-brand line with the LS icon.
- C-seal: round seal, faceted star, ribbon.
- pair-*: side by side with the official LS keyline logo. board.png is the overview.

All text is converted to outlines (fontTools), so the SVGs need no fonts. Fonts used (Google, OFL): Rye, Alfa Slab One, Bebas Neue, Yellowtail. Regenerate with `python3 build.py` after pointing FONTS in textpath.py at a folder holding those TTFs and putting the four official LS PNGs in `ls/`.

## Set two, blues and classic rock (2026-09-04, later)

Less Texas country, more record-culture and stage. Site palette (black, cream, brass) plus warm soul tones and one blue.

- D-marquee: name in lights, ties to the site hero. Sigmar One letters filled with bulbs (bulb grid sampled from a PIL mask).
- E-chrome: amp-badge chrome script on tolex. Lobster.
- F-label45: 45 rpm record label in mustard and burnt orange. Archivo Black + Oswald.
- G-block: Blue Note style typographic block. Anton + Oswald, one electric blue.
- H-pick: JE monogram with a bolt on a guitar pick. Sigmar One.
- I-revue: 70s soul revue, misregistered print with a halftone fade. Shrikhand + Bowlby One + Yellowtail.

Regenerate with `python3 build2.py` (needs the extra Google fonts listed at the top of the specimen: Sigmar One, Lobster, Archivo Black, Anton, Oswald 700, Shrikhand, Bowlby One).
