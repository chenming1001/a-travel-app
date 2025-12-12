// 本地状态存储，解决页面切换数据丢失问题
const TRAVEL_STORE_KEY = 'wanderai_travel_data';

class TravelStore {
  constructor() {
    this.data = this.loadData();
  }

  loadData() {
    try {
      const saved = localStorage.getItem(TRAVEL_STORE_KEY);
      return saved ? JSON.parse(saved) : this.getInitialData();
    } catch (e) {
      console.error('加载存储数据失败:', e);
      return this.getInitialData();
    }
  }

  getInitialData() {
    return {
      chatHistory: [
        { 
          role: 'assistant', 
          content: '🌍 **你好！我是 WanderAI**\n\n我是你的私人旅行规划师。告诉我你想去哪里，或者点击右下角的"定制攻略"开始一段新的旅程。' 
        }
      ],
      currentCity: null,
      mapCenter: [116.397428, 39.90923], // 默认北京
      mapZoom: 11,
      markers: [],
      searchHistory: [],
      travelStats: {
        generated_plans: 12,
        explored_cities: 8,
        total_distance: 3450,
        total_budget: 12000,
        popular_tags: ["美食探索", "自然风光", "历史人文"],
        recent_plans: [],
        budget_distribution: {
          住宿: 45,
          交通: 30,
          餐饮: 15,
          门票: 10
        },
        monthly_trend: [40, 65, 45, 80, 55, 90, 70]
      },
      userPreferences: {
        favoriteCities: [],
        travelStyle: '适中',
        budgetLevel: '中等',
        interests: []
      }
    };
  }

  save() {
    try {
      localStorage.setItem(TRAVEL_STORE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('保存数据失败:', e);
    }
  }

  // 聊天相关
  addMessage(role, content) {
    this.data.chatHistory.push({ role, content });
    this.save();
  }

  getMessages() {
    return this.data.chatHistory;
  }

  clearChat() {
    this.data.chatHistory = [
      { 
        role: 'assistant', 
        content: '🌍 **你好！我是 WanderAI**\n\n我是你的私人旅行规划师。告诉我你想去哪里，或者点击右下角的"定制攻略"开始一段新的旅程。' 
      }
    ];
    this.save();
  }

  // 地图相关
  updateMapCenter(lng, lat) {
    this.data.mapCenter = [lng, lat];
    this.save();
  }

  updateMapZoom(zoom) {
    this.data.mapZoom = zoom;
    this.save();
  }

  setCurrentCity(city) {
    this.data.currentCity = city;
    this.save();
  }

  getCurrentCity() {
    return this.data.currentCity;
  }

  addMarker(marker) {
    this.data.markers.push(marker);
    this.save();
  }

  clearMarkers() {
    this.data.markers = [];
    this.save();
  }

  getMarkers() {
    return this.data.markers;
  }

  // 搜索相关
  addSearch(query, results) {
    const searchEntry = {
      query,
      results,
      timestamp: new Date().toISOString()
    };
    this.data.searchHistory.unshift(searchEntry);
    // 只保留最近10条搜索记录
    if (this.data.searchHistory.length > 10) {
      this.data.searchHistory = this.data.searchHistory.slice(0, 10);
    }
    this.save();
  }

  getSearchHistory() {
    return this.data.searchHistory;
  }

  // 统计数据相关
  updateStats(newPlan) {
    // 更新生成行程数量
    this.data.travelStats.generated_plans += 1;
    
    // 如果目的地是新城市，增加探索城市数
    if (!this.data.userPreferences.favoriteCities.includes(newPlan.destination)) {
      this.data.userPreferences.favoriteCities.push(newPlan.destination);
      this.data.travelStats.explored_cities += 1;
    }
    
    // 更新热门标签
    newPlan.tags.forEach(tag => {
      if (!this.data.travelStats.popular_tags.includes(tag)) {
        this.data.travelStats.popular_tags.push(tag);
      }
    });
    
    // 保留前5个热门标签
    this.data.travelStats.popular_tags = this.data.travelStats.popular_tags.slice(0, 5);
    
    // 添加最近行程
    const recentPlan = {
      id: Date.now(),
      name: `${newPlan.destination}之旅`,
      date: new Date().toISOString().split('T')[0],
      duration: `${newPlan.days}天`,
      budget: Math.floor(Math.random() * 3000) + 2000
    };
    
    this.data.travelStats.recent_plans.unshift(recentPlan);
    // 只保留最近5条
    if (this.data.travelStats.recent_plans.length > 5) {
      this.data.travelStats.recent_plans = this.data.travelStats.recent_plans.slice(0, 5);
    }
    
    // 更新总预算和里程
    this.data.travelStats.total_budget += recentPlan.budget;
    this.data.travelStats.total_distance += Math.floor(Math.random() * 1000) + 500;
    
    this.save();
  }

  getStats() {
    return this.data.travelStats;
  }

  // 用户偏好
  updatePreferences(prefs) {
    this.data.userPreferences = { ...this.data.userPreferences, ...prefs };
    this.save();
  }

  getPreferences() {
    return this.data.userPreferences;
  }
}

// 创建单例实例
const travelStore = new TravelStore();

export default travelStore;
