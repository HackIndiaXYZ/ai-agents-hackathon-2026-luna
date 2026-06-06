import { useState } from 'react';
import { ComposableMap, Geographies, Geography, Marker, Line } from 'react-simple-maps';

const INDIA_TOPO = 'https://raw.githubusercontent.com/deldersveld/topojson/master/countries/india/india-districts.json';

function priceColor(price) {
  if (price > 7000) return '#14532d';
  if (price > 6000) return '#16a34a';
  if (price > 5000) return '#d97706';
  if (price > 4000) return '#ea580c';
  return '#dc2626';
}

export default function IndiaMap({ markers = [], routes = [], height = 400, onMarkerClick }) {
  const [tooltip, setTooltip] = useState(null);

  return (
    <div className="relative w-full" style={{ height }}>
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 1000, center: [82, 22] }}
        style={{ width: '100%', height: '100%' }}
      >
        <Geographies geography={INDIA_TOPO}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="#F5F0E8"
                stroke="#D4C9A8"
                strokeWidth={0.5}
                style={{ default: { outline: 'none' }, hover: { fill: '#E8F5E9', outline: 'none' } }}
              />
            ))
          }
        </Geographies>
        {routes.map((route, i) => (
          <Line
            key={i}
            from={route.from}
            to={route.to}
            stroke={route.color || '#16a34a'}
            strokeWidth={route.width || 1.5}
            strokeLinecap="round"
            style={{
              strokeDasharray: route.animated ? '5 5' : 'none',
              animation: route.animated ? 'dash-flow 1s linear infinite' : 'none',
            }}
          />
        ))}
        {markers.map((marker, i) => (
          <Marker
            key={i}
            coordinates={[marker.lng, marker.lat]}
            onClick={() => onMarkerClick?.(marker)}
            onMouseEnter={() => setTooltip(marker)}
            onMouseLeave={() => setTooltip(null)}
          >
            <circle
              r={marker.size || 6}
              fill={marker.color || (marker.price ? priceColor(marker.price) : '#16a34a')}
              stroke="#fff"
              strokeWidth={1.5}
              style={{ cursor: 'pointer' }}
              className={marker.pulse ? 'animate-pulse' : ''}
            />
            {marker.isAnomaly && (
              <circle r={(marker.size || 6) + 4} fill="none" stroke="#d97706" strokeWidth={1.5} opacity={0.6} />
            )}
          </Marker>
        ))}
      </ComposableMap>
      {tooltip && (
        <div className="absolute top-2 left-2 bg-white rounded-lg shadow-md px-3 py-2 text-xs z-10 border">
          <p className="font-semibold">{tooltip.label || tooltip.mandi}</p>
          {tooltip.price && <p>₹{tooltip.price?.toLocaleString('en-IN')}/qtl</p>}
          {tooltip.change != null && (
            <p className={tooltip.change >= 0 ? 'text-green-600' : 'text-red-600'}>
              {tooltip.change >= 0 ? '+' : ''}{tooltip.change}%
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export { priceColor };
