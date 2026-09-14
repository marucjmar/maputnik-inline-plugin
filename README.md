# Maputnik Inline Plugin

Maputnik Inline Plugin embeds the [Maputnik](https://maplibre.org/maputnik/)
style editor directly into a [MapLibre GL JS](https://maplibre.org/projects/maplibre-gl-js/)
map. It is useful when users need to inspect and edit a map style without
leaving the application that displays the map.

The plugin is distributed as an ES module and exposes a MapLibre control:


```
npm i --save maputnik-inline-plugin
```

```ts
import { MaputnikControl } from "maputnik-inline-plugin";

const editorControl = new MaputnikControl();
map.addControl(editorControl, "top-left");

map.on("styledata", () => {
   console.log("Style changed");
});

// map.removeControl(editorControl);
```

## Features

- Edit the style currently loaded by a MapLibre map.
- Add the editor as a standard MapLibre control.
- Select, reorder, duplicate, delete, hide, and edit layers.
- Inspect the map and select layers from map features.
- Keep the map and editor synchronized when the style changes.

## Requirements

- A MapLibre GL JS map.
- A browser with ES module support.
- The MapLibre GL JS stylesheet.

The plugin currently targets MapLibre GL JS 6.x. The MapLibre version used by
the host application should be compatible with the version used to build the
plugin.

## Build

Install dependencies and create the plugin bundle:

```bash
npm install
npm run build
```

The build writes the ES module and stylesheet to `dist/`. During development,
run:

The control reads the style from the map passed to `onAdd`. Changes made in the
editor are applied to that MapLibre map, so the host application can continue
to listen for `styledata` or other MapLibre events.

To remove the editor, use the standard MapLibre control API:

```js
map.removeControl(editorControl);
```

## Development checks

```bash
npm run lint
npm run test-unit
npm run test
```

## License

Maputnik Inline Plugin is licensed under [MIT](./LICENSE).
