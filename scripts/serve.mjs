import {createServer} from 'node:http';
import {networkInterfaces} from 'node:os';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const port=Number(process.env.PORT)||8080;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.txt':'text/plain; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.json':'application/json'};
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const path=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!path.startsWith(resolve(root)+sep)){res.writeHead(403);res.end('Forbidden');return;}
  if(!(await stat(path)).isFile())throw new Error('Not a file');
  const data=await readFile(path);res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:data);
 }catch{res.writeHead(404);res.end('Not found');}
});
const host=process.env.HOST||'127.0.0.1';
server.listen(port,host,()=>{
 console.log(`Reign of Doom: http://127.0.0.1:${port} — Ctrl+C stops the server.`);
 if(host==='0.0.0.0')for(const entries of Object.values(networkInterfaces()))for(const entry of entries??[])if(entry.family==='IPv4'&&!entry.internal)console.log(`Tablet on the same Wi-Fi: http://${entry.address}:${port}`);
});
