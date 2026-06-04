import React, { useState, useEffect } from 'react';
import { getWeatherForecast } from '../../lib/api';

// Simple global cache for weather requests to prevent duplicate network calls across mounts
const weatherCache = new Map();

export const WeatherBadge = ({ region, compact = false }) => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    if (!region) return;

    const fetchWeather = async () => {
      const cacheKey = region.toLowerCase().trim();
      if (weatherCache.has(cacheKey)) {
        setWeather(weatherCache.get(cacheKey));
        return;
      }

      setLoading(true);
      try {
        const data = await getWeatherForecast(region);
        weatherCache.set(cacheKey, data);
        setWeather(data);
      } catch (err) {
        console.error("Failed to load weather for", region, err);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [region]);

  if (!region) return null;
  if (loading || !weather) {
    return (
      <span className="inline-flex items-center text-xs text-slate-400">
        Loading...
      </span>
    );
  }

  const { risk_level, description, forecast } = weather;

  // Determine styles and text based on risk_level
  let badgeText = "Clear";
  let badgeStyles = "bg-green-50 text-green-700 border-green-200";
  let dotColor = "bg-green-500";
  let pulseAnimation = false;

  const rLevel = String(risk_level || 'none').toLowerCase().trim();
  if (rLevel === 'high' || rLevel === 'storm' || rLevel === 'critical') {
    badgeText = "Storm risk";
    badgeStyles = "bg-rose-50 text-rose-700 border-rose-200";
    dotColor = "bg-rose-500";
    pulseAnimation = true;
  } else if (
    rLevel === 'low' ||
    rLevel === 'medium' ||
    rLevel === 'rain' ||
    rLevel === 'light_rain' ||
    rLevel === 'warning'
  ) {
    badgeText = "Light rain";
    badgeStyles = "bg-teal-50 text-teal-700 border-teal-200";
    dotColor = "bg-teal-500";
  }

  const weatherIcon = rLevel === 'high' || rLevel === 'storm' ? '🌧' : rLevel === 'low' || rLevel === 'medium' || rLevel === 'rain' ? '🌦' : '☀️';

  const content = compact ? (
    <span className="flex items-center gap-1">
      {pulseAnimation && (
        <span className="relative flex h-2 w-2 mr-0.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
        </span>
      )}
      {!pulseAnimation && <span className={`h-1.5 w-1.5 rounded-full mr-0.5 ${dotColor}`} />}
      {weatherIcon}
    </span>
  ) : (
    <span className="flex items-center gap-1">
      {pulseAnimation && (
        <span className="relative flex h-2 w-2 mr-0.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
        </span>
      )}
      {!pulseAnimation && <span className={`h-1.5 w-1.5 rounded-full mr-0.5 ${dotColor}`} />}
      {badgeText}
    </span>
  );

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border cursor-help select-none ${badgeStyles}`}
      >
        {content}
      </span>

      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50 w-64 bg-slate-900 text-white rounded-lg p-3 shadow-xl border border-slate-700 text-xs">
          <div className="font-semibold mb-1 text-slate-200 flex justify-between items-center">
            <span>{region} Weather</span>
            <span className="text-[10px] text-slate-400 uppercase font-bold">{rLevel} Risk</span>
          </div>
          <p className="text-slate-300 mb-2 leading-relaxed">{description || "No severe weather risks reported."}</p>
          {forecast && forecast.length > 0 ? (
            <div className="border-t border-slate-800 pt-2 mt-1">
              <div className="grid grid-cols-5 gap-1 text-center font-medium text-slate-400 text-[10px] mb-1">
                {forecast.slice(0, 5).map((f, i) => (
                  <div key={i}>{f.date || f.day}</div>
                ))}
              </div>
              <div className="grid grid-cols-5 gap-1 text-center text-[10px]">
                {forecast.slice(0, 5).map((f, i) => {
                  const cond = String(f.condition || '').toLowerCase();
                  const fIcon = cond.includes('storm') || cond.includes('heavy') ? '🌧' : cond.includes('rain') || cond.includes('shower') ? '🌦' : '☀️';
                  return (
                    <div key={i} className="flex flex-col items-center">
                      <span className="text-xs">{fIcon}</span>
                      <span className="text-slate-300 mt-0.5 text-[9px]">{f.temp}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-[10px] text-slate-500 italic">No forecast details available</div>
          )}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
        </div>
      )}
    </div>
  );
};

export default WeatherBadge;
