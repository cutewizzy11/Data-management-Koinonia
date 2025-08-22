# Standalone Windows Executable

This project has been packaged as a standalone Windows executable for easy distribution and deployment.

## How to Use the Standalone Executable

1. **Get the executable folder**: The `dist-exe` folder contains:
   - `standalone.exe` - The main application executable
   - `dist/` - The built web application assets (required)

2. **Run the application**:
   - Simply double-click `standalone.exe` or run it from the command line
   - The app will automatically:
     - Find an available port (8080, 8081, 3000, or 5173)
     - Start a local web server
     - Open your default browser to the application

3. **Distribution**:
   - Copy the entire `dist-exe` folder to share or deploy
   - Both `standalone.exe` and the `dist/` folder must stay together
   - No Node.js or npm installation required on the target machine

## Development Commands

To rebuild the standalone executable:

```bash
# Install dependencies (if not already done)
npm install

# Build and package the executable
npm run pack:exe
```

This will:
1. Build the React application (`npm run build`)
2. Package the Node.js server into a Windows executable using `pkg`
3. Copy the built assets next to the executable

## Technical Details

- **Server**: Node.js HTTP server using `serve-handler`
- **Packaging**: Uses `pkg` to create a single executable
- **Platform**: Windows x64 (Node.js 18)
- **Port detection**: Automatically finds available ports
- **Browser launch**: Opens default browser automatically
- **Assets**: Static files served from the `dist/` folder

## Troubleshooting

- **Port conflicts**: The app will try multiple ports automatically
- **Missing assets**: Ensure the `dist/` folder is next to `standalone.exe`
- **Browser doesn't open**: Manually navigate to the URL shown in the console
- **Firewall warnings**: Windows may ask for network access permission

The standalone executable provides a complete, portable version of the Applicant Connect application that can run on any Windows machine without requiring Node.js or other dependencies.