import json
import requests

with open("config.json", "r") as f:
    cfg = json.load(f)

form = {
    "product_id": cfg["product_id"],
    "version": cfg["version"],
    "title": cfg["title"],
    "description": cfg["description"],
}

files = {
    "files": open(cfg["file"], "rb")
}

r = requests.post(
    cfg["api"],
    data=form,
    files=files,
)

print(r.status_code)
print(r.text)