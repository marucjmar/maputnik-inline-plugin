import "./favicon.ico";
import "./styles/index.scss";
import "./i18n";

import r2wc from "@r2wc/react-to-web-component";
import { MaputnikLayerEditor } from "./MaputnikWidgetEditor";
import { type IControl, type Map } from "maplibre-gl";

const MaputnikLayerEditorWc = r2wc(MaputnikLayerEditor, {
  props: {
    map: 'function',
  },
});

// Register as HTML element
customElements.define("maputnik-layer-editor", MaputnikLayerEditorWc);

export class MaputnikControl implements IControl {
  private _map: Map | undefined;
  private _container: HTMLElement | undefined;

    public onAdd(map: Map): HTMLElement {
      //@ts-ignore
      window.map = () => map;
      this._map = map;
      this._container = document.createElement('div');

      this._map.once("load", () => {
        if (!this._container) {
          return;
        }

        map.getContainer().classList.add("style-edit-mode");
        const layerEditor = document.createElement("maputnik-layer-editor");

        layerEditor.style.height = map.getContainer().clientHeight + 'px';
        layerEditor.style.display = "block";
        layerEditor.setAttribute("id", "layer-editor");
        layerEditor.setAttribute("map", "map");
        
        this._container.appendChild(layerEditor);
      });

      return this._container;
    }

    onRemove() {
        this._map?.getContainer().classList.remove("style-edit-mode");
        this._container?.remove();
        this._map = undefined;
    }
}