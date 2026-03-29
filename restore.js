const fs = require('fs');
const cp = require('child_process');
try {
  const out = cp.execSync('git show HEAD:frontend/src/components/Dashboard.tsx');
  fs.writeFileSync('D:/Projects/RoadFireWall/dashboard_old.txt', out);
} catch (e) {
  fs.writeFileSync('D:/Projects/RoadFireWall/dashboard_old.txt', String(e));
}
