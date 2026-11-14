# For NASA Space Apps judges — ZATHURA

*Everything below is verifiable inside this repository. If a claim cannot be checked here, it is marked as a limit rather than a promise.*

ملخص بالعربي في آخر الصفحة.

| | |
|---|---|
| **Challenge** | Junior Astronaut Mission Trainer — NASA Space Apps Challenge 2026 (*The Next Frontier*) |
| **Open this first** | [`play/index.html`](../play/index.html) — one folder, two games, offline |
| **Audience** | Ages 7–12, Arabic-first (RTL) |
| **Modes** | 1) `Outpost` — strategic base simulator (Canvas 2D) 2) `Odyssey: Survive` — first-person 3D mission (React 19 + Three.js) |
| **Data** | 22 attributed NASA sources; every constant labelled *NASA data* or *game estimate* |
| **Build** | `node build.js` → one self-contained file, byte-verified in CI |

---

## 1. The claim, in one sentence

Most space games hand the child extra oxygen when they fail; ZATHURA doesn't.
A Sol is 24 crew-hours, digging a sample costs 8, and radiation dose never resets — so the child learns exploration as a chain of trade-offs rather than a power fantasy.

That single sentence drives every design decision below.

---

## 2. Mapping to the five judging criteria

### Impact — *does it address a real need?*
- **Gap:** there is very little Arabic STEM content at ages 7–12 that combines resource management, in-situ resource utilisation and real radiation limits. The project targets exactly that gap, in the child's own language and reading level.
- **Reach:** no install, no account, no server, no internet. A single HTML file opens on a school laptop, a lab PC or a phone — including classrooms with no connectivity.
- **Transferable lesson:** the trade-off framing (time, dose, power) applies to any mission design problem, not just this game.

### Creativity — *is it new?*
- **Time as the only currency:** there is no "end day" button; the clock runs while the child plays, and every action is paid for in crew-hours.
- **Adaptive consequences:** 36 scenarios weighted by the player's own past decisions; nothing repeats back-to-back, and after every outcome the game explains *why* it happened.
- **Two genuinely different games on one set of constants:** a 2D strategic simulator and a first-person 3D mission, sharing the same six destinations, the same numbers and the same commander. This is not a reskin — the second mode required a different engine, control scheme and rendering stack.

### Validity — *is the science right?*
Every constant is traceable. In-game, the sources panel lists 22 entries; each constant is labelled **NASA data** or **game estimate**.

| Constant | Value used | Source |
|---|---|---|
| Oxygen per crew, per day | `0.84 kg` | NASA ECLSS |
| Dry food per crew, per day | `1.56 kg` | BVAD 2022 |
| Drinking water per crew, per day | `3.20 kg` | BVAD 2022 |
| Water recovery | `90% → 98%` | NASA (Brine Processor) |
| Career dose ceiling | `600 mSv` | NASA STD-3001 |
| Mars surface dose rate | `0.64 mSv/day` | RAD / MSL |
| Deep-space transit dose rate | `1.84 mSv/day` | RAD / MSL |
| Shelter / active-shielding reduction | `−85% / −38%` | game estimate |
| Daytime solar ceiling | `~38 kW` | game estimate |

**Space weather:** the game ships a cached archive of **May 2024** — the strongest geomagnetic storm in 25 years. `CME 85 · FLR 135 · GST 4 (Kp 9.0) · SEP 14`, in [`data/donki/`](../data/donki/). Storms are drawn from **SEP** events, because solar energetic particles are what actually irradiate crews — not flares; the first SEP arrived ~24 h before the geomagnetic storm.

**Corrections we made against our own first draft** (documented in [`SOURCES-AUDIT.md`](../SOURCES-AUDIT.md)): the 1.8 kg food figure was wrong (BVAD 2022 gives 1.56 kg dry / 2.39 kg packaged), water was understated against NASA's 3.2 kg drinking figure, and the water-recovery figure moved from 90% to 98% after the Brine Processor. We also do **not** publish a unit for RadLab readings, because the API does not document one.

### Relevance — *does it answer the brief?*
- Directly serves the Artemis / crew-survival and ISRU themes.
- The brief's own framing — a mission is a sequence of decisions with consequences — is the core mechanic, not decoration.
- The Moon destination is a real constraint set (14-day night, radiation), not a backdrop.

### Presentation — *can a reviewer evaluate it quickly?*
- `play/index.html` opens offline; nothing to install.
- Bilingual project page, 14-slide Arabic deck with speaker notes, 15-scenario science reference (PDF), full README, and this document.
- The build is reproducible and CI-checked, so the file a reviewer opens is provably the file the source produces.

---

## 3. Architecture — how a number becomes a mechanic

