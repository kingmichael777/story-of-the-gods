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
# A smaller mesh preserves the facial outline, lids and irises for Canvas 2D.
facial=[0,1,2,4,5,6,9,10,19,33,54,67,78,93,103,109,127,132,133,136,148,149,150,151,152,162,172,176,234,251,263,284,297,323,332,338,356,361,362,365,377,378,379,389,397,400,454]
facial += [246,161,160,159,158,157,173,7,163,144,145,153,154,155,466,388,387,386,385,384,398,249,390,373,374,380,381,382,*range(468,478)]
facial += [61,40,37,267,270,291,321,314,17,84,91,13,14,98,327,168,197,195,8,21,71,55,285,301]
small=set(facial)
for y in np.linspace(0,1,14):
 for x in np.linspace(0,1,12):
  if hull.find_simplex([[x,y]])[0]<0:small.add(int(np.argmin(np.sum((points-[x,y])**2,axis=1))))
small=sorted(small)
fallback=[[small[j] for j in tri] for tri in Delaunay(points[small]).simplices]
original.thumbnail((800,1000),Image.Resampling.LANCZOS)
asset=output/'center.webp';original.save(str(asset)+'.tmp','WEBP',quality=90,method=6);Path(str(asset)+'.tmp').replace(asset)
(output.parent/'rig-data.json').write_text(json.dumps({'source':source.name,'file':'assets/center.webp','points':np.round(points,6).tolist(),'triangles':triangles,'fallbackTriangles':np.array(fallback).flatten().tolist(),'aspect':.8},separators=(',',':')))
print(len(points),'vertices;',asset.stat().st_size,'bytes')
