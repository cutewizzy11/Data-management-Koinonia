# Applicant Connect - Installation Guide

This guide will help you install and set up the Applicant Connect dashboard on a new computer.

## System Requirements

- **Operating System**: Windows 10 or newer
- **Node.js**: Version 18 or higher
- **RAM**: Minimum 4GB (8GB recommended)
- **Storage**: At least 1GB free space

## Pre-Installation Steps

### 1. Install Node.js
1. Visit [https://nodejs.org/](https://nodejs.org/)
2. Download the **LTS version** (recommended)
3. Run the installer and follow the setup wizard
4. Restart your computer after installation

### 2. Verify Node.js Installation
1. Open Command Prompt (press `Win + R`, type `cmd`, press Enter)
2. Type `node --version` and press Enter
3. You should see a version number like `v18.x.x` or higher

## Installation Process

### Method 1: Automatic Installation (Recommended)
1. Copy the entire project folder to your desired location
2. Right-click on `install.bat` and select "Run as administrator"
3. Follow the on-screen instructions
4. The installer will:
   - Install all required dependencies
   - Download necessary images
   - Create a desktop shortcut
   - Test the installation

### Method 2: Manual Installation
1. Open Command Prompt in the project directory
2. Run: `npm install`
3. (No backend server required)
4. Run: `npm run download-images`
5. Double-click `install.bat` to create the desktop shortcut

## Using the Application

### Starting the Dashboard
- **Option 1**: Double-click the "Applicant Connect" shortcut on your desktop
- **Option 2**: Navigate to project folder and double-click `launch-applicant-connect.bat`
- **Option 3**: Open Command Prompt in project folder and run `npm run dev`

### First Launch
1. The application will start automatically
2. Wait for "Server ready" message
3. Your default browser will open to the dashboard
4. If browser doesn't open automatically, visit: `http://localhost:8080`

### Stopping the Application
- Close the browser tab
- In the Command Prompt window, press `Ctrl + C`
- Or simply close the Command Prompt window

## Available Features

- **Dashboard**: Overview of all applicant data
- **Applicants**: Detailed view of job applicants
- **Referees**: Reference contact information
- **Associates**: Associate partner details
- **Statistics**: Analytics and insights
- **CSV Data**: Import/export functionality

## Troubleshooting

### Common Issues

**Port Already in Use**
- The app will automatically try port 8081 if 8080 is busy
- Check for other running applications using the same ports

**Node.js Not Found**
- Ensure Node.js is properly installed
- Restart Command Prompt after Node.js installation
- Check that Node.js is in your system PATH

**Dependencies Failed to Install**
- Check your internet connection
- Try running as administrator
- Clear npm cache: `npm cache clean --force`

**Images Not Loading**
- Run `npm run download-images` to refresh images
- Check internet connection for Google Drive access

### Getting Help

1. Check the console output for error messages
2. Ensure all system requirements are met
3. Try restarting the application
4. Re-run the installer if needed

## File Structure

```
applicant-connect/
├── install.bat              # Main installer script
├── launch-applicant-connect.bat  # Desktop shortcut target
├── setup.bat               # Basic setup script
├── package.json            # Project dependencies
├── src/                    # Application source code
├── public/                 # Static assets
├── server/                 # Backend server
└── README.md              # Project documentation
```

## Development Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run server` - Start backend server only
- `npm run download-images` - Refresh images from source

## Data Management

The application uses:
- **Google Sheets API** for live data
- **Local mock data** as fallback
- **CSV export/import** functionality
- **Real-time updates** when connected

## Security Notes

- The application runs locally on your machine
- No data is transmitted to external servers (except Google Sheets API)
- All processing happens on your local computer
- Your data remains private and secure