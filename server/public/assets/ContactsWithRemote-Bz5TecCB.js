import{r as l,bj as w,bo as T,bp as y,j as r,bq as S,br as R,bs as M}from"./index-e3V0CD7Y.js";import{persistentAssistantService as E}from"./persistentAssistantService-1dAMUpe6.js";class I{constructor(e="*"){this.assistantService=E,this.activeIframes=new Set,this.origin=e,this.setupMessageListener(),this.initializeAssistants()}async initializeAssistants(){try{await this.assistantService.initialize(),console.log("✅ Assistant Bridge: Services initialized")}catch(e){console.error("❌ Assistant Bridge: Failed to initialize:",e)}}registerIframe(e){this.activeIframes.add(e),console.log("📱 Assistant Bridge: Iframe registered")}unregisterIframe(e){this.activeIframes.delete(e),console.log("📱 Assistant Bridge: Iframe unregistered")}setupMessageListener(){window.addEventListener("message",async e=>{if(this.origin!=="*"&&e.origin!==this.origin)return;const t=e.data;if(t.type?.startsWith("ASSISTANT_")){console.log("🤖 Assistant Bridge received:",t);try{const s=await this.handleAssistantMessage(t);this.sendResponse(e.source,t.type,s)}catch(s){console.error("❌ Assistant Bridge error:",s),this.sendResponse(e.source,t.type,{success:!1,error:s instanceof Error?s.message:"Unknown error"})}}})}async handleAssistantMessage(e){const{type:t,data:s,entityId:n,assistantType:i}=e;switch(t){case"ASSISTANT_START_CONVERSATION":return await this.startConversation(i,n,s.initialMessage);case"ASSISTANT_SEND_MESSAGE":return await this.sendMessage(i,n,s.message,s.threadId);case"ASSISTANT_GET_HISTORY":return await this.getConversationHistory(i,n);case"ASSISTANT_GET_STATUS":return await this.getAssistantStatus(i);case"ASSISTANT_GET_SUGGESTIONS":return await this.getAssistantSuggestions(i,n,s.context);case"ASSISTANT_QUICK_ANALYSIS":return await this.performQuickAnalysis(i,n,s);default:throw new Error(`Unknown assistant message type: ${t}`)}}async startConversation(e,t,s){try{const n=await this.assistantService.startConversation(e,t,s);return{success:!0,data:{response:n.content,threadId:n.threadId,assistantName:n.assistantName},threadId:n.threadId}}catch(n){return{success:!1,error:n instanceof Error?n.message:"Failed to start conversation"}}}async sendMessage(e,t,s,n){try{const i=await this.assistantService.sendMessage(e,t,s,n);return{success:!0,data:{response:i.content,threadId:i.threadId}}}catch(i){return{success:!1,error:i instanceof Error?i.message:"Failed to send message"}}}async getConversationHistory(e,t){try{return{success:!0,data:{history:await this.assistantService.getAssistantMemory(e,t,20)}}}catch(s){return{success:!1,error:s instanceof Error?s.message:"Failed to get history"}}}async getAssistantStatus(e){try{const s=this.assistantService.getAssistantStats().find(n=>n.type===e);return{success:!0,data:{assistant:s?{name:s.name,totalInteractions:s.totalInteractions,activeThreads:s.activeThreads.size,performance:s.performance,lastUsed:s.lastUsed,isActive:s.activeThreads.size>0}:null}}}catch(t){return{success:!1,error:t instanceof Error?t.message:"Failed to get status"}}}async getAssistantSuggestions(e,t,s){try{return{success:!0,data:{suggestions:await this.generateSuggestions(e,s)}}}catch(n){return{success:!1,error:n instanceof Error?n.message:"Failed to get suggestions"}}}async performQuickAnalysis(e,t,s){try{return{success:!0,data:{analysis:await this.performAnalysis(e,s)}}}catch(n){return{success:!1,error:n instanceof Error?n.message:"Failed to perform analysis"}}}async generateSuggestions(e,t){switch(e){case"contact":return["Ask about their recent projects","Schedule a follow-up meeting","Send relevant case studies","Connect on LinkedIn","Introduce to relevant team members"];case"deal":return["Review deal requirements","Schedule decision-maker meeting","Send proposal follow-up","Address outstanding concerns","Confirm timeline and budget"];default:return["Get AI insights","Analyze recent activity","Generate action items","Review performance metrics"]}}async performAnalysis(e,t){return{summary:`AI analysis for ${e}`,insights:["High engagement opportunity","Strong potential for conversion","Requires immediate follow-up"],recommendations:["Schedule meeting within 2 days","Send personalized proposal","Connect with decision maker"],score:Math.floor(Math.random()*100)+1}}sendResponse(e,t,s){const n={type:`${t}_RESPONSE`,data:s,timestamp:Date.now()};e.postMessage(n,this.origin),console.log("📤 Assistant Bridge response:",n)}broadcastAssistantUpdate(e,t,s){const n={type:"ASSISTANT_UPDATE",data:{assistantType:e,entityId:t,update:s},timestamp:Date.now()};this.activeIframes.forEach(i=>{i.contentWindow&&i.contentWindow.postMessage(n,this.origin)}),console.log("📡 Assistant Bridge broadcast:",n)}}const C=new I;class N{constructor(e="https://taupe-sprinkles-83c9ee.netlify.app"){this.iframe=null,this.messageHandlers=new Map,this.isConnected=!1,this.origin=e,this.setupMessageListener()}setIframe(e){this.iframe=e}setupMessageListener(){window.addEventListener("message",e=>{if(e.origin!==this.origin)return;const t=e.data;console.log("🔗 Bridge received message:",t),t.type==="REMOTE_READY"&&(this.isConnected=!0,console.log("✅ Remote contacts module is ready"));const s=this.messageHandlers.get(t.type);s&&s(t.data)})}onMessage(e,t){this.messageHandlers.set(e,t)}sendMessage(e,t){if(!this.iframe){console.warn("⚠️ Bridge: No iframe reference available");return}const s={type:e,data:t,timestamp:Date.now()};console.log("📤 Bridge sending message:",s),this.iframe.contentWindow?.postMessage(s,this.origin)}initializeCRM(e,t){this.sendMessage("CRM_INIT",{contacts:e,crmInfo:t,capabilities:{canCreate:!0,canUpdate:!0,canDelete:!0,canSync:!0}})}syncContacts(e){this.sendMessage("CONTACTS_SYNC",{contacts:e})}requestContactsData(){this.sendMessage("REQUEST_CONTACTS",{})}notifyContactCreated(e){this.sendMessage("LOCAL_CONTACT_CREATED",e)}notifyContactUpdated(e){this.sendMessage("LOCAL_CONTACT_UPDATED",e)}notifyContactDeleted(e){this.sendMessage("LOCAL_CONTACT_DELETED",{id:e})}sendNavigationCapabilities(){this.sendMessage("NAVIGATION_AVAILABLE",{routes:[{path:"/",name:"Dashboard"},{path:"/contacts",name:"Contacts"},{path:"/deals",name:"Deals"},{path:"/tasks",name:"Tasks"},{path:"/calendar",name:"Calendar"}]})}getConnectionStatus(){return this.isConnected}initializeAssistantForContact(e){C.registerIframe(this.iframe),this.sendMessage("ASSISTANT_AVAILABLE",{contactId:e,assistantType:"contact",capabilities:{canChat:!0,canAnalyze:!0,canSuggest:!0,canSocialResearch:!0}})}sendAssistantResponse(e,t){this.sendMessage("ASSISTANT_RESPONSE",{contactId:e,response:t})}requestContactAssistant(e,t,s){this.sendMessage("ASSISTANT_REQUEST",{contactId:e,action:t,data:s})}disconnect(){this.iframe&&C.unregisterIframe(this.iframe),this.isConnected=!1,this.messageHandlers.clear()}}const _=()=>{const c=l.useRef(null),e=l.useRef(null),[t,s]=l.useState(!1),{contacts:n,addContact:i,updateContact:m,deleteContact:u,fetchContacts:h}=w(),g=a=>({id:a.id,name:a.name||`${a.firstName||""} ${a.lastName||""}`.trim(),email:a.email,phone:a.phone,company:a.company,position:a.position||a.title,tags:a.tags||[],notes:a.notes,createdAt:typeof a.createdAt=="string"?a.createdAt:a.createdAt?.toISOString(),updatedAt:typeof a.updatedAt=="string"?a.updatedAt:a.updatedAt?.toISOString()});l.useEffect(()=>{const a=new N;return e.current=a,T.registerBridge("contacts",a),y.initialize(),a.onMessage("REMOTE_READY",()=>{s(!0),console.log("✅ Remote contacts module connected")}),a.onMessage("CONTACT_CREATED",o=>{console.log("📝 Remote contact created:",o),i(o)}),a.onMessage("CONTACT_UPDATED",o=>{console.log("✏️ Remote contact updated:",o),m(o.id,o)}),a.onMessage("CONTACT_DELETED",o=>{console.log("🗑️ Remote contact deleted:",o.id),u(o.id)}),a.onMessage("REQUEST_CONTACTS",()=>{console.log("📤 Remote requesting contacts data");const o=Object.values(n).map(g);a.syncContacts(o)}),a.onMessage("SYNC_REQUEST",()=>{console.log("🔄 Remote requesting full sync"),h()}),a.onMessage("NAVIGATE",o=>{console.log("🧭 Remote requesting navigation to:",o.route),o.route&&typeof o.route=="string"&&(o.route.startsWith("/")?window.location.pathname=o.route:window.location.hash="#/"+o.route)}),a.onMessage("NAVIGATE_BACK",()=>{console.log("⬅️ Remote requesting navigation back"),window.history.back()}),a.onMessage("NAVIGATE_TO_DASHBOARD",()=>{console.log("🏠 Remote requesting navigation to dashboard"),window.location.pathname="/"}),()=>{a.disconnect()}},[i,m,u,h]);const p=()=>{c.current&&e.current&&(e.current.setIframe(c.current),setTimeout(()=>{f()},1e3),setTimeout(()=>{const a=Object.values(n).map(g);e.current?.initializeCRM(a,{name:"CRM System",version:"1.0.0",features:["contacts","deals","tasks","ai-tools","navigation"]}),e.current?.sendNavigationCapabilities()},2e3))},f=()=>{if(c.current)try{const a=c.current,o=a.contentDocument||a.contentWindow?.document;if(!o){console.warn("⚠️ Cannot access iframe document - cross-origin restrictions");return}const d=o.createElement("script");d.textContent=`
        console.log('🚀 Injecting CRM Bridge into remote module');
        
        // CRM Integration Bridge for Remote Contacts Module
        class CRMBridge {
          constructor() {
            this.parentOrigin = '${window.location.origin}';
            this.isConnected = false;
            this.setupMessageListener();
            this.notifyReady();
          }

          setupMessageListener() {
            window.addEventListener('message', (event) => {
              if (event.origin !== this.parentOrigin) {
                return;
              }

              const { type, data } = event.data;
              console.log('📨 Remote module received:', type, data);

              switch (type) {
                case 'CRM_INIT':
                  this.handleCRMInit(data);
                  break;
                case 'CONTACTS_SYNC':
                  this.handleContactsSync(data.contacts);
                  break;
                case 'LOCAL_CONTACT_CREATED':
                  this.handleLocalContactCreated(data);
                  break;
                case 'LOCAL_CONTACT_UPDATED':
                  this.handleLocalContactUpdated(data);
                  break;
                case 'LOCAL_CONTACT_DELETED':
                  this.handleLocalContactDeleted(data);
                  break;
              }
            });
          }

          notifyReady() {
            this.sendToCRM('REMOTE_READY', { 
              moduleInfo: {
                name: 'Remote Contacts',
                version: '1.0.0',
                capabilities: ['create', 'read', 'update', 'delete']
              }
            });
          }

          handleCRMInit(data) {
            console.log('🚀 CRM initialized with', data.contacts?.length || 0, 'contacts');
            this.isConnected = true;
            
            // Try to integrate with existing contact management
            if (data.contacts && window.loadContactsFromCRM) {
              window.loadContactsFromCRM(data.contacts);
            } else {
              console.log('💾 CRM contacts available:', data.contacts);
            }
          }

          handleContactsSync(contacts) {
            console.log('🔄 Syncing', contacts.length, 'contacts from CRM');
            if (window.loadContactsFromCRM) {
              window.loadContactsFromCRM(contacts);
            }
          }

          handleLocalContactCreated(contact) {
            console.log('➕ Local contact created:', contact);
            if (window.addContactFromCRM) {
              window.addContactFromCRM(contact);
            }
          }

          handleLocalContactUpdated(contact) {
            console.log('✏️ Local contact updated:', contact);
            if (window.updateContactFromCRM) {
              window.updateContactFromCRM(contact);
            }
          }

          handleLocalContactDeleted(data) {
            console.log('🗑️ Local contact deleted:', data.id);
            if (window.deleteContactFromCRM) {
              window.deleteContactFromCRM(data.id);
            }
          }

          // Methods that the remote module can call
          notifyContactCreated(contact) {
            this.sendToCRM('CONTACT_CREATED', contact);
          }

          notifyContactUpdated(contact) {
            this.sendToCRM('CONTACT_UPDATED', contact);
          }

          notifyContactDeleted(contactId) {
            this.sendToCRM('CONTACT_DELETED', { id: contactId });
          }

          requestCRMContacts() {
            this.sendToCRM('REQUEST_CONTACTS', {});
          }

          // Navigation methods for remote module to use
          navigateTo(route) {
            this.sendToCRM('NAVIGATE', { route });
          }

          navigateBack() {
            this.sendToCRM('NAVIGATE_BACK', {});
          }

          navigateToDashboard() {
            this.sendToCRM('NAVIGATE_TO_DASHBOARD', {});
          }

          sendToCRM(type, data) {
            if (window.parent) {
              window.parent.postMessage({ type, data }, this.parentOrigin);
              console.log('📤 Sent to CRM:', type, data);
            }
          }
        }

        // Initialize the bridge and make it globally available
        window.crmBridge = new CRMBridge();
        
        // Helper functions for the remote module to use
        window.notifyContactCreated = (contact) => window.crmBridge?.notifyContactCreated(contact);
        window.notifyContactUpdated = (contact) => window.crmBridge?.notifyContactUpdated(contact);
        window.notifyContactDeleted = (contactId) => window.crmBridge?.notifyContactDeleted(contactId);
        
        // Navigation helper functions
        window.navigateTo = (route) => window.crmBridge?.navigateTo(route);
        window.navigateBack = () => window.crmBridge?.navigateBack();
        window.navigateToDashboard = () => window.crmBridge?.navigateToDashboard();
        
        console.log('✅ CRM Bridge injected successfully');
      `,o.head.appendChild(d),console.log("💉 Bridge code injected into remote module")}catch(a){console.warn("⚠️ Failed to inject bridge code:",a.message),console.log("📝 This is expected with cross-origin iframes. Attempting postMessage approach..."),setTimeout(()=>{A()},500)}},A=()=>{if(!c.current?.contentWindow)return;console.log("📡 Attempting bridge setup via postMessage"),[{type:"CRM_BRIDGE_SETUP",origin:window.location.origin},{type:"PARENT_READY",data:{crmOrigin:window.location.origin}},{type:"INIT_COMMUNICATION",data:{ready:!0}}].forEach((o,d)=>{setTimeout(()=>{c.current?.contentWindow?.postMessage(o,"https://taupe-sprinkles-83c9ee.netlify.app"),console.log(`📤 Sent setup message ${d+1}:`,o.type)},d*200)})};return l.useEffect(()=>{if(e.current&&t){const a=Object.values(n).map(g);e.current.syncContacts(a)}},[n,t]),r.jsxs("div",{className:"min-h-screen bg-gray-50 dark:bg-gray-900",children:[r.jsx("div",{className:"bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4",children:r.jsxs("div",{className:"flex items-center justify-between",children:[r.jsxs("div",{children:[r.jsxs("h1",{className:"text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2",children:[r.jsx(S,{className:"h-6 w-6 text-blue-600"}),"Contacts Module"]}),r.jsx("p",{className:"text-sm text-gray-600 dark:text-gray-400",children:"Remote contact management system"})]}),r.jsxs("div",{className:"flex items-center space-x-2",children:[r.jsx("div",{className:"text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full",children:"✓ Remote Module"}),r.jsxs("div",{className:`text-sm px-3 py-1 rounded-full flex items-center gap-1 ${t?"bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200":"bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200"}`,children:[t?r.jsx(R,{className:"h-3 w-3"}):r.jsx(M,{className:"h-3 w-3"}),t?"CRM Connected":"Connecting..."]})]})]})}),r.jsx("div",{className:"flex-1",style:{height:"calc(100vh - 100px)"},children:r.jsx("iframe",{ref:c,src:"https://taupe-sprinkles-83c9ee.netlify.app",style:{width:"100%",height:"100%",border:"none",overflow:"hidden"},title:"Remote Contacts Module",allow:"clipboard-read; clipboard-write",sandbox:"allow-scripts allow-same-origin allow-forms allow-popups allow-downloads",onLoad:p})})]})};export{_ as default};
