(function(){
  var KEY='student-tasks-v1', tasks=[], f={status:'all',prio:'all',sort:'due'}, editId=null, lastDeleted=null, toastT;
  var $=function(id){return document.getElementById(id)};
  var PR={high:0,medium:1,low:2};

  function load(){
    try{var r=localStorage.getItem(KEY); if(r){tasks=JSON.parse(r)||[];return}}catch(e){}
    var d=function(n){var x=new Date();x.setDate(x.getDate()+n);return iso(x)};
    tasks=[
      {id:uid(),title:'Read Chapter 4 – Cell Biology',desc:'Take notes on mitosis vs meiosis.',due:d(1),prio:'high',done:false,at:3},
      {id:uid(),title:'Maths problem set 6',desc:'Questions 1–15, show working.',due:d(3),prio:'medium',done:false,at:2},
      {id:uid(),title:'Return library books',desc:'',due:d(-1),prio:'low',done:true,at:1}
    ];
  }
  function save(){try{localStorage.setItem(KEY,JSON.stringify(tasks))}catch(e){}}
  function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
  function iso(x){return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0')}
  function todayIso(){return iso(new Date())}
  function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function fmt(s){var p=s.split('-');return new Date(+p[0],+p[1]-1,+p[2]).toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short'})}
  function dueLabel(t){
    var td=todayIso(); if(t.due===td)return 'Due today';
    var diff=Math.round((new Date(t.due+'T00:00')-new Date(td+'T00:00'))/864e5);
    if(diff===1)return 'Due tomorrow';
    return 'Due '+fmt(t.due);
  }

  function visible(){
    var out=tasks.filter(function(t){
      if(f.status==='active'&&t.done)return false;
      if(f.status==='done'&&!t.done)return false;
      if(f.prio!=='all'&&t.prio!==f.prio)return false;
      return true;
    });
    out.sort(function(a,b){
      if(f.sort==='new')return b.at-a.at;
      if(f.sort==='prio')return PR[a.prio]-PR[b.prio]||a.due.localeCompare(b.due);
      return a.done-b.done||a.due.localeCompare(b.due)||PR[a.prio]-PR[b.prio];
    });
    return out;
  }

  function render(){
    var list=visible(), td=todayIso();
    $('list').innerHTML=list.length?list.map(function(t){
      var late=!t.done&&t.due<td;
      return '<li class="task p-'+t.prio+(t.done?' done':'')+'" data-id="'+t.id+'">'+
        '<input type="checkbox" data-a="toggle" aria-label="Mark “'+esc(t.title)+'” as done"'+(t.done?' checked':'')+'>'+
        '<div><div class="title">'+esc(t.title)+'</div>'+(t.desc?'<p class="desc">'+esc(t.desc)+'</p>':'')+
        '<div class="meta"><span class="chip '+t.prio+'">'+t.prio[0].toUpperCase()+t.prio.slice(1)+' priority</span>'+
        '<span class="chip'+(late?' late':'')+'">'+(late?'Overdue · ':'')+dueLabel(t)+'</span></div></div>'+
        '<div class="acts"><button data-a="edit" aria-label="Edit task" title="Edit">✎</button><button data-a="del" aria-label="Delete task" title="Delete">🗑</button></div></li>';
    }).join(''):'<li class="empty">'+(tasks.length?'No tasks match these filters. Try “All” or “Any priority”.':'No tasks yet. Add your first assignment with “New task”.')+'</li>';

    var done=tasks.filter(function(t){return t.done}).length, pct=tasks.length?Math.round(done/tasks.length*100):0;
    var late=tasks.filter(function(t){return !t.done&&t.due<td}).length;
    $('sumText').textContent=done+' of '+tasks.length+' tasks done';
    $('sumLate').textContent=late?late+' overdue':(tasks.length&&done===tasks.length?'All caught up!':'');
    $('fill').style.width=pct+'%';
    document.querySelector('.bar').setAttribute('aria-valuenow',pct);
  }

  function openForm(t){
    editId=t?t.id:null;
    $('dlgTitle').textContent=t?'Edit task':'New task';
    $('save').textContent=t?'Save changes':'Add task';
    $('fTitle').value=t?t.title:''; $('fDesc').value=t?t.desc:'';
    $('fDue').value=t?t.due:todayIso(); $('fPrio').value=t?t.prio:'medium';
    $('err').textContent='';
    if($('dlg').showModal)$('dlg').showModal(); else $('dlg').setAttribute('open','');
    $('fTitle').focus();
  }
  function closeForm(){ if($('dlg').close)$('dlg').close(); else $('dlg').removeAttribute('open'); }

  function toast(msg,undo){
    $('toastMsg').textContent=msg; $('undo').style.display=undo?'':'none';
    $('toast').classList.add('show'); clearTimeout(toastT);
    toastT=setTimeout(function(){$('toast').classList.remove('show');lastDeleted=null},5000);
  }

  $('form').addEventListener('submit',function(e){
    e.preventDefault();
    var title=$('fTitle').value.trim(), due=$('fDue').value;
    if(!title){$('err').textContent='Enter a title for the task.';$('fTitle').focus();return}
    if(!due){$('err').textContent='Pick a due date.';$('fDue').focus();return}
    var data={title:title,desc:$('fDesc').value.trim(),due:due,prio:$('fPrio').value};
    if(editId){tasks=tasks.map(function(t){return t.id===editId?Object.assign({},t,data):t});toast('Changes saved',false)}
    else{tasks.push(Object.assign({id:uid(),done:false,at:Date.now()},data));toast('Task added',false)}
    save();render();closeForm();
  });
  $('cancel').onclick=closeForm;
  $('add').onclick=function(){openForm(null)};
  $('dlg').addEventListener('click',function(e){if(e.target===$('dlg'))closeForm()});

  $('list').addEventListener('click',function(e){
    var b=e.target.closest('[data-a]'); if(!b)return;
    var li=b.closest('.task'), id=li.dataset.id, a=b.dataset.a;
    var t=tasks.filter(function(x){return x.id===id})[0]; if(!t)return;
    if(a==='toggle'){t.done=b.checked;save();render()}
    if(a==='edit')openForm(t);
    if(a==='del'){lastDeleted=t;tasks=tasks.filter(function(x){return x.id!==id});save();render();toast('Task deleted',true)}
  });
  $('undo').onclick=function(){if(lastDeleted){tasks.push(lastDeleted);lastDeleted=null;save();render();$('toast').classList.remove('show')}};

  $('statusSeg').addEventListener('click',function(e){
    var b=e.target.closest('button'); if(!b)return;
    f.status=b.dataset.v;
    [].forEach.call($('statusSeg').children,function(x){x.setAttribute('aria-pressed',x===b)});
    render();
  });
  $('prio').onchange=function(){f.prio=this.value;render()};
  $('sort').onchange=function(){f.sort=this.value;render()};

  $('theme').onclick=function(){
    var r=document.documentElement, dark=r.dataset.theme?r.dataset.theme==='dark':matchMedia('(prefers-color-scheme: dark)').matches;
    r.dataset.theme=dark?'light':'dark';
  };

  $('today').textContent=new Date().toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long'})+' · stay on top of your deadlines';
  load();render();
})();
