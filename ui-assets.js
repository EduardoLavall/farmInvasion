/* Farm Invasion — inventory/tool icons rendered directly from exact-grid PNG atlases.
 * Source textures: assets/v2/items.png and assets/v2/tools.png
 * Cells: items 10×5, tools 8×4, both 64×64 px.
 * Crop by integer source rectangles, no percentages, offsets, or CSS background-position.
 */
(function(){
  "use strict";
  const SOURCES={
    items:{url:"assets/v2/items.png",cols:10,rows:5,cell:64},
    tools:{url:"assets/v2/tools.png",cols:8,rows:4,cell:64}
  };
  const ICONS={
    seed0:["items",0],seed1:["items",1],seed2:["items",2],
    weapon:["tools",0],turret:["tools",11],repair:["tools",7],
    armor:["tools",12],scarecrow:["items",9],
    market:["items",16],bag:["items",9],
    water:["tools",5],use:["tools",3],attack:["tools",0]
  };
  const images={},cache=new Map();
  const api={ready:false,failed:[],loaded:[],iconData,apply,applyShop};
  function iconData(name){
    const entry=ICONS[name];
    if(!entry)return null;
    const [group,index]=entry,source=SOURCES[group],img=images[group];
    if(!img || !img.naturalWidth)return null;
    const key=group+":"+index;
    if(cache.has(key))return cache.get(key);
    const c=document.createElement("canvas");c.width=64;c.height=64;
    const ctx=c.getContext("2d");ctx.imageSmoothingEnabled=false;
    const sx=(index%source.cols)*source.cell,sy=Math.floor(index/source.cols)*source.cell;
    ctx.drawImage(img,sx,sy,source.cell,source.cell,0,0,64,64);
    const value=c.toDataURL("image/png");
    cache.set(key,value);
    return value;
  }
  function replace(node,name){
    if(!node)return;
    const data=iconData(name);if(!data)return;
    let img=node.querySelector("img.fi-icon");
    if(!img){img=document.createElement("img");img.className="fi-icon";img.alt="";img.setAttribute("aria-hidden","true");node.replaceChildren(img)}
    img.src=data;
  }
  function apply(){
    document.querySelectorAll(".seed").forEach((btn,i)=>replace(btn.querySelector("span"),"seed"+i));
    replace(document.querySelector(".bag"),"bag");
    const controls=[["waterTouch","water"],["useTouch","use"],["hitTouch","attack"]];
    for(const [id,name] of controls){
      const button=document.getElementById(id);
      if(!button||button.querySelector("img.fi-icon"))continue;
      const data=iconData(name);if(!data)continue;
      const img=document.createElement("img");img.className="fi-icon";img.src=data;img.alt="";img.setAttribute("aria-hidden","true");
      button.insertBefore(img,button.firstChild);
      for(const n of button.childNodes)if(n.nodeType===Node.TEXT_NODE&&n.textContent.trim())n.textContent="";
    }
    applyShop();
  }
  function applyShop(){
    document.querySelectorAll(".item").forEach(card=>{
      const name=card.dataset.itemId;
      if(name)replace(card.querySelector("span"),name);
    });
  }
  Promise.all(Object.entries(SOURCES).map(([key,s])=>new Promise(resolve=>{
    const img=new Image();img.onload=()=>{
      if(img.naturalWidth===s.cols*s.cell&&img.naturalHeight===s.rows*s.cell){images[key]=img;api.loaded.push(key)}
      else{console.warn("Farm Invasion: invalid icon atlas dimensions",key,img.naturalWidth,img.naturalHeight);api.failed.push(key)}
      resolve();
    };
    img.onerror=()=>{api.failed.push(key);resolve()};
    img.src=s.url;
  }))).then(()=>{
    api.ready=api.loaded.length===2;
    apply();
    console.info("Farm Invasion HUD sprite icons:",api.loaded,api.failed);
  });
  window.FarmUIAssets=api;
})();
