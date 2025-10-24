import{r as o,bx as y,j as e,br as b,bs as R,cy as E,bq as C}from"./index-e3V0CD7Y.js";class D{constructor(t){this.iframe=null,this.maxAttempts=3,this.retryDelay=2e3,this.messageCallbacks=[],this.statusCallback=t,this.status={isConnected:!1,lastSync:null,dealCount:0,connectionAttempts:0},this.messageHandler=this.handleMessage.bind(this),window.addEventListener("message",this.messageHandler)}setIframe(t){this.iframe=t}handleMessage(t){if(["https://cheery-syrniki-b5b6ca.netlify.app","http://localhost:3000","http://127.0.0.1:3000"].some(s=>t.origin.includes(s.replace("https://","").replace("http://",""))))try{const s=t.data;if(!s||s.source!=="REMOTE_PIPELINE")return;switch(console.log("📨 Remote pipeline message received:",s.type),s.type){case"REMOTE_READY":console.log("🎯 Remote pipeline ready, initializing..."),this.updateStatus({connectionAttempts:this.status.connectionAttempts+1}),this.initializePipeline();break;case"CRM_INIT_COMPLETE":this.updateStatus({isConnected:!0,lastSync:new Date,dealCount:s.data?.dealsReceived||0}),console.log("✅ Remote pipeline initialized successfully");break;case"BRIDGE_READY":this.updateStatus({connectionAttempts:this.status.connectionAttempts+1}),setTimeout(()=>this.initializePipeline(),500);break;case"DEAL_UPDATED":case"DEAL_CREATED":case"DEAL_DELETED":case"DEAL_STAGE_CHANGED":this.updateStatus({lastSync:new Date}),this.messageCallbacks.forEach(r=>{try{r(s.data)}catch(c){console.error("Message callback failed:",c)}});break;case"CONNECTION_ERROR":this.updateStatus({isConnected:!1,errorMessage:s.data?.error||"Connection error"});break}}catch(s){console.error("❌ Failed to handle remote pipeline message:",s)}}updateStatus(t){this.status={...this.status,...t},this.statusCallback(this.status)}sendMessage(t,n=null){if(!this.iframe?.contentWindow)return console.warn("⚠️ Remote pipeline iframe not ready"),!1;const s={type:t,data:n,source:"CRM",timestamp:Date.now()};try{return this.iframe.contentWindow.postMessage(s,"*"),console.log("📤 Message sent to remote pipeline:",t),!0}catch(r){return console.error("❌ Failed to send message to remote pipeline:",r),!1}}initializePipeline(){if(!this.iframe?.contentWindow){console.warn("⚠️ Remote pipeline iframe not ready for initialization");return}this.injectBridgeCode(),setTimeout(()=>{this.sendInitializationData()},1e3)}injectBridgeCode(){const t=`
      (function() {
        if (window.crmBridge) {
          console.log('CRM Bridge already exists');
          window.parent.postMessage({
            type: 'BRIDGE_READY',
            source: 'REMOTE_PIPELINE',
            timestamp: Date.now()
          }, '*');
          return;
        }

        console.log('Injecting CRM Bridge code...');
        
        class CRMPipelineBridge {
          constructor() {
            this.deals = [];
            this.stages = [];
            this.isInitialized = false;
            window.addEventListener('message', this.handleMessage.bind(this));
            console.log('CRM Pipeline Bridge initialized');
            
            // Notify parent that bridge is ready
            window.parent.postMessage({
              type: 'BRIDGE_READY',
              source: 'REMOTE_PIPELINE',
              timestamp: Date.now()
            }, '*');
          }

          handleMessage(event) {
            try {
              const message = event.data;
              if (!message || message.source !== 'CRM') return;
              
              console.log('CRM message received:', message.type);
              
              switch (message.type) {
                case 'CRM_INIT':
                  this.handleInit(message.data);
                  break;
                case 'SYNC_DEALS':
                  this.handleDealsSync(message.data.deals);
                  break;
              }
            } catch (error) {
              console.error('Failed to handle CRM message:', error);
            }
          }

          handleInit(data) {
            console.log('CRM initialization received');
            this.deals = data.pipelineData.deals || [];
            this.stages = data.pipelineData.stages || [];
            this.isInitialized = true;
            
            // Update UI if possible
            this.updateUI();
            
            // Confirm initialization
            window.parent.postMessage({
              type: 'CRM_INIT_COMPLETE',
              data: {
                dealsReceived: this.deals.length,
                stagesReceived: this.stages.length
              },
              source: 'REMOTE_PIPELINE',
              timestamp: Date.now()
            }, '*');
          }

          handleDealsSync(deals) {
            console.log('Syncing deals:', deals.length);
            this.deals = deals;
            this.updateUI();
          }

          updateUI() {
            // Try to update the UI with deal data
            if (window.updatePipelineData) {
              window.updatePipelineData(this.deals, this.stages);
            }
            
            // Dispatch custom event for the app to listen
            window.dispatchEvent(new CustomEvent('crmDataUpdated', {
              detail: { deals: this.deals, stages: this.stages }
            }));
            
            console.log('UI updated with', this.deals.length, 'deals');
          }

          sendToCRM(type, data) {
            window.parent.postMessage({
              type,
              data,
              source: 'REMOTE_PIPELINE',
              timestamp: Date.now()
            }, '*');
          }
        }

        window.crmBridge = new CRMPipelineBridge();
        console.log('CRM Bridge injection complete');
      })();
    `;try{this.iframe?.contentWindow&&setTimeout(()=>{try{this.iframe?.contentWindow&&(this.iframe.contentWindow.eval(t),console.log("Bridge code injected via eval"))}catch{console.warn("Direct injection failed, trying postMessage method"),this.sendMessage("INJECT_BRIDGE",{code:t})}},500)}catch(n){console.warn("Bridge injection failed:",n)}}sendInitializationData(){const t=[],n=[],s={crmInfo:{name:"Smart CRM Dashboard",version:"2.0.0",timestamp:new Date().toISOString()},pipelineData:{deals:t,stages:[{id:"lead",name:"Lead",order:1},{id:"qualified",name:"Qualified",order:2},{id:"proposal",name:"Proposal",order:3},{id:"negotiation",name:"Negotiation",order:4},{id:"won",name:"Won",order:5},{id:"lost",name:"Lost",order:6}]},contactsData:n};this.sendMessage("CRM_INIT",s)}retry(){return this.status.connectionAttempts>=this.maxAttempts?(this.updateStatus({isConnected:!1,errorMessage:"Max connection attempts reached"}),!1):(this.updateStatus({isConnected:!1,errorMessage:void 0,connectionAttempts:this.status.connectionAttempts+1}),this.iframe&&(this.iframe.src=this.iframe.src),!0)}getStatus(){return{...this.status}}onMessage(t){this.messageCallbacks.push(t)}syncDeals(t){this.sendMessage("SYNC_DEALS",{deals:t}),this.updateStatus({lastSync:new Date,dealCount:t.length})}disconnect(){this.updateStatus({isConnected:!1,lastSync:null,dealCount:0,errorMessage:void 0}),this.iframe&&(this.iframe.src="about:blank")}destroy(){window.removeEventListener("message",this.messageHandler),this.messageCallbacks=[]}}const N=()=>{const l=o.useRef(null),t=o.useRef(null),[n,s]=o.useState(!0),[r,c]=o.useState(!1),[d,m]=o.useState(null),{deals:u,fetchDeals:p}=y(),g="https://cheery-syrniki-b5b6ca.netlify.app";o.useEffect(()=>(t.current||(t.current=new D(a=>{c(a.isConnected),a.errorMessage&&m(a.errorMessage)}),t.current.onMessage("REMOTE_READY",()=>{console.log("🎉 Remote pipeline is ready"),c(!0),s(!1)}),t.current.onMessage("DEAL_CREATED",a=>{console.log("🆕 Deal created in remote pipeline:",a),p()}),t.current.onMessage("DEAL_UPDATED",a=>{console.log("✏️ Deal updated in remote pipeline:",a),p()}),t.current.onMessage("DEAL_DELETED",a=>{console.log("🗑️ Deal deleted in remote pipeline:",a),p()}),t.current.onMessage("REQUEST_PIPELINE_DATA",()=>{console.log("📊 Remote pipeline requesting CRM data");const a=u.map(i=>({id:i.id,title:i.title,value:i.value,stage:i.stage.toString(),contactId:i.contactId,contactName:i.contactName,company:i.company,probability:i.probability,expectedCloseDate:i.expectedCloseDate,notes:i.notes,createdAt:i.createdAt,updatedAt:i.updatedAt}));t.current&&t.current.syncDeals(a)})),()=>{t.current&&(t.current=null)}),[u,p]),o.useEffect(()=>{const a=l.current;if(a&&t.current){const i=()=>{console.log("📺 Remote pipeline iframe loaded");try{const h=a.contentDocument||a.contentWindow?.document;if(h&&h.title==="Page not found"){console.error("❌ Remote app not found - 404 error"),m("The remote React app is not available at this URL. Please check if the app is properly deployed."),s(!1),c(!1);return}}catch{console.log("📝 Cross-origin iframe loaded (expected)")}m(null),s(!1),t.current&&(t.current.setIframe(a),setTimeout(()=>{t.current&&console.log("🔗 Bridge communication initialized")},2e3))},x=()=>{console.error("❌ Failed to load remote pipeline"),m("Network error: Could not connect to the remote pipeline application. Check your internet connection."),s(!1),c(!1)};return a.addEventListener("load",i),a.addEventListener("error",x),()=>{a.removeEventListener("load",i),a.removeEventListener("error",x)}}},[]);const f=()=>{l.current&&(s(!0),m(null),l.current.src=l.current.src)},w=()=>{window.open("https://cheery-syrniki-b5b6ca.netlify.app","_blank")};return e.jsxs("div",{className:"h-full flex flex-col bg-gray-50",children:[e.jsxs("div",{className:"flex items-center justify-between p-4 bg-white border-b border-gray-200",children:[e.jsxs("div",{className:"flex items-center space-x-4",children:[e.jsxs("div",{children:[e.jsx("h1",{className:"text-2xl font-bold text-gray-900",children:"Remote Pipeline"}),e.jsx("p",{className:"text-sm text-gray-600",children:"External pipeline management system"})]}),e.jsx("div",{className:"flex items-center space-x-2",children:r?e.jsxs("div",{className:"flex items-center text-green-600 text-sm",children:[e.jsx(b,{className:"w-4 h-4 mr-1"}),"Connected"]}):e.jsxs("div",{className:"flex items-center text-gray-500 text-sm",children:[e.jsx(R,{className:"w-4 h-4 mr-1"}),n?"Connecting...":"Disconnected"]})})]}),e.jsxs("div",{className:"flex items-center space-x-2",children:[e.jsxs("button",{onClick:f,disabled:n,className:"flex items-center px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50",children:[e.jsx(E,{className:`w-4 h-4 mr-1 ${n?"animate-spin":""}`}),"Refresh"]}),e.jsxs("button",{onClick:w,className:"flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700",children:[e.jsx(C,{className:"w-4 h-4 mr-1"}),"Open in New Tab"]})]})]}),e.jsxs("div",{className:"flex-1 relative",children:[d&&e.jsx("div",{className:"absolute inset-0 flex items-center justify-center bg-red-50",children:e.jsxs("div",{className:"text-center",children:[e.jsx("div",{className:"text-red-600 mb-2",children:e.jsx("svg",{className:"w-12 h-12 mx-auto",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"})})}),e.jsx("h3",{className:"text-lg font-medium text-red-800 mb-1",children:"Error Loading Remote Pipeline"}),e.jsx("p",{className:"text-red-600 mb-4",children:d}),e.jsx("button",{onClick:f,className:"px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700",children:"Try Again"})]})}),n&&!d&&e.jsx("div",{className:"absolute inset-0 flex items-center justify-center bg-gray-50",children:e.jsxs("div",{className:"text-center",children:[e.jsx(E,{className:"w-8 h-8 animate-spin text-blue-600 mx-auto mb-4"}),e.jsx("h3",{className:"text-lg font-medium text-gray-800 mb-1",children:"Loading Remote Pipeline"}),e.jsx("p",{className:"text-gray-600",children:"Connecting to external pipeline system..."})]})}),e.jsx("iframe",{ref:l,src:g,className:"w-full h-full border-0",title:"Remote Pipeline System",allow:"clipboard-read; clipboard-write; fullscreen; microphone; camera",sandbox:"allow-same-origin allow-scripts allow-forms allow-popups allow-navigation allow-top-navigation",loading:"lazy"})]}),e.jsxs("div",{className:"flex items-center justify-between px-4 py-2 bg-white border-t border-gray-200 text-xs text-gray-500",children:[e.jsxs("div",{className:"flex items-center space-x-4",children:[e.jsxs("span",{children:["Remote URL: ",g]}),r&&e.jsx("span",{className:"text-green-600",children:"● Bridge Active"}),d&&e.jsx("span",{className:"text-red-600",children:"● Connection Failed"})]}),e.jsxs("div",{className:"flex items-center space-x-2",children:[e.jsx("span",{children:"CRM Integration v1.0"}),!n&&!d&&!r&&e.jsx("span",{className:"text-yellow-600",children:"● Checking..."})]})]})]})};export{N as default};
