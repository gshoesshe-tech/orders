/* app.js — Supplier Tracker (split files) */
(function(){
  const $ = (id)=>document.getElementById(id);
  const authError = $('authError');
  const showErr = (t)=>{ if(!authError) return; authError.textContent=t||''; authError.classList.remove('hidden'); };
  const hideErr = ()=>{ if(!authError) return; authError.textContent=''; authError.classList.add('hidden'); };

  if (!window.supabase){ showErr('Supabase JS not loaded.'); return; }
  if (!window.__SUPABASE_URL__ || !window.__SUPABASE_ANON_KEY__){ showErr('config.js missing keys.'); return; }
  const supa = window.supabase.createClient(window.__SUPABASE_URL__, window.__SUPABASE_ANON_KEY__);
  const BUCKET = window.__ATTACHMENTS_BUCKET__ || 'order_attachments';

  const userChip = $('userChip');
  const btnLogout = $('btnLogout');
  const btnRefresh = $('btnRefresh');
  const orderList = $('orderList');
  const countLabel = $('countLabel');

  const form = $('orderForm');
  const formTitle = $('formTitle');
  const formMsg = $('formMsg');
  const btnClear = $('btnClear');
  const btnSave = $('btnSave');

  const inputCustomer = $('customer_name');
  const inputFb = $('fb_profile');
  const inputDetails = $('order_details');
  const inputAttach = $('attachment');
  const inputStatus = $('status');
  const inputDate = $('order_date');
  const inputDelivery = $('delivery_method');
  const inputPaidProd = $('paid_product');
  const inputPaidShip = $('paid_shipping');
  const inputNotes = $('notes');

  const search = $('search');
  const statusFilter = $('statusFilter');
  const dateFilter = $('dateFilter');
  const tabs = document.querySelectorAll('#tabs .tab');

  const adminDash = $('adminOnlyDashboard');
  const kpiTotal = $('kpiTotal');
  const kpiPaid = $('kpiPaid');
  const kpiPending = $('kpiPending');

  let orders = [];
  let editingId = null;
  let activeTab = 'all';

  const money = (n)=>'₱'+Number(n||0).toLocaleString(undefined,{maximumFractionDigits:2});

  async function ensureSession(){
    hideErr();
    const { data: { session }, error } = await supa.auth.getSession();
    if (error){ showErr(error.message); return null; }
    if (!session){ location.replace('./login.html'); return null; }
    const email = session.user?.email || 'Logged in';
    if (userChip) userChip.textContent = email;

    const allow = Array.isArray(window.__ADMIN_EMAILS__) ? window.__ADMIN_EMAILS__ : [];
    const isAdmin = allow.map(x=>String(x).toLowerCase()).includes(String(email).toLowerCase());
    if (adminDash) adminDash.classList.toggle('hidden', !isAdmin);
    return session;
  }

  async function logout(){
    await supa.auth.signOut();
    location.replace('./login.html');
  }

  function handleDeliveryChange(){
    if (!inputDelivery || !inputPaidShip) return;
    if (inputDelivery.value === 'walkin'){
      inputPaidShip.value = '0';
      inputPaidShip.disabled = true;
    } else {
      inputPaidShip.disabled = false;
    }
  }

  function resetForm(){
    editingId = null;
    if (formTitle) formTitle.textContent = 'New Order';
    form.reset();
    if (inputStatus) inputStatus.value = 'pending';
    if (inputDelivery) inputDelivery.value = 'jnt';
    handleDeliveryChange();
    if (formMsg) formMsg.textContent = '—';
  }

  async function uploadAttachment(file){
    if (!file) return null;
    const ext = (file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'');
    const path = `orders/${Date.now()}_${Math.random().toString(16).slice(2)}.${ext}`;
    const { error } = await supa.storage.from(BUCKET).upload(path, file, { cacheControl:'3600', upsert:false, contentType:file.type||'image/jpeg' });
    if (error) throw error;
    const { data } = supa.storage.from(BUCKET).getPublicUrl(path);
    return data?.publicUrl || path;
  }

  async function loadOrders(){
    if (!await ensureSession()) return;
    const { data, error } = await supa.from('orders').select('*').order('last_updated', { ascending:false });
    if (error){ showErr('Failed to load orders: '+(error.message||error)); return; }
    orders = Array.isArray(data) ? data : [];
    rebuildDateOptions();
    render();
  }

  function rebuildDateOptions(){
    if (!dateFilter) return;
    const current = dateFilter.value || 'all';
    const set = new Set();
    for (const o of orders){ if (o.order_date) set.add(o.order_date); }
    const sorted = Array.from(set).sort((a,b)=>String(b).localeCompare(String(a)));
    dateFilter.innerHTML = '<option value="all">All Dates</option>' + sorted.map(d=>`<option value="${d}">${d}</option>`).join('');
    dateFilter.value = sorted.includes(current) ? current : 'all';
  }

  function filtered(){
    const q = (search?.value||'').trim().toLowerCase();
    const st = statusFilter?.value || 'all';
    const dt = dateFilter?.value || 'all';

    return orders.filter(o=>{
      if (activeTab !== 'all' && String(o.delivery_method||'').toLowerCase() !== activeTab) return false;
      if (st !== 'all' && String(o.status||'').toLowerCase() !== st) return false;
      if (dt !== 'all' && String(o.order_date||'') !== dt) return false;
      if (!q) return true;
      const hay = [o.order_id,o.customer_name,o.fb_profile,o.order_details,o.notes].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }

  function renderKPIs(){
    if (!kpiTotal) return;
    kpiTotal.textContent = String(orders.length);
    const sum = orders.reduce((acc,o)=>acc+Number(o.paid_product||0)+Number(o.paid_shipping||0),0);
    if (kpiPaid) kpiPaid.textContent = money(sum);
    const pend = orders.filter(o=>String(o.status||'').toLowerCase()==='pending').length;
    if (kpiPending) kpiPending.textContent = String(pend);
  }

  function render(){
    const list = filtered();
    if (countLabel) countLabel.textContent = `${list.length} order${list.length===1?'':'s'}`;
    renderKPIs();

    if (!orderList) return;
    orderList.innerHTML = '';
    for (const o of list){
      const li = document.createElement('li');
      li.className = 'item';

      const left = document.createElement('div');
      const title = document.createElement('div');
      title.className='titleLine';

      const name = document.createElement('div');
      name.style.fontWeight='800';
      name.textContent = o.customer_name || '(No name)';

      const pill = (t, extra)=>{
        const s=document.createElement('span');
        s.className='pill '+(extra||'');
        s.textContent=t; return s;
      };

      title.appendChild(name);
      title.appendChild(pill(String(o.status||'pending').toUpperCase()));
      title.appendChild(pill('🚚 '+String(o.delivery_method||'jnt').toUpperCase()));
      if (o.order_id) title.appendChild(pill(o.order_id,'accent'));

      const sub = document.createElement('div');
      sub.style.marginTop='6px';
      sub.style.color='var(--muted)';
      sub.style.fontSize='12px';
      sub.textContent = [o.order_date?('📅 '+o.order_date):'', '💰 '+money(Number(o.paid_product||0)+Number(o.paid_shipping||0)), (o.order_details||'').replace(/\s+/g,' ').slice(0,120)].filter(Boolean).join(' • ');

      left.appendChild(title);
      left.appendChild(sub);

      const right = document.createElement('div');
      right.style.display='flex';
      right.style.gap='8px';
      right.style.flexWrap='wrap';
      right.style.justifyContent='flex-end';

      if (o.attachment_url){
        const a=document.createElement('a');
        a.className='btn';
        a.href=o.attachment_url;
        a.target='_blank';
        a.rel='noopener';
        a.textContent='View';
        right.appendChild(a);
      }

      const edit=document.createElement('button');
      edit.className='btn';
      edit.type='button';
      edit.textContent='Edit';
      edit.onclick=()=>startEdit(o);
      right.appendChild(edit);

      const del=document.createElement('button');
      del.className='btn danger';
      del.type='button';
      del.textContent='Delete';
      del.onclick=()=>deleteOrder(o);
      right.appendChild(del);

      li.appendChild(left);
      li.appendChild(right);
      orderList.appendChild(li);
    }
  }

  function startEdit(o){
    editingId = o.id;
    if (formTitle) formTitle.textContent = `Edit Order (${o.order_id || o.id})`;
    inputCustomer.value = o.customer_name || '';
    inputFb.value = o.fb_profile || '';
    inputDetails.value = o.order_details || '';
    inputStatus.value = o.status || 'pending';
    inputDate.value = o.order_date || '';
    inputDelivery.value = (o.delivery_method || 'jnt');
    inputPaidProd.value = String(o.paid_product ?? '');
    inputPaidShip.value = String(o.paid_shipping ?? '');
    inputNotes.value = o.notes || '';
    handleDeliveryChange();
  }

  async function deleteOrder(o){
    if (!confirm(`Delete order ${o.order_id || o.id}?`)) return;
    const { error } = await supa.from('orders').delete().eq('id', o.id);
    if (error){ alert(error.message || 'Delete failed'); return; }
    await loadOrders();
    resetForm();
  }

  async function saveOrder(ev){
    ev.preventDefault();
    if (formMsg) formMsg.textContent = 'Saving…';
    btnSave.disabled = true;

    try{
      if (!await ensureSession()) return;

      const payload = {
        customer_name: inputCustomer.value.trim(),
        fb_profile: inputFb.value.trim() || null,
        order_details: inputDetails.value.trim(),
        paid_product: Number(inputPaidProd.value || 0),
        paid_shipping: Number(inputPaidShip.value || 0),
        status: inputStatus.value,
        order_date: inputDate.value || null,
        notes: inputNotes.value.trim() || null,
        delivery_method: inputDelivery.value
      };
      if (payload.delivery_method === 'walkin') payload.paid_shipping = 0;

      const file = inputAttach?.files?.[0] || null;
      if (file){ payload.attachment_url = await uploadAttachment(file); }

      let error;
      if (editingId){
        ({ error } = await supa.from('orders').update(payload).eq('id', editingId));
      } else {
        ({ error } = await supa.from('orders').insert(payload));
      }
      if (error) throw error;

      if (formMsg) formMsg.textContent = 'Saved ✅';
      await loadOrders();
      resetForm();
    } catch(e){
      showErr(e?.message || String(e));
      if (formMsg) formMsg.textContent = 'Save failed';
    } finally {
      btnSave.disabled = false;
      if (inputAttach) inputAttach.value = '';
    }
  }

  function setActiveTab(val){
    activeTab = val;
    tabs.forEach(t=>t.classList.toggle('active', t.dataset.tab === val));
    render();
  }

  async function init(){
    if (!await ensureSession()) return;

    if (btnLogout) btnLogout.addEventListener('click', logout);
    if (btnRefresh) btnRefresh.addEventListener('click', loadOrders);
    if (btnClear) btnClear.addEventListener('click', resetForm);
    if (form) form.addEventListener('submit', saveOrder);

    if (inputDelivery) inputDelivery.addEventListener('change', handleDeliveryChange);
    handleDeliveryChange();

    if (search) search.addEventListener('input', render);
    if (statusFilter) statusFilter.addEventListener('change', render);
    if (dateFilter) dateFilter.addEventListener('change', render);

    tabs.forEach(t=>t.addEventListener('click', ()=>setActiveTab(t.dataset.tab)));
    supa.auth.onAuthStateChange((event)=>{ if (event==='SIGNED_OUT') location.replace('./login.html'); });

    await loadOrders();
    resetForm();
  }

  init();
})();
