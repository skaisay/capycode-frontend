export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: 'e-commerce' | 'social' | 'productivity' | 'utility' | 'media' | 'finance';
  features: string[];
  preview: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

const templates: ProjectTemplate[] = [
  {
    id: 'ecommerce-basic',
    name: 'E-Commerce Store',
    description: 'A complete mobile store with product catalog, cart, and checkout',
    category: 'e-commerce',
    features: ['product-list', 'product-detail', 'cart', 'checkout', 'user-auth', 'order-history'],
    preview: '/templates/ecommerce.png',
    difficulty: 'intermediate',
  },
  {
    id: 'social-feed',
    name: 'Social Feed App',
    description: 'Social media app with posts, likes, comments, and user profiles',
    category: 'social',
    features: ['feed', 'posts', 'likes', 'comments', 'profiles', 'follow-system', 'notifications'],
    preview: '/templates/social.png',
    difficulty: 'advanced',
  },
  {
    id: 'todo-app',
    name: 'Task Manager',
    description: 'Simple but powerful todo app with categories and reminders',
    category: 'productivity',
    features: ['task-list', 'categories', 'due-dates', 'reminders', 'offline-sync'],
    preview: '/templates/todo.png',
    difficulty: 'beginner',
  },
  {
    id: 'fitness-tracker',
    name: 'Fitness Tracker',
    description: 'Track workouts, calories, and fitness goals with charts',
    category: 'utility',
    features: ['workout-logging', 'calorie-tracker', 'goal-setting', 'progress-charts', 'reminders'],
    preview: '/templates/fitness.png',
    difficulty: 'intermediate',
  },
  {
    id: 'media-player',
    name: 'Podcast Player',
    description: 'Podcast and audio player with playlists and subscriptions',
    category: 'media',
    features: ['audio-player', 'playlists', 'subscriptions', 'downloads', 'background-playback'],
    preview: '/templates/podcast.png',
    difficulty: 'advanced',
  },
  {
    id: 'expense-tracker',
    name: 'Expense Tracker',
    description: 'Track expenses and income with budgets and reports',
    category: 'finance',
    features: ['transactions', 'categories', 'budgets', 'reports', 'charts', 'export'],
    preview: '/templates/expense.png',
    difficulty: 'intermediate',
  },
  {
    id: 'recipe-app',
    name: 'Recipe Book',
    description: 'Browse recipes, save favorites, and create shopping lists',
    category: 'utility',
    features: ['recipe-list', 'recipe-detail', 'favorites', 'shopping-list', 'meal-planner'],
    preview: '/templates/recipe.png',
    difficulty: 'beginner',
  },
  {
    id: 'chat-app',
    name: 'Chat Application',
    description: 'Real-time messaging with rooms and direct messages',
    category: 'social',
    features: ['real-time-chat', 'chat-rooms', 'direct-messages', 'media-sharing', 'read-receipts'],
    preview: '/templates/chat.png',
    difficulty: 'advanced',
  },
  {
    id: 'weather-app',
    name: 'Weather Dashboard',
    description: 'Beautiful weather app with forecasts and location-based updates',
    category: 'utility',
    features: ['current-weather', 'forecast', 'locations', 'widgets', 'notifications'],
    preview: '/templates/weather.png',
    difficulty: 'beginner',
  },
  {
    id: 'booking-app',
    name: 'Booking System',
    description: 'Appointment booking with calendar and reminders',
    category: 'productivity',
    features: ['calendar', 'booking-slots', 'confirmations', 'reminders', 'user-profiles'],
    preview: '/templates/booking.png',
    difficulty: 'intermediate',
  },
];

export class ProjectTemplates {
  static getAll(): ProjectTemplate[] {
    return templates;
  }

  static getById(id: string): ProjectTemplate | undefined {
    return templates.find(t => t.id === id);
  }

  static getByCategory(category: ProjectTemplate['category']): ProjectTemplate[] {
    return templates.filter(t => t.category === category);
  }

  static getByDifficulty(difficulty: ProjectTemplate['difficulty']): ProjectTemplate[] {
    return templates.filter(t => t.difficulty === difficulty);
  }

  static search(query: string): ProjectTemplate[] {
    const lower = query.toLowerCase();
    return templates.filter(t => 
      t.name.toLowerCase().includes(lower) ||
      t.description.toLowerCase().includes(lower) ||
      t.features.some(f => f.toLowerCase().includes(lower))
    );
  }
}
