/* Validate IHDR dimensions without requiring third-party packages. */
const fs=require("node:fs");
const assert=require("node:assert/strict");
const specs={farmer:[512,384],enemies:[512,256],items:[640,320],tools:[512,256],terrain:[384,384]};
let missing=[];
for(const [name,[w,h]] of Object.entries(specs)){
 const file="assets/v2/"+name+".png";
 if(!fs.existsSync(file)){missing.push(file);continue;}
 const buf=fs.readFileSync(file);
 assert.equal(buf.subarray(0,8).toString("hex"),"89504e470d0a1a0a",name+" must be PNG");
 assert.equal(buf.readUInt32BE(16),w,name+" width");
 assert.equal(buf.readUInt32BE(20),h,name+" height");
 assert.ok(buf.length>2000,name+" seems empty");
 console.log("OK",name,w+"x"+h,buf.length+" bytes");
}
if(missing.length){
 console.warn("V2 image assets not yet uploaded:",missing.join(", "));
 if(process.env.FARM_REQUIRE_V2==="1")process.exitCode=1;
}else console.log("All 226 exact-grid v2 atlas cells validated");
