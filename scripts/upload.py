import sys,json,io,pathlib
from PIL import Image,ImageOps,ImageCms
root=pathlib.Path(__file__).resolve().parent.parent
key=sys.argv[1]
raw=sys.stdin.buffer.read()
Image.MAX_IMAGE_PIXELS=45000000
im=ImageOps.exif_transpose(Image.open(io.BytesIO(raw)))
source_profile=im.info.get('icc_profile')
srgb=ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB'))
if source_profile:
 im=ImageCms.profileToProfile(im,ImageCms.ImageCmsProfile(io.BytesIO(source_profile)),srgb,outputMode='RGB')
else:
 im=im.convert('RGB')
if im.width<200 or im.height<200: raise ValueError('Use a photograph at least 200 pixels wide and high')
variants=[]
for width in sorted(set(min(w,im.width) for w in (480,960,1600))):
 out=im.resize((width,round(im.height*width/im.width)),Image.Resampling.LANCZOS)
 out.save(root/'content'/'images'/f'{key}-{width}.webp','WEBP',quality=88,method=6,icc_profile=srgb.tobytes())
 variants.append({'src':f'/images/{key}-{width}.webp','width':width})
print(json.dumps({'width':im.width,'height':im.height,'variants':variants,'src':variants[-1]['src']}))
