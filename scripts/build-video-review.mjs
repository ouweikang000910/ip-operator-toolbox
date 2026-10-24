import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {cp} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export async function buildVideoReview(output){
 const cwd=fileURLToPath(new URL('../video-review-app/',import.meta.url));
 const npm=process.platform==='win32'?'npm.cmd':'npm';
 function run(args){const r=spawnSync(npm,args,{cwd,stdio:'inherit',shell:process.platform==='win32'});if(r.error||r.status!==0)throw new Error('视频复盘官构建失败：npm '+args.join(' '));}
 if(!existsSync(path.join(cwd,'node_modules')))run(['ci','--ignore-scripts','--no-audit','--no-fund']);
 run(['test']);run(['run','build']);
 await cp(path.join(cwd,'dist'),path.join(output,'video-review'),{recursive:true});
}
