import subprocess
import os

repo_dir = r"d:\Projects\RoadFireWall"
output_file = r"d:\Projects\RoadFireWall\temp.txt"

# Force powershell or run process directly
try:
    proc = subprocess.run(["git", "show", "HEAD:frontend/src/components/Dashboard.tsx"], cwd=repo_dir, capture_output=True, text=True, check=True)
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(proc.stdout)
except Exception as e:
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(str(e))
