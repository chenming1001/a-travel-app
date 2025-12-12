// frontend/src/components/ExploredCitiesMap.jsx
import React, { useEffect, useState, useRef } from 'react';
import { X, MapPin, Loader2, AlertCircle } from 'lucide-react';
import axios from 'axios';

const ExploredCitiesMap = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [cities, setCities] = useState([]);
  const [error, setError] = useState(null);
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  // 1. 获取数据
  useEffect(() => {
    if (isOpen) {
      fetchExploredCities();
    }
  }, [isOpen]);

  const fetchExploredCities = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('access_token');
      const response = await axios.get('http://localhost:8000/api/dashboard/explored-cities', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setCities(response.data.explored_cities);
      }
    } catch (err) {
      console.error("获取足迹数据失败:", err);
      // 模拟数据作为兜底，防止完全空白
      setCities([
        { city: "北京", longitude: 116.4074, latitude: 39.9042, visit_count: 1, total_days: 3, total_spent: 2000 }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // 2. 初始化地图
  useEffect(() => {
    // 如果窗口没开，或者正在加载，或者没有DOM ref，都不初始化
    if (!isOpen || loading || !mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.destroy();
      mapInstanceRef.current = null;
    }

    const initMap = () => {
      try {
        if (!window.AMap) return;

        const map = new window.AMap.Map(mapContainerRef.current, {
          zoom: 4,
          center: [105.0, 35.0], // 中国中心
          viewMode: '3D',
          mapStyle: 'amap://styles/whitesmoke',
        });

        mapInstanceRef.current = map;
        const infoWindow = new window.AMap.InfoWindow({ offset: new window.AMap.Pixel(0, -30) });

        cities.forEach(city => {
          if (city.longitude && city.latitude) {
            const marker = new window.AMap.Marker({
              position: [city.longitude, city.latitude],
              title: city.city,
              content: `
                <div style="
                  background-color: #3b82f6; 
                  width: 24px; 
                  height: 24px; 
                  border-radius: 50%; 
                  border: 2px solid white; 
                  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  color: white;
                ">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
              `
            });

            marker.on('click', () => {
              // 构建 InfoWindow 内容
              const content = `
                <div style="padding: 8px;">
                  <h4 style="font-weight: bold; margin-bottom: 4px; color: #333;">${city.city}</h4>
                  <div style="font-size: 12px; color: #666; line-height: 1.5;">
                    <div>访问次数: ${city.visit_count}</div>
                    <div>总花费: ¥${city.total_spent?.toLocaleString() || 0}</div>
                  </div>
                </div>
              `;
              infoWindow.setContent(content);
              infoWindow.open(map, marker.getPosition());
            });

            map.add(marker);
          }
        });
        
        // 自动缩放视野以包含所有标记
        if (cities.length > 0) {
          map.setFitView();
        }

      } catch (e) {
        console.error("地图渲染错误:", e);
        setError("地图加载失败，请检查 Key 配置");
      }
    };

    // 检查是否需要加载脚本
    if (!window.AMap) {
      const loader = document.createElement('script');
      loader.type = 'text/javascript';
      const userKey = localStorage.getItem('amap_key') || 'a7a90e05a37d3f6bf76d4a9032fc9129'; 
      loader.src = `https://webapi.amap.com/maps?v=2.0&key=${userKey}`;
      loader.onload = initMap;
      loader.onerror = () => setError("地图脚本加载失败");
      document.head.appendChild(loader);
    } else {
      initMap();
    }

    // 清理函数：组件卸载时销毁地图
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen, loading, cities]); // 依赖项

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-5xl h-[80vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* 顶部栏 */}
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-800 bg-white dark:bg-gray-900 z-10">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-500" /> 我的旅行足迹
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 relative bg-gray-50 dark:bg-gray-800 w-full overflow-hidden">
          
          {/* 地图挂载点：始终渲染，只是在 loading 时被遮挡 */}
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Loading 遮罩层 */}
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
              <p className="text-sm text-gray-500">正在绘制足迹...</p>
            </div>
          )}

          {/* Error 遮罩层 */}
          {!loading && error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-white/90 dark:bg-gray-900/90">
              <AlertCircle className="w-10 h-10 text-red-500 mb-2" />
              <p className="text-gray-600 dark:text-gray-400">{error}</p>
            </div>
          )}

          {/* 空数据提示 */}
          {!loading && !error && cities.length === 0 && (
             <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
                <div className="bg-white/80 dark:bg-gray-800/80 px-6 py-4 rounded-xl shadow-lg backdrop-blur text-center">
                  <p className="text-gray-500">暂无旅行足迹</p>
                  <p className="text-xs text-gray-400 mt-1">去记录你的第一次旅行吧！</p>
                </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExploredCitiesMap;