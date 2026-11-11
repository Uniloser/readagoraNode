import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const require=createRequire(import.meta.url);
const {transformSync}=require('next/dist/build/swc');
const file='../src/components/application/event-vote.tsx';
const code=transformSync(readFileSync(new URL(file,import.meta.url),'utf8'),{filename:file,jsc:{parser:{syntax:'typescript',tsx:true},transform:{react:{runtime:'automatic'}},target:'es2022'},module:{type:'commonjs',noInterop:true}}).code;
function harness(){
 const states=[],body={};let index=0,portal;
 const overrides={react:{useState:initial=>{const i=index++;if(!(i in states))states[i]=initial;return [states[i],value=>{states[i]=value;}];},useRef:()=>({current:null}),useEffect(){}},'react-dom':{createPortal:(child,target)=>{portal={child,target};return portal;}},'next/link':{default:()=>null},'@/lib/shared/story-competitions.js':{},'./provider':{useApplication:()=>({session:null}),useResource:()=>({data:[{id:'event',votingOpen:true,entries:[{id:'story',title:'Story',author_id:'writer'}]}]})},'./ui':{enc:encodeURIComponent,list:value=>Array.isArray(value)?value:[]}};
 const exports={};vm.runInNewContext(code,{exports,document:{body},require:name=>name in overrides?overrides[name]:require(name)});
 return {body,render(){index=0;portal=null;return exports.EventVote({storyId:'story'});},get portal(){return portal;}};
}
test('vote dialog is portaled to the document body rather than laid out in the story row',()=>{
 const h=harness();let row=h.render();assert.equal(h.portal,null);
 row.props.children[0].props.onClick();row=h.render();
 assert.equal(h.portal.target,h.body);
 assert.match(h.portal.child.props.className,/event-vote-backdrop/);
 assert.equal(h.portal.child.props.children.props.role,'dialog');
 assert.equal(h.portal.child.props.children.props['aria-modal'],'true');
 assert.equal(row.props.children[0].props.className,'event-upvote');
});
test('clicking inside the dialog keeps it open; clicking its backdrop closes it',()=>{
 const h=harness();h.render().props.children[0].props.onClick();h.render();
 const backdrop=h.portal.child,element={};backdrop.props.onClick({target:{},currentTarget:element});h.render();assert.ok(h.portal);
 h.portal.child.props.onClick({target:element,currentTarget:element});h.render();assert.equal(h.portal,null);
});
