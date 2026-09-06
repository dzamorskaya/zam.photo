from PIL import Image, ImageOps
from pathlib import Path
import json
root=Path(__file__).resolve().parent.parent
out=root/'content'/'images';out.mkdir(exist_ok=True)
files=['p_car.jpg','p_gezno.jpg','p_elevator.jpg','p_fence.jpg','p_pool.jpg','p_mels.jpg','p_desert.jpg','p_hollywood.jpg','selin.jpg']
manifest={}
for f in files:
    im=ImageOps.exif_transpose(Image.open(root/f)).convert('RGB')
    key=Path(f).stem; variants=[]
    for w in [480,960,1600]:
        w=min(w,im.width)
        if any(v['width']==w for v in variants):continue
        copy=im.copy();copy.thumbnail((w,10000),Image.Resampling.LANCZOS)
        filename=f'{key}-{w}.webp';copy.save(out/filename,'WEBP',quality=88,method=6)
        variants.append({'src':'/images/'+filename,'width':copy.width})
    manifest[key]={'width':im.width,'height':im.height,'variants':variants,'src':variants[-1]['src']}
(root/'content'/'images.json').write_text(json.dumps(manifest,indent=2))
print('Optimized',len(manifest),'unique photographs into responsive WebP assets')
