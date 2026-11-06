/* Farm Invasion — ChatGPT image-generated asset atlas importer.
 * Source pixel art is committed as real PNG files under assets/.
 * Each frame is enlarged with nearest-neighbor filtering and registered
 * under the stable gameplay texture names. Original art.js is a fallback.
 */
(function(){
 "use strict";
 const SHEETS={
  sprites:{key:"farm-sheet-sprites",url:"assets/spritesheet.png",size:24,columns:8},
  tiles:{key:"farm-sheet-tiles",url:"assets/tileset.png",size:16,columns:8}
 };
 const SPRITE_KEYS=[
  ...["down","right","up","left"].flatMap(dir=>Array.from({length:4},(_,i)=>"player_"+dir+i)),
  "slime","goblin","bat","mushroom","boss",
  "carrot0","carrot1","carrot2","tomato0","tomato1","tomato2","pumpkin0","pumpkin1","pumpkin2"
 ];
 const TILE_KEYS=["grass0","grass1","grass2","grass3","soil0","soil1","soil2","path","water","stone","grassflower","earth"];
 const api={
  loaded:false,
  errors:[],
  preload(scene){
   Object.values(SHEETS).forEach(sheet=>scene.load.image(sheet.key,sheet.url));
   scene.load.on("loaderror",file=>{
    if(Object.values(SHEETS).some(sheet=>sheet.key===file.key)){
     api.errors.push(file.key);
     console.warn("Farm Invasion: atlas unavailable, using fallback art:",file.key);
    }
   });
  },
  apply(scene){
   let count=0;
   function fromSheet(key,source,index,frame,columns){
    if(!scene.textures.exists(source))return false;
    const image=scene.textures.get(source).getSourceImage();
    if(!image||!image.width)return false;
    const dest=key==="boss"?64:48;
    const canvas=document.createElement("canvas");
    canvas.width=dest;canvas.height=dest;
    const ctx=canvas.getContext("2d");
    ctx.imageSmoothingEnabled=false;
    ctx.clearRect(0,0,dest,dest);
    const sx=(index%columns)*frame,sy=Math.floor(index/columns)*frame;
    ctx.drawImage(image,sx,sy,frame,frame,0,0,dest,dest);
    if(scene.textures.exists(key))scene.textures.remove(key);
    scene.textures.addCanvas(key,canvas);
    return true;
   }
   for(let i=0;i<SPRITE_KEYS.length;i++)
    if(fromSheet(SPRITE_KEYS[i],SHEETS.sprites.key,i,24,8))count++;
   for(let i=0;i<TILE_KEYS.length;i++)
    if(fromSheet(TILE_KEYS[i],SHEETS.tiles.key,i,16,8))count++;
   api.loaded=count===SPRITE_KEYS.length+TILE_KEYS.length;
   api.textureCount=count;
   console.info("Farm Invasion: imported "+count+" pixel-art atlas frames.");
   return count;
  },
  spriteKeys:SPRITE_KEYS,
  tileKeys:TILE_KEYS
 };
 window.FarmAssetImport=api;
})();