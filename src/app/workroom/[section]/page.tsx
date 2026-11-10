import {notFound} from 'next/navigation';
import {ApplicationFrame} from '@/components/application/frame';
import {AccountToolsPage} from '@/components/application/account-tools';
import {WorkroomLayout,WorkroomPage} from '@/components/application/workroom';
import {RequireAccount} from '@/components/application/ui';
const tools:Record<string,string>={analytics:'author-analytics',promotions:'promotions','author-center':'author-center',notifications:'inbox','creator-center':'creator-center','payout-request':'payout-request','payout-history':'payout-history'};
export const metadata={title:'Workroom',robots:{index:false,follow:false}};
export default async function WorkroomSection({params}:{params:Promise<{section:string}>}){
 const {section}=await params;
 if(section==='earnings')return <ApplicationFrame><WorkroomPage section="earnings"/></ApplicationFrame>;
 if(!tools[section])notFound();
 return <ApplicationFrame><RequireAccount><WorkroomLayout><AccountToolsPage path={tools[section]}/></WorkroomLayout></RequireAccount></ApplicationFrame>;
}
