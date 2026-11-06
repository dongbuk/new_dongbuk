"""Join supplied LOD1 geometry/materials with supplied animation channels by node name."""
import json,struct,pathlib,sys,copy,hashlib
source=pathlib.Path(sys.argv[1]);output=pathlib.Path('public/animals');report=[]
def read(p):
 b=p.read_bytes();n=struct.unpack_from('<I',b,12)[0];return json.loads(b[20:20+n]),b[28+n:]
def write(p,j,b):
 while len(b)%4:b+=b'\0'
 j['buffers']=[{'byteLength':len(b)}];s=json.dumps(j,separators=(',',':')).encode();s+=b' '*((-len(s))%4)
 p.write_bytes(struct.pack('<III',0x46546c67,2,28+len(s)+len(b))+struct.pack('<II',len(s),0x4e4f534a)+s+struct.pack('<II',len(b),0x004e4942)+b)
for name in ['Colobus','Gecko','Herring','Inkfish','Muskrat','Pudu','Sparrow','Taipan']:
 base,raw=read(source/f'{name}_LOD1.glb');anim,araw=read(source/'Animations'/f'{name}_Animations.glb');raw=bytearray(raw[:base['buffers'][0]['byteLength']]);nodes={n['name']:i for i,n in enumerate(base['nodes']) if 'name' in n};accessors={};views={}
 def accessor(index):
  if index in accessors:return accessors[index]
  a=copy.deepcopy(anim['accessors'][index]);v=a['bufferView']
  if v not in views:
   view=copy.deepcopy(anim['bufferViews'][v]);start=view.get('byteOffset',0);data=araw[start:start+view['byteLength']]
   while len(raw)%4:raw.append(0)
   view['byteOffset']=len(raw);view['buffer']=0;raw.extend(data);views[v]=len(base['bufferViews']);base['bufferViews'].append(view)
  a['bufferView']=views[v];accessors[index]=len(base['accessors']);base['accessors'].append(a);return accessors[index]
 base['animations']=[]
 for original in anim['animations']:
  a=copy.deepcopy(original);a['name']={'Idle_A':'idle','Idle_B':'idle_alt','Idle_C':'idle_extra','Clicked':'call'}.get(a['name'],a['name'].lower())
  for s in a['samplers']:s['input']=accessor(s['input']);s['output']=accessor(s['output'])
  for c in a['channels']:c['target']['node']=nodes[anim['nodes'][c['target']['node']]['name']]
  base['animations'].append(a)
 target=output/(name.lower()+'.glb');write(target,base,raw)
 report.append({'id':name.lower(),'bytes':target.stat().st_size,'triangles':sum(base['accessors'][p['indices']]['count']//3 for m in base['meshes'] for p in m['primitives']),'sourceSHA256':hashlib.sha256((source/f'{name}_LOD1.glb').read_bytes()).hexdigest(),'animations':[a['name'] for a in base['animations']]})
(output/'quirky-manifest.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
