---
name: video-skill-picker
description: Use when the user wants to make a video, motion graphic, promo, explainer, launch video, animation, or B-roll. Lists the installed video skills, asks what the video is about, and recommends the best-fitting skill(s) by topic, length and style. Trigger for "영상 만들어줘", "모션그래픽", "홍보 영상", "설명 영상", "런칭 영상", "video", "promo", "explainer", "motion graphics".
---

# Video Skill Picker

Pick the right video skill before making anything. Show the list, ask what the video is about, then recommend one or two.

## Video skills installed in this repo

| Skill | Best for | Length | Output | Needs |
|---|---|---|---|---|
| `explainer-default` | Product demo, feature walkthrough, "how it works" | 45–90 s | MP4 with music | Local render |
| `explainer-engaging` | One-take story explainer, loopable product animation | 10–30 s | MP4 with sound | Local render |
| `explainer-high-energy` | Hype reel, teaser, launch sting | 12–20 s | MP4 with synth music | Local render |
| `brag` | Launch video for the current project website (reads the code) | short | Hyperframes video | Hyperframes |
| `brag-slim` | Same as brag, one file, no bundled assets | short | video + share copy | Local tools |
| `lemo-opuscar` | Short film in a named style (oil painting, ukiyo-e, satellite briefing, product teardown) | short | code-made film | Lemo-Opuscar library |
| `bang-motion` | Cinematic promo, opener, intro, kinetic typography, explainer (16:9 or 9:16) | short | HTML/GSAP, can render to MP4 | Browser |
| `motion-broll` | B-roll cutaways for a talking-head video, timed to the transcript | per clip | motion overlay | Video + transcript |
| `sound-effects` | Adds measured sound effects and music to a motion-graphics video | — | audio pass | Finished MP4 |
| `object-separation` | Cut a person or product out of a video (SAM 2) | — | masked video | Local GPU/CPU |
| `manim-video` | Technical explainer with graphs, formulas, system diagrams | short | Manim MP4 | Python |
| `remotion-video-creation` | React-based motion graphics, captions, charts, transitions | any | MP4 | Node + render |
| `video-editing` | Cutting and polishing real footage | — | edited video | FFmpeg etc. |
| `videodb` | Search, index and edit existing video and audio | — | clips | VideoDB API |
| `ui-demo` | Screen recording of a web app with cursor and pacing | short | WebM | Playwright |

Note: `animate` (Emil's UI animation skill) is a web UI animation skill, not a video skill. The `animate` skill from cth9191 was not installed because its name conflicts with the installed one.

## How to recommend

1. Ask (only what is missing): what the video is about, target length, and whether there is footage, a transcript, or a website URL.
2. Match by input:
   - Has a website or project code → `brag` (or `brag-slim` if you want a single file).
   - Has a product to demo → `explainer-default`, or `explainer-engaging` for a short one-take.
   - Wants hype or a teaser → `explainer-high-energy`.
   - Has a talking-head video → `motion-broll`, then `sound-effects`.
   - Wants a named artistic style → `lemo-opuscar`.
   - Wants a cinematic browser-based promo → `bang-motion`.
   - Needs equations or graphs → `manim-video`.
   - Needs React components or captions → `remotion-video-creation`.
3. Recommend one primary skill and at most one follow-up (often `sound-effects` at the end).
4. Before rendering, say that the MP4 is rendered locally and check the environment can run it.

## Rules

- Do not run a render without confirming the topic and length.
- These skills run with full agent permissions, so show the skill's SKILL.md if the user asks what it does.
- If nothing fits, say so and suggest the closest skill instead of forcing one.
