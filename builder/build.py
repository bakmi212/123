import shutil
import os

DIST = "dist"

os.makedirs(DIST, exist_ok=True)

print("Building...")

# sementara simulasi build
with open(os.path.join(DIST, "app.exe"), "w") as f:
    f.write("Dummy EXE")

shutil.make_archive(
    os.path.join(DIST, "app"),
    "zip",
    DIST
)

print("Build selesai.")