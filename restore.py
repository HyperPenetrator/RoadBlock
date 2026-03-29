import subprocess
try:
    with open('d:/Projects/RoadFireWall/frontend/src/components/Dashboard.tsx', 'wb') as f:
        f.write(subprocess.check_output(['git', 'show', 'HEAD:frontend/src/components/Dashboard.tsx'], cwd='d:/Projects/RoadFireWall'))
    print('Restore successful')
except Exception as e:
    print('Error:', e)
