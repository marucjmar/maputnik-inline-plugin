import React from "react";
import type {
  Map,
  LayerSpecification,
  SourceSpecification,
  StyleSpecification,
} from "maplibre-gl";
import * as MapLibreGl from "maplibre-gl";
import { createRoot } from "react-dom/client";
import MaplibreInspect from "@maplibre/maplibre-gl-inspect";
import colors from "@maplibre/maplibre-gl-inspect/lib/colors";
import Color from "color";

import { LayerList } from "./components/LayerList";
import { LayerEditor } from "./components/LayerEditor";
import { FeatureLayerPopup as MapMaplibreGlLayerPopup } from "./components/MapMaplibreGlLayerPopup";
import { FeaturePropertyPopup as MapMaplibreGlFeaturePropertyPopup, type InspectFeature } from "./components/MapMaplibreGlFeaturePropertyPopup";
import { type HighlightedLayer, colorHighlightedLayer } from "./libs/highlight";

import type {
  MappedError,
  StyleSpecificationWithId,
} from "./libs/definitions";

import './styles/index.scss';
import './maplibregl.css';

// --- Zduplikowane z MapMaplibreGlInternal, celowo, żeby go nie ruszać ---
function buildInspectStyle(
  originalMapStyle: StyleSpecification,
  coloredLayers: HighlightedLayer[],
  highlightedLayer?: HighlightedLayer
) {
  const backgroundLayer = {
    id: "background",
    type: "background",
    paint: { "background-color": "#1c1f24" },
  } as LayerSpecification;

  const layer = colorHighlightedLayer(highlightedLayer);
  if (layer) {
    coloredLayers.push(layer);
  }

  const sources: { [key: string]: SourceSpecification } = {};
  Object.keys(originalMapStyle.sources).forEach((sourceId) => {
    const source = originalMapStyle.sources[sourceId];
    if (source.type !== "raster" && source.type !== "raster-dem") {
      sources[sourceId] = source;
    }
  });

  return {
    ...originalMapStyle,
    sources,
    layers: [backgroundLayer].concat(coloredLayers as LayerSpecification[]),
  };
}
// -------------------------------------------------------------------

type Props = {
  map: () => Map;
  inspectModeEnabled?: boolean; // opcjonalnie sterowane z zewnątrz
};

type State = {
  mapStyle: StyleSpecificationWithId;
  selectedLayerIndex: number;
  sources: {
    [key: string]: SourceSpecification & { layers: string[] };
  };
  vectorLayers: { [key: string]: any };
  spec: any;
  errors: MappedError[];
  // --- nowy stan związany z inspektorem ---
  inspect: MaplibreInspect | null;
  inspectModeEnabled: boolean;
};

export class MaputnikLayerEditor extends React.Component<Props, State> {
  private mapDataListener?: () => void;
  private map: Map;
  private popupRoot = document.createElement("div");
  private reactRoot = createRoot(this.popupRoot);

  constructor(props: Props) {
    super(props);
    this.map = props.map();

    this.state = {
      mapStyle: this.map.getStyle() as StyleSpecificationWithId,
      selectedLayerIndex: 0,
      sources: {},
      vectorLayers: {},
      spec: {},
      errors: [],
      inspect: null,
      inspectModeEnabled: props.inspectModeEnabled ?? false,
    };
  }

  componentDidMount() {
    this.attachMapListeners();
    this.syncFromMap();
    this.initInspect();
  }

  componentWillUnmount() {
    this.detachMapListeners();
    this.state.inspect?._popup?.remove();
    if (this.state.inspect) {
      this.map.removeControl(this.state.inspect);
    }
  }

  componentDidUpdate(_prevProps: Props, prevState: State) {
    // reaguj na zmianę zaznaczonej warstwy -> podświetlenie w inspektorze
    if (prevState.selectedLayerIndex !== this.state.selectedLayerIndex) {
      this.refreshInspectHighlight();
    }
  }

  // ---------- INSPECTOR ----------

  private initInspect() {
    const popup = new MapLibreGl.Popup({ closeOnClick: false });

    const inspect = new MaplibreInspect({
      popup,
      showMapPopup: true,
      showMapPopupOnHover: false,
      showInspectMapPopupOnHover: true,
      showInspectButton: false,
      blockHoverPopupOnClick: true,
      assignLayerColor: (layerId: string, alpha: number) =>
        Color(colors.brightColor(layerId, alpha)).desaturate(0.5).string(),
      buildInspectStyle: (
        originalMapStyle: StyleSpecification,
        coloredLayers: HighlightedLayer[]
      ) =>
        buildInspectStyle(
          originalMapStyle,
          coloredLayers,
          this.getHighlightedLayer()
        ),
      renderPopup: (features: InspectFeature[]) => {
        if (this.state.inspectModeEnabled) {
          popup.once("open", () => {
            this.reactRoot.render(
              <MapMaplibreGlFeaturePropertyPopup features={features} />
            );
          });
        } else {
          popup.once("open", () => {
            this.reactRoot.render(
              <MapMaplibreGlLayerPopup
                features={features}
                onLayerSelect={this.onLayerSelectById}
                zoom={this.map.getZoom()}
              />
            );
          });
        }
        return this.popupRoot;
      },
    });

    this.map.addControl(inspect);
    this.setState({ inspect }, () => this.refreshInspectHighlight());
  }

  private getHighlightedLayer(): HighlightedLayer | undefined {
    const layer = this.state.mapStyle.layers?.[this.state.selectedLayerIndex];
    if (!layer) return undefined;
    // Dostosuj kształt obiektu do definicji HighlightedLayer w libs/highlight.ts
    return { id: layer.id } as HighlightedLayer;
  }

