import { IControl, Map } from 'maplibre-gl';
export declare class MaputnikControl implements IControl {
    private _map;
    private _container;
    onAdd(map: Map): HTMLElement;
    onRemove(): void;
}
