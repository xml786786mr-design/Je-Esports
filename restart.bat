@echo off
echo Cleaning Next.js cache...
if exist .next rmdir /s /q .next
if exist node_modules\.cache rmdir /s /q node_modules\.cache
echo Cache cleaned! 
echo.
echo Restarting development server...
echo.
npm run dev
