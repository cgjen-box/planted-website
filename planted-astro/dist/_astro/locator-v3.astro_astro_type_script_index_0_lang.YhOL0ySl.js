const k={uber_eats:"uber-eats",ubereats:"uber-eats",just_eat:"just-eat",justeat:"just-eat",lieferando:"lieferando",wolt:"wolt",doordash:"doordash",deliveroo:"deliveroo",eat_ch:"eat-ch",eatch:"eat-ch"};function I(e){const t=e.venue,s=e.dishes||[],a=[...new Set(s.flatMap(n=>n.planted_products||[]).filter(Boolean))].slice(0,4),c=t.distance_km||0,i=c<1?`${Math.round(c*1e3)}m`:`${c.toFixed(1)}km`,o=s.map(n=>n.cuisine_type).filter(Boolean);let d="restaurant";o.some(n=>/burger/i.test(n))?d="burger":o.some(n=>/bowl|poke|asian/i.test(n))?d="bowl":o.some(n=>/kebab|döner|turkish/i.test(n))&&(d="kebab");const r=(t.delivery_platforms||[]).filter(n=>n.active).map(n=>({name:n.partner.replace(/_/g," ").replace(/\b\w/g,g=>g.toUpperCase()),url:n.url,icon:k[n.partner.toLowerCase()]||"website"})),m=s.find(n=>n.image_url)?.image_url,f=o[0]||(t.type==="delivery_kitchen"?"Lieferküche":"Restaurant");return{id:t.id,name:t.name,location:t.address?.city||"",category:f,distance:i,distanceMeters:Math.round(c*1e3),products:a.length>0?a:["planted.chicken"],dishes:s.map(n=>({name:n.name,price:n.price?`${n.price.currency} ${n.price.amount.toFixed(2)}`:"",description:n.description,image:n.image_url,isVegan:n.dietary_tags?.includes("vegan"),plantedProduct:n.planted_products?.[0]})),iconType:d,heroImage:m,deliveryPartners:r}}function E(e,t,s){const a=e.dishes.slice(0,2);return`
      <article class="v3-venue-card ${t>=3?"v3-card-hidden":""}" data-venue-id="${e.id}" data-index="${t}">
        <div class="v3-card-header">
          <div class="v3-venue-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/>
              <path d="M7 2v20"/>
              <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>
            </svg>
          </div>
          <div class="v3-venue-info">
            <h3 class="v3-venue-name">${e.name}</h3>
            <div class="v3-venue-meta">
              <span>${e.location}</span>
              <span>${e.category}</span>
            </div>
          </div>
          <span class="v3-venue-distance">${e.distance}</span>
        </div>

        <div class="v3-product-tags">
          ${e.products.map(i=>`<span class="v3-product-tag">${i}</span>`).join("")}
        </div>

        <div class="v3-dishes-list">
          ${a.map(i=>`
            <div class="v3-dish-item">
              <span class="v3-dish-name">
                ${i.name}
                ${i.isVegan?`<span class="v3-dish-badge">${s.vegan}</span>`:""}
              </span>
              <span class="v3-dish-price">${i.price}</span>
            </div>
          `).join("")}
        </div>

        <footer class="v3-card-footer">
          <button class="v3-view-details-btn" type="button">
            ${s.viewAllDishes}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
          <span class="v3-dish-count">${e.dishes.length} ${s.dishes}</span>
        </footer>
      </article>
    `}async function T(){const e=window.__v3Config;if(!e)return;const t=document.getElementById("v3CardGrid"),s=document.querySelector(".v3-main-content"),a=document.querySelector(".v3-header-title"),c=document.querySelector(".v3-results-count");if(document.getElementById("v3LoadMore"),document.getElementById("v3LoadMoreCount"),s){const i=t,o=document.createElement("div");o.className="v3-loading",o.id="v3Loading",o.innerHTML=`
        <div class="v3-loading-spinner"></div>
        <p>${e.translations.loading}</p>
      `,i&&(i.style.display="none"),s.insertBefore(o,s.firstChild?.nextSibling||null)}try{const{lat:i,lng:o,apiBaseUrl:d}=e;if(!i||!o)throw new Error("Missing coordinates");const r=`${d}/nearby?lat=${i}&lng=${o}&radius_km=10&type=restaurant&limit=50`;console.log("[V3] Fetching venues from:",r);const m=await fetch(r);if(!m.ok)throw new Error(`API error: ${m.status}`);const f=await m.json();console.log("[V3] Received",f.total,"venues");const n=f.results.map(I);v=n,l=[...n],window.__v3Venues=n;const g=document.getElementById("v3Loading");g&&g.remove(),a&&(a.textContent=e.translations.headerTitle.replace("{count}",String(n.length)));const $=n.reduce((b,_)=>b+_.dishes.length,0);c&&(c.textContent=e.translations.dishesFound.replace("{count}",String($))),B()}catch(i){console.error("[V3] Error loading venues:",i);const o=document.getElementById("v3Loading");o&&(o.className="v3-error",o.innerHTML=`
          <div class="v3-error-icon">⚠️</div>
          <p>${e.translations.errorLoading}</p>
          <p style="font-size: 0.875rem; color: #999; margin-top: 0.5rem;">${i.message}</p>
        `)}}let v=[],l=[],u=0;const C=3;let p=!1,h=null;function M(){if(p||l.length-u<=0)return;p=!0;const t=window.__v3Config,s=document.getElementById("v3CardGrid");if(!s){p=!1;return}const a=l.slice(u,u+C);a.forEach((c,i)=>{const o=E(c,u+i,t.translations),d=document.createElement("div");d.innerHTML=o.trim();const r=d.firstElementChild;r.style.opacity="0",r.style.transform="translateY(20px)",r.classList.remove("v3-card-hidden"),s.appendChild(r),setTimeout(()=>{r.style.transition="opacity 0.3s ease, transform 0.3s ease",r.style.opacity="1",r.style.transform="translateY(0)"},i*100)}),u+=a.length,y(),setTimeout(()=>{p=!1},a.length*100+100)}function y(){const e=document.getElementById("v3LoadMore"),t=document.getElementById("v3LoadMoreCount");if(document.getElementById("v3LoadMoreBtn"),!e||!t)return;const s=l.length-u;s>0?(e.style.display="",t.textContent=`(+${s} mehr)`):e.style.display="none"}function V(e){switch(e){case"all":l=[...v];break;case"distance-500":l=v.filter(t=>(t.distanceMeters||0)<=500);break;case"distance-1000":l=v.filter(t=>(t.distanceMeters||0)<=1e3);break;case"top-rated":l=[...v];break;default:if(e.startsWith("product-")){const t=e.replace("product-","");l=v.filter(s=>s.products.includes(t))}else l=[...v]}u=0,B()}function B(){const e=window.__v3Config,t=document.getElementById("v3CardGrid"),s=document.getElementById("v3NoResults");if(!t||!e)return;if(t.innerHTML="",l.length===0){t.style.display="none",s&&(s.style.display=""),y();return}t.style.display="",s&&(s.style.display="none");const a=l.slice(0,C);a.forEach((c,i)=>{const o=E(c,i,e.translations),d=document.createElement("div");d.innerHTML=o.trim();const r=d.firstElementChild;r.classList.remove("v3-card-hidden"),r.style.animationDelay=`${.05*(i+1)}s`,t.appendChild(r)}),u=a.length,y()}function S(){const e=()=>{h&&clearTimeout(h),h=window.setTimeout(()=>{const t=document.getElementById("v3LoadMore");if(!t||t.style.display==="none")return;t.getBoundingClientRect().top<window.innerHeight+200&&!p&&M()},150)};window.addEventListener("scroll",e,{passive:!0})}function x(){const e=document.querySelectorAll(".v3-filter-chip");e.forEach(t=>{t.addEventListener("click",()=>{e.forEach(a=>a.classList.remove("active")),t.classList.add("active");const s=t.getAttribute("data-filter")||"all";V(s)})})}function H(){document.getElementById("v3LoadMoreBtn")?.addEventListener("click",()=>{M()})}let w=!1;function L(){w||(w=!0,T(),x(),H(),S())}document.addEventListener("DOMContentLoaded",L);document.addEventListener("astro:page-load",()=>{w=!1,L()});
