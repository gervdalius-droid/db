(function(){
  // Rich local dataset covering every project category the app can render.
  const D = 86400000, now = Date.now();
  const iso = d => new Date(d).toISOString();
  const day = n => iso(now + n*D).slice(0,10);
  USERS = [
    {id:'u1',name:'Rytis Zubas',role:'manager',color:'#4338ca',bg:'#eef2ff',initials:'RZ'},
    {id:'u2',name:'Jonas Petraitis',role:'worker',color:'#0e7490',bg:'#ecfeff',initials:'JP'},
    {id:'u3',name:'Eglė Kazlauskė',role:'engineer',color:'#be185d',bg:'#fdf2f8',initials:'EK'},
  ];
  DB.currentUserId='u1';
  DB.projects=[
    {id:'p1',name:'SA_GA_VIRT — Virtuvė Gala',client:'UAB Sala Galerija',color:'#6366f1',status:'active',type:'projektas',priority:'high',deadline:day(4),created:iso(now-9*D)},
    {id:'p2',name:'Biuro baldai — Rytas',client:'UAB "Rytas"',color:'#0ea5e9',status:'active',type:'projektas',priority:'mid',deadline:day(-2),created:iso(now-3*D)},
    {id:'p3',name:'Vonios komplektas — Šilas',client:'Šilo namai',color:'#10b981',status:'active',type:'projektas',priority:'low',created:iso(now-14*D),paused:true},
    {id:'p4',name:'Fasadų frezavimas',client:'Baldų fabrikas Nr.1',color:'#f59e0b',status:'active',type:'paslauga',priority:'mid',deadline:day(1),created:iso(now-2*D),serviceSteps:['pjovimas','briaunavimas','pakavimas']},
    {id:'p5',name:'Stalviršių pjovimas',client:'Privatus klientas',color:'#84cc16',status:'active',type:'paslauga',priority:'low',created:iso(now-D)},
    {id:'p6',name:'Svetainės sekcija — Vilkas',client:'Vilkas ir Ko',color:'#a855f7',status:'active',designStatus:'design',priority:'high',deadline:day(6),created:iso(now-5*D)},
    {id:'p7',name:'Drabužinė — Klaipėda',client:'UAB Marių baldai',color:'#db2777',status:'active',designStatus:'design',priority:'mid',created:iso(now-8*D)},
    {id:'p8',name:'Registratūra — Medikai',client:'Medikų centras',color:'#0891b2',status:'completed',type:'projektas',priority:'mid',created:iso(now-30*D)},
    {id:'p9',name:'Senas projektas 2024',client:'Archyvas',color:'#94a3b8',status:'archived',type:'projektas',created:iso(now-200*D)},
  ];
  let n=0; const nid=()=>'t'+(++n);
  DB.tasks=[];
  const add=(pid,step,st,extra)=>DB.tasks.push(Object.assign({
    id:nid(),projectId:pid,stepId:step,name:(ALL_STEPS_BY_ID[step]?ALL_STEPS_BY_ID[step].label:step),
    status:st,assigneeId:st==='pending'?null:'u2',materials:[],created:iso(now-4*D)},extra||{}));
  ['pjovimas','briaunavimas'].forEach(s=>add('p1',s,'done'));
  add('p1','grezimas','in-progress',{startedAt:iso(now-5*3600000),assigneeId:'u2',deadline:day(1),materials:['KARKASAI 18mm (30.4 m²)']});
  ['apdaila','surinkimas','isstatymas','pakavimas','montavimas'].forEach(s=>add('p1',s,'pending'));
  add('p2','pjovimas','in-progress',{startedAt:iso(now-2*3600000),deadline:day(-1)});
  add('p2','briaunavimas','pending',{blocker:'Nėra briaunos 1mm'});
  add('p3','pjovimas','done'); add('p3','grezimas','pending');
  add('p4','pjovimas','in-progress',{startedAt:iso(now-3600000)}); add('p4','briaunavimas','pending'); add('p4','pakavimas','pending');
  add('p5','pjovimas','pending');
  add('p6','koncepcija','done',{assigneeId:'u3'}); add('p6','breziniai','done',{assigneeId:'u3'});
  add('p6','modelis3d','in-progress',{assigneeId:'u3',startedAt:iso(now-8*3600000),deadline:day(2)});
  ['klientui','cam','perdavimas'].forEach(s=>add('p6',s,'pending'));
  add('p7','koncepcija','in-progress',{assigneeId:'u3',startedAt:iso(now-D)});
  ['breziniai','modelis3d','klientui','cam','perdavimas'].forEach(s=>add('p7',s,'pending'));
  DB.projects[7] && ['pjovimas','briaunavimas','grezimas','apdaila','surinkimas','isstatymas','pakavimas','montavimas'].forEach(s=>add('p8',s,'done'));
  DB.notifications=[{id:'n1',read:false,text:'Jonas pradėjo Gręžimą',created:iso(now-3600000)}];
  DB.orders=DB.orders||[];
  return {projects:DB.projects.length,tasks:DB.tasks.length};
})()
