@echo off
echo Running Deployment Script...
git init
git add .
git commit -m "Deploy: Tactical S-Rank Dashboard with Sync Fix"
git branch -M main
git remote add origin https://github.com/HyperPenetrator/RoadBlock
git push -u origin main --force
echo Done.
