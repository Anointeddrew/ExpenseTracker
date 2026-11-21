# Daily Expense Tracker

A simple React Native / Expo expense tracker. It does not require registration, login, Firebase, or an internet connection. Expenses are stored locally on the device using AsyncStorage.

## Features
- Add expenses with amount, category, date, and optional description
- Today's total and transaction count
- Current-month spending total and category breakdown
- Full expense history with search
- Tap an expense to edit; press and hold to delete
- Currency displayed in Nigerian naira (₦)

## Run the app
1. Install Node.js and a package manager (npm).
2. Extract this folder and open it in VS Code.
3. In the project folder, run:

   npm install
   npx expo start

4. Scan the QR code with Expo Go, or run `npx expo run:android` after configuring Android development tools.

## Notes
- Data stays on the device where it was entered. It is not synced or backed up to an account.
- The date field accepts YYYY-MM-DD.
- To change the Android application ID, edit `android.package` in app.json before building.
