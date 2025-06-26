# Build RocketryBox Frontend Docker Image
# Usage: .\build-docker.ps1 [tag]

param(
  [string]$Tag = "rocketrybox-frontend:latest"
)

Write-Host "🐳 Building RocketryBox Frontend Docker Image..." -ForegroundColor Green
Write-Host "Tag: $Tag" -ForegroundColor Yellow

# Check if we're in the frontend directory
if (-not (Test-Path "package.json")) {
  Write-Host "❌ Error: package.json not found! Are you in the frontend directory?" -ForegroundColor Red
  Write-Host "Please run this script from the frontend directory: cd frontend && .\build-docker.ps1" -ForegroundColor Yellow
  exit 1
}

# Check if Dockerfile exists
if (-not (Test-Path "Dockerfile")) {
  Write-Host "❌ Error: Dockerfile not found in frontend directory!" -ForegroundColor Red
  exit 1
}

# Build the Docker image
Write-Host "🔨 Building Docker image..." -ForegroundColor Blue
docker build -t $Tag .

if ($LASTEXITCODE -eq 0) {
  Write-Host "✅ Frontend Docker image built successfully!" -ForegroundColor Green
  Write-Host "Image: $Tag" -ForegroundColor Yellow

  # Show image details
  Write-Host "`n📊 Image Details:" -ForegroundColor Cyan
  docker images $Tag

  Write-Host "`n🚀 To run the container:" -ForegroundColor Cyan
  Write-Host "docker run -d --name rocketrybox-frontend -p 3000:80 $Tag" -ForegroundColor White

  Write-Host "`n📝 Frontend will be available at:" -ForegroundColor Yellow
  Write-Host "http://localhost:3000" -ForegroundColor White

  Write-Host "`n🌐 Make sure your backend is running and accessible for the frontend to work properly." -ForegroundColor Cyan
}
else {
  Write-Host "❌ Failed to build Docker image!" -ForegroundColor Red
  exit 1
}
