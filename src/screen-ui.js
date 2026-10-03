let screen='',activeDialog=null,returnFocus=null,resizeFrame=0;
const pages=new Map(),panels=new Map();
const titles={collection:'Your collection',build:'Build details',history:'Recent runs',dyno:'Engine dyno',condition:'Build & service',shop:'Shop management',assists:'Driving assists',contender:'Your contender','reset-confirmation':'Start a new career?','workshop-notes':'Workshop notes','driving-help':'Driving help'};

function template(id,node){
  const t=document.createElement('template');t.id=id;t.content.append(node);document.getElementById('main').append(t);
}
function dialogTrigger(label,id){
  const b=document.createElement('button');b.className='button secondary';b.dataset.dialog=id;b.textContent=label;return b;
}
function toolRow(){
  const row=document.createElement('div');row.className='screen-tools';return row;
}

export function mountScreen(next){
  if(screen!==next){activeDialog=null;returnFocus=null;}
  screen=next;
  const main=document.getElementById('main');
  const heading=main.querySelector('.page-head h1'),menuTitles={race:'RACE SETUP',career:'CAREER',tuning:'WORKSHOP',dealership:'CAR LOT',business:'THE SHOP'};
  if(heading&&menuTitles[screen])heading.textContent=menuTitles[screen];
  if(screen==='tuning'){
    const top=main.querySelector('.tuning-top'),row=toolRow();
    template('dyno',top.querySelector('.dyno-panel'));template('condition',top.querySelector('.build-summary'));
    row.append(dialogTrigger('Engine dyno','dyno'),dialogTrigger('Build & service','condition'));top.replaceWith(row);
    const notes=[...main.querySelectorAll('.two-col>.panel>.field-help')];
    if(notes.length){const help=document.createElement('section');help.className='panel workshop-notes';notes.forEach(note=>help.append(note));template('workshop-notes',help);row.append(dialogTrigger('Workshop notes','workshop-notes'));}
    const data=main.querySelector('.component-grades');
    if(data){
      const parent=data.closest('.panel'),specs=parent.querySelector('.technical-grid');
      const gradePanel=document.createElement('section');gradePanel.className='panel';gradePanel.append(data);
      const specPanel=document.createElement('section');specPanel.className='panel';specPanel.append(specs);
      main.querySelector('.tab-bar').after(createPanels([gradePanel,specPanel,parent],['Performance','Specifications','Model notes'],'data'));
    }
    const tune=main.querySelector('.two-col');
    if(tune)responsivePanels(tune,'workshop');
  }
  if(screen==='settings'){
    const columns=main.querySelector('.two-col'),save=main.querySelector('.save-panel'),about=save.nextElementSibling;
    const presetNote=columns.firstElementChild.querySelector('p'),noteHeading=document.createElement('h3');noteHeading.textContent='Difficulty presets';about.append(noteHeading,presetNote);
    const controls=columns.lastElementChild,help=document.createElement('section');help.className='panel';help.append(controls.querySelector('.notice'),controls.querySelector('.field-help'));template('driving-help',help);
    const actions=toolRow();actions.append(controls.querySelector('a'),dialogTrigger('Driving help','driving-help'));controls.append(actions);
    const sections=[...columns.children,save,about];columns.replaceWith(createPanels(sections,['Driving','Controls','Save data','About'],'settings'));
    const confirmation=document.createElement('div');confirmation.className='empty-state';confirmation.innerHTML='<p>This removes the garage saved in this browser. Export a backup first if you want to keep it.</p><div class="setup-actions"><button class="button danger" data-action="confirm-reset">Reset my garage</button><button class="button secondary" data-action="cancel-reset">Keep my garage</button></div>';template('reset-confirmation',confirmation);
  }
  if(screen==='business'){
    const management=main.querySelector('.two-col'),details=document.createElement('div');details.className='shop-management';details.append(main.querySelector('.stat-strip'),management);template('shop',details);
    const row=toolRow();row.append(dialogTrigger('Manage shop','shop'));main.querySelector('.page-head').append(row);
    const jobs=main.querySelector('.jobs-grid');pageGrid(jobs);
  }
  if(screen==='race'){
    const panel=main.querySelector('.race-setup>.panel'),divider=panel.querySelector('.divider');
    const assists=document.createElement('section');assists.className='panel';
    let node=divider.nextElementSibling;
    while(node&&!node.classList.contains('setup-actions')){const following=node.nextElementSibling;assists.append(node);node=following;}
    const details=toolRow();details.append(dialogTrigger('Driving assists','assists'));divider.replaceWith(details);template('assists',assists);
    const preview=main.querySelector('.setup-preview');
    if(innerWidth<650){template('contender',preview);details.append(dialogTrigger('Car & track preview','contender'));}
  }
  // Paged grids keep the entire screen bounded, including large saved collections.
  main.querySelectorAll('.dealer-grid,.parts-grid,.events-grid').forEach(el=>pageGrid(el));
  if(activeDialog)openDialog(activeDialog,false);
  requestAnimationFrame(layout);
}

