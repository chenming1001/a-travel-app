// frontend/src/components/TripGallery.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, Image as ImageIcon, ChevronLeft, ChevronRight, Download, 
  Share2, Heart, MapPin, Calendar, Eye, ExternalLink, 
  Filter, Grid, List, Star, Clock, Users, Tag,
  ZoomIn, ZoomOut, RotateCw, Maximize2, ChevronDown
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const TripGallery = ({ isOpen, onClose }) => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // grid, masonry, list
  const [filter, setFilter] = useState('all'); // all, recent, byCity, byTrip, favorites
  const [sortBy, setSortBy] = useState('date'); // date, city, trip
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  
  const { isAuthenticated } = useAuth();

  // 加载旅行图片
  const loadTripImages = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get('http://localhost:8000/api/dashboard/trip-images', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setImages(response.data.images);
        
        // 加载收藏状态
        const savedFavorites = JSON.parse(localStorage.getItem('trip_gallery_favorites') || '[]');
        setFavorites(savedFavorites);
      }
    } catch (error) {
      console.error('加载旅行图片失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      loadTripImages();
    }
  }, [isOpen, isAuthenticated, loadTripImages]);

  // 保存收藏状态
  useEffect(() => {
    localStorage.setItem('trip_gallery_favorites', JSON.stringify(favorites));
  }, [favorites]);

  // 切换收藏状态
  const toggleFavorite = (imageUrl) => {
    setFavorites(prev => {
      if (prev.includes(imageUrl)) {
        return prev.filter(url => url !== imageUrl);
      } else {
        return [...prev, imageUrl];
      }
    });
  };

  // 打开图片查看器
  const openImageViewer = (image, index) => {
    setSelectedImage(image);
    setCurrentIndex(index);
    setZoomLevel(1);
    setRotation(0);
  };

  // 导航到下一张图片
  const nextImage = () => {
    const filtered = getFilteredImages();
    const nextIndex = (currentIndex + 1) % filtered.length;
    setCurrentIndex(nextIndex);
    setSelectedImage(filtered[nextIndex]);
    setZoomLevel(1);
    setRotation(0);
  };

  // 导航到上一张图片
  const prevImage = () => {
    const filtered = getFilteredImages();
    const prevIndex = (currentIndex - 1 + filtered.length) % filtered.length;
    setCurrentIndex(prevIndex);
    setSelectedImage(filtered[prevIndex]);
    setZoomLevel(1);
    setRotation(0);
  };

  // 下载图片
  const downloadImage = async (image) => {
    try {
      const response = await fetch(`http://localhost:8000${image.url}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${image.trip_name}_${image.destination}_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('下载图片失败:', error);
    }
  };

  // 分享图片
  const shareImage = async (image) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${image.trip_name} - ${image.destination}`,
          text: `我在${image.destination}的旅行照片：${image.trip_name}`,
          url: window.location.origin,
        });
      } catch (error) {
        console.error('分享失败:', error);
      }
    } else {
      // 备用分享方式
      navigator.clipboard.writeText(`${image.trip_name} - ${image.destination}`);
      alert('链接已复制到剪贴板！');
    }
  };

  // 获取过滤后的图片
  const getFilteredImages = () => {
    let filtered = [...images];

    // 按收藏过滤
    if (filter === 'favorites') {
      filtered = filtered.filter(img => favorites.includes(img.url));
    }
    
    // 按城市过滤
    if (filter === 'byCity') {
      filtered = filtered.reduce((groups, image) => {
        const city = image.destination;
        if (!groups[city]) {
          groups[city] = [];
        }
        groups[city].push(image);
        return groups;
      }, {});
    }
    
    // 按旅行过滤
    if (filter === 'byTrip') {
      filtered = filtered.reduce((groups, image) => {
        const trip = image.trip_name;
        if (!groups[trip]) {
          groups[trip] = [];
        }
        groups[trip].push(image);
        return groups;
      }, {});
    }
    
    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (Array.isArray(filtered)) {
        filtered = filtered.filter(img => 
          img.trip_name.toLowerCase().includes(query) ||
          img.destination.toLowerCase().includes(query)
        );
      }
    }
    
    // 排序
    if (Array.isArray(filtered)) {
      if (sortBy === 'date') {
        filtered.sort((a, b) => new Date(b.upload_date) - new Date(a.upload_date));
      } else if (sortBy === 'city') {
        filtered.sort((a, b) => a.destination.localeCompare(b.destination));
      } else if (sortBy === 'trip') {
        filtered.sort((a, b) => a.trip_name.localeCompare(b.trip_name));
      }
    }

    return filtered;
  };

  // 获取分组后的城市图片
  const getGroupedCities = () => {
    const groups = images.reduce((acc, image) => {
      const city = image.destination;
      if (!acc[city]) {
        acc[city] = {
          city,
          count: 0,
          images: [],
          latestDate: image.upload_date
        };
      }
      acc[city].count++;
      acc[city].images.push(image);
      if (new Date(image.upload_date) > new Date(acc[city].latestDate)) {
        acc[city].latestDate = image.upload_date;
      }
      return acc;
    }, {});

    return Object.values(groups).sort((a, b) => b.count - a.count);
  };

  // 获取分组后的旅行图片
  const getGroupedTrips = () => {
    const groups = images.reduce((acc, image) => {
      const trip = image.trip_name;
      if (!acc[trip]) {
        acc[trip] = {
          trip,
          destination: image.destination,
          count: 0,
          images: [],
          latestDate: image.upload_date
        };
      }
      acc[trip].count++;
      acc[trip].images.push(image);
      if (new Date(image.upload_date) > new Date(acc[trip].latestDate)) {
        acc[trip].latestDate = image.upload_date;
      }
      return acc;
    }, {});

    return Object.values(groups).sort((a, b) => b.count - a.count);
  };

  // 获取图片统计
  const getStats = () => {
    const total = images.length;
    const cities = new Set(images.map(img => img.destination)).size;
    const trips = new Set(images.map(img => img.trip_name)).size;
    const favorited = favorites.length;
    const oldest = images.length > 0 
      ? new Date(Math.min(...images.map(img => new Date(img.upload_date)))) 
      : null;
    const newest = images.length > 0 
      ? new Date(Math.max(...images.map(img => new Date(img.upload_date)))) 
      : null;

    return { total, cities, trips, favorited, oldest, newest };
  };

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">加载旅行图片中...</p>
        </div>
      </div>
    );
  }

  const filteredImages = getFilteredImages();
  const groupedCities = getGroupedCities();
  const groupedTrips = getGroupedTrips();
  const stats = getStats();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 shadow-2xl">
        
        {/* 头部 */}
        <div className="sticky top-0 p-6 border-b dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 z-10">
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">旅行记忆画廊</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {stats.total} 张照片 • {stats.cities} 个城市 • {stats.trips} 次旅行
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full ml-4"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* 控制栏 */}
        <div className="p-4 border-b dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {/* 视图模式 */}
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`}
                  title="网格视图"
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('masonry')}
                  className={`p-2 rounded ${viewMode === 'masonry' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`}
                  title="瀑布流视图"
                >
                  <div className="grid grid-cols-2 gap-0.5 w-4 h-4">
                    <div className="bg-current rounded-sm h-3"></div>
                    <div className="bg-current rounded-sm h-4"></div>
                    <div className="bg-current rounded-sm h-2"></div>
                    <div className="bg-current rounded-sm h-3"></div>
                  </div>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`}
                  title="列表视图"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* 过滤选项 */}
              <div className="flex items-center gap-2">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="px-3 py-1.5 text-sm rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="all">全部照片</option>
                  <option value="recent">最近上传</option>
                  <option value="favorites">我的收藏</option>
                  <option value="byCity">按城市</option>
                  <option value="byTrip">按旅行</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-1.5 text-sm rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="date">按时间排序</option>
                  <option value="city">按城市排序</option>
                  <option value="trip">按旅行排序</option>
                </select>
              </div>
            </div>

            {/* 搜索框 */}
            <div className="relative">
              <input
                type="text"
                placeholder="搜索照片..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-1.5 text-sm rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none w-48"
              />
              <Filter className="absolute left-3 top-2 w-3 h-3 text-gray-400" />
            </div>
          </div>

          {/* 统计摘要 */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-blue-500" />
                <span className="text-sm">照片总数</span>
              </div>
              <p className="text-lg font-bold">{stats.total}</p>
            </div>
            <div className="px-3 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-green-500" />
                <span className="text-sm">探索城市</span>
              </div>
              <p className="text-lg font-bold">{stats.cities}</p>
            </div>
            <div className="px-3 py-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-500" />
                <span className="text-sm">旅行次数</span>
              </div>
              <p className="text-lg font-bold">{stats.trips}</p>
            </div>
            <div className="px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-yellow-500" />
                <span className="text-sm">我的收藏</span>
              </div>
              <p className="text-lg font-bold">{stats.favorited}</p>
            </div>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="p-4 flex-1 overflow-auto">
          {images.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">暂无旅行照片</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                记录旅行时上传照片，让美好瞬间永久保存
              </p>
              <button
                onClick={() => {
                  onClose();
                  // 这里可以触发打开添加旅行记录的模态框
                }}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:opacity-90"
              >
                去记录旅行
              </button>
            </div>
          ) : (
            <>
              {/* 按城市分组视图 */}
              {filter === 'byCity' && (
                <div className="space-y-8">
                  {groupedCities.map((group, index) => (
                    <div key={index} className="mb-8">
                      <div className="flex items-center gap-3 mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-xl">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                          {group.city.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-bold text-lg">{group.city}</h3>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {group.count} 张照片
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            最近更新: {new Date(group.latestDate).toLocaleDateString()}
                          </p>
                        </div>
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      </div>
                      
                      <div className={`grid gap-3 ${viewMode === 'grid' 
                        ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' 
                        : viewMode === 'list' 
                        ? 'grid-cols-1' 
                        : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                        {group.images.slice(0, 8).map((image, imgIndex) => (
                          <ImageCard 
                            key={imgIndex}
                            image={image}
                            index={imgIndex}
                            viewMode={viewMode}
                            favorites={favorites}
                            toggleFavorite={toggleFavorite}
                            openImageViewer={() => openImageViewer(image, images.findIndex(img => img.url === image.url))}
                          />
                        ))}
                      </div>
                      
                      {group.images.length > 8 && (
                        <button
                          onClick={() => {
                            setFilter('all');
                            setSearchQuery(group.city);
                          }}
                          className="mt-4 w-full py-2 text-center text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                        >
                          查看更多 {group.city} 的照片 ({group.images.length - 8} 张)
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* 按旅行分组视图 */}
              {filter === 'byTrip' && (
                <div className="space-y-8">
                  {groupedTrips.map((group, index) => (
                    <div key={index} className="mb-8">
                      <div className="flex items-center gap-3 mb-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-900 rounded-xl">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center text-white">
                          <Users className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-bold text-lg">{group.trip}</h3>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {group.count} 张照片
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {group.destination} • {new Date(group.latestDate).toLocaleDateString()}
                          </p>
                        </div>
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      </div>
                      
                      <div className={`grid gap-3 ${viewMode === 'grid' 
                        ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' 
                        : viewMode === 'list' 
                        ? 'grid-cols-1' 
                        : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                        {group.images.slice(0, 8).map((image, imgIndex) => (
                          <ImageCard 
                            key={imgIndex}
                            image={image}
                            index={imgIndex}
                            viewMode={viewMode}
                            favorites={favorites}
                            toggleFavorite={toggleFavorite}
                            openImageViewer={() => openImageViewer(image, images.findIndex(img => img.url === image.url))}
                          />
                        ))}
                      </div>
                      
                      {group.images.length > 8 && (
                        <button
                          onClick={() => {
                            setFilter('all');
                            setSearchQuery(group.trip);
                          }}
                          className="mt-4 w-full py-2 text-center text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"
                        >
                          查看更多 {group.trip} 的照片 ({group.images.length - 8} 张)
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* 收藏视图 */}
              {filter === 'favorites' && (
                <>
                  {favorites.length === 0 ? (
                    <div className="text-center py-12">
                      <Heart className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <h3 className="text-lg font-medium mb-2">暂无收藏照片</h3>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">
                        点击照片上的❤️按钮收藏喜欢的照片
                      </p>
                    </div>
                  ) : (
                    <div className={`grid gap-3 ${viewMode === 'grid' 
                      ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' 
                      : viewMode === 'list' 
                      ? 'grid-cols-1' 
                      : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                      {images.filter(img => favorites.includes(img.url)).map((image, index) => (
                        <ImageCard 
                          key={index}
                          image={image}
                          index={index}
                          viewMode={viewMode}
                          favorites={favorites}
                          toggleFavorite={toggleFavorite}
                          openImageViewer={() => openImageViewer(image, images.findIndex(img => img.url === image.url))}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* 全部照片视图 */}
              {(filter === 'all' || filter === 'recent') && Array.isArray(filteredImages) && (
                <>
                  {filteredImages.length === 0 ? (
                    <div className="text-center py-12">
                      <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <h3 className="text-lg font-medium mb-2">未找到匹配的照片</h3>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">
                        尝试修改搜索关键词或过滤条件
                      </p>
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setFilter('all');
                        }}
                        className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                      >
                        清除筛选
                      </button>
                    </div>
                  ) : (
                    <div className={`grid gap-3 ${viewMode === 'grid' 
                      ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' 
                      : viewMode === 'list' 
                      ? 'grid-cols-1' 
                      : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                      {filteredImages.map((image, index) => (
                        <ImageCard 
                          key={index}
                          image={image}
                          index={index}
                          viewMode={viewMode}
                          favorites={favorites}
                          toggleFavorite={toggleFavorite}
                          openImageViewer={() => openImageViewer(image, images.findIndex(img => img.url === image.url))}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* 图片预览模态框 */}
        {selectedImage && (
          <div className="fixed inset-0 z-[60] bg-black/95 flex flex-col items-center justify-center p-4">
            {/* 控制栏 */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3 text-white">
                <button
                  onClick={() => setSelectedImage(null)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <div>
                  <h3 className="font-bold">{selectedImage.trip_name}</h3>
                  <p className="text-sm opacity-80">{selectedImage.destination}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleFavorite(selectedImage.url)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <Heart className={`w-5 h-5 ${favorites.includes(selectedImage.url) ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                </button>
                <button
                  onClick={() => downloadImage(selectedImage)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <Download className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={() => shareImage(selectedImage)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <Share2 className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* 图片显示区域 */}
            <div className="flex-1 flex items-center justify-center w-full overflow-hidden">
              <div className="relative max-w-5xl max-h-[70vh]">
                <img
                  src={`http://localhost:8000${selectedImage.url}`}
                  alt={`${selectedImage.trip_name} - ${selectedImage.destination}`}
                  className={`max-w-full max-h-[70vh] object-contain transition-all duration-200
                    ${zoomLevel !== 1 ? 'cursor-move' : ''}`}
                  style={{
                    transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                    cursor: zoomLevel !== 1 ? 'grab' : 'default'
                  }}
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/800x600?text=图片加载失败';
                  }}
                />
              </div>
            </div>

            {/* 导航和工具 */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-4">
              <button
                onClick={prevImage}
                className="p-3 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              
              <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2">
                <button
                  onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.5))}
                  className="p-2 hover:bg-white/10 rounded-full"
                >
                  <ZoomOut className="w-4 h-4 text-white" />
                </button>
                <span className="text-white text-sm w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
                <button
                  onClick={() => setZoomLevel(Math.min(3, zoomLevel + 0.5))}
                  className="p-2 hover:bg-white/10 rounded-full"
                >
                  <ZoomIn className="w-4 h-4 text-white" />
                </button>
                <div className="w-px h-4 bg-white/30 mx-1"></div>
                <button
                  onClick={() => setRotation((rotation + 90) % 360)}
                  className="p-2 hover:bg-white/10 rounded-full"
                >
                  <RotateCw className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={() => {
                    setZoomLevel(1);
                    setRotation(0);
                  }}
                  className="p-2 hover:bg-white/10 rounded-full"
                >
                  <Maximize2 className="w-4 h-4 text-white" />
                </button>
              </div>
              
              <button
                onClick={nextImage}
                className="p-3 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition-colors"
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            </div>

            {/* 图片信息 */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white/80 text-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(selectedImage.upload_date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>{selectedImage.destination}</span>
                </div>
              </div>
              <div>
                第 {currentIndex + 1} / {getFilteredImages().length} 张
              </div>
            </div>

            {/* 键盘快捷键提示 */}
            <div className="absolute top-16 right-4 bg-black/50 backdrop-blur-sm rounded-lg p-3 text-white/70 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 bg-white/20 rounded">←</kbd>
                  <span>上一张</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 bg-white/20 rounded">→</kbd>
                  <span>下一张</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 bg-white/20 rounded">ESC</kbd>
                  <span>关闭</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// 图片卡片组件
const ImageCard = ({ image, viewMode, favorites, toggleFavorite, openImageViewer }) => {
  const isFavorite = favorites.includes(image.url);

  if (viewMode === 'list') {
    return (
      <div 
        onClick={openImageViewer}
        className="flex items-center gap-4 p-3 rounded-lg border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-all group"
      >
        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
          <img
            src={`http://localhost:8000${image.url}`}
            alt={image.trip_name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/64x64?text=图片';
            }}
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-medium truncate">{image.trip_name}</h4>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(image.url);
              }}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
            </button>
          </div>
          
          <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span>{image.destination}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{new Date(image.upload_date).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        
        <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
      </div>
    );
  }

  return (
    <div 
      onClick={openImageViewer}
      className={`group relative cursor-pointer transition-all duration-300 hover:scale-[1.02] 
        ${viewMode === 'masonry' ? 'break-inside-avoid' : ''}`}
    >
      <div className={`rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 relative
        ${viewMode === 'masonry' ? 'aspect-[3/4]' : 'aspect-square'}`}>
        {/* 图片 */}
        <img
          src={`http://localhost:8000${image.url}`}
          alt={`${image.trip_name} - ${image.destination}`}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          onError={(e) => {
            e.target.src = 'https://via.placeholder.com/300x300?text=图片加载失败';
          }}
        />
        
        {/* 遮罩层 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="absolute top-3 right-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(image.url);
              }}
              className="p-2 bg-black/40 backdrop-blur-sm rounded-full hover:bg-black/60 transition-colors"
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-white'}`} />
            </button>
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <div className="mb-1">
              <p className="font-medium text-white truncate">{image.trip_name}</p>
              <p className="text-white/80 text-sm truncate">{image.destination}</p>
            </div>
            
            <div className="flex items-center justify-between text-white/70 text-xs">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(image.upload_date).toLocaleDateString()}</span>
                </div>
              </div>
              <Eye className="w-3 h-3" />
            </div>
          </div>
        </div>
      </div>
      
      {/* 收藏标记 */}
      {isFavorite && (
        <div className="absolute top-2 left-2">
          <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center shadow-lg">
            <Heart className="w-3 h-3 text-white fill-white" />
          </div>
        </div>
      )}
    </div>
  );
};

export default TripGallery;