# Loadout Command

A first-person shooter prototype built in plain HTML, CSS, and JavaScript with:

- a start screen for selecting up to three starting weapons
- a first-person arena game view
- keyboard + mouse movement and shooting
- enemy encounters in a small arena map
- a clean HUD with health, weapon, and loadout info

## Run locally

Because this project uses JavaScript modules and browser APIs, serve it with a local web server:

```bash
cd /path/to/fps-loadout-game
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Controls

- W/A/S/D: move
- Mouse: look around
- Left click: shoot
- 1/2/3/4: switch weapons
- Mouse wheel: cycle weapons
- Esc: release the mouse cursor

## Notes

The project intentionally keeps the game lightweight and easy to extend. The map, weapon list, enemy behavior, and UI are all structured to be easy to customize.
