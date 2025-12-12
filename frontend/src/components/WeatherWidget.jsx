// components/WeatherWidget.jsx
import React, { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, Thermometer, Droplets, Wind } from 'lucide-react';

const WeatherWidget = ({ theme }) => {
  const [weatherData, setWeatherData] = useState(null);
  const [location, setLocation] = useState('北京');

  const cities = ['北京', '上海', '广州', '成都', '杭州'];

  useEffect(() => {
    // 简单模拟天气数据
    const condition = ['晴天', '多云', '小雨'][Math.floor(Math.random() * 3)];
    const icon = condition === '晴天' ? <Sun className="w-8 h-8 text-yellow-500" /> : 
                condition === '多云' ? <Cloud className="w-8 h-8 text-gray-500" /> : 
                <CloudRain className="w-8 h-8 text-blue-500" />;
    
    setWeatherData({
      location,
      temperature: Math.floor(Math.random() * 20) + 10,
      condition,
      icon,
      humidity: Math.floor(Math.random() * 40) + 50,
      windSpeed: (Math.random() * 5 + 2).toFixed(1)
    });
  }, [location]);

  if (!weatherData) return null;

  return (
    <div className={`p-4 border-b ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-3xl font-bold">{weatherData.temperature}°</div>
          <div>
            <div className="flex items-center gap-2">
              {weatherData.icon}
              <span className="font-medium">{weatherData.condition}</span>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {weatherData.location}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Droplets className="w-4 h-4 text-blue-500" />
            <span className="text-sm">{weatherData.humidity}%</span>
          </div>
          <div className="flex items-center gap-1">
            <Wind className="w-4 h-4 text-gray-500" />
            <span className="text-sm">{weatherData.windSpeed}m/s</span>
          </div>
        </div>
        
        <select 
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className={`px-3 py-1 rounded-lg ${theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-800'}`}
        >
          {cities.map(city => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default WeatherWidget;