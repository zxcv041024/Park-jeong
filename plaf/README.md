# PLAF

An original articulated desk lamp on a full-screen blue-gray 3D stage. Built with Three.js and Vite. Existing projects in the parent directory are untouched.

## Run

```powershell
cd C:\Users\ASUS\OneDrive\Desktop\Codex\plaf
pnpm install
pnpm dev
```

Open http://127.0.0.1:4173. `pnpm build` creates a standalone static website in `dist`; `pnpm preview` serves that build. No CDN or network asset downloads are needed at runtime.

## Play

The introduction starts automatically. The lamp enters from the right in repeated hops, examines L, and stomps it three times. Controls appear when it finishes.

- Type a letter or word (maximum eight graphemes) and press Enter or **추가**. Words appear together, and the lamp presses each letter three times from left to right. Repeated letters are separate targets; spaces do not create a target.
- Add more while the lamp moves: a newly entered word waits until all remaining letters of the current word have been pressed.
- Added letters remain for 10 seconds after the final press, then fade over 2.8 seconds. The original PLAF letters, including the flattened L, remain. If the stage has no safe space, use **Reset**.
- **Reset** clears all added letters, restores the four upright PLAF letters, and leaves the lamp ready beside them.
- **Intro Replay** clears the stage and plays the original entrance again.
- **Sound ON/OFF** controls original synthesized Web Audio effects. Audio starts only after a user gesture.

## Animation

One requestAnimationFrame clock owns a serialized action queue. Preparation and impact settlement keep the base stationary. Only the ballistic flight phase moves horizontally. Travel distance determines the number of hops (maximum 1.85 world units per normal hop), each lasting about 0.60 seconds. Motion runs at 1.3× speed, while target hold and fade timings use unscaled elapsed time.

The lamp is constructed from original geometry: a domed base, separate articulated arms with coils and hinge caps, a rotating bell shade and emissive bulb. Joint angles change during compression and flight. The head controls a real spotlight, with a faint cone and a contact shadow that fades with height. Exactly three stomps press each upright letter vertically to 70%, 40%, then 14%. Stomps and their pauses run another 1.2× faster, giving pressure durations of about 0.31, 0.40 and 0.53 seconds. Travel speed remains 1.3×. Text never rotates, and spreading is limited to 10%. The lamp is 12% larger than the first version. A hidden tab pauses the action clock.

Each upright letter has a rectangular physical footprint inflated by the lamp's clearance. A visibility graph and Dijkstra search find routes around these obstacles. Word layout uses a common baseline and scale, with pairwise gaps computed after scaling so even repeated narrow letters stay reachable. Word placement is atomic: the full future queue is simulated in order before creating any glyph. The route is recalculated after every landing. New placements cannot intersect an incoming travel or first-stomp hop. Only the intentional stomp enters its target footprint.

Added letters fade independently using elapsed time after the final press. Their shadows fade with dithered depth coverage. An idle lamp standing on a fading letter lowers gently to the floor and never remains suspended after the letter disappears.

Placement checks world bounds, the current lamp, existing objects, projected screen overlap, viewport margins, and the input area. Stomp arcs fit the available camera headroom, and placement reserves enough height for a visible hop. Camera dimensions follow viewport aspect ratio. Rendering starts at no more than 1600×900 pixels and one device pixel per CSS pixel, then reduces resolution when sustained frame intervals exceed 25ms. Physics speed remains unchanged. Letter geometry is reused, directional shadows refresh only when letters change, and the lamp keeps its animated contact shadow and spotlight.

For Lively Wallpaper, import the built `dist` folder as a local HTML project. `LivelyProperties.json` supplies a native **글자 입력** textbox and **입력한 글자 추가** button in **Customize**. This supports Korean IME without desktop raw-keyboard forwarding. Use Lively's mouse input mode to avoid duplicated characters; the in-page controls remain available. Korean composition-confirmation Enter never submits a partial glyph.

## Verify

```powershell
pnpm test
node tests/browser.mjs
node tests/letters-browser.mjs
node tests/runtime-browser.mjs
```

The browser suite uses locally installed Google Chrome and checks the actual introduction, G/B/HELLO queue, persistent marks, controls, interruption-safe reset, replay, browser errors, and 1366×768 through 3840×2160 plus portrait mobile. Screenshots and a result snapshot are saved in `tests/evidence`.

The classic serif is Three.js's bundled Optimer Bold font. Other Unicode graphemes, including Korean, use the operating system's bold serif fonts on a lit glyph surface. No film studio logo, character asset or recorded film sound is used.

Inputs with three or more visible glyphs use two presses per letter; shorter inputs and the intro use three. Queued targets skip the camera-facing pause. Final presses deform the glyph outline into a thin floor silhouette without rotating its mesh.
