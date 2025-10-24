import{bw as r,r as i,j as n}from"./index-e3V0CD7Y.js";const c=()=>{const{isDark:l}=r(),a=i.useRef(null);return i.useEffect(()=>{const e=a.current;if(!e)return;const s=()=>{try{e.contentWindow?.postMessage({type:"SET_THEME",theme:"light"},"*"),e.contentWindow?.postMessage({type:"ADD_TOP_PADDING",padding:"80px"},"*"),setTimeout(()=>{try{const t=e.contentDocument||e.contentWindow?.document;if(t){const o=t.createElement("style");o.textContent=`
                body { 
                  padding-top: 80px !important; 
                  margin-top: 0 !important;
                }
                .navbar, .header, nav, [class*="nav"], [class*="header"] {
                  z-index: 999 !important;
                }
                .main-content, .content, main, [class*="main"], [class*="content"] {
                  margin-top: 80px !important;
                  padding-top: 20px !important;
                }
              `,t.head?.appendChild(o)}}catch{console.log("Unable to inject CSS directly into iframe")}},1e3)}catch{console.log("Unable to communicate with iframe for theme setting and padding")}};return e.addEventListener("load",s),()=>e.removeEventListener("load",s)},[]),n.jsx("div",{className:"w-full h-full bg-white",style:{paddingTop:"80px"},"data-testid":"business-intel",children:n.jsx("iframe",{ref:a,src:"https://ai-powered-analytics-fibd.bolt.host",className:"w-full border-0",style:{height:"calc(100vh - 80px)",minHeight:"calc(100vh - 80px)"},title:"Business Intelligence Platform",allow:"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",allowFullScreen:!0})})},p=()=>n.jsx("div",{className:"fixed inset-0 z-40",style:{top:"80px"},children:n.jsx(c,{})});export{p as default};
