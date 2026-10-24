import {mkdir,copyFile,readFile,writeFile,cp} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {buildVideoReview} from './build-video-review.mjs';

// Explicit allowlist: never copy workspace data, uploads, environment files or old APIs.
export async function buildPages(output=path.resolve('dist')){
  const root=fileURLToPath(new URL('../',import.meta.url));
  await mkdir(output,{recursive:true});
  for(const file of ['index.html','favicon.svg','app.js','radar-core.mjs','radar-search.mjs','web-search-client.mjs','style.css','theme-ember.css'])
    await copyFile(path.join(root,'public',file),path.join(output,file));
  await cp(path.join(root,'public/assets'),path.join(output,'assets'),{recursive:true});
  await cp(path.join(root,'public/briefly'),path.join(output,'briefly'),{recursive:true});
  await buildVideoReview(output);
  const html=await readFile(path.join(output,'index.html'),'utf8');
  await writeFile(path.join(output,'index.html'),html.replace('<html lang="zh-CN">','<html lang="zh-CN" data-hosting="github-pages">'));
  await writeFile(path.join(output,'.nojekyll'),'');
  return output;
}
if(process.argv[1]===fileURLToPath(import.meta.url))console.log('Pages files: '+await buildPages(process.argv[2]));

