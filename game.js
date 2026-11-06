/* Farm Invasion — gameplay runtime. Original game by Farm Invasion contributors. MIT. */
(function(){
"use strict";
if(typeof Phaser==="undefined"||!window.FarmArt){document.querySelector(".hero p").textContent="Não foi possível carregar o motor gráfico. Verifique a conexão com a internet e recarregue a página.";return;}
const $=id=>document.getElementById(id),TILE=48,W=36,H=26,WORLD_W=W*TILE,WORLD_H=H*TILE;
const FIELD={x:13,y:7,w:11,h:10},DAY=95,NIGHT=58;
const CROPS=[
 {name:"Cenoura",emoji:"🥕",grow:22,sell:12,texture:"carrot",pack:5,cost:18},
 {name:"Tomate",emoji:"🍅",grow:38,sell:29,texture:"tomato",pack:3,cost:44},
 {name:"Abóbora",emoji:"🎃",grow:56,sell:65,texture:"pumpkin",pack:2,cost:75}
];
const META_KEY="farmInvasion.meta.1",SAVE_KEY="farmInvasion.run.1";
const rand=(a,b)=>a+Math.random()*(b-a),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),dist=(x,y,a,b)=>Math.hypot(x-a,y-b);
const old=key=>{try{return JSON.parse(localStorage.getItem(key)||"null")}catch{return null}};
const meta=Object.assign({souls:0,best:0,totalKills:0},old(META_KEY)||{});
let state=null,scene=null,playing=false,paused=true,overlay="start",manualAim=null,mobileAxis={x:0,y:0},attackTouch=false,noticeTimer=0,lastUi=0,saveTimer=0;
const runSaved=()=>{const v=old(SAVE_KEY);return v&&v.version===1&&v.state&&v.state.plots&&Array.isArray(v.state.plots)&&v.state.plots.length===FIELD.w*FIELD.h?v.state:null};
function fresh(){
 return {day:1,phase:"day",time:DAY,coins:45,health:100,maxHealth:100,base:160,maxBase:160,
  seeds:[8,3,1],bag:[0,0,0],selection:0,plots:Array.from({length:FIELD.w*FIELD.h},()=>({crop:-1,growth:0,water:false})),
  px:11*TILE,py:13*TILE,levels:{weapon:0,boots:0,armor:0,turret:0,scarecrow:0},
  kills:0,dayKills:0,shards:0,wave:0};
}
function persist(force=false){if(!state||!playing||overlay==="gameover")return;try{localStorage.setItem(SAVE_KEY,JSON.stringify({version:1,state}));if(force)toast("💾 Fazenda salva!")}catch{if(force)toast("Armazenamento indisponível",true)}}
function saveMeta(){try{localStorage.setItem(META_KEY,JSON.stringify(meta))}catch{}}
function clearSave(){try{localStorage.removeItem(SAVE_KEY)}catch{}}
function toast(message,bad=false){const el=document.createElement("div");el.className="toast"+(bad?" bad":"");el.textContent=message;$("toasts").prepend(el);setTimeout(()=>el.remove(),2700)}
function announce(message){const n=$("notice");n.textContent=message;n.classList.add("visible");clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>n.classList.remove("visible"),3400)}
const context={audio:null,enabled:true};
function sfx(kind){if(!context.enabled)return;try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;if(!context.audio)context.audio=new AC();if(context.audio.state==="suspended")context.audio.resume();const c=context.audio,t=c.currentTime;const o=c.createOscillator(),g=c.createGain();o.type=kind==="hit"?"sawtooth":"square";const map={plant:[440,610,.09],harvest:[560,920,.17],coin:[680,1050,.15],hit:[220,100,.09],hurt:[170,90,.18],dash:[440,260,.08],wave:[200,90,.4],upgrade:[620,1000,.27],water:[480,350,.10]};const a=map[kind]||map.plant;o.frequency.setValueAtTime(a[0],t);o.frequency.exponentialRampToValueAtTime(a[1],t+a[2]);g.gain.setValueAtTime(.035,t);g.gain.exponentialRampToValueAtTime(.0001,t+a[2]);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+a[2]+.01)}catch{}}
function shopPrices(){
 const lv=state.levels;return [
  {id:"seed0",icon:"🥕",title:"Sementes de cenoura",desc:"+5 sementes · Cresce em 22s",price:18},
  {id:"seed1",icon:"🍅",title:"Sementes de tomate",desc:"+3 sementes · Venda por 29",price:44},
  {id:"seed2",icon:"🎃",title:"Sementes de abóbora",desc:"+2 sementes · Venda por 65",price:75},
  {id:"weapon",icon:"⚔️",title:"Ferramenta afiada",desc:"+7 dano · Nível "+lv.weapon,price:55+lv.weapon*55},
  {id:"boots",icon:"👢",title:"Botas ligeiras",desc:"+20 velocidade · Nível "+lv.boots,price:45+lv.boots*52},
  {id:"armor",icon:"♥",title:"Coração robusto",desc:"+25 vida máxima · Nível "+lv.armor,price:60+lv.armor*55},
  {id:"turret",icon:"🏹",title:"Totem defensor",desc:"Atira automaticamente · Nível "+lv.turret,price:105+lv.turret*115},
  {id:"repair",icon:"🏠",title:"Reparar a fazenda",desc:"Recupera 60 de integridade",price:32},
  {id:"scarecrow",icon:"🪆",title:"Espantalho mágico",desc:"Retarda inimigos · Nível "+lv.scarecrow,price:85+lv.scarecrow*105}
 ];
}
function updateUI(){
 if(!state)return;
 $("phase").textContent="DIA "+state.day+" — "+(state.phase==="day"?"MANHÃ":"INVASÃO");
 $("sun").textContent=state.phase==="day"?"☀️":"🌙";
 $("countdown").textContent=String(Math.floor(Math.max(0,state.time)/60)).padStart(2,"0")+":"+String(Math.floor(Math.max(0,state.time)%60)).padStart(2,"0");
 $("timeBar").style.width=clamp(state.time/(state.phase==="day"?DAY:NIGHT)*100,0,100)+"%";
 $("timeBar").style.background=state.phase==="day"?"#ffd078":"#ec978b";
 $("coins").textContent=state.coins;
 $("playerHp").textContent=Math.ceil(state.health)+"/"+state.maxHealth;
 $("baseHp").textContent=Math.ceil(state.base)+"/"+state.maxBase;
 $("playerBar").style.width=clamp(100*state.health/state.maxHealth,0,100)+"%";
 $("baseBar").style.width=clamp(100*state.base/state.maxBase,0,100)+"%";
 CROPS.forEach((_,i)=>{$("seeds"+i).textContent="× "+state.seeds[i]});
 $("bagCount").textContent=state.bag.reduce((a,b)=>a+b,0);
 document.querySelectorAll(".seed").forEach((e,i)=>e.classList.toggle("selected",i===state.selection));
 $("marketBtn").disabled=state.phase!=="day";
}
function show(id){for(const x of ["start","shop","pause","gameover"])$(x).classList.add("hidden");if(id)$(id).classList.remove("hidden");overlay=id||"";paused=!!id;updateUI()}
function selectSeed(index){if(!state||index<0||index>2)return;state.selection=index;updateUI()}
function openShop(){if(!playing||!state||state.phase!=="day"){toast("🌙 O mercado fecha durante as invasões!",true);return}show("shop");renderShop()}
function renderShop(){
 if(!state)return;$("shopGold").textContent=state.coins;const total=state.bag.reduce((n,v,i)=>n+v*CROPS[i].sell,0);$("salePrice").textContent="+"+total;
 $("sellBtn").disabled=total===0;
 $("items").innerHTML="";
 for(const item of shopPrices()){const card=document.createElement("div");card.className="item";const span=document.createElement("span");span.textContent=item.icon;const title=document.createElement("b");title.textContent=item.title;const desc=document.createElement("p");desc.textContent=item.desc;const btn=document.createElement("button");btn.textContent="✦ "+item.price+" COMPRAR";btn.disabled=state.coins<item.price||(item.id==="repair"&&state.base>=state.maxBase)||(item.id==="scarecrow"&&state.levels.scarecrow>=3)||(item.id==="turret"&&state.levels.turret>=4);btn.addEventListener("click",()=>buy(item.id));card.append(span,title,desc,btn);$("items").append(card)}
}
function buy(id){if(!state||overlay!=="shop")return;const item=shopPrices().find(a=>a.id===id);if(!item||state.coins<item.price)return;state.coins-=item.price;
 if(id.startsWith("seed")){const i=Number(id.slice(-1));state.seeds[i]+=CROPS[i].pack}
 else if(id==="repair")state.base=Math.min(state.maxBase,state.base+60);
 else if(id==="armor"){state.levels.armor++;state.maxHealth+=25;state.health=Math.min(state.maxHealth,state.health+35)}
 else{state.levels[id]++;if(id==="turret"||id==="scarecrow")scene.syncBuildings()}
 sfx("upgrade");toast("✦ Melhorado: "+item.title);renderShop();updateUI();persist();
}
function sellAll(){if(!state||overlay!=="shop")return;const coins=state.bag.reduce((a,v,i)=>a+v*CROPS[i].sell,0);if(!coins)return;state.coins+=coins;state.bag=[0,0,0];sfx("coin");toast("✦ +"+coins+" ouro pela colheita");renderShop();updateUI();persist()}
function enterRun(saved){
 if(!scene){toast('O cenário ainda está carregando...');return}
 state=saved?JSON.parse(JSON.stringify(saved)):fresh();
 state.coins=Number(state.coins)||0;
 if(!state.levels)state.levels={weapon:0,boots:0,armor:0,turret:0,scarecrow:0};
 if(!saved){const bonus=Math.min(75,Math.max(0,meta.souls*5));state.coins+=bonus;if(bonus>0)toast("✦ Legado da floresta: +"+bonus+" ouro")}
 playing=true;show("");$("hud").classList.remove("hidden");$("start").classList.add("hidden");$("mobile").classList.toggle("hidden",!isTouch());
 scene.resetRun();announce(saved?"✦ FAZENDA RESTAURADA":"☀ BEM-VINDO À SUA FAZENDA!");updateUI();persist();
}
function returnMenu(){if(playing&&state.health>0&&state.base>0)persist();playing=false;show("start");$("hud").classList.add("hidden");$("mobile").classList.add("hidden");$("continueBtn").classList.toggle("hidden",!runSaved());$("start").classList.remove("hidden");scene.clearThreats()}
function endGame(){if(!playing)return;playing=false;state.health=Math.max(0,state.health);state.base=Math.max(0,state.base);meta.best=Math.max(meta.best,state.day);meta.totalKills+=state.kills;saveMeta();clearSave();$("summary").textContent=state.base<=0?"A horda destruiu sua fazenda. Reconstrua e volte mais forte!":"O fazendeiro caiu em combate. A próxima jornada será sua vingança.";$("best").textContent="☾ DIA "+state.day+" • "+state.kills+" MONSTROS • ✦ "+state.shards+" FRAGMENTOS";show("gameover");sfx("wave");}
function nextPhase(){
 if(state.phase==="day"){state.phase="night";state.time=NIGHT;state.dayKills=0;state.wave++;scene.beginNight();announce("☾ A NOITE CAIU! DEFENDA O CRISTAL!");sfx("wave");}
 else{state.phase="day";state.time=DAY;state.day++;state.shards++;meta.souls++;meta.best=Math.max(meta.best,state.day);saveMeta();const reward=20+state.day*12;state.coins+=reward;state.health=Math.min(state.maxHealth,state.health+18);state.base=Math.min(state.maxBase,state.base+12);state.plots.forEach(p=>p.water=false);scene.clearThreats();scene.syncCrops();announce("☀ AMANHECEU! +"+reward+" OURO • +1 LEGADO");sfx("coin");}
 scene.setNight();updateUI();persist();
}
function isTouch(){return matchMedia("(pointer:coarse)").matches||window.innerWidth<700}
function getPlotIndex(x,y){const gx=Math.floor(x/TILE)-FIELD.x,gy=Math.floor(y/TILE)-FIELD.y;return gx<0||gx>=FIELD.w||gy<0||gy>=FIELD.h?-1:gy*FIELD.w+gx}
function plotXY(i){return {x:(FIELD.x+(i%FIELD.w)+.5)*TILE,y:(FIELD.y+Math.floor(i/FIELD.w)+.5)*TILE}}
function nearestPlot(){let result=-1,dd=124;for(let i=0;i<state.plots.length;i++){let p=plotXY(i),d=dist(p.x,p.y,state.px,state.py);if(d<dd){dd=d;result=i}}return result}
function interact(index=-1){
 if(!playing||paused)return;
 let i=index>=0?index:nearestPlot();if(i<0){toast("🌱 Aproxime-se da horta!",true);return}
 const xy=plotXY(i);if(dist(xy.x,xy.y,state.px,state.py)>145){toast("Você está muito longe da horta!",true);return}
 const p=state.plots[i];if(p.crop>=0){const crop=CROPS[p.crop];if(p.growth>=crop.grow){const amount=Math.random()<.19?2:1;state.bag[p.crop]+=amount;p.crop=-1;p.growth=0;p.water=false;scene.syncCrop(i);scene.floatText(xy.x,xy.y-14,"+"+amount+" "+crop.emoji,"#ffdd9c");sfx("harvest");toast(crop.emoji+" Colhido! Leve ao mercado.");}
 else{toast("⏳ Ainda crescendo... Regue com R.")}return}
 const k=state.selection;if(state.seeds[k]<1){toast("Sem sementes! Compre mais no mercado.",true);return}state.seeds[k]--;p.crop=k;p.growth=0;p.water=false;scene.syncCrop(i);scene.floatText(xy.x,xy.y-16,"🌱","#dbf4ae");sfx("plant");updateUI();
}
function water(){if(!playing||paused)return;let hit=0;for(let i=0;i<state.plots.length;i++){let p=state.plots[i],xy=plotXY(i);if(p.crop>=0&&!p.water&&dist(xy.x,xy.y,state.px,state.py)<89){p.water=true;hit++;scene.syncCrop(i)}}if(hit){sfx("water");toast("💧 "+hit+" plantio(s) regado(s)")}else toast("💧 Nenhuma planta seca próxima.")}
class FarmScene extends Phaser.Scene{
 constructor(){super("Farm");this.enemies=[];this.bullets=[];this.props=[];this.plotViews=[];this.held=false;this.attackCd=0;this.dashCd=0;this.invuln=0;this.spawnCd=2;this.uiCd=0;this.farmCd=0;this.turretCd=0;this.vfxTime=0;this.bossSpawned=false;this.facing={x:1,y:0};}
 create(){
  scene=this;window.FarmArt.create(this);this.createWorld();
  this.player=this.add.image(11*TILE,13*TILE,"player").setScale(1.15).setDepth(900);
  this.player.setOrigin(.5,.77);this.cameras.main.setBounds(0,0,WORLD_W,WORLD_H);
  this.cameras.main.startFollow(this.player,false,.10,.10);
  this.resizeCam();this.scale.on("resize",()=>this.resizeCam());
  this.keys=this.input.keyboard.addKeys({up:"W",down:"S",left:"A",right:"D",arrowUp:"UP",arrowDown:"DOWN",arrowLeft:"LEFT",arrowRight:"RIGHT",attack:"SPACE",dash:"SHIFT"});
  this.input.keyboard.on("keydown-E",()=>interact());
  this.input.keyboard.on("keydown-R",()=>water());
  this.input.keyboard.on("keydown-I",()=>{if(overlay==="shop")show("");else if(!paused)openShop()});
  this.input.keyboard.on("keydown-ONE",()=>selectSeed(0));
  this.input.keyboard.on("keydown-TWO",()=>selectSeed(1));
  this.input.keyboard.on("keydown-THREE",()=>selectSeed(2));
  this.input.keyboard.on("keydown-ESC",()=>{if(overlay==="shop"||overlay==="pause")show("");else if(playing)show("pause")});
  this.input.keyboard.on("keydown-M",()=>{context.enabled=!context.enabled;toast("Som "+(context.enabled?"ativado":"desativado"))});
  this.input.on("pointerdown",(ptr)=>{if(!playing||paused)return;const pos=ptr.positionToCamera(this.cameras.main),idx=getPlotIndex(pos.x,pos.y);if(idx>=0&&dist(pos.x,pos.y,state.px,state.py)<120){interact(idx);return}manualAim={x:pos.x,y:pos.y};this.attack(manualAim)});
  this.dark=this.add.rectangle(0,0,this.scale.width,this.scale.height,0x081e3b,.02).setOrigin(0).setScrollFactor(0).setDepth(9000);this.setNight();
  this.cameras.main.fadeIn(300,0,0,0);
 }
 resizeCam(){const mobile=isTouch(),zoom=mobile?.86:1.12;this.cameras.main.setZoom(zoom);if(this.dark){this.dark.width=this.scale.width;this.dark.height=this.scale.height}if(playing)$("mobile").classList.toggle("hidden",!mobile)}
 createWorld(){
  const rnd=this.seeded(84621);const lawn=[];for(let y=0;y<H;y++)for(let x=0;x<W;x++){const n=Math.floor(rnd()*4);this.add.image((x+.5)*TILE,(y+.5)*TILE,"grass"+n).setDepth(0);}
  // Winding village track and meadow around the planted grounds
  for(let y=5;y<23;y++){for(let x=7;x<13;x++){if((x===9||x===10||(y>=18&&x===8))&&!(y>=7&&y<=16&&x===12))this.add.image((x+.5)*TILE,(y+.5)*TILE,"path").setAlpha(.87).setDepth(1)}}
  for(let x=10;x<=25;x++)this.add.image((x+.5)*TILE,18.5*TILE,"path").setDepth(1);
  for(let y=0;y<FIELD.h;y++)for(let x=0;x<FIELD.w;x++){
   const px=(FIELD.x+x+.5)*TILE,py=(FIELD.y+y+.5)*TILE;
   this.add.image(px,py,"soil"+((x*7+y*13)%3)).setDepth(2);
   const wet=this.add.ellipse(px,py+12,34,14,0x70c4ba,.0).setDepth(3);
   const crop=this.add.image(px,py,"carrot0").setDepth(py+10).setVisible(false);
   this.plotViews.push({wet,crop,stage:-1});
  }
  // Fences, with an entrance near the south path
  for(let x=FIELD.x-1;x<=FIELD.x+FIELD.w;x++){this.add.image((x+.5)*TILE,(FIELD.y-.35)*TILE,"fence").setDepth((FIELD.y-.35)*TILE);if(x!==FIELD.x+Math.floor(FIELD.w/2)&&x!==FIELD.x+Math.floor(FIELD.w/2)-1)this.add.image((x+.5)*TILE,(FIELD.y+FIELD.h+.25)*TILE,"fence").setDepth((FIELD.y+FIELD.h+.25)*TILE);}
  for(let y=FIELD.y;y<FIELD.y+FIELD.h;y++){this.add.image((FIELD.x-.5)*TILE,(y+.5)*TILE,"fence").setDepth((y+.5)*TILE);this.add.image((FIELD.x+FIELD.w+.5)*TILE,(y+.5)*TILE,"fence").setDepth((y+.5)*TILE)}
  // Groves with soft clusters surrounding gameplay loop
  for(let i=0;i<128;i++){let x=rand(1,W-1),y=rand(1,H-1);let nearFarm=(x>11&&x<27&&y>4&&y<20),nearVillage=(x>3&&x<12&&y>5&&y<22);if(nearFarm||nearVillage)continue;let px=x*TILE,py=y*TILE;let type=rnd()<.57?"tree":"pine";this.add.image(px,py,type).setOrigin(.5,1).setDepth(py).setScale(rand(.86,1.1));}
  for(let i=0;i<32;i++){let x=rand(2,W-2),y=rand(2,H-2);if((x>12&&x<26&&y>5&&y<19)||(x>4&&x<12&&y>6&&y<22))continue;let t=rnd()<.7?"flower":"rock";this.add.image(x*TILE,y*TILE,t).setDepth(y*TILE).setAlpha(.9)}
  this.barn=this.add.image(6.8*TILE,10.3*TILE,"barn").setOrigin(.5,1).setDepth(10.3*TILE);
  this.stall=this.add.image(7.5*TILE,19.8*TILE,"market").setOrigin(.5,1).setDepth(19.8*TILE);
  this.core=this.add.image(6.4*TILE,13.8*TILE,"core").setOrigin(.5,1).setDepth(13.8*TILE);
  this.add.text(5.2*TILE,14.2*TILE,"CRISTAL",{fontSize:"11px",fontStyle:"900",fontFamily:"monospace",color:"#fff1c2",backgroundColor:"#2c5637aa",padding:{x:5,y:3}}).setDepth(1000);
  this.add.text(6.2*TILE,20*TILE,"MERCADO",{fontSize:"12px",fontStyle:"900",fontFamily:"monospace",color:"#fff1c2",backgroundColor:"#304e36be",padding:{x:4,y:4}}).setDepth(1000);
  this.buildings=[];
 }
 seeded(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}}
 setNight(){if(this.dark)this.dark.setAlpha(state&&state.phase==="night"?.31:.03)}
 syncBuildings(){
  this.buildings.forEach(b=>b.destroy());this.buildings=[];if(!state)return;
  for(let i=0;i<state.levels.turret;i++){const x=(4.3+(i%2)*4.2)*TILE,y=(14.5+Math.floor(i/2)*2.4)*TILE;this.buildings.push(this.add.image(x,y,"turret").setOrigin(.5,1).setDepth(y))}
  if(state.levels.scarecrow)this.buildings.push(this.add.image(12.2*TILE,13.1*TILE,"scarecrow").setOrigin(.5,1).setDepth(13.1*TILE));
 }
 syncCrop(i){if(!state)return;const p=state.plots[i],v=this.plotViews[i],xy=plotXY(i);v.wet.setAlpha(p.water?.23:0);if(p.crop<0){v.crop.setVisible(false);v.stage=-1;return}const crop=CROPS[p.crop];const level=p.growth>=crop.grow?2:p.growth>=crop.grow*.34?1:0;v.crop.setVisible(true);v.crop.setTexture(crop.texture+level);v.crop.setScale(level===2?1.0:.85);v.stage=level;v.crop.setY(xy.y+4);}
 syncCrops(){for(let i=0;i<this.plotViews.length;i++)this.syncCrop(i)}
 clearThreats(){this.enemies.forEach(e=>e.sprite.destroy());this.enemies=[];this.bullets.forEach(b=>b.sprite.destroy());this.bullets=[];}
 resetRun(){
  this.clearThreats();this.player.setPosition(state.px,state.py);this.syncCrops();this.syncBuildings();this.setNight();
  this.attackCd=0;this.dashCd=0;this.invuln=0;this.spawnCd=2;this.turretCd=0;this.bossSpawned=false;this.farmCd=0;
  this.cameras.main.centerOn(state.px,state.py);
 }
 beginNight(){this.spawnCd=1.3;this.bossSpawned=false;}
 floatText(x,y,value,color="#ffefd2"){const t=this.add.text(x,y,value,{fontFamily:"Nunito,system-ui",fontSize:"15px",fontStyle:"900",color,stroke:"#153226",strokeThickness:4}).setOrigin(.5).setDepth(8500);this.tweens.add({targets:t,y:y-33,alpha:0,duration:850,ease:"Sine.easeOut",onComplete:()=>t.destroy()})}
 flash(x,y,color=0xffd28a,scale=1){const sp=this.add.image(x,y,"spark").setTint(color).setScale(scale).setDepth(8000);this.tweens.add({targets:sp,alpha:0,scale:scale*1.8,duration:300,onComplete:()=>sp.destroy()})}
 plantTick(dt){for(let i=0;i<state.plots.length;i++){const p=state.plots[i];if(p.crop<0)continue;const grow=CROPS[p.crop].grow;if(p.growth>=grow)continue;const before=p.growth;p.growth=Math.min(grow,p.growth+dt*(state.phase==="day"?1:.65)*(p.water?1.85:1));if(Math.floor(before/(grow/3))!==Math.floor(p.growth/(grow/3))||p.growth===grow)this.syncCrop(i)}}
 spawnEnemy(boss=false){
  if(this.enemies.length>80)return;
  const edge=Math.floor(rand(0,4));let x,y;if(edge===0){x=rand(30,WORLD_W-30);y=40}else if(edge===1){x=WORLD_W-35;y=rand(30,WORLD_H-30)}else if(edge===2){x=rand(30,WORLD_W-30);y=WORLD_H-35}else{x=35;y=rand(30,WORLD_H-30)}
  let type=boss?"boss":Math.random()<Math.min(.25+state.day*.02,.46)?"slime":Math.random()<.45?"bat":state.day>=3&&Math.random()<.23?"mushroom":"goblin";
  const data={slime:[42,49,8,6],goblin:[63,42,11,10],bat:[29,85,7,9],mushroom:[86,32,16,15],boss:[480,23,22,80]}[type];
  const hp=data[0]*(1+(state.day-1)*.18),spd=data[1]*(1+Math.min(state.day*.035,.32));
  const sprite=this.add.image(x,y,type).setDepth(y).setScale(type==="boss"?1.15:1);
  const e={sprite,x,y,type,hp,maxHp:hp,speed:spd,damage:data[2],reward:data[3],cooldown:0,bob:rand(0,6),hit:0};this.enemies.push(e);
  if(boss){announce("☠ GUARDIÃO DA FLORESTA APARECEU!");sfx("wave")}
 }
 attack(target=null){
  if(!playing||paused||this.attackCd>0)return;
  const px=state.px,py=state.py;let tx,ty;
  if(target){tx=target.x;ty=target.y}else{const enemies=this.enemies.filter(e=>dist(e.x,e.y,px,py)<490).sort((a,b)=>dist(a.x,a.y,px,py)-dist(b.x,b.y,px,py));if(enemies[0]){tx=enemies[0].x;ty=enemies[0].y}else{tx=px+(this.facing.x||1)*200;ty=py+(this.facing.y||0)*200}}
  const d=Math.max(1,dist(tx,ty,px,py)),dx=(tx-px)/d,dy=(ty-py)/d;
  const s=this.add.image(px,py-12,"spark").setScale(.68).setTint(0xffd987).setDepth(1000);
  this.bullets.push({sprite:s,x:px,y:py-12,dx,dy,speed:440,life:1.25,damage:24+state.levels.weapon*7+Math.min(10,meta.souls),friendly:true});
  this.attackCd=Math.max(.21,.40-state.levels.weapon*.012);this.player.setTint(0xfff1cc);this.time.delayedCall(95,()=>{if(this.player.active)this.player.clearTint()});sfx("hit");
 }
 dash(){
  if(!playing||paused||this.dashCd>0)return;
  let v=this.facing||{x:1,y:0};const d=Math.max(1,Math.hypot(v.x,v.y));this.player.setPosition(clamp(state.px+v.x/d*120,35,WORLD_W-35),clamp(state.py+v.y/d*120,35,WORLD_H-35));state.px=this.player.x;state.py=this.player.y;this.dashCd=3;this.invuln=.34;this.flash(state.px,state.py,0xb9f6e5,1.8);sfx("dash");
 }
 updateEnemies(dt){
  const baseX=6.4*TILE,baseY=13.1*TILE;
  for(let i=this.enemies.length-1;i>=0;i--){
   const e=this.enemies[i];e.cooldown-=dt;e.hit=Math.max(0,e.hit-dt);
   const towardsPlayer=e.type==="bat"||dist(e.x,e.y,state.px,state.py)<150&&e.type!=="boss";
   const tx=towardsPlayer?state.px:baseX,ty=towardsPlayer?state.py:baseY;
   const d=Math.max(1,dist(e.x,e.y,tx,ty)),slow=state.levels.scarecrow&&dist(e.x,e.y,18*TILE,12*TILE)<360?1-.16*state.levels.scarecrow:1;
   if(d>24){e.x+=(tx-e.x)/d*e.speed*dt*slow;e.y+=(ty-e.y)/d*e.speed*dt*slow}
   e.sprite.setPosition(e.x,e.y+Math.sin(this.vfxTime*4+e.bob)*2);e.sprite.setDepth(e.y);e.sprite.setFlipX(tx<e.x);e.sprite.setTint(e.hit>0?0xffaaaa:0xffffff);
   const dp=dist(e.x,e.y,state.px,state.py);
   if(dp<34&&e.cooldown<=0&&this.invuln<=0){state.health-=e.damage;e.cooldown=1.2;this.invuln=.28;this.flash(state.px,state.py,0xff897d,1.1);this.floatText(state.px,state.py-45,"-"+e.damage,"#ff9586");sfx("hurt");if(state.health<=0){endGame();return}}
   if(dist(e.x,e.y,baseX,baseY)<45&&e.cooldown<=0){state.base-=e.damage;e.cooldown=1.3;this.floatText(baseX,baseY-33,"-"+e.damage,"#ffaaa2");this.flash(baseX,baseY,0xff8078,1.7);if(state.base<=0){endGame();return}}
  }
 }
 damageEnemy(e,damage){e.hp-=damage;e.hit=.12;this.floatText(e.x+rand(-9,9),e.y-19,"-"+Math.round(damage),"#ffe6ab");this.flash(e.x,e.y,0xffd9aa,.7);if(e.hp<=0){e.sprite.destroy();this.enemies.splice(this.enemies.indexOf(e),1);state.kills++;state.dayKills++;const reward=e.reward+Math.floor(state.day/3);state.coins+=reward;if(e.type==="boss"){state.coins+=80;state.shards+=2;meta.souls+=2;saveMeta();announce("✦ GUARDIÃO DERROTADO! +80 OURO");}this.floatText(e.x,e.y-5,"✦ +"+reward,"#ffda80");if(Math.random()<.18){state.seeds[0]++}sfx("coin")}}
 updateBullets(dt){
  for(let i=this.bullets.length-1;i>=0;i--){
   const b=this.bullets[i];b.x+=b.dx*b.speed*dt;b.y+=b.dy*b.speed*dt;b.life-=dt;b.sprite.setPosition(b.x,b.y);b.sprite.rotation+=dt*7;let remove=b.life<=0;
   if(!remove){for(const e of [...this.enemies]){if(dist(b.x,b.y,e.x,e.y)<(e.type==="boss"?36:24)){this.damageEnemy(e,b.damage);remove=true;break}}}
   if(remove){b.sprite.destroy();this.bullets.splice(i,1)}
  }
 }
 turretAttack(dt){
  if(state.levels.turret<1||this.enemies.length===0)return;this.turretCd-=dt;if(this.turretCd>0)return;
  const points=[[4.3,14.5],[8.5,14.5],[4.3,16.9],[8.5,16.9]];
  for(let i=0;i<state.levels.turret;i++){let pos=points[i],px=pos[0]*TILE,py=pos[1]*TILE;
   const enemy=this.enemies.filter(e=>dist(e.x,e.y,px,py)<410).sort((a,b)=>dist(a.x,a.y,px,py)-dist(b.x,b.y,px,py))[0];if(!enemy)continue;
   const d=dist(px,py,enemy.x,enemy.y),dx=(enemy.x-px)/d,dy=(enemy.y-py)/d;const sp=this.add.image(px,py-32,"spark").setTint(0xb1f5c3).setScale(.60).setDepth(1100);
   this.bullets.push({sprite:sp,x:px,y:py-32,dx,dy,speed:370,life:1.4,damage:15+state.levels.turret*4,friendly:true})}
  this.turretCd=Math.max(.47,1.35-state.levels.turret*.16);
 }
 update(t,ms){
  const dt=Math.min(ms/1000,.065);
  if(!playing||paused||!state)return;
  this.vfxTime+=dt;this.attackCd=Math.max(0,this.attackCd-dt);this.dashCd=Math.max(0,this.dashCd-dt);this.invuln=Math.max(0,this.invuln-dt);
  state.time-=dt;if(state.time<=0)nextPhase();
  let dx=(this.keys.right.isDown||this.keys.arrowRight.isDown?1:0)-(this.keys.left.isDown||this.keys.arrowLeft.isDown?1:0)+mobileAxis.x;
  let dy=(this.keys.down.isDown||this.keys.arrowDown.isDown?1:0)-(this.keys.up.isDown||this.keys.arrowUp.isDown?1:0)+mobileAxis.y;
  let mag=Math.hypot(dx,dy);if(mag>.05){dx/=Math.max(1,mag);dy/=Math.max(1,mag);this.facing={x:dx,y:dy};const speed=170+state.levels.boots*20;state.px=clamp(state.px+dx*dt*speed,32,WORLD_W-32);state.py=clamp(state.py+dy*dt*speed,32,WORLD_H-32);this.player.setFlipX(dx<-.1);}
  this.player.setPosition(state.px,state.py+Math.sin(this.vfxTime*11)*Math.min(2,mag*2));this.player.setDepth(state.py+6);this.player.setAlpha(this.invuln>0?(.60+Math.sin(this.vfxTime*50)*.2):1);
  if(this.keys.dash.isDown)this.dash();
  if(this.keys.attack.isDown||attackTouch)this.attack();
  this.plantTick(dt);
  if(state.phase==="night"){
   this.spawnCd-=dt;if(this.spawnCd<=0){this.spawnEnemy();this.spawnCd=Math.max(.56,2.55-state.day*.18)*rand(.75,1.15)}
   if(state.day%3===0&&!this.bossSpawned&&state.time<NIGHT-8){this.spawnEnemy(true);this.bossSpawned=true;}
   this.updateEnemies(dt);this.updateBullets(dt);this.turretAttack(dt);
  }else{this.updateBullets(dt)}
  this.uiCd-=dt;if(this.uiCd<=0){this.uiCd=.15;updateUI()}
  saveTimer+=dt;if(saveTimer>10){saveTimer=0;persist()}
 }
}
function setupTouch(){
 const joy=$("joystick"),knob=$("knob");let pointer=null;
 function track(e){if(pointer!==e.pointerId)return;const r=joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let dx=(e.clientX-cx)/(r.width*.35),dy=(e.clientY-cy)/(r.height*.35),d=Math.max(1,Math.hypot(dx,dy));mobileAxis={x:dx/d,y:dy/d};knob.style.left="calc(50% + "+(mobileAxis.x*34)+"px)";knob.style.top="calc(50% + "+(mobileAxis.y*34)+"px)"}
 joy.addEventListener("pointerdown",e=>{e.preventDefault();pointer=e.pointerId;joy.setPointerCapture(pointer);track(e)});joy.addEventListener("pointermove",track);
 const reset=e=>{if(pointer!==e.pointerId)return;pointer=null;mobileAxis={x:0,y:0};knob.style.left="50%";knob.style.top="50%"};
 joy.addEventListener("pointerup",reset);joy.addEventListener("pointercancel",reset);
 $("useTouch").addEventListener("pointerdown",e=>{e.preventDefault();interact()});
 $("waterTouch").addEventListener("pointerdown",e=>{e.preventDefault();water()});
 $("dashTouch").addEventListener("pointerdown",e=>{e.preventDefault();if(scene)scene.dash()});
 $("hitTouch").addEventListener("pointerdown",e=>{e.preventDefault();attackTouch=true;if(scene)scene.attack()});
 for(const event of ["pointerup","pointercancel","pointerleave"])$("hitTouch").addEventListener(event,()=>attackTouch=false);
}
function bindUI(){
 $("startBtn").onclick=()=>{clearSave();enterRun(null)};
 $("continueBtn").onclick=()=>{const s=runSaved();if(s)enterRun(s)};
 $("pauseBtn").onclick=()=>{if(playing)show("pause")};
 $("resumeBtn").onclick=()=>show("");
 $("saveBtn").onclick=()=>persist(true);
 $("menuBtn").onclick=returnMenu;
 $("retryBtn").onclick=()=>enterRun(null);
 $("backBtn").onclick=returnMenu;
 $("marketBtn").onclick=openShop;
 $("closeShop").onclick=()=>show("");
 $("sellBtn").onclick=sellAll;
 document.querySelectorAll(".seed").forEach((e,i)=>e.addEventListener("click",()=>selectSeed(i)));
 $("continueBtn").classList.toggle("hidden",!runSaved());
 setupTouch();
 window.addEventListener("blur",()=>{if(playing&&!paused)show("pause")});
 window.addEventListener("beforeunload",()=>persist());
 document.addEventListener("visibilitychange",()=>{if(document.hidden&&playing&&!paused){persist();show("pause")}});
}
bindUI();
new Phaser.Game({type:Phaser.AUTO,parent:"game",width:window.innerWidth,height:window.innerHeight,backgroundColor:"#477b4b",pixelArt:true,roundPixels:true,scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.CENTER_BOTH,width:window.innerWidth,height:window.innerHeight},render:{pixelArt:true,antialias:false},scene:[FarmScene]});
})();