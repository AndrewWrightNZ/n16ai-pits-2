declare namespace google.maps {
    interface MapOptions {
      center?: google.maps.LatLng | google.maps.LatLngLiteral;
      zoom?: number;
      tilt?: number;
      heading?: number;
      mapTypeId?: string;
      mapTypeControl?: boolean;
      fullscreenControl?: boolean;
      streetViewControl?: boolean;
      mapTypeControlOptions?: google.maps.MapTypeControlOptions;
      atmosphere?: {
        lighting?: {
          time?: Date;
        };
      };
      time?: Date;
    }
    
    interface Map {
      moveCamera?: (options: {
        center?: google.maps.LatLng | google.maps.LatLngLiteral;
        zoom?: number;
        tilt?: number;
        heading?: number;
      }) => void;
    }
  }


// Create this file as src/types/google-maps.d.ts

declare namespace google {
    namespace maps {
      // Basic interfaces
      interface LatLng {
        lat(): number;
        lng(): number;
        toJSON(): LatLngLiteral;
        toString(): string;
        equals(other: LatLng | LatLngLiteral): boolean;
      }
  
      interface LatLngLiteral {
        lat: number;
        lng: number;
      }
  
      interface Size {
        height: number;
        width: number;
        equals(other: Size): boolean;
        toString(): string;
      }
  
      class LatLngBounds {
        constructor(sw?: LatLng | LatLngLiteral, ne?: LatLng | LatLngLiteral);
        contains(latLng: LatLng | LatLngLiteral): boolean;
        equals(other: LatLngBounds | LatLngBoundsLiteral): boolean;
        extend(point: LatLng | LatLngLiteral): LatLngBounds;
        getCenter(): LatLng;
        getNorthEast(): LatLng;
        getSouthWest(): LatLng;
        isEmpty(): boolean;
        toJSON(): LatLngBoundsLiteral;
        toString(): string;
        toSpan(): LatLng;
        union(other: LatLngBounds | LatLngBoundsLiteral): LatLngBounds;
      }
  
      interface LatLngBoundsLiteral {
        east: number;
        north: number;
        south: number;
        west: number;
      }
  
      // Map interface
      interface MapOptions {
        center?: LatLng | LatLngLiteral;
        zoom?: number;
        tilt?: number;
        heading?: number;
        mapTypeId?: string;
        mapTypeControl?: boolean;
        fullscreenControl?: boolean;
        streetViewControl?: boolean;
        mapTypeControlOptions?: MapTypeControlOptions;
        gestureHandling?: string;
        atmosphere?: {
          lighting?: {
            time?: Date;
          };
        };
        time?: Date;
      }
  
      interface MapTypeControlOptions {
        mapTypeIds?: string[];
        position?: number;
        style?: number;
      }
  
      interface MoveOptions {
        center?: LatLng | LatLngLiteral;
        zoom?: number;
        tilt?: number;
        heading?: number;
      }
  
      class Map {
        constructor(mapDiv: Element, opts?: MapOptions);
        fitBounds(bounds: LatLngBounds | LatLngBoundsLiteral, padding?: number | Padding): void;
        getBounds(): LatLngBounds;
        getCenter(): LatLng;
        getDiv(): Element;
        getHeading(): number;
        getMapTypeId(): string;
        getProjection(): Projection;
        getStreetView(): StreetViewPanorama;
        getTilt(): number;
        getZoom(): number;
        panBy(x: number, y: number): void;
        panTo(latLng: LatLng | LatLngLiteral): void;
        panToBounds(latLngBounds: LatLngBounds | LatLngBoundsLiteral, padding?: number | Padding): void;
        setCenter(latlng: LatLng | LatLngLiteral): void;
        setHeading(heading: number): void;
        setMapTypeId(mapTypeId: string): void;
        setOptions(options: MapOptions): void;
        setStreetView(panorama: StreetViewPanorama): void;
        setTilt(tilt: number): void;
        setZoom(zoom: number): void;
        controls: MVCArray<MVCArray<Node>>[];
        data: Data;
        mapTypes: MapTypeRegistry;
        overlayMapTypes: MVCArray<MapType>;
        moveCamera?: (options: MoveOptions) => void;
      }
  
      interface Padding {
        bottom: number;
        left: number;
        right: number;
        top: number;
      }
  
