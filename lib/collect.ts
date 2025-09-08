// src/lib/collect.ts
export type Consent = { hardware?: boolean; network?: boolean; media?: boolean; permissions?: boolean; webgl?: boolean; geolocation?: boolean; };

export async function collectAutoMeta() {
  const meta: any = { collectedAt: new Date().toISOString() };
  try {
    meta.basic = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      languages: navigator.languages,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        availWidth: window.screen.availWidth,
        availHeight: window.screen.availHeight,
        colorDepth: window.screen.colorDepth,
        pixelRatio: window.devicePixelRatio
      },
      viewport: { w: window.innerWidth, h: window.innerHeight },
      platform: navigator.platform,
      touch: 'ontouchstart' in window,
    };
    const nc: any = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    meta.networkLite = nc ? { effectiveType: nc.effectiveType, downlink: nc.downlink, rtt: nc.rtt, saveData: nc.saveData } : null;

    try {
      const canvas = document.createElement('canvas');
      const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as any;
      if (gl) {
        const dbgInfo = gl.getExtension('WEBGL_debug_renderer_info');
        meta.webgl = {
          vendor: dbgInfo ? gl.getParameter(dbgInfo.UNMASKED_VENDOR_WEBGL) : null,
          renderer: dbgInfo ? gl.getParameter(dbgInfo.UNMASKED_RENDERER_WEBGL) : null
        };
      }
    } catch {}
  } catch (e) { meta.error = String(e); }
  return meta;
}

export async function collectGated(consent: Consent = {}) {
  const meta: any = { gatedAt: new Date().toISOString(), consent };
  try {
    if (consent.hardware) {
      const nav: any = navigator;
      const battery = nav.getBattery ? await nav.getBattery() : null;
      meta.hardware = { hardwareConcurrency: navigator.hardwareConcurrency, deviceMemory: (nav.deviceMemory || null), battery: battery ? { charging: battery.charging, level: battery.level, chargingTime: battery.chargingTime, dischargingTime: battery.dischargingTime } : null };
    }
    if (consent.network) {
      const nc: any = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      meta.network = nc ? { effectiveType: nc.effectiveType, downlink: nc.downlink, rtt: nc.rtt, saveData: nc.saveData } : null;
    }
    if (consent.media) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        meta.mediaDevices = devices.map(d => ({ kind: d.kind, label: d.label, groupId: d.groupId, deviceId: d.deviceId ? 'hash:' + hashId(d.deviceId) : null }));
      } catch {}
    }
    if (consent.permissions) {
      const qs = ['camera', 'microphone', 'geolocation', 'notifications', 'persistent-storage', 'push'];
      const statuses: Record<string, string> = {};
      if ((navigator as any).permissions?.query) {
        for (const name of qs) {
          try { const st = await (navigator as any).permissions.query({ name } as any); statuses[name] = st.state; } catch {}
        }
      }
      meta.permissions = statuses;
    }
    if (consent.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000 });
        });
        meta.geolocation = { lat: pos.coords.latitude, lon: pos.coords.longitude, acc_m: pos.coords.accuracy, alt: pos.coords.altitude, altAcc: pos.coords.altitudeAccuracy };
      } catch {}
    }
    if (consent.webgl) {
      try {
        const canvas = document.createElement('canvas');
        const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as any;
        if (gl) {
          const dbgInfo = gl.getExtension('WEBGL_debug_renderer_info');
          meta.webgl = { vendor: dbgInfo ? gl.getParameter(dbgInfo.UNMASKED_VENDOR_WEBGL) : null, renderer: dbgInfo ? gl.getParameter(dbgInfo.UNMASKED_RENDERER_WEBGL) : null };
        }
      } catch {}
    }
  } catch (e) { meta.error = String(e); }
  return meta;
}

function hashId(s: string) { let h = 0; for (let i=0;i<s.length;i++) { h = (h<<5) - h + s.charCodeAt(i); h|=0; } return (h >>> 0).toString(16); }
