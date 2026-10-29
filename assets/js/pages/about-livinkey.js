document.addEventListener('DOMContentLoaded', () => {
  renderLayout('about_livinkey', 'About Livinkey', 'Company notices');
  let notices = [];
  const grid = document.getElementById('noticeGrid');
  const alertBox = document.getElementById('noticeAlert');
  const filesInput = document.getElementById('noticeFiles');
  const uploadBtn = document.getElementById('uploadBtn');
  const selectedFiles = document.getElementById('selectedFiles');
  const canAdd = Permissions.canAdd('about_livinkey');
  const canEdit = Permissions.canEdit('about_livinkey');
  const canDelete = Permissions.canDelete('about_livinkey');

  const showAlert=(message,type='success')=>{
    alertBox.innerHTML=`<div class="alert alert-${type} py-2">${lkEsc(message)}</div>`;
    setTimeout(()=>alertBox.innerHTML='',3500);
  };

  async function loadNotices(){
    PAGE_LOADER.grid(grid,'Loading notices...');
    try{
      const res=await API.livinkeyNotices.getAll();
      if(!res.success) throw new Error(res.message);
      notices=res.data||[];
      document.getElementById('noticeCount').textContent=`${notices.length} / 5`;
      renderNotices();
    }catch(e){grid.innerHTML=`<div class="col-12"><div class="alert alert-danger">${lkEsc(e.message||'Unable to load notices.')}</div></div>`;}
  }

  function renderNotices(){
    if(!notices.length){grid.innerHTML='<div class="col-12 text-center py-5 text-muted-soft"><i class="bi bi-images fs-1 d-block mb-2"></i>No notices uploaded yet.</div>';return;}
    grid.innerHTML=notices.map((n,i)=>`
      <div class="col-12 col-md-6 col-xl-4">
        <div class="notice-card">
          <div class="notice-img-wrap"><img src="${n.image_url}" alt="Livinkey Notice ${i+1}"></div>
          <div class="notice-actions">
            ${canEdit?`<label class="btn btn-outline-secondary btn-sm mb-0 replace-label"><i class="bi bi-arrow-repeat me-1"></i>Replace<input type="file" class="d-none replace-input" data-id="${n.id}" accept="image/*"></label>`:''}
            ${canDelete?`<button class="btn btn-outline-danger btn-sm delete-notice-btn" data-id="${n.id}"><i class="bi bi-trash me-1"></i>Delete</button>`:''}
          </div>
        </div>
      </div>`).join('');

    document.querySelectorAll('.replace-input').forEach(input=>input.addEventListener('change',async e=>{
      if(!e.target.files?.length)return;
      const btn=e.target.closest('.notice-card')?.querySelector('.replace-label');
      if(btn)LOADER.show(btn,'Replacing...');
      try{
        const res=await API.livinkeyNotices.replace(e.target.dataset.id,e.target.files[0]);
        if(!res.success)throw new Error(res.message);
        showAlert('Notice replaced successfully.');
        await loadNotices();
      }catch(err){showAlert(err.message||'Unable to replace notice.','danger');}
      finally{if(btn)LOADER.hide(btn);e.target.value='';}
    }));
    document.querySelectorAll('.delete-notice-btn').forEach(btn=>btn.addEventListener('click',async()=>{
      const id=btn.dataset.id;
      if(!confirm('Delete this notice? It will disappear from the tenant app.'))return;
      LOADER.show(btn,'Deleting...');
      try{
        const res=await API.livinkeyNotices.delete(id);
        if(!res.success)throw new Error(res.message);
        showAlert('Notice deleted.');
        await loadNotices();
      }catch(e){showAlert(e.message||'Unable to delete notice.','danger');}
      finally{LOADER.hide(btn);}
    }));
  }

  document.getElementById('chooseNotices')?.addEventListener('click',()=>filesInput.click());
  filesInput?.addEventListener('change',()=>{
    const selected=Array.from(filesInput.files||[]);
    if(!selected.length)return;
    if(notices.length+selected.length>5){showAlert(`You can have only ${5-notices.length} more notice image(s).`,'warning');filesInput.value='';uploadBtn.classList.add('d-none');selectedFiles.classList.add('d-none');return;}
    selectedFiles.textContent=`${selected.length} image(s) selected: ${selected.map(f=>f.name).join(', ')}`;
    selectedFiles.classList.remove('d-none');uploadBtn.classList.remove('d-none');
  });
  uploadBtn?.addEventListener('click',async()=>{
    const selected=Array.from(filesInput.files||[]);if(!selected.length)return;
    LOADER.show(uploadBtn,'Uploading...');
    try{
      const res=await API.livinkeyNotices.upload(selected);
      if(!res.success)throw new Error(res.message);
      showAlert('Notice images uploaded successfully.');filesInput.value='';selectedFiles.classList.add('d-none');uploadBtn.classList.add('d-none');await loadNotices();
    }catch(e){showAlert(e.message||'Unable to upload notices.','danger');}
    finally{LOADER.hide(uploadBtn);}
  });
  if(!canAdd){document.getElementById('chooseNotices')?.classList.add('d-none');}
  loadNotices();
});
