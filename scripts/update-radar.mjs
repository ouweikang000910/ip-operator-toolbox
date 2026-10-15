import {mkdir,writeFile,readFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRadar} from '../server/radar.mjs';
import {extendRadarHistory} from '../public/radar-search.mjs';

export async function updateRadar(output=path.resolve('dist'),cacheDir=path.resolve('.radar-cache')){
  const radar=await createRadar({dataDir:cacheDir,timeout:20000}).get();
  const historyFile=path.join(cacheDir,'search-history.json');let previous=null;
  try{previous=JSON.parse(await readFile(historyFile,'utf8'));}catch{}
  // Keep the published history as a fallback if GitHub evicts the Actions cache.
  if(!previous&&process.env.RADAR_HISTORY_URL){
    try{
      const response=await fetch(process.env.RADAR_HISTORY_URL,{signal:AbortSignal.timeout(10000)});
      if(response.ok){const text=await response.text();if(text.length<=20*1024*1024)previous=JSON.parse(text);}
    }catch{console.log('Previous published history unavailable; collecting current hotlists.');}
  }
  const history=extendRadarHistory(previous,radar);
  await mkdir(cacheDir,{recursive:true});
  await writeFile(historyFile+'.tmp',JSON.stringify(history));await rename(historyFile+'.tmp',historyFile);
  await mkdir(output,{recursive:true});
  await writeFile(path.join(output,'radar.json'),JSON.stringify({...radar,hosting:'github-pages',generatedAt:new Date().toISOString()}));
  await writeFile(path.join(output,'radar-search.json'),JSON.stringify(history));
  // A new unavailable snapshot is published as unavailable rather than leaving yesterday's data labelled today.
  console.log(JSON.stringify({day:radar.day,count:radar.items.length,searchCandidates:radar.searchItems.length,historyItems:history.items.length,historyDays:history.days,sources:radar.sources.map(s=>({name:s.name,status:s.status,count:s.count}))}));
  return radar;
}
if(process.argv[1]===fileURLToPath(import.meta.url))await updateRadar(process.argv[2],process.argv[3]);
