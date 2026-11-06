"""Offline Blender conversion of uploaded FBX files; never changes game collision.
Run: blender -b -t 1 --python scripts/import-new-packs.py -- INPUT OUTPUT
INPUT contains extracted source/, cute-enemy-slime/, free_pack_stick_man_rigged/.
"""
import bpy, pathlib, sys, math, json, hashlib
from mathutils import Quaternion
src,out=map(pathlib.Path,sys.argv[sys.argv.index('--')+1:]);out.mkdir(parents=True,exist_ok=True)
report=[]
def load(path):
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.fbx(filepath=str(path));bpy.context.scene.render.fps=30

def export(id,path,kind):
 for m in bpy.data.materials:
  if m.use_nodes:
   for n in m.node_tree.nodes:
    if n.type=='BSDF_PRINCIPLED':n.inputs['Metallic'].default_value=0;n.inputs['Roughness'].default_value=.85
 for image in bpy.data.images:
  if image.size[0]>512 or image.size[1]>512:image.scale(512,512)
 for action in bpy.data.actions:
  for fc in action.fcurves:
   for key in fc.keyframe_points:key.interpolation='LINEAR'
 actor=next((o for o in bpy.context.scene.objects if o.type=='ARMATURE'),None)
 if actor is None:actor=next(o for o in bpy.context.scene.objects if o.type=='MESH')
 actor.animation_data_create();actor.animation_data.action=None
 for track in list(actor.animation_data.nla_tracks):actor.animation_data.nla_tracks.remove(track)
 for action in list(bpy.data.actions):
  action.use_fake_user=True;track=actor.animation_data.nla_tracks.new();track.name=action.name;track.strips.new(action.name,int(action.frame_range[0]),action)
 target=out/(id+'.glb')
 bpy.ops.export_scene.gltf(filepath=str(target),export_format='GLB',export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_optimize_animation_size=True,export_cameras=False,export_lights=False)
 report.append(dict(id=id,source=str(path.relative_to(src)),sha256=hashlib.sha256(path.read_bytes()).hexdigest(),bytes=target.stat().st_size,animationOrigin=kind))

for id,name in [('happy_horse','Horse'),('happy_deer','Deer'),('happy_kitty','Kitty'),('happy_dog','Dog'),('happy_penguin','Pinguin'),('happy_chicken','Chicken'),('happy_tiger','Tiger')]:
 path=src/'source'/('Animals_FREE.fbx' if name=='Horse' else f'separate/{name}_001.fbx');load(path)
 for image in bpy.data.images:
  image.filepath=str(src/'source/separate/Texture_1.png');image.reload()
 for a in list(bpy.data.actions):
  n=a.name.split('|')[-1];a.name='idle_alt' if n.endswith(('idle_rare','eat')) else n.split('_')[-1]
 export(id,path,'supplied idle/walk/run; jump uses idle pose')

for id,meshname in [('slime_big','BigSlime'),('slime_small','SmallSlime')]:
 path=src/'cute-enemy-slime/source/slime.fbx';load(path)
 mesh=bpy.data.objects[meshname]
 for ob in list(bpy.data.objects):
  if ob.type=='MESH' and ob!=mesh:bpy.data.objects.remove(ob,do_unlink=True)
 # Preserve authored UVs and restore the supplied diffuse texture.
 for m in mesh.data.materials:
  m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF');tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(src/f'cute-enemy-slime/textures/slime_{meshname}1_AlbedoTransparency.png'));m.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
 # Bake source object axes so local Z is Blender's up axis. Keep original geometry.
 world_matrix=mesh.matrix_world.copy();mesh.parent=None;mesh.matrix_world=world_matrix
 bpy.ops.object.select_all(action='DESELECT');mesh.select_set(True);bpy.context.view_layer.objects.active=mesh
 bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
 # Put mesh origin at its base; squash animation is visual only.
 from mathutils import Vector
 world=[mesh.matrix_world@Vector(v) for v in mesh.bound_box];center=Vector(((min(v.x for v in world)+max(v.x for v in world))/2,(min(v.y for v in world)+max(v.y for v in world))/2,min(v.z for v in world)))
 bpy.context.scene.cursor.location=center;bpy.context.view_layer.objects.active=mesh;mesh.select_set(True);bpy.ops.object.origin_set(type='ORIGIN_CURSOR');mesh.location-=center
 base=mesh.scale.copy()
 for name,duration,amp in [('idle',60,.025),('walk',30,.12),('run',20,.18),('jump',24,.15)]:
  mesh.animation_data_create();mesh.animation_data.action=bpy.data.actions.new(name);mesh.animation_data.action.use_fake_user=True
  for f in range(duration+1):
   s=math.sin(f/duration*math.tau)*amp;mesh.scale=(base.x*(1-s*.5),base.y*(1-s*.5),base.z*(1+s));mesh.keyframe_insert('scale',frame=f)
  mesh.animation_data.action=None
 mesh.scale=base
 export(id,path,'custom squash clips on supplied static mesh; no supplied skeletal animations')

path=src/'free_pack_stick_man_rigged/source/Free Pack - Stick Man.fbx';load(path)
rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
for name,duration,amp in [('idle',90,.025),('walk',32,.48),('run',22,.8),('jump',24,.35)]:
 rig.animation_data_create();rig.animation_data.action=bpy.data.actions.new(name)
 for f in range(duration+1):
  wave=math.sin(f/duration*math.tau)
  for b in rig.pose.bones:
   q=Quaternion((1,0,0),0)
   if b.name in ['LeftArm','RightArm']:
    side=1 if b.name.startswith('Left') else -1;q=Quaternion((1,0,0),-side*wave*amp*.7)@Quaternion((0,0,1),-side*1.35)
   elif b.name in ['LeftUpLeg','RightUpLeg']:
    side=1 if b.name.startswith('Left') else -1;q=Quaternion((1,0,0),side*wave*amp)
   elif b.name in ['LeftLeg','RightLeg']:
    side=1 if b.name.startswith('Left') else -1;q=Quaternion((1,0,0),-max(0,side*wave)*amp*.65)
   elif b.name=='Head':q=Quaternion((0,1,0),wave*.06)
   rest=b.bone.matrix_local.to_quaternion();b.rotation_mode='QUATERNION';b.rotation_quaternion=rest.inverted()@q@rest;b.keyframe_insert('rotation_quaternion',frame=f)
 rig.animation_data.action=None
for b in rig.pose.bones:b.rotation_quaternion=Quaternion()
export('stickman',path,'custom simple gait on supplied rig; gray source material, no texture supplied')
(out/'new-packs-manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