  private refreshInspectHighlight() {
    const { inspect } = this.state;
    if (!inspect) return;

    inspect.setOriginalStyle(this.state.mapStyle);
    // tak jak w MapMaplibreGlInternal - odśwież po chwili, żeby
    // maplibre-gl-inspect zauważył zmianę nawet gdy źródła się nie zmieniły
    setTimeout(() => {
      inspect.render();
    }, 500);
  }

  toggleInspector = () => {
    const { inspect } = this.state;
    if (!inspect) return;
    inspect.toggleInspector();
    this.setState(
      (prev) => ({ inspectModeEnabled: !prev.inspectModeEnabled }),
      () => this.refreshInspectHighlight()
    );
  };

  // --------------------------------

  private attachMapListeners() {
    this.mapDataListener = () => this.syncFromMap();
    this.map.on("styledata", this.mapDataListener);
  }

  private detachMapListeners() {
    if (this.mapDataListener) {
      this.map.off("styledata", this.mapDataListener);
    }
  }

  private syncFromMap() {
    const mapStyle = this.map.getStyle() as StyleSpecificationWithId;
    this.setState({ mapStyle });
    this.fetchSources();
  }

  private onLayerSelect = (index: number) => {
    this.setState({ selectedLayerIndex: index });
  };

  private onLayerSelectById = (id: string) => {
    const index = this.state.mapStyle.layers.findIndex(
      (layer) => layer.id === id
    );
    if (index >= 0) {
      this.onLayerSelect(index);
    }
  };

  private onLayersChange = (layers: LayerSpecification[]) => {
    const mapStyle = this.state.mapStyle;
    const changedStyle = { ...mapStyle, layers };
    this.setState({ mapStyle: changedStyle });
    this.map.setStyle(changedStyle);
  };

  private onLayerChanged = (index: number, layer: LayerSpecification) => {
    const layers = [...this.state.mapStyle.layers];
    layers[index] = layer;
    this.onLayersChange(layers);
  };

  private onLayerDestroy = (index: number) => {
    const layers = [...this.state.mapStyle.layers];
    layers.splice(index, 1);
    this.onLayersChange(layers);
    this.setState((current) => ({
      selectedLayerIndex: Math.max(
        0,
        Math.min(current.selectedLayerIndex, layers.length - 1)
      ),
    }));
  };

  private onLayerCopy = (index: number) => {
    const layers = [...this.state.mapStyle.layers];
    const layer = structuredClone(layers[index]);
    layer.id = `${layer.id}-copy`;
    layers.splice(index, 0, layer);
    this.onLayersChange(layers);
  };

  private onLayerVisibilityToggle = (index: number) => {
    const layers = [...this.state.mapStyle.layers];
    const layer = {
      ...layers[index],
      layout: {
        ...layers[index].layout,
        visibility:
          layers[index].layout?.visibility === "none" ? "visible" : "none",
      },
    };
    //@ts-ignore
    layers[index] = layer;
    this.onLayersChange(layers);
  };

  private onLayerIdChange = (index: number, _oldId: string, newId: string) => {
    const layers = [...this.state.mapStyle.layers];
    layers[index] = { ...layers[index], id: newId };
    this.onLayersChange(layers);
  };

  private onMoveLayer = ({
    oldIndex,
    newIndex,
  }: {
    oldIndex: number;
    newIndex: number;
  }) => {
    const layers = [...this.state.mapStyle.layers];
    const [layer] = layers.splice(oldIndex, 1);
    layers.splice(newIndex, 0, layer);
    this.onLayersChange(layers);
    this.setState({ selectedLayerIndex: newIndex });
  };

  private async fetchSources() {
    // tutaj możesz przenieść istniejące fetchSources()
    // z App
  }

  render() {
    const {
      mapStyle,
      selectedLayerIndex,
      sources,
      vectorLayers,
      spec,
      errors,
    } = this.state;

    const layers = mapStyle.layers || [];
    const selectedLayer = layers[selectedLayerIndex];

    return (
      <div className="maputnik-layer-editor-container">
        <div className="maputnik-layout-list">
          <LayerList
            layers={layers}
            selectedLayerIndex={selectedLayerIndex}
            sources={sources}
            errors={errors}
            onLayersChange={this.onLayersChange}
            onLayerSelect={this.onLayerSelect}
            onLayerDestroy={this.onLayerDestroy}
            onLayerCopy={this.onLayerCopy}
            onMoveLayer={this.onMoveLayer}
            onLayerVisibilityToggle={this.onLayerVisibilityToggle}
          />
        </div>

        {selectedLayer && (
          <div className="maputnik-layout-drawer">
            <LayerEditor
              key={selectedLayer.id}
              layer={selectedLayer}
              layerIndex={selectedLayerIndex}
              isFirstLayer={selectedLayerIndex === 0}
              isLastLayer={selectedLayerIndex === layers.length - 1}
              sources={sources}
              vectorLayers={vectorLayers}
              spec={spec}
              errors={errors}
              onLayerChanged={this.onLayerChanged}
              onLayerIdChange={this.onLayerIdChange}
              onMoveLayer={this.onMoveLayer}
              onLayerDestroy={this.onLayerDestroy}
              onLayerCopy={this.onLayerCopy}
              onLayerVisibilityToggle={this.onLayerVisibilityToggle}
            />
          </div>
        )}
      </div>
    );
  }
}