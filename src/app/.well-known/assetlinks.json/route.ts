import { androidAppLinks } from '../../../lib/app-links';
export const dynamic='force-dynamic';
export function GET(){const data=androidAppLinks();return data?Response.json(data,{headers:{'Cache-Control':'public, max-age=3600'}}):Response.json({error:'Release app-link identity is not configured'},{status:503,headers:{'Cache-Control':'no-store'}});}
