/* Farm Invasion v2 — exact-grid art atlases, alpha-safe, nearest-neighbor. */
(function() {
  "use strict";
  const specs = {
    farmer: {url:"assets/v2/farmer.png", width:64,height:64, cols:8, rows:6},
    enemies:{url:"assets/v2/enemies.png",width:64,height:64,cols:8,rows:4},
    items:{url:"assets/v2/items.png",width:64,height:64,cols:10,rows:5},
    tools:{url:"assets/v2/tools.png",width:64,height:64,cols:8,rows:4},
    terrain:{url:"assets/v2/terrain.png",width:48,height:48,cols:8,rows:8}
  };
  const textureNames = {farmer:"fi2-farmer",enemies:"fi2-enemies",items:"fi2-items",tools:"fi2-tools",terrain:"fi2-terrain"};
  const api = {
    ready:false,loaded:[],failed:[],
    preload(scene) {
      Object.entries(specs).forEach(([name,s]) => {
        scene.load.spritesheet(textureNames[name],s.url,{frameWidth:s.width,frameHeight:s.height,endFrame:s.cols*s.rows-1});
      });
      scene.load.on("loaderror",file => {
        if(Object.values(textureNames).includes(file.key))api.failed.push(file.key);
      });
    },
    apply(scene) {
      api.loaded=[];
      for(const [name,s] of Object.entries(specs)) {
        const key=textureNames[name];
        if(!scene.textures.exists(key))continue;
        const texture=scene.textures.get(key),image=texture.getSourceImage();
        if(!image || image.width!==s.width*s.cols || image.height!==s.height*s.rows){
          console.warn("Farm Invasion: wrong atlas dimensions",name,image?.width,image?.height);
          scene.textures.remove(key);continue;
        }
        api.loaded.push(name);
      }
      for(const [direction,row] of Object.entries({down:0,left:1,right:2,up:3})) {
        const key="fi2-walk-"+direction;
        if(api.loaded.includes("farmer")&&!scene.anims.exists(key))
          scene.anims.create({key,frames:scene.anims.generateFrameNumbers(textureNames.farmer,{start:row*8,end:row*8+7}),frameRate:9,repeat:-1});
      }
      for(const [name,row] of Object.entries({slime:0,bat:1,goblin:2,boss:3})) {
        const key="fi2-"+name;
        if(api.loaded.includes("enemies")&&!scene.anims.exists(key))
          scene.anims.create({key,frames:scene.anims.generateFrameNumbers(textureNames.enemies,{start:row*8,end:row*8+7}),frameRate:name==="boss"?5:7,repeat:-1});
      }
      for(const [key,row] of Object.entries({farm:4,strike:5})) {
        const anim="fi2-"+key;
        if(api.loaded.includes("farmer")&&!scene.anims.exists(anim))
          scene.anims.create({key:anim,frames:scene.anims.generateFrameNumbers(textureNames.farmer,{start:row*8,end:row*8+7}),frameRate:11,repeat:0});
      }
      api.ready=api.loaded.length===5;
      console.info("Farm Invasion v2 atlases:",api.loaded.join(","), api.failed);
      return api.ready;
    },
    textures:textureNames,specs,
    has(name){return api.loaded.includes(name)},
    cropFrame(index,stage) {
      const rows={0:3,1:3,2:4}, starts={0:0,1:6,2:5};
      return rows[index]*10+Math.min(4,starts[index]+stage);
    }
  };
  window.FarmAssetsV2=api;
})();