      interface Projection {
        fromLatLngToPoint(latLng: LatLng | LatLngLiteral): Point;
        fromPointToLatLng(pixel: Point, noWrap?: boolean): LatLng;
      }
  
      // Marker
      interface MarkerOptions {
        position: LatLng | LatLngLiteral;
        map?: Map | StreetViewPanorama;
        title?: string;
        icon?: string | Icon | Symbol;
        label?: string | MarkerLabel;
        draggable?: boolean;
        clickable?: boolean;
        visible?: boolean;
        zIndex?: number;
        opacity?: number;
        animation?: any;
        optimized?: boolean;
      }
  
      interface MarkerLabel {
        color: string;
        fontFamily: string;
        fontSize: string;
        fontWeight: string;
        text: string;
      }
  
      interface Icon {
        url: string;
        size?: Size;
        scaledSize?: Size;
        origin?: Point;
        anchor?: Point;
        labelOrigin?: Point;
      }
  
      class Marker {
        constructor(opts?: MarkerOptions);
        getAnimation(): any;
        getClickable(): boolean;
        getDraggable(): boolean;
        getIcon(): string | Icon | Symbol;
        getLabel(): MarkerLabel;
        getMap(): Map | StreetViewPanorama;
        getOpacity(): number;
        getPosition(): LatLng;
        getShape(): any;
        getTitle(): string;
        getVisible(): boolean;
        getZIndex(): number;
        setAnimation(animation: any): void;
        setClickable(clickable: boolean): void;
        setDraggable(draggable: boolean): void;
        setIcon(icon: string | Icon | Symbol): void;
        setLabel(label: string | MarkerLabel): void;
        setMap(map: Map | StreetViewPanorama | null): void;
        setOpacity(opacity: number): void;
        setOptions(options: MarkerOptions): void;
        setPosition(latlng: LatLng | LatLngLiteral): void;
        setShape(shape: any): void;
        setTitle(title: string): void;
        setVisible(visible: boolean): void;
        setZIndex(zIndex: number): void;
      }
  
      // Helper interfaces
      interface Point {
        x: number;
        y: number;
        equals(other: Point): boolean;
        toString(): string;
      }
  
      interface Symbol {
        path: string | SymbolPath;
        anchor?: Point;
        fillColor?: string;
        fillOpacity?: number;
        labelOrigin?: Point;
        rotation?: number;
        scale?: number;
        strokeColor?: string;
        strokeOpacity?: number;
        strokeWeight?: number;
      }
  
      enum SymbolPath {
        BACKWARD_CLOSED_ARROW,
        BACKWARD_OPEN_ARROW,
        CIRCLE,
        FORWARD_CLOSED_ARROW,
        FORWARD_OPEN_ARROW
      }
  
      class MVCArray<T> {
        constructor(array?: T[]);
        clear(): void;
        forEach(callback: (elem: T, i: number) => void): void;
        getArray(): T[];
        getAt(i: number): T;
        getLength(): number;
        insertAt(i: number, elem: T): void;
        pop(): T;
        push(elem: T): number;
        removeAt(i: number): T;
        setAt(i: number, elem: T): void;
      }
  
      interface MVCObject {
        addListener(eventName: string, handler: (...args: any[]) => void): MapsEventListener;
        bindTo(key: string, target: MVCObject, targetKey?: string, noNotify?: boolean): void;
        get(key: string): any;
        notify(key: string): void;
        set(key: string, value: any): void;
        setValues(values: any): void;
        unbind(key: string): void;
        unbindAll(): void;
      }
  
      interface MapsEventListener {
        remove(): void;
      }
  
      // Additional interfaces
      interface MapTypeRegistry extends MVCObject {
        set(id: string, mapType: MapType): void;
      }
  
      interface MapType {
        getTile(tileCoord: Point, zoom: number, ownerDocument: Document): Element;
        releaseTile(tile: Element): void;
        alt?: string;
        maxZoom?: number;
        minZoom?: number;
        name?: string;
        projection?: Projection;
        radius?: number;
        tileSize?: Size;
      }
  
      interface Data extends MVCObject {
        // methods and properties omitted for brevity
      }
  
      interface StreetViewPanorama {
        // methods and properties omitted for brevity
      }
    }
  }
  
  // Declare global initMap function
  declare global {
    interface Window {
      google: typeof google;
      initMap: () => void;
    }
  }
  
  export {};
  