@echo off
echo Removing old git history...
if exist .git rmdir /S /Q .git

echo Initializing fresh repo...
git init

echo Adding all files...
git add --all

echo Committing...
git commit -m "Fix CI/CD permissions, add ignore files, and stabilize build pipeline"

echo Setting branch to main...
git branch -M main

echo Adding remote...
git remote add origin https://github.com/HyperPenetrator/RoadBlock

echo Pushing to GitHub...
git push -u origin main --force

echo DONE!
pause
