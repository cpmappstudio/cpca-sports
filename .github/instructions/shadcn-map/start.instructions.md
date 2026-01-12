---
title: Get Started
description: A map component built for shadcn/ui, following the same design patterns and styles. Uses Leaflet with React Leaflet, both open-source libraries, to provide interactive mapping.
component: true
---

## Prerequisite

Before installing, make sure you already have **[shadcn/ui](https://ui.shadcn.com/docs/installation)** set up in your project.

## Installation

```bash
npx shadcn@latest add @shadcn-map/map
```

## Usage

```tsx showLineNumbers
import {
    Map,
    MapMarker,
    MapPopup,
    MapTileLayer,
    MapZoomControl,
} from "@/components/ui/map"
```

```tsx showLineNumbers
<Map center={[43.6532, -79.3832]}>
    <MapTileLayer />
    <MapZoomControl />
    <MapMarker position={[43.6532, -79.3832]}>
        <MapPopup>A map component for shadcn/ui.</MapPopup>
    </MapMarker>
</Map>
```


https://shadcn-map.vercel.app/docs/examples
https://shadcn-map.vercel.app/docs/examples/custom-tile
https://shadcn-map.vercel.app/docs/examples/marker
https://shadcn-map.vercel.app/docs/examples/custom-marker
https://shadcn-map.vercel.app/docs/examples/marker-cluster-group
https://shadcn-map.vercel.app/docs/examples/shapes
https://shadcn-map.vercel.app/docs/examples/popup-and-tooltip
https://shadcn-map.vercel.app/docs/examples/zoom-control
https://shadcn-map.vercel.app/docs/examples/layers-control
https://shadcn-map.vercel.app/docs/examples/locate-control
https://shadcn-map.vercel.app/docs/examples/search-control
https://shadcn-map.vercel.app/docs/examples/draw-control
https://shadcn-map.vercel.app/docs/examples/custom-control-position
https://shadcn-map.vercel.app/docs/examples/custom-control-container
