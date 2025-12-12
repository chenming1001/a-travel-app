// frontend/src/components/MapModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { X, MapPin, Navigation, Search, Route, Clock, Car, Bus, Train, Plane, User, Star, Filter } from 'lucide-react';
import axios from 'axios';

const MapModal = ({ isOpen, onClose, theme, apiConfig }) => {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [map, setMap] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [routeMode, setRouteMode] = useState('driving');
  const [routeResult, setRouteResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentLocation, setCurrentLocation] = useState(null);

  const mapContainerRef = useRef(null);

  // API基础URL
  const BASE_URL = 'http://localhost:8000';

  // 加载高德地图API
  useEffect(() => {
    if (!isOpen || mapLoaded) return;

    const amapKey = apiConfig?.amap_key || "2f7e7f522142f058bd513ad4b102fecc";

    if (!window.AMap) {
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.async = true;
      script.src = `https://webapi.amap.com/maps?v=2.0&key=${amapKey}&plugin=AMap.Scale,AMap.ToolBar,AMap.Marker,AMap.InfoWindow,AMap.Polyline,AMap.Geocoder`;

      script.onload = () => {
        console.log('✅ 高德地图API加载成功');
        setMapLoaded(true);
      };

      script.onerror = () => {
        console.error('❌ 高德地图API加载失败');
        setError('地图加载失败，请检查网络连接');
      };

      document.head.appendChild(script);
    } else {
      setMapLoaded(true);
    }

    return () => {
      // 清理地图实例
      if (map) {
        map.destroy();
        setMap(null);
      }
    };
  }, [isOpen, mapLoaded, apiConfig]);

  // 初始化地图
  useEffect(() => {
    if (!mapLoaded || !isOpen || !mapContainerRef.current) return;

    try {
      console.log('🗺️ 初始化地图...');

      // 创建地图实例
      const mapInstance = new window.AMap.Map(mapContainerRef.current, {
        zoom: 11,
        center: [116.397428, 39.90923], // 北京中心
        viewMode: '2D',
        resizeEnable: true,
        zoomEnable: true,
        dragEnable: true,
        doubleClickZoom: true,
        keyboardEnable: false,
      });

      // 添加控件
      mapInstance.addControl(new window.AMap.Scale());
      mapInstance.addControl(new window.AMap.ToolBar());

      setMap(mapInstance);
      console.log('✅ 地图初始化成功');

      // 尝试获取当前位置
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setCurrentLocation([longitude, latitude]);

            // 添加当前位置标记
            const marker = new window.AMap.Marker({
              position: [longitude, latitude],
              title: '我的位置',
              icon: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_bs.png'
            });
            marker.setMap(mapInstance);

            // 将地图中心设置为当前位置
            mapInstance.setCenter([longitude, latitude]);
            mapInstance.setZoom(14);
          },
          (error) => {
            console.log('⚠️ 获取位置失败:', error);
          }
        );
      }
    } catch (err) {
      console.error('❌ 地图初始化失败:', err);
      setError('地图初始化失败: ' + err.message);
    }
  }, [mapLoaded, isOpen]);

  // 搜索地点
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('请输入搜索关键词');
      return;
    }

    setLoading(true);
    setError('');
    setSearchResults([]);

    try {
      console.log('🔍 开始搜索:', searchQuery);

      // 获取访问令牌
      const token = localStorage.getItem('access_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      console.log('🔑 请求头:', headers);

      const response = await axios.get(`${BASE_URL}/api/map/search`, {
        params: {
          keyword: searchQuery,
          city: '全国'
        },
        headers: headers,
        timeout: 10000 // 10秒超时
      });

      console.log('📦 搜索响应:', response.data);

      if (response.data.success) {
        const results = response.data.data || [];
        setSearchResults(results);
        console.log(`✅ 搜索成功，找到 ${results.length} 个结果`);

        // 在地图上标记搜索结果
        if (map && results.length > 0) {
          if (typeof map.clearMap === 'function') {
            map.clearMap();
          } else if (typeof map.clear === 'function') {
            map.clear(); // 如果 clearMap 不存在，尝试使用 clear()
          } else {
            console.warn('地图清理方法不可用');
          }

          const markers = [];
          results.forEach((place, index) => {
            if (place.location && place.location.lng && place.location.lat) {
              const marker = new window.AMap.Marker({
                position: [place.location.lng, place.location.lat],
                title: place.name,
                content: `<div class="bg-white p-1 rounded shadow text-xs">${index + 1}. ${place.name}</div>`,
                offset: new window.AMap.Pixel(0, -25)
              });

              marker.on('click', () => {
                const infoWindow = new window.AMap.InfoWindow({
                  content: `
                    <div class="p-2 max-w-xs">
                      <h3 class="font-bold text-sm">${place.name}</h3>
                      <p class="text-gray-600 text-xs mt-1">${place.address || '无地址信息'}</p>
                      <p class="text-gray-500 text-xs mt-1">${place.type || '未知类型'}</p>
                      ${place.tel && place.tel !== 'N/A' ? `<p class="text-green-500 text-xs mt-1">📞 ${place.tel}</p>` : ''}
                    </div>
                  `,
                  offset: new window.AMap.Pixel(0, -35)
                });
                infoWindow.open(map, marker.getPosition());
              });

              marker.setMap(map);
              markers.push(marker);
            }
          });

          // 调整地图视野
          if (markers.length > 0) {
            const bounds = new window.AMap.Bounds();
            markers.forEach(marker => {
              bounds.extend(marker.getPosition());
            });
            map.setBounds(bounds);

            // 如果只有一个结果，放大一点
            if (markers.length === 1) {
              map.setZoom(15);
            }
          }
        } else if (results.length === 0) {
          setError('未找到相关地点，请尝试其他关键词');
        }
      } else {
        console.error('❌ 搜索失败:', response.data.msg);
        setError('搜索失败: ' + (response.data.msg || '未知错误'));
      }
    } catch (error) {
      console.error('❌ 搜索请求失败:', error);

      if (error.response) {
        // 服务器返回了错误状态码
        console.error('响应状态:', error.response.status);
        console.error('响应数据:', error.response.data);
        setError(`搜索失败: ${error.response.status} - ${error.response.data?.msg || error.response.statusText}`);
      } else if (error.request) {
        // 请求已发送但未收到响应
        console.error('请求信息:', error.request);
        setError('搜索失败: 无法连接到服务器，请检查后端服务是否运行');
      } else {
        // 请求配置出错
        console.error('错误信息:', error.message);
        setError(`搜索失败: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // 规划路线
  const handleRoute = async () => {
    if (!origin.trim() || !destination.trim()) {
      setError('请输入起点和终点');
      return;
    }

    setLoading(true);
    setError('');
    setRouteResult(null);

    try {
      console.log('🗺️ 开始规划路线:', { origin, destination, mode: routeMode });

      // 获取访问令牌
      const token = localStorage.getItem('access_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      const response = await axios.get(`${BASE_URL}/api/map/direction`, {
        params: {
          origin,
          destination,
          mode: routeMode
        },
        headers: headers,
        timeout: 15000 // 15秒超时
      });

      console.log('📦 路线规划响应:', response.data);

      if (response.data.success) {
        setRouteResult(response.data);
        console.log('✅ 路线规划成功');

        // 在地图上显示路线
        if (map) {
          if (typeof map.clearMap === 'function') {
            map.clearMap();
          } else if (typeof map.clear === 'function') {
            map.clear(); // 如果 clearMap 不存在，尝试使用 clear()
          } else {
            console.warn('地图清理方法不可用');
          }

          // 标记起点
          if (response.data.origin_loc) {
            const originMarker = new window.AMap.Marker({
              position: response.data.origin_loc,
              title: '起点',
              icon: 'https://webapi.amap.com/theme/v1.3/markers/n/start.png'
            });
            originMarker.setMap(map);
          }

          // 标记终点
          if (response.data.dest_loc) {
            const destMarker = new window.AMap.Marker({
              position: response.data.dest_loc,
              title: '终点',
              icon: 'https://webapi.amap.com/theme/v1.3/markers/n/end.png'
            });
            destMarker.setMap(map);
          }

          // 绘制路线
          if (response.data.path && response.data.path.length > 0) {
            // 根据交通方式选择颜色
            let strokeColor = '#FF6B6B'; // 默认红色
            switch (routeMode) {
              case 'driving':
                strokeColor = '#FFE66D'; // 黄色
                break;
              case 'bus':
                strokeColor = '#45B7D1'; // 蓝色
                break;
              case 'train':
                strokeColor = '#4ECDC4'; // 青色
                break;
              case 'walking':
                strokeColor = '#FF6B6B'; // 红色
                break;
              case 'bicycling':
                strokeColor = '#95E77E'; // 绿色
                break;
              case 'plane':
                strokeColor = '#C780E8'; // 紫色
                break;
            }

            const polyline = new window.AMap.Polyline({
              path: response.data.path,
              strokeColor: strokeColor,
              strokeWeight: 4,
              strokeOpacity: 0.8,
              strokeStyle: routeMode === 'plane' ? 'dashed' : 'solid'
            });
            polyline.setMap(map);

            // 调整地图视野
            const markers = [];
            if (response.data.origin_loc) {
              markers.push(new window.AMap.Marker({
                position: response.data.origin_loc,
                title: '起点'
              }));
            }
            if (response.data.dest_loc) {
              markers.push(new window.AMap.Marker({
                position: response.data.dest_loc,
                title: '终点'
              }));
            }
            map.setFitView([...markers, polyline]);
          }
        }
      } else {
        console.error('❌ 路线规划失败:', response.data.msg);
        setError('路线规划失败: ' + (response.data.msg || '未知错误'));
      }
    } catch (error) {
      console.error('❌ 路线规划请求失败:', error);

      if (error.response) {
        console.error('响应状态:', error.response.status);
        console.error('响应数据:', error.response.data);
        setError(`路线规划失败: ${error.response.status} - ${error.response.data?.msg || error.response.statusText}`);
      } else if (error.request) {
        console.error('请求信息:', error.request);
        setError('路线规划失败: 无法连接到服务器');
      } else {
        console.error('错误信息:', error.message);
        setError(`路线规划失败: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // 选择起点或终点
  const handleSelectPlace = (place, type) => {
    const address = `${place.name} (${place.address || '无地址'})`;
    if (type === 'origin') {
      setOrigin(address);
    } else {
      setDestination(address);
    }
  };

  // 测试地图API连接
  const testMapAPI = async () => {
    try {
      console.log('🧪 测试地图API连接...');
      setError('');

      const response = await axios.get(`${BASE_URL}/api/map/test`, {
        timeout: 5000
      });

      console.log('测试结果:', response.data);

      if (response.data.success) {
        alert(`✅ 地图API测试成功: ${response.data.message}`);
      } else {
        alert(`❌ 地图API测试失败: ${response.data.message}`);
      }
    } catch (error) {
      console.error('测试失败:', error);
      alert(`❌ 测试失败: ${error.message}`);
    }
  };

  // 清空地图
  const clearMap = () => {
    if (map) {
      if (typeof map.clearMap === 'function') {
        map.clearMap();
      } else if (typeof map.clear === 'function') {
        map.clear(); // 如果 clearMap 不存在，尝试使用 clear()
      } else {
        console.warn('地图清理方法不可用');
      }
      setSearchResults([]);
      setRouteResult(null);
      setError('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 shadow-2xl">

        {/* 头部 */}
        <div className="sticky top-0 p-6 border-b dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 z-10">
          <div>
            <h2 className="text-2xl font-bold">旅行地图</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              探索目的地、规划路线、搜索景点
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={testMapAPI}
              className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-800 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700"
              title="测试地图API连接"
            >
              测试连接
            </button>
            <button
              onClick={clearMap}
              className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-800 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700"
              title="清空地图"
            >
              清空地图
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
              title="关闭"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row h-[calc(90vh-120px)]">
          {/* 左侧控制面板 */}
          <div className="w-full lg:w-96 p-6 border-r dark:border-gray-800 overflow-y-auto">

            {/* 搜索框 */}
            <div className="mb-6">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <Search className="w-4 h-4" /> 搜索地点
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="搜索景点、酒店、餐厅..."
                  className="flex-1 p-2 rounded-lg border dark:border-gray-700 bg-transparent"
                  disabled={loading}
                />
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      搜索中...
                    </>
                  ) : (
                    '搜索'
                  )}
                </button>
              </div>
            </div>

            {/* 搜索结果 */}
            {searchResults.length > 0 && (
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold">搜索结果 ({searchResults.length})</h3>
                  <button
                    onClick={() => setSearchResults([])}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    清空
                  </button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                  {searchResults.map((place, index) => (
                    <div
                      key={place.id || index}
                      className="p-3 rounded-lg border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                      onClick={() => {
                        if (map && place.location) {
                          map.setCenter([place.location.lng, place.location.lat]);
                          map.setZoom(15);

                          // 显示信息窗口
                          const infoWindow = new window.AMap.InfoWindow({
                            content: `
                              <div class="p-2 max-w-xs">
                                <h3 class="font-bold text-sm">${place.name}</h3>
                                <p class="text-gray-600 text-xs mt-1">${place.address || '无地址信息'}</p>
                                <p class="text-gray-500 text-xs mt-1">${place.type || '未知类型'}</p>
                              </div>
                            `,
                            offset: new window.AMap.Pixel(0, -30)
                          });

                          infoWindow.open(map, [place.location.lng, place.location.lat]);
                        }
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-1">
                            <span className="w-5 h-5 flex items-center justify-center bg-blue-100 text-green-600 text-xs rounded-full">
                              {index + 1}
                            </span>
                            <h4 className="font-medium text-sm">{place.name}</h4>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 truncate">{place.address}</p>
                          {place.type && (
                            <p className="text-xs text-gray-400 mt-1">{place.type}</p>
                          )}
                        </div>
                        <div className="flex gap-1 ml-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectPlace(place, 'origin');
                            }}
                            className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
                            title="设为起点"
                          >
                            <Navigation className="w-3 h-3 text-green-500" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectPlace(place, 'destination');
                            }}
                            className="p-1 hover:bg-green-100 dark:hover:bg-green-900/30 rounded transition-colors"
                            title="设为终点"
                          >
                            <MapPin className="w-3 h-3 text-green-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 路线规划 */}
            <div className="mb-6">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <Route className="w-4 h-4" /> 路线规划
              </h3>

              <div className="space-y-3">
                {/* 起点 */}
                <div>
                  <label className="text-sm text-gray-500 mb-1 block">起点</label>
                  <div className="relative">
                    <Navigation className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={origin}
                      onChange={(e) => setOrigin(e.target.value)}
                      placeholder="例如：北京天安门"
                      className="w-full pl-10 pr-4 py-2 rounded-lg border dark:border-gray-700 bg-transparent"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* 终点 */}
                <div>
                  <label className="text-sm text-gray-500 mb-1 block">终点</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder="例如：故宫博物院"
                      className="w-full pl-10 pr-4 py-2 rounded-lg border dark:border-gray-700 bg-transparent"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* 交通方式 */}
                <div>
                  <label className="text-sm text-gray-500 mb-1 block">交通方式</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { mode: 'driving', label: '驾车', icon: Car, color: 'bg-yellow-500' },
                      { mode: 'bus', label: '公交', icon: Bus, color: 'bg-green-500' },
                      { mode: 'walking', label: '步行', icon: User, color: 'bg-red-500' },
                      { mode: 'train', label: '火车', icon: Train, color: 'bg-cyan-500' },
                      { mode: 'plane', label: '飞机', icon: Plane, color: 'bg-yellow-500' }
                    ].map((option) => {
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.mode}
                          type="button"
                          onClick={() => setRouteMode(option.mode)}
                          disabled={loading}
                          className={`p-2 rounded-lg border flex flex-col items-center gap-1 transition-all ${
                            routeMode === option.mode
                              ? 'border-green-500 bg-blue-50 dark:bg-blue-900/30 shadow-sm'
                              : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                          } disabled:opacity-50`}
                        >
                          <Icon className={`w-4 h-4 ${routeMode === option.mode ? 'text-green-500' : ''}`} />
                          <span className="text-xs">{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={handleRoute}
                  disabled={loading || !origin.trim() || !destination.trim()}
                  className="w-full py-2 bg-gradient-to-r from-green-500 to-yellow-500 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      规划中...
                    </>
                  ) : (
                    '规划路线'
                  )}
                </button>
              </div>
            </div>

            {/* 路线结果 */}
            {routeResult && routeResult.success && (
              <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 mb-6">
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  <Route className="w-4 h-4" /> 路线详情
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">距离</span>
                    <span className="font-medium text-lg">{routeResult.distance} km</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">预计时间</span>
                    <span className="font-medium text-lg">{routeResult.duration} 分钟</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">交通方式</span>
                    <span className="font-medium">
                      {routeMode === 'driving' ? '🚗 驾车' :
                       routeMode === 'bus' ? '🚌 公交' :
                       routeMode === 'walking' ? '🚶 步行' :
                       routeMode === 'train' ? '🚆 火车' :
                       routeMode === 'plane' ? '✈️ 飞机' : '🚲 骑行'}
                    </span>
                  </div>
                  {routeResult.path && (
                    <div className="text-xs text-gray-500 mt-2">
                      路径点: {routeResult.path.length} 个
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 错误信息 */}
            {error && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm flex items-start gap-2">
                <div className="flex-shrink-0 mt-0.5">⚠️</div>
                <div>{error}</div>
              </div>
            )}

            {/* 调试信息 */}
            <div className="mt-4 text-xs text-gray-500">
              <div>地图状态: {mapLoaded ? '✅ 已加载' : '⏳ 加载中...'}</div>
              <div>搜索记录: {searchResults.length} 条</div>
              <div>路线规划: {routeResult ? '✅ 已完成' : '未规划'}</div>
            </div>
          </div>

          {/* 右侧地图区域 */}
          <div className="flex-1 relative">
            <div
              ref={mapContainerRef}
              className="w-full h-full rounded-r-2xl"
              style={{ minHeight: '400px' }}
            />

            {/* 加载状态 */}
            {!mapLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-r-2xl">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">加载地图中...</p>
                  <p className="text-xs text-gray-500 mt-2">请确保网络连接正常</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapModal;