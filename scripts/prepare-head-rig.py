"""Prepare the original portrait and its mesh. No image generation or video.
Usage: python prepare-head-rig.py SOURCE_IMAGE OUTPUT_DIRECTORY MODEL_PATH
"""
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.spatial import Delaunay
import mediapipe as mp
source, output, model = map(Path,sys.argv[1:])
output.mkdir(parents=True,exist_ok=True)
original=Image.open(source).convert('RGB')
options=mp.tasks.vision.FaceLandmarkerOptions(base_options=mp.tasks.BaseOptions(model_asset_path=str(model)),num_faces=1)
with mp.tasks.vision.FaceLandmarker.create_from_options(options) as detector:
 result=detector.detect(mp.Image(image_format=mp.ImageFormat.SRGB,data=np.asarray(original)))
 if not result.face_landmarks:raise RuntimeError('No face landmarks')
 points=np.array([[p.x,p.y] for p in result.face_landmarks[0]])
hull=Delaunay(points[:468])
grid=np.array([[x,y] for y in np.linspace(0,1,64) for x in np.linspace(0,1,52)])
grid=grid[hull.find_simplex(grid)<0]
points=np.concatenate((points,grid))
triangles=Delaunay(points).simplices.flatten().tolist()
original.thumbnail((800,1000),Image.Resampling.LANCZOS)
asset=output/'center.webp';original.save(str(asset)+'.tmp','WEBP',quality=90,method=6);Path(str(asset)+'.tmp').replace(asset)
(output.parent/'rig-data.json').write_text(json.dumps({'source':source.name,'file':'assets/center.webp','points':np.round(points,6).tolist(),'triangles':triangles,'aspect':.8},separators=(',',':')))
print(len(points),'vertices;',asset.stat().st_size,'bytes')
