# 🐳 Frontend Docker Setup

Build and run the RocketryBox Frontend as a Docker container.

## 🚀 Quick Start

### 1. Build the Docker image

```powershell
.\build-docker.ps1
```

### 2. Run the container

```powershell
.\run-docker.ps1
```

## 🔧 Manual Commands

```powershell
# Build
docker build -t rocketrybox-frontend:latest .

# Run
docker run -d --name rocketrybox-frontend -p 3000:80 rocketrybox-frontend:latest
```

## 🌐 Access Points

- **Frontend**: http://localhost:3000

## 📝 Available Scripts

- `build-docker.ps1` - Build the Docker image
- `run-docker.ps1` - Run the Docker container

## ⚠️ Important Notes

- Make sure your **backend is running** for the frontend to work properly
- The backend should be accessible at the configured API endpoint
- Frontend is served by nginx on port 80 inside the container

## 🔍 Troubleshooting

```powershell
# Check container status
docker ps -f "name=rocketrybox-frontend"

# View logs
docker logs -f rocketrybox-frontend

# Stop container
docker stop rocketrybox-frontend

# Remove container
docker rm rocketrybox-frontend
```

## 🏗️ Build Process

The Dockerfile uses a multi-stage build:

1. **Build Stage**: Installs dependencies and builds the React/Vite app
2. **Production Stage**: Serves static files with nginx

This results in a smaller, production-optimized image.
