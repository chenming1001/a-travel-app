// 智能地图搜索服务
class MapService {
  constructor() {
    this.AMAP_KEY = "14fb0255a1a29f751585db86b4f48945"; // 实际项目中应从环境变量读取
    this.geoCache = new Map();
    this.searchCache = new Map();
  }

  // 智能地址解析 - 支持多种格式
  async geocode(location) {
    const cacheKey = `geo_${location}`;
    if (this.geoCache.has(cacheKey)) {
      return this.geoCache.get(cacheKey);
    }

    try {
      let result;
      
      // 如果是坐标格式 (116.397428, 39.90923)
      if (/^-?\d{1,3}\.\d+,\s*-?\d{1,3}\.\d+$/.test(location)) {
        const [lng, lat] = location.split(',').map(Number);
        result = {
          location: [lng, lat],
          formatted_address: `坐标: ${lng.toFixed(6)}, ${lat.toFixed(6)}`,
          name: '指定坐标位置'
        };
      }
      // 如果是城市名
      else if (this.isCityName(location)) {
        // 使用城市坐标数据库
        const cityCoords = this.getCityCoordinates(location);
        if (cityCoords) {
          result = {
            location: [cityCoords.lng, cityCoords.lat],
            formatted_address: `${location}市`,
            name: location,
            city: location
          };
        }
      }
      
      // 如果以上都不匹配，尝试高德API
      if (!result) {
        result = await this.amapGeocode(location);
      }
      
      if (result) {
        this.geoCache.set(cacheKey, result);
        return result;
      }
    } catch (error) {
      console.error('地址解析失败:', error);
    }
    
    // 默认返回北京
    return {
      location: [116.397428, 39.90923],
      formatted_address: '北京市',
      name: '北京市'
    };
  }

  // 高德地图API地理编码
  async amapGeocode(address) {
    try {
      const response = await fetch(
        `https://restapi.amap.com/v3/geocode/geo?address=${encodeURIComponent(address)}&key=${this.AMAP_KEY}`
      );
      const data = await response.json();
      
      if (data.status === '1' && data.geocodes && data.geocodes.length > 0) {
        const geocode = data.geocodes[0];
        const [lng, lat] = geocode.location.split(',').map(Number);
        
        return {
          location: [lng, lat],
          formatted_address: geocode.formatted_address,
          name: address,
          province: geocode.province,
          city: geocode.city,
          district: geocode.district
        };
      }
    } catch (error) {
      console.error('高德地理编码失败:', error);
    }
    return null;
  }

  // 智能地点搜索
  async searchPlaces(keyword, city = '全国') {
    const cacheKey = `search_${keyword}_${city}`;
    if (this.searchCache.has(cacheKey)) {
      return this.searchCache.get(cacheKey);
    }

    try {
      // 如果是地标性建筑，使用预定义坐标
      const landmarkResult = this.searchLandmarks(keyword);
      if (landmarkResult) {
        this.searchCache.set(cacheKey, landmarkResult);
        return landmarkResult;
      }

      // 否则使用高德API
      const response = await fetch(
        `https://restapi.amap.com/v3/place/text?keywords=${encodeURIComponent(keyword)}&city=${encodeURIComponent(city)}&key=${this.AMAP_KEY}`
      );
      const data = await response.json();
      
      if (data.status === '1' && data.pois && data.pois.length > 0) {
        const places = data.pois.map(poi => ({
          id: poi.id,
          name: poi.name,
          location: poi.location.split(',').map(Number),
          address: poi.address,
          type: poi.type,
          city: poi.cityname || city
        }));
        
        this.searchCache.set(cacheKey, places);
        return places;
      }
    } catch (error) {
      console.error('地点搜索失败:', error);
    }
    
    // 返回默认结果
    const defaultResults = [
      {
        id: '1',
        name: keyword,
        location: [116.397428, 39.90923],
        address: '北京市',
        type: '地名',
        city: '北京'
      }
    ];
    
    this.searchCache.set(cacheKey, defaultResults);
    return defaultResults;
  }

