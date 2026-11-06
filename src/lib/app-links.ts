import release from './release-app-links.json';
export function androidAppLinks(fingerprints=process.env.ANDROID_APP_SIGNING_SHA256||release.androidSigningSha256.join(',')){
 const values=(fingerprints||'').split(',').map(value=>value.trim()).filter(Boolean);
 if(!values.length||values.some(value=>!/^([A-F0-9]{2}:){31}[A-F0-9]{2}$/i.test(value)))return null;
 return [{relation:['delegate_permission/common.handle_all_urls'],target:{namespace:'android_app',package_name:release.androidPackage,sha256_cert_fingerprints:values}}];
}
export function appleAppLinks(team=process.env.APPLE_TEAM_ID,bundle=process.env.IOS_BUNDLE_IDENTIFIER){
 if(!team||!bundle||!/^[A-Z0-9]{10}$/.test(team)||!/^[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/.test(bundle))return null;
 return {applinks:{details:[{appIDs:[team+'.'+bundle],components:[{'/':'/events'},{'/':'/events/*'},{'/':'/story/*'}]}]}};
}