```
data/donki/*.json  ─┐
BVAD / ECLSS / RAD ─┴→ src/missiondata.js   (one source of truth:
                                            6 missions · 36 scenarios
                                            22 sources · every constant)
                             │
                             ├→ src/core.js      state · clock · audio · router
                             ├→ src/quests.js    mission sequencing engine
                             ├→ src/render.js    planets · stars · particles
                             └→ src/screens_*.js six screens · Canvas 2D · Web Audio
                                        │
                                   build.js
                                        ↓
                             play/game1.html     one self-contained file
                                        │
                        tools/verify-build.js + CI  ← byte-compare
```

**Mode 1 stack:** vanilla JavaScript (ES6), HTML5, CSS3, Canvas 2D, Web Audio API (all sound synthesised at runtime — no audio assets), zero dependencies, custom Node build script.
**Mode 2 stack:** React 19, TypeScript, Vite + `viteSingleFile`, Three.js over WebGL, Pointer Lock + touch joystick controls.
**Integration:** NASA Open APIs (DONKI, NeoWs, APOD, EPIC) power the optional *NASA Live* panel; when offline the panel fails gracefully and the game is unaffected.

---

## 4. Verification — why you can trust the shipped file

- **Reproducible build:** `node build.js` regenerates `play/game1.html`; `node tools/verify-build.js` rebuilds in a temp folder and **byte-compares** it with the committed artefact.
- **CI enforces it:** `.github/workflows/verify.yml` runs that comparison on every push.
- **QA hooks never ship:** debug helpers (`__completeAll`, `Return.skipTo`, …) are delimited in `src/` by `@QA-BEGIN` / `@QA-END` and stripped by the default build; `--dev` keeps them locally. The committed game is byte-identical to the submitted build.
- **Sources audit published:** `SOURCES-AUDIT.md` records what each NASA endpoint actually returns (including CORS behaviour, documented limits and the figures that were wrong in our draft).

This matters for a judges' workflow specifically: you do not have to trust a description of the game — you can rebuild it and diff it.

---

## 5. Accessibility and classroom use

- Arabic-first typography and full RTL layout; keyboard and touch are at parity (mouse/touch joystick in Mode 2).
- Consequences are colour-coded *and* written; nothing depends on colour alone.
- `prefers-reduced-motion` is respected in the project page; the game needs no external fonts or assets.
- Suggested lesson shape: 5–10 minutes of framing, then one mission (≈20–30 minutes), then the debrief screen as the discussion object — it reports dose, resources, ISRU output and a plain-language verdict.
- Progress autosaves and resumes, so a session can be split across a class.

---

## 6. Known limits (stated before you find them)

1. **No classroom pilot data yet** — the impact case is design-reasoned, not measured. A pilot with a local school is the planned next step.
2. **Mode 2 source is not in this repository** — only its built artefact (`play/game2.html`) is; Mode 1's full source is here.
3. **Audio is synthesised, not localised** — no voice-over in either language.
4. **Canvas scenes have no screen-reader narration** — a text summary exists in the debrief, but the surface world itself is visual.
5. **Kp/SEP values are an archived reference, not live telemetry** — the operational reference for real forecasting is NOAA SWPC, and the game says so.
6. **Vehicles are fictional** — inspired by historic NASA missions (Apollo LM, Mars 2020, MESSENGER, Magellan, Cassini–Huygens), not copies of them. Planet Zewail is fictional, created in honour of Ahmed Zewail.

---

## 7. What we would build next

- A measured classroom pilot (pre/post on resource-trade-off reasoning) with an Arabic worksheet pack.
- Localised voice-over for the mission-control briefings.
- A scenario authoring format so teachers can add their own events without touching code.
- Screen-reader narration layer for the base world.

---

<div dir="rtl">

## ملخص بالعربي

- **الادعاء الأساسي:** كل ألعاب الفضاء تكافئ الطفل على الفشل بأوكسجين إضافي؛ ZATHURA لا. الـSol ٢٤ ساعة، والحفر ٨، والجرعة لا تُرجَع.
- **الصلاحية العلمية:** كل ثابت له مصدر (ECLSS · BVAD 2022 · NASA STD-3001 · RAD/MSL · DONKI مايو ٢٠٢٤)، ومُصنَّف داخل اللعبة كـ«بيانات NASA» أو «تقدير لعبة»، مع ٢٢ مصدرًا منسوبًا وتدقيق مصادر منشور.
- **التحقق:** البناء قابل لإعادة الإنتاج، وCI يقارن الملف المرفوع بايت ببايت مع ناتج البناء، وأدوات الاختبار لا تصل للمحكّم.
- **الحدود:** مفيش تجربة ميدانية في فصل حتى الآن، ومصدر الوضع ٢ خارج المستودع، والصوت مُولَّد وغير مُترجم، والـcanvas بدون سرد لقارئ الشاشة.

</div>

---

*ZATHURA is an independent, non-commercial educational project. It is not affiliated with, endorsed by, or representing NASA. Scientific data belongs to NASA and its partners and is attributed in-game and in the sources panel.*
