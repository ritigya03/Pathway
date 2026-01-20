# SentinelChain Frontend

AI-Powered Supply Chain Compliance & Threat Intelligence Platform

## Project Overview

SentinelChain is a comprehensive supply chain security platform that provides:

- Supplier legitimacy verification
- Contract & compliance analysis
- Geopolitical risk detection
- Reputational threat alerts

## Technologies Used

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Recharts for data visualization

## Development Setup

### Prerequisites

- Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

### Getting Started

```sh
# Step 1: Clone the repository
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory
cd frontend

# Step 3: Install dependencies
npm install

# Step 4: Start the development server
npm run dev
```

The application will be available at `http://localhost:8080`

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run build:dev` - Build in development mode
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
frontend/
├── src/
│   ├── assets/        # Images and static files
│   ├── components/    # Reusable UI components
│   ├── hooks/         # Custom React hooks
│   ├── pages/         # Page components
│   └── main.tsx       # Application entry point
├── public/            # Public static assets
└── index.html         # HTML template
```

## Deployment

Build the project for production:

```sh
npm run build
```

The built files will be in the `dist` directory, ready for deployment to any static hosting service.
