export function createDraftQueue<T>(write:(draft:T)=>Promise<void>,onSaved:(revision:number)=>void=()=>{}){
 let revision=0,saved=0,current:T,pending:Promise<void>|null=null;
 const flush=():Promise<void>=>{if(pending)return pending;pending=(async()=>{while(saved<revision){const target=revision,draft=structuredClone(current);await write(draft);saved=target;onSaved(saved);}})().finally(()=>{pending=null;});return pending;};
 return {update(draft:T){current=draft;return ++revision;},flush,get dirty(){return saved<revision;},get revision(){return revision;}};
}