function responsivePanels(container,key){
  container.dataset.responsivePanels=key;
  if(innerWidth<650){
    const children=[...container.children];
    if(key==='workshop'&&children[1].querySelector('.gear-table')){
      const drive=document.createElement('section');drive.className='panel';drive.innerHTML='<h2>Final drive</h2>';drive.append(children[1].querySelector('.range-field'));
      children[1].querySelector('h2').textContent='Gear ratios';container.replaceWith(createPanels([children[0],drive,children[1]],['Car setup','Final drive','Gear ratios'],key));
    }else container.replaceWith(createPanels(children,screen==='tuning'&&key==='workshop'?(children[1].querySelector('.cvt-details')?['Car setup','CVT drive']:['Paint','Body']):['Shop expansion','Customer jobs'],key));
  }
}
function createPanels(sections,labels,key){
  const holder=document.createElement('div');holder.className='screen-panel-group';
  const rail=document.createElement('div');rail.className='section-tabs';rail.setAttribute('role','tablist');rail.setAttribute('aria-label',key);
  const content=document.createElement('div');content.className='screen-panels';
  const selected=Math.min(panels.get(key)||0,sections.length-1);
  sections.forEach((section,i)=>{
    const b=document.createElement('button');b.textContent=labels[i];b.dataset.panelKey=key;b.dataset.panelIndex=i;b.setAttribute('role','tab');b.id=`${key}-tab-${i}`;b.setAttribute('aria-controls',`${key}-panel-${i}`);
    b.setAttribute('aria-selected',String(i===selected));b.tabIndex=i===selected?0:-1;b.classList.toggle('active',i===selected);
    section.id=`${key}-panel-${i}`;section.setAttribute('role','tabpanel');section.setAttribute('aria-labelledby',b.id);section.hidden=i!==selected;
    rail.append(b);content.append(section);
  });holder.append(rail,content);return holder;
}

function pageGrid(grid){
  const wrapper=document.createElement('div');wrapper.className='paged-grid';
  grid.replaceWith(wrapper);wrapper.append(grid);
  const pager=document.createElement('div');pager.className='screen-pager';
  pager.innerHTML='<button class="button secondary" data-page-step="-1" aria-label="Previous page">← PREVIOUS</button><span aria-live="polite"></span><button class="button secondary" data-page-step="1" aria-label="Next page">NEXT →</button>';
  wrapper.append(pager);wrapper.dataset.pageKey=screen+':'+grid.className;
}
function layout(){
  document.querySelectorAll('.paged-grid').forEach(wrapper=>{
    if(!wrapper.getClientRects().length)return;
    const grid=wrapper.firstElementChild,items=[...grid.children],key=wrapper.dataset.pageKey;
    const minWidth=grid.classList.contains('history-grid')?900:grid.classList.contains('parts-grid')?235:265;
    const cols=Math.max(1,Math.min(4,Math.floor((grid.clientWidth+12)/(minWidth+12))));
    const minHeight=grid.classList.contains('history-grid')?47:grid.classList.contains('parts-grid')?180:grid.classList.contains('jobs-grid')?230:grid.classList.contains('collection-grid')?190:265;
    const height=wrapper.clientHeight-42,rows=Math.max(1,Math.min(grid.classList.contains('history-grid')?10:3,Math.floor((height+12)/(minHeight+12))));
    const capacity=cols*rows,total=Math.ceil(items.length/capacity)||1,index=Math.min(pages.get(key)||0,total-1);
    pages.set(key,index);wrapper.dataset.capacity=capacity;wrapper.dataset.total=total;
    grid.style.gridTemplateColumns=`repeat(${cols},minmax(0,1fr))`;
    grid.style.gridTemplateRows=`repeat(${Math.min(rows,Math.ceil(Math.min(items.length,capacity)/cols))},minmax(0,1fr))`;
    items.forEach((el,i)=>el.hidden=i<index*capacity||i>=(index+1)*capacity);
    const pager=wrapper.lastElementChild;pager.hidden=total===1;
    pager.querySelector('span').textContent=`${index+1} / ${total}`;
    pager.firstElementChild.disabled=index===0;pager.lastElementChild.disabled=index===total-1;
  });
}

