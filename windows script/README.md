# Windows PowerShell Scripts - Medical Device Regulatory Assistant

## Overview

This folder contains optimized PowerShell scripts for developing the Medical Device Regulatory Assistant on Windows. The scripts have been unified and enhanced with Turbopack support, performance optimizations, and better error handling.

## Scripts

### 🚀 start-dev.ps1 (Main Script)

**Unified development startup script** that combines the best features from the original `start-dev.ps1` and `start-dev-optimized.ps1`.

**✨ Smart Path Resolution**: Can be run from multiple locations:
- The parent directory containing `medical-device-regulatory-assistant` folder
- The `medical-device-regulatory-assistant` directory itself  
- Any subdirectory (like `windows script`) of the parent directory

#### Key Features:
- **Turbopack enabled by default** for faster frontend builds
- **Performance timing** and optimization tips
- **Flexible configuration** with multiple startup modes
- **Health checks** and service monitoring
- **Automatic dependency installation**
- **Custom port configuration**

#### Usage Examples:
```powershell
# Standard startup with Turbopack (recommended)
.\start-dev.ps1

# Fast startup - skip health checks (saves 3-5 seconds)
.\start-dev.ps1 -Fast

# Detailed progress information
.\start-dev.ps1 -ShowProgress

# Backend service only
.\start-dev.ps1 -BackendOnly

# Frontend service only  
.\start-dev.ps1 -FrontendOnly

# Use Webpack instead of Turbopack (if needed)
.\start-dev.ps1 -UseWebpack

# Custom ports
.\start-dev.ps1 -BackendPort 8001 -FrontendPort 3001

# Show help
.\start-dev.ps1 -Help
```

#### Parameters:
- `-Fast` - Skip health checks for faster startup
- `-Parallel` - Start services in parallel (experimental)
- `-ShowProgress` - Show detailed progress and timing
- `-BackendOnly` - Start only the backend service
- `-FrontendOnly` - Start only the frontend service
- `-BackendPort N` - Custom backend port (default: 8000)
- `-FrontendPort N` - Custom frontend port (default: 3000)
- `-UseWebpack` - Use Webpack instead of Turbopack
- `-Help` - Show help information

### 🎨 start-frontend.ps1

**Frontend-only startup script** with Turbopack support.

#### Features:
- Turbopack enabled by default
- Webpack fallback option
- Custom port support
- Optimized environment variables
- **Smart path resolution** - works from multiple directories

#### Usage:
```powershell
# Start with Turbopack (default)
.\start-frontend.ps1

# Start with Webpack
.\start-frontend.ps1 -UseWebpack

# Custom port
.\start-frontend.ps1 -Port 3001

# Show detailed output
.\start-frontend.ps1 -ShowDetails
```

### 🔧 start-backend.ps1

**Backend-only startup script** with performance optimizations.

#### Features:
- Optimized environment variables
- Optional Redis service detection
- Custom port support
- Fast mode for development
- **Smart path resolution** - works from multiple directories

#### Usage:
```powershell
# Standard backend startup
.\start-backend.ps1

# Custom port
.\start-backend.ps1 -Port 8001

# Fast mode (skip optional service checks)
.\start-backend.ps1 -Fast

# Show detailed output
.\start-backend.ps1 -ShowDetails
```

### 🧪 test-scripts.ps1

**Testing script** to verify all scripts work correctly.

#### Features:
- Syntax validation for all scripts
- Help functionality testing
- Turbopack configuration verification
- Comprehensive test reporting
- **Smart path resolution** testing

#### Usage:
```powershell
.\test-scripts.ps1
```

## Turbopack Integration

### What is Turbopack?

Turbopack is Next.js's new bundler that provides:
- **10x faster** than Webpack for large applications
- **Near-instant** Hot Module Replacement (HMR)
- **Better memory usage** and caching
- **Improved developer experience**

### Configuration

Turbopack is configured in `package.json`:
```json
{
  "scripts": {
    "dev": "next dev --turbo",
    "dev:webpack": "next dev"
  }
}
```

### Usage

- **Default**: All scripts use Turbopack by default
- **Fallback**: Use `-UseWebpack` flag if you encounter Turbopack issues
- **Verification**: Run `test-scripts.ps1` to verify configuration

## Performance Optimizations

### Startup Time Improvements

| Mode | Typical Startup Time | Optimizations |
|------|---------------------|---------------|
| Standard | 8-12 seconds | Full health checks, dependency verification |
| Fast Mode | 4-6 seconds | Skip health checks, minimal validation |
| Service-Only | 2-4 seconds | Single service startup |

### Environment Variables

The scripts set optimized environment variables:

**Frontend:**
- `NODE_ENV=development`
- `NEXT_TELEMETRY_DISABLED=1` (faster startup)
- `NEXT_WEBPACK_USEPOLLING=false` (better performance)

**Backend:**
- `PYTHONPATH=.`
- `UVICORN_LOG_LEVEL=warning` (less noise)
- `SKIP_HEALTH_CHECKS=true` (in fast mode)

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```powershell
   .\start-dev.ps1 -BackendPort 8001 -FrontendPort 3001
   ```

2. **Prerequisites Missing**
   - Install pnpm: `npm install -g pnpm`
   - Install Poetry: https://python-poetry.org/docs/#installation

3. **Turbopack Issues**
   ```powershell
   .\start-dev.ps1 -UseWebpack
   ```

4. **Slow Startup**
   ```powershell
   .\start-dev.ps1 -Fast
   ```

### Verification

Run the test script to verify everything is working:
```powershell
.\test-scripts.ps1
```

## Migration from Old Scripts

### Changes Made

1. **Merged Scripts**: Combined `start-dev.ps1` and `start-dev-optimized.ps1` into a single unified script
2. **Removed**: `start-dev-optimized.ps1` (functionality merged into main script)
3. **Enhanced**: All scripts now have better error handling and performance optimizations
4. **Turbopack**: Enabled by default with Webpack fallback option
5. **Smart Path Resolution**: All scripts can now be run from multiple directory locations

### Backward Compatibility

All existing command patterns still work:
- `.\start-dev.ps1` - Standard startup
- `.\start-frontend.ps1` - Frontend only
- `.\start-backend.ps1` - Backend only

New features are opt-in via parameters.

## Development Workflow

### Recommended Usage

1. **Daily Development**: `.\start-dev.ps1`
2. **Quick Testing**: `.\start-dev.ps1 -Fast`
3. **Frontend Work**: `.\start-dev.ps1 -FrontendOnly`
4. **Backend Work**: `.\start-dev.ps1 -BackendOnly`
5. **Troubleshooting**: `.\start-dev.ps1 -UseWebpack -ShowProgress`

### Performance Tips

- Use `-Fast` flag for routine development (saves 3-5 seconds)
- Use service-specific scripts when working on single components
- Turbopack provides the best development experience
- Close unnecessary applications to free system resources

## Support

For issues or questions:
1. Run `.\test-scripts.ps1` to verify setup
2. Check the troubleshooting section above
3. Review the main project documentation
4. Use `-ShowProgress` flag for detailed diagnostics