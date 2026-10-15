import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRadar} from '../server/radar.mjs';

export async function updateRadar(output=path.resolve('dist'),cacheDir=path.resolve('.radar-cache')){
  const radar=await createRadar({dataDir:cacheDir,timeout:20000}).get();
  await mkdir(output,{recursive:true});
  await writeFile(path.join(output,'radar.json'),JSON.stringify({...radar,hosting:'github-pages',generatedAt:new Date().toISOString()}));
  // A new unavailable snapshot is published as unavailable rather than leaving yesterday's data labelled today.
  console.log(JSON.stringify({day:radar.day,count:radar.items.length,sources:radar.sources.map(s=>({name:s.name,status:s.status,count:s.count}))}));
  return radar;
}
if(process.argv[1]===fileURLToPath(import.meta.url))await updateRadar(process.argv[2],process.argv[3]);
