import * as CookieConsent from 'vanilla-cookieconsent';
import {track} from '@vercel/analytics';
import type {BeforeSendEvent} from '@vercel/analytics';
import type {BeforeSendMiddleware} from '@vercel/speed-insights';
import type {ConsentSettings,MeasurementRuntime} from '../site-types';
import {renderedMeasurementPage} from '../seo/measurement';
import {analyticsConsent,clickProperties,googleConsent,publicMeasurementUrl} from './policy';

type ConsentCommand = ['consent','default'|'update',ReturnType<typeof googleConsent>];
declare global { interface Window {dataLayer?: unknown[];gtag?: (...command:ConsentCommand)=>void} }
function queueGoogleConsent() {
  // Google's gtag protocol uses the native arguments object in dataLayer.
  // eslint-disable-next-line prefer-rest-params -- gtag expects an Arguments object, not a replacement array.
  (window.dataLayer??=[]).push(arguments);
}

export function startConsent(consent:ConsentSettings,measurement:MeasurementRuntime,locale:string,onPermission:(enabled:boolean)=>void):()=>void {
  let active=false,disposed=false;
  const page=()=>{const canonical=renderedMeasurementPage(document);return canonical?publicMeasurementUrl(canonical,measurement.origin,measurement.excludedPaths):null;};
  const allowed=()=>!disposed&&measurement.mode!=='off'&&!!page()&&analyticsConsent(document.cookie,consent);
  // The provider cannot redact referrers through beforeSend. Suppress measurement when one contains URL parameters.
  const cleanReferrer=()=>{try{return !document.referrer||(!new URL(document.referrer).search&&!new URL(document.referrer).hash);}catch{return false;}};
  const canSend=()=>allowed()&&cleanReferrer();
  window.gtag??=queueGoogleConsent;
  let lastChoice:boolean|undefined;
  const command=(action:'default'|'update',granted:boolean)=>{if(action==='default'||lastChoice!==granted){window.gtag?.('consent',action,googleConsent(granted));lastChoice=granted;}};
  command('default',false);
  window.va??=((...args)=>{(window.vaq??=[]).push(args);});
  window.si??=((...args)=>{(window.siq??=[]).push(args);});
  const analyticsFilter=(event:BeforeSendEvent)=>canSend()?{...event,url:publicMeasurementUrl(event.url,measurement.origin,measurement.excludedPaths)??page()!}:null;
  const speedFilter:BeforeSendMiddleware=event=>canSend()?{...event,url:publicMeasurementUrl(event.url,measurement.origin,measurement.excludedPaths)??page()!}:null;
  window.va('beforeSend',analyticsFilter);window.si('beforeSend',speedFilter);
  const channel=typeof BroadcastChannel==='undefined'?null:new BroadcastChannel(consent.cookieName);
  // A final transport check covers provider work queued after beforeSend, including pagehide/visibility flushes.
  // Only the configured measurement endpoints are intercepted; navigation and application requests are untouched.
  const endpoints=[...['view','event','session','identify','group'].map(path=>new URL(`${measurement.analyticsEndpoint}/${path}`,location.origin).href),new URL(measurement.speedEndpoint,location.origin).href];
  const isMeasurement=(value:RequestInfo|URL)=>{try{return endpoints.includes(new URL(value instanceof Request?value.url:String(value),location.origin).href);}catch{return false;}};
  const originalFetch=window.fetch,originalBeacon=navigator.sendBeacon;
  window.fetch=function(input,init){
    if(!isMeasurement(input))return originalFetch.call(window,input,init);
    if(!canSend())return Promise.resolve(new Response(null,{status:204}));
    return originalFetch.call(window,input,{...init,credentials:'omit',referrerPolicy:'no-referrer'});
  };
  navigator.sendBeacon=function(url,data){
    if(!isMeasurement(url))return originalBeacon.call(navigator,url,data);
    if(!canSend())return false;
    // Beacon has no credentials option. Use credential-free fetch for these known endpoints.
    void window.fetch(url,{method:'POST',body:data,keepalive:true,mode:'no-cors'}).catch(()=>{});return true;
  };
  const synchronize=(broadcast=false)=>{
    if(disposed)return;
    const enabled=allowed();command('update',enabled);
    if(broadcast)channel?.postMessage('choice-changed');
    onPermission(enabled&&cleanReferrer());
    if(active&&!enabled){window.vaq=[];window.siq=[];location.reload();}
    active=enabled;
  };
  const click=(event:MouseEvent)=>{
    if(!canSend()||(event.type==='auxclick'&&event.button!==1)||(event.type==='click'&&event.button!==0))return;
    const anchor=event.target instanceof Element?event.target.closest<HTMLAnchorElement>('a[data-affiliate-id]'):null;
    if(!anchor||anchor.origin!==location.origin||!anchor.pathname.startsWith('/go/')||anchor.search||anchor.hash)return;
    const properties=clickProperties(anchor.dataset,measurement.affiliateOrigins);
    if(properties)try{track(measurement.eventName,properties);}catch{/* Measurement failure must not block the native link. */}
  };
  document.addEventListener('click',click,{capture:true});document.addEventListener('auxclick',click,{capture:true});
  const refresh=()=>synchronize();
  const remoteChoice=()=>{command('update',allowed());location.reload();};
  channel?.addEventListener('message',remoteChoice);window.addEventListener('focus',refresh);window.addEventListener('pageshow',refresh);
  document.addEventListener('visibilitychange',refresh);
  const timer=window.setInterval(refresh,60000);
  if(page())void CookieConsent.run({
    mode:'opt-in',revision:consent.revision,hideFromBots:false,disablePageInteraction:false,manageScriptTags:false,
    cookie:{name:consent.cookieName,domain:location.hostname,path:'/',sameSite:'Lax',secure:location.protocol==='https:',expiresAfterDays:consent.retentionDays,useLocalStorage:false},
    guiOptions:{consentModal:{layout:'bar',position:'bottom',equalWeightButtons:true},preferencesModal:{layout:'box',equalWeightButtons:true}},
    categories:{necessary:{enabled:true,readOnly:true},analytics:{enabled:false}},
    onConsent:()=>synchronize(),onChange:()=>synchronize(true),
    language:{default:locale,translations:{[locale]:{
      consentModal:{title:consent.ui.title,description:consent.ui.description,acceptAllBtn:consent.ui.accept,acceptNecessaryBtn:consent.ui.reject,showPreferencesBtn:consent.ui.customize,revisionMessage:consent.ui.revision,footer:consent.ui.policyLink},
      preferencesModal:{title:consent.ui.settings,acceptAllBtn:consent.ui.accept,acceptNecessaryBtn:consent.ui.reject,savePreferencesBtn:consent.ui.save,closeIconLabel:consent.ui.close,sections:[
        {title:consent.ui.necessary,description:consent.ui.necessaryDescription,linkedCategory:'necessary'},
        {title:consent.ui.analytics,description:consent.ui.analyticsDescription,linkedCategory:'analytics'},
      ]},
    }}},
  }).then(()=>{if(!disposed)synchronize();});
  return ()=>{
    disposed=true;onPermission(false);window.clearInterval(timer);channel?.close();
    document.removeEventListener('click',click,true);document.removeEventListener('auxclick',click,true);
    window.removeEventListener('focus',refresh);window.removeEventListener('pageshow',refresh);document.removeEventListener('visibilitychange',refresh);
    window.fetch=originalFetch;navigator.sendBeacon=originalBeacon;
    CookieConsent.reset(false);
  };
}
