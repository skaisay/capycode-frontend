# CodeVibe - AI-Powered Mobile App Generator

🚀 Build production-ready mobile apps in minutes using natural language prompts. CodeVibe leverages AI to generate React Native + TypeScript code, with live preview and one-click deployment to App Store and Google Play.

## ✨ Features

- **🤖 AI Code Generation** - Describe your app in natural language, get production-ready React Native code
- **👁️ Live Preview** - See your app in real-time with react-native-web and Expo Snack integration
- **📱 Cloud Builds** - Build iOS and Android apps in the cloud using EAS Build
- **🏪 Store Deployment** - One-click submission to App Store and Google Play
- **🎨 Browser IDE** - Full-featured code editor with Monaco, file tree, and AI assistant

## 🏗️ Architecture

```
codevibe.BETA/
├── backend/                 # Hono API Server
│   ├── src/
│   │   ├── index.ts        # Main server entry
│   │   ├── lib/            # Supabase, OpenAI clients
│   │   ├── middleware/     # Auth middleware
│   │   ├── modules/
│   │   │   ├── generator/  # AI code generation
│   │   │   ├── preview/    # Snack SDK + web preview
│   │   │   ├── build/      # EAS Build integration
│   │   │   ├── store/      # App Store + Google Play
│   │   │   ├── project/    # Project CRUD
│   │   │   └── webhooks/   # EAS webhooks
│   │   ├── types/          # TypeScript types
│   │   └── websocket/      # Real-time updates
│   └── package.json
│
├── frontend/               # Next.js 14 App
│   ├── src/
│   │   ├── app/           # App Router pages
│   │   ├── components/    # React components
│   │   │   ├── ide/       # IDE components
│   │   │   └── ui/        # UI primitives
│   │   ├── hooks/         # Custom hooks
│   │   ├── lib/           # API client, utils
│   │   └── stores/        # Zustand stores
│   └── package.json
│
└── package.json            # Root monorepo config
```

## 🛠️ Tech Stack

### Backend
- **Hono** - Lightweight, fast web framework
- **TypeScript** - Type-safe codebase
- **Supabase** - Auth, PostgreSQL database, Row-Level Security
- **OpenAI GPT-4** - AI code generation
- **EAS Build API** - Cloud mobile app builds
- **App Store Connect API** - iOS app submission
- **Google Play Developer API** - Android app submission

### Frontend
- **Next.js 14** - React framework with App Router
- **Monaco Editor** - VS Code editor in the browser
- **TanStack Query** - Data fetching and caching
- **Zustand** - State management
- **Tailwind CSS** - Utility-first styling

### Preview
- **Expo Snack SDK** - Run on physical devices
- **react-native-web** - Browser preview

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm, npm, or yarn
- Supabase account
- OpenAI API key
- Expo account (for builds)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/codevibe.git
cd codevibe
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**

Backend:
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your credentials
```

Frontend:
```bash
cp frontend/.env.example frontend/.env.local
# Edit frontend/.env.local with your credentials
```

4. **Set up Supabase**

Create a new Supabase project and run the migrations:

```sql
-- Create projects table
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  files JSONB DEFAULT '[]',
  expo_config JSONB DEFAULT '{}',
  dependencies JSONB DEFAULT '{}',
  dev_dependencies JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create builds table
CREATE TABLE builds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  profile TEXT NOT NULL,
  status TEXT DEFAULT 'queued',
  eas_build_id TEXT,
  artifact_url TEXT,
  logs_url TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Create store_submissions table
CREATE TABLE store_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  store TEXT NOT NULL,
  build_id UUID REFERENCES builds(id),
  status TEXT DEFAULT 'pending',
  version TEXT,
  metadata JSONB DEFAULT '{}',
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT
);

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE builds ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_submissions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);

-- Similar policies for builds and store_submissions...
```

5. **Start development servers**

```bash
# Start both backend and frontend
npm run dev

# Or separately:
cd backend && npm run dev
cd frontend && npm run dev
```

6. **Open in browser**

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## 📖 Usage

### Creating a New App

1. Sign in or create an account
2. Click "New Project" or type a prompt on the landing page
3. Describe your app in natural language:
   ```
   "Build a fitness tracking app with workout logging, 
   progress charts, and social sharing features"
   ```
4. Watch as AI generates your React Native codebase
5. Edit code in the browser IDE
6. Preview on web or scan QR code for Expo Go

### Building for Production

1. Open your project in the IDE
2. Click the "Build" tab
3. Select platform (iOS, Android, or both)
4. Choose build profile:
   - **Development** - Debug build with dev tools
   - **Preview** - Internal testing build
   - **Production** - Store-ready build
5. Click "Start Build"
6. Monitor progress in real-time

### Publishing to App Stores

1. Complete a production build
2. Go to the "Store" tab
3. Configure App Store Connect or Google Play credentials
4. Fill in app metadata (description, screenshots, etc.)
5. Click "Submit for Review"
6. Track submission status

## 🔧 Configuration

### Backend Environment Variables

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key |
| `OPENAI_API_KEY` | OpenAI API key for GPT-4 |
| `EXPO_ACCESS_TOKEN` | Expo account token for EAS |
| `APP_STORE_KEY_ID` | App Store Connect API Key ID |
| `APP_STORE_ISSUER_ID` | App Store Connect Issuer ID |
| `APP_STORE_PRIVATE_KEY` | App Store Connect private key |
| `GOOGLE_PLAY_SERVICE_ACCOUNT` | Google Play service account JSON |

### Frontend Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `NEXT_PUBLIC_API_URL` | Backend API URL |
| `NEXT_PUBLIC_WS_URL` | WebSocket server URL |

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Expo](https://expo.dev) for the amazing mobile development platform
- [OpenAI](https://openai.com) for GPT-4
- [Supabase](https://supabase.com) for the backend infrastructure
- [Vercel](https://vercel.com) for Next.js and hosting
