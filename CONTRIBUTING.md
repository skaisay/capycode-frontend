# CodeVibe - Contributing Guide

Thank you for your interest in contributing to CodeVibe! This document provides guidelines and instructions for contributing.

## 🌟 Ways to Contribute

- **Bug Reports**: Found a bug? Open an issue with a detailed description
- **Feature Requests**: Have an idea? We'd love to hear it
- **Code Contributions**: Submit pull requests for bug fixes or features
- **Documentation**: Help improve our docs
- **Testing**: Help test new features and report issues

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Git

### Development Setup

1. **Fork the repository** on GitHub

2. **Clone your fork**
```bash
git clone https://github.com/YOUR_USERNAME/codevibe.git
cd codevibe
```

3. **Add upstream remote**
```bash
git remote add upstream https://github.com/original/codevibe.git
```

4. **Install dependencies**
```bash
npm install
```

5. **Set up environment variables**
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

6. **Start development servers**
```bash
npm run dev
```

## 📋 Development Workflow

### Creating a Branch

```bash
# Sync with upstream
git fetch upstream
git checkout main
git merge upstream/main

# Create feature branch
git checkout -b feature/your-feature-name
```

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Adding tests

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Tests
- `chore`: Maintenance

Examples:
```
feat(generator): add template support for e-commerce apps
fix(preview): resolve QR code display issue on mobile
docs(readme): update installation instructions
```

### Submitting a Pull Request

1. **Push your branch**
```bash
git push origin feature/your-feature-name
```

2. **Open a Pull Request** on GitHub

3. **Fill out the PR template** with:
   - Description of changes
   - Related issue numbers
   - Screenshots (if UI changes)
   - Testing steps

4. **Wait for review** and address feedback

## 🏗️ Project Structure

```
codevibe/
├── backend/           # Hono API server
│   ├── src/
│   │   ├── modules/   # Feature modules
│   │   ├── lib/       # Shared libraries
│   │   └── types/     # TypeScript types
│   └── package.json
├── frontend/          # Next.js app
│   ├── src/
│   │   ├── app/       # Pages (App Router)
│   │   ├── components/# React components
│   │   ├── hooks/     # Custom hooks
│   │   ├── stores/    # State management
│   │   └── lib/       # Utilities
│   └── package.json
└── supabase/          # Database migrations
```

## 🧪 Testing

### Running Tests

```bash
# All tests
npm test

# Backend only
cd backend && npm test

# Frontend only
cd frontend && npm test
```

### Writing Tests

- Place tests next to the code they test
- Use descriptive test names
- Cover edge cases
- Mock external services

## 📝 Code Style

### TypeScript

- Use strict mode
- Prefer interfaces over types for object shapes
- Use explicit return types for functions
- Avoid `any` - use `unknown` if needed

### React

- Use functional components with hooks
- Keep components small and focused
- Use proper prop types
- Extract reusable logic into hooks

### Naming Conventions

- **Files**: kebab-case (`user-profile.tsx`)
- **Components**: PascalCase (`UserProfile`)
- **Functions**: camelCase (`getUserProfile`)
- **Constants**: SCREAMING_SNAKE_CASE (`API_BASE_URL`)
- **Types/Interfaces**: PascalCase (`UserProfile`)

## 🔒 Security

- Never commit secrets or API keys
- Use environment variables for configuration
- Validate all user inputs
- Follow OWASP security guidelines

## 📚 Documentation

When adding features, update:
- README.md if adding new setup steps
- Code comments for complex logic
- JSDoc for public APIs
- CHANGELOG.md for notable changes

## ❓ Questions?

- Open a [Discussion](https://github.com/original/codevibe/discussions)
- Join our [Discord](https://discord.gg/codevibe)
- Email: support@codevibe.dev

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.
