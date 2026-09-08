// Browser cookie choices and event listeners require this isolated interactive leaf; article content stays on the server.
'use client';
import {useEffect,useState} from 'react';
import Script from 'next/script';
import {showPreferences} from 'vanilla-cookieconsent';
import type {ConsentSettings,MeasurementRuntime} from '@/lib/site-types';
import {startConsent} from '@/lib/measurement/browser';

export function ConsentControls({consent,measurement,locale}:{consent:ConsentSettings;measurement:MeasurementRuntime;locale:string}) {
  const [permitted,setPermitted]=useState(false);
  useEffect(()=>startConsent(consent,measurement,locale,setPermitted),[consent,measurement,locale]);
  return <>
    <button type="button" data-consent-settings onClick={()=>showPreferences()}>{consent.ui.settings}</button>
    {permitted&&<>
      <Script id="consented-analytics" src={measurement.analyticsScript} strategy="afterInteractive" crossOrigin="anonymous" referrerPolicy="no-referrer" data-endpoint={measurement.analyticsEndpoint} data-sdkn="@vercel/analytics/next" data-sdkv="2.0.1" />
      <Script id="consented-speed" src={measurement.speedScript} strategy="afterInteractive" crossOrigin="anonymous" referrerPolicy="no-referrer" data-endpoint={measurement.speedEndpoint} data-sdkn="@vercel/speed-insights/next" data-sdkv="2.0.0" />
    </>}
  </>;
}