export function openDialog(id,remember=true){
  const source=document.getElementById(id);if(!source)return;
  if(remember)returnFocus=document.activeElement;
  activeDialog=id;const host=document.getElementById('dialog-host');
  host.innerHTML=`<dialog class="game-dialog" aria-labelledby="dialog-title"><header class="dialog-header"><div><span class="eyebrow">REDLINE / ${screen.toUpperCase()}</span><h2 id="dialog-title">${id.startsWith('factory-')?'Vehicle specifications':titles[id]||'Details'}</h2></div><button class="icon-button" data-close-dialog aria-label="Close dialog">×</button></header><div class="dialog-content"></div></dialog>`;
  const dialog=host.firstElementChild,content=dialog.querySelector('.dialog-content');content.append(source.content.cloneNode(true));
  content.querySelectorAll('.vehicle-fact-sections').forEach(el=>{const sections=[...el.children];el.replaceWith(createPanels(sections,sections.map(s=>s.dataset.label),'vehicle-facts'));});
  content.querySelectorAll('.dialog-grid,.history-grid').forEach(el=>{if(el.children.length>1)pageGrid(el);});
  content.querySelectorAll('.two-col').forEach(el=>responsivePanels(el,'dialog-'+id));
  dialog.addEventListener('cancel',e=>{e.preventDefault();closeDialog();});
  dialog.addEventListener('click',e=>{if(e.target===dialog){const rect=dialog.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)closeDialog();}});
  dialog.showModal();requestAnimationFrame(layout);
}
export function closeDialog(){
  document.querySelector('.game-dialog')?.close();document.getElementById('dialog-host')?.replaceChildren();activeDialog=null;
  if(returnFocus?.isConnected)returnFocus.focus();else document.querySelector(`[data-dialog]`)?.focus();
}

export function handleScreenKey(e){
  if(e.defaultPrevented)return true;
  if(e.code==='Escape'&&activeDialog){e.preventDefault();closeDialog();return true;}
  const result=document.querySelector('.slip-result');
  if(result&&e.key==='Tab'){
    const controls=[...result.querySelectorAll('button:not(:disabled)')];
    if(e.shiftKey&&(document.activeElement===controls[0]||document.activeElement.id==='result-title')){e.preventDefault();controls.at(-1)?.focus();}
    else if(!e.shiftKey&&document.activeElement===controls.at(-1)){e.preventDefault();controls[0]?.focus();}
    return true;
  }
  if(e.code==='Escape'&&screen!=='garage'&&screen!=='racing'&&!/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)){e.preventDefault();document.querySelector('[data-nav="garage"]')?.click();return true;}
  return !!activeDialog;
}

document.addEventListener('click',e=>{
  const opener=e.target.closest('[data-dialog]');if(opener){openDialog(opener.dataset.dialog);return;}
  if(e.target.closest('[data-close-dialog]')){closeDialog();return;}
  const step=e.target.closest('[data-page-step]');if(step){const wrapper=step.closest('.paged-grid'),key=wrapper.dataset.pageKey;pages.set(key,(pages.get(key)||0)+Number(step.dataset.pageStep));layout();return;}
  const tab=e.target.closest('[data-panel-key]');if(tab){
    const group=tab.closest('.screen-panel-group'),i=Number(tab.dataset.panelIndex);panels.set(tab.dataset.panelKey,i);
    [...group.querySelector('.section-tabs').children].forEach((el,j)=>{el.classList.toggle('active',i===j);el.setAttribute('aria-selected',String(i===j));el.tabIndex=i===j?0:-1;});
    [...group.querySelector('.screen-panels').children].forEach((el,j)=>el.hidden=i!==j);layout();
  }
  if(e.target.closest('[data-fullscreen]')){
    const action=document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen?.();
    action?.catch(()=>{});
  }
});
document.addEventListener('keydown',e=>{
  const tab=e.target.closest('[role="tab"]');if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
  const tabs=[...tab.parentElement.children],index=tabs.indexOf(tab),next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(index+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
  e.preventDefault();tabs[next].click();tabs[next].focus();
});
window.addEventListener('resize',()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(layout);});
