import zipfile
import os
import hashlib
import shutil

pack_dir = "modpacks/resourcepacks"
os.makedirs(pack_dir, exist_ok=True)
os.makedirs("server/resourcepacks", exist_ok=True)

zip_path = os.path.join(pack_dir, "ThirdWorld-Assets.zip")
server_zip_path = os.path.join("server/resourcepacks", "ThirdWorld-Assets.zip")

mcmeta = """{
  "pack": {
    "pack_format": 34,
    "description": "Third World - Devises et Ressources Strategiques"
  }
}"""

src_assets = "kubejs/assets/kubejs"

with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("pack.mcmeta", mcmeta)
    
    # Add textures
    tex_dir = os.path.join(src_assets, "textures/item")
    if os.path.exists(tex_dir):
        for f in os.listdir(tex_dir):
            if f.endswith(".png"):
                z.write(os.path.join(tex_dir, f), f"assets/kubejs/textures/item/{f}")
                
    # Add models
    mod_dir = os.path.join(src_assets, "models/item")
    if os.path.exists(mod_dir):
        for f in os.listdir(mod_dir):
            if f.endswith(".json"):
                z.write(os.path.join(mod_dir, f), f"assets/kubejs/models/item/{f}")

shutil.copyfile(zip_path, server_zip_path)

with open(zip_path, "rb") as f:
    sha1 = hashlib.sha1(f.read()).hexdigest()

print(f"Resource pack created: {zip_path}")
print(f"SHA-1: {sha1}")
with open("modpacks/resourcepacks/sha1.txt", "w") as f:
    f.write(sha1)
