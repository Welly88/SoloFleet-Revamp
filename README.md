# Coldspace Apps - React Native

Mobile application untuk monitoring chamber temperature secara real-time.

## Features

- ✅ Login Screen with credentials validation
- ✅ Real-time temperature monitoring
- ✅ Pull to refresh
- ✅ Auto refresh setiap 30 detik
- ✅ Search chambers by name, location
- ✅ Temperature status indicators (Below Min, Normal, Above Max)
- ✅ Dynamic temperature colors
- ✅ Temperature profile integration
- ✅ Logout functionality

## Installation

1. Install dependencies:
```bash
npm install
```

2. Install AsyncStorage:
```bash
npx expo install @react-native-async-storage/async-storage
```

3. Start the app:
```bash
npx expo start
```

## Running the App

- Press `a` for Android
- Press `i` for iOS
- Press `w` for Web

## Login Credentials

Gunakan username dan password SOLOFleet Anda.

**Contoh untuk testing:**
- Username: `coldspacestorage`
- Password: `cs2217`

API akan otomatis fetch semua chamber data yang terkait dengan akun tersebut.

## API Configuration

APIs yang digunakan:
- **Vehicle Data**: `https://www.solofleet.com/api/vehiclelivequeryvehiclejson`
- **Temperature Profile**: `https://internalwebapp.solofleet.com/TempProfile/GetProfile`

## Project Structure

```
ColdspaceApps/
├── App.js                      # Main app with auth navigation
├── src/
│   ├── api/
│   │   ├── auth.js            # Login & vehicle data API
│   │   └── tempprofile.js     # Temperature profile API
│   ├── screens/
│   │   ├── LoginScreen.js     # Login UI
│   │   └── HomeScreen.js      # Chamber list with monitoring
│   └── utils/
│       └── storage.js         # AsyncStorage helpers
├── package.json
├── app.json
└── babel.config.js
```

## How It Works

1. **Login**: User enters username & password
2. **API Call**: App validates credentials via SOLOFleet API
3. **Data Fetch**: Upon success, fetches chamber data
4. **Display**: Shows all chambers with real-time temperature
5. **Auto Refresh**: Updates data every 30 seconds
6. **Search**: Filter chambers by name or location

## Temperature Colors

- ≤ -20°C: Blue (#60A5FA)
- -20 to -10°C: Cyan (#22D3EE)
- -10 to 0°C: Teal (#2DD4BF)
- 0 to 10°C: Yellow (#FBBF24)
- > 10°C: Orange (#FB923C)

## Temperature Status

- **Below Min**: Temperature dibawah batas minimum profile
- **Normal**: Temperature dalam range yang ditentukan
- **Above Max**: Temperature diatas batas maximum profile

## Development

Built with:
- React Native
- Expo SDK 50
- AsyncStorage for session management
- Fetch API for network requests

## Notes

- Session persists until user logout
- Auto refresh interval: 30 seconds
- Pull to refresh manual update
- Search is real-time and case-insensitive
