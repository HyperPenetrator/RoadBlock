@echo off
cd frontend
npm test -- --run > ..\test_results.txt 2>&1
echo Done > ..\test_done.txt
