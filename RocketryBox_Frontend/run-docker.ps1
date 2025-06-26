# Run RocketryBox Frontend Docker Container
# Usage: .\run-docker.ps1 [options]

param(
  [string]$ImageTag = "rocketrybox-frontend:latest",
  [string]$ContainerName = "rocketrybox-frontend",
  [string]$Port = "3000",
  [switch]$Detached = $true,
  [switch]$RemoveExisting = $false
)

Write-Host "🚀 Running RocketryBox Frontend Container..." -ForegroundColor Green

# Check if image exists
$imageExists = docker images -q $ImageTag
if (-not $imageExists) {
  Write-Host "❌ Error: Docker image '$ImageTag' not found!" -ForegroundColor Red
  Write-Host "Please build the image first using: .\build-docker.ps1" -ForegroundColor Yellow
  exit 1
}

# Remove existing container if requested
if ($RemoveExisting) {
  Write-Host "🗑️ Removing existing container..." -ForegroundColor Yellow
  docker stop $ContainerName 2>$null
  docker rm $ContainerName 2>$null
}

# Check if container already exists
$containerExists = docker ps -a -q -f "name=$ContainerName"
if ($containerExists) {
  Write-Host "⚠️ Container '$ContainerName' already exists!" -ForegroundColor Yellow
  Write-Host "Use -RemoveExisting to remove it first, or choose a different name." -ForegroundColor Yellow
  exit 1
}

# Build the docker run command
$runArgs = @(
  "run"
  "--name", $ContainerName
  "-p", "${Port}:80"
  "--restart", "unless-stopped"
)

if ($Detached) {
  $runArgs += "-d"
}

$runArgs += $ImageTag

# Run the container
Write-Host "🔧 Starting container with the following configuration:" -ForegroundColor Blue
Write-Host "Image: $ImageTag" -ForegroundColor White
Write-Host "Container: $ContainerName" -ForegroundColor White
Write-Host "Port: $Port" -ForegroundColor White
Write-Host "Mode: $(if ($Detached) { 'Detached' } else { 'Interactive' })" -ForegroundColor White

docker @runArgs

if ($LASTEXITCODE -eq 0) {
  Write-Host "✅ Frontend container started successfully!" -ForegroundColor Green

  if ($Detached) {
    Write-Host "`n📊 Container Status:" -ForegroundColor Cyan
    docker ps -f "name=$ContainerName"

    Write-Host "`n🌐 Frontend available at:" -ForegroundColor Yellow
    Write-Host "http://localhost:$Port" -ForegroundColor White

    Write-Host "`n📝 Useful Commands:" -ForegroundColor Cyan
    Write-Host "View logs: docker logs -f $ContainerName" -ForegroundColor White
    Write-Host "Stop container: docker stop $ContainerName" -ForegroundColor White
    Write-Host "Remove container: docker rm $ContainerName" -ForegroundColor White

    Write-Host "`n⚠️ Make sure your backend is running for the frontend to work properly!" -ForegroundColor Yellow
  }
}
else {
  Write-Host "❌ Failed to start container!" -ForegroundColor Red
  exit 1
}