  // 预定义的地标坐标数据库
  searchLandmarks(keyword) {
    const landmarks = {
      // 北京
      '天安门': [116.397428, 39.90923],
      '故宫': [116.397026, 39.918058],
      '颐和园': [116.271203, 39.999872],
      '长城': [116.570374, 40.431908],
      '王府井': [116.417428, 39.91923],
      
      // 上海
      '外滩': [121.490317, 31.242452],
      '东方明珠': [121.499817, 31.239667],
      '南京路': [121.475317, 31.238452],
      '城隍庙': [121.493317, 31.227452],
      '迪士尼': [121.669873, 31.148036],
      
      // 广州
      '广州塔': [113.324590, 23.106680],
      '珠江新城': [113.321730, 23.119340],
      '北京路': [113.267500, 23.127300],
      
      // 深圳
      '世界之窗': [113.973160, 22.537500],
      '深圳湾': [113.943000, 22.520000],
      
      // 成都
      '宽窄巷子': [104.060200, 30.663400],
      '锦里': [104.054500, 30.650400],
      '熊猫基地': [104.147500, 30.734300],
      
      // 杭州
      '西湖': [120.155070, 30.274085],
      '雷峰塔': [120.148230, 30.230820],
      '灵隐寺': [120.097000, 30.237600]
    };
    
    for (const [name, coords] of Object.entries(landmarks)) {
      if (keyword.includes(name) || name.includes(keyword)) {
        return [{
          id: name,
          name: name,
          location: coords,
          address: `${name}位置`,
          type: '景点',
          city: this.getCityByLandmark(name)
        }];
      }
    }
    
    return null;
  }

  getCityByLandmark(landmark) {
    const cityMap = {
      '天安门': '北京', '故宫': '北京', '颐和园': '北京', '长城': '北京',
      '外滩': '上海', '东方明珠': '上海', '南京路': '上海', '迪士尼': '上海',
      '广州塔': '广州', '珠江新城': '广州',
      '世界之窗': '深圳', '深圳湾': '深圳',
      '宽窄巷子': '成都', '锦里': '成都', '熊猫基地': '成都',
      '西湖': '杭州', '雷峰塔': '杭州', '灵隐寺': '杭州'
    };
    return cityMap[landmark] || '未知';
  }

  isCityName(location) {
    const cities = [
      '北京', '上海', '广州', '深圳', '杭州', '成都', '重庆', '武汉',
      '西安', '南京', '天津', '苏州', '厦门', '青岛', '大连', '沈阳',
      '长沙', '郑州', '合肥', '福州', '南宁', '昆明', '贵阳', '南昌',
      '海口', '三亚', '拉萨', '乌鲁木齐', '呼和浩特', '银川', '西宁', '兰州'
    ];
    return cities.includes(location.replace(/市|省|县|区$/g, ''));
  }

  getCityCoordinates(city) {
    const cityCoordinates = {
      '北京': { lng: 116.397428, lat: 39.90923 },
      '上海': { lng: 121.473701, lat: 31.230416 },
      '广州': { lng: 113.264434, lat: 23.129162 },
      '深圳': { lng: 114.057868, lat: 22.543099 },
      '杭州': { lng: 120.155070, lat: 30.274085 },
      '成都': { lng: 104.066540, lat: 30.572269 },
      '重庆': { lng: 106.551557, lat: 29.563009 },
      '武汉': { lng: 114.305392, lat: 30.593098 },
      '西安': { lng: 108.940174, lat: 34.341568 },
      '南京': { lng: 118.796877, lat: 32.060255 },
      '天津': { lng: 117.200983, lat: 39.084158 },
      '苏州': { lng: 120.585315, lat: 31.298886 },
      '厦门': { lng: 118.089425, lat: 24.479834 },
      '青岛': { lng: 120.382640, lat: 36.067082 },
      '大连': { lng: 121.614682, lat: 38.914003 },
      '沈阳': { lng: 123.431475, lat: 41.805698 }
    };
    
    const cleanCity = city.replace(/市|省|县|区$/g, '');
    return cityCoordinates[cleanCity] || null;
  }

  // 计算两个坐标之间的距离（公里）
  calculateDistance(lng1, lat1, lng2, lat2) {
    const R = 6371; // 地球半径（公里）
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // 获取当前位置
  async getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('浏览器不支持地理位置'));
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lng: position.coords.longitude,
            lat: position.coords.latitude
          });
        },
        (error) => {
          console.error('获取位置失败:', error);
          // 默认返回北京
          resolve({ lng: 116.397428, lat: 39.90923 });
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    });
  }
}

// 创建单例实例
const mapService = new MapService();

export default mapService;
