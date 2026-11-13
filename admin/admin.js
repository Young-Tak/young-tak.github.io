(() => {
  'use strict';
  const OPTOUT_KEY = 'ytk-analytics-optout';
  const readOptOut = () => { try { return localStorage.getItem(OPTOUT_KEY) === '1'; } catch (_) { return false; } };
  const writeOptOut = value => { try { if (value) localStorage.setItem(OPTOUT_KEY, '1'); else localStorage.removeItem(OPTOUT_KEY); return true; } catch (_) { return false; } };
  const privacyOptOut = document.querySelector('#privacy-optout');
  if (privacyOptOut) {
    privacyOptOut.checked = readOptOut();
    privacyOptOut.addEventListener('change', () => {
      const saved = writeOptOut(privacyOptOut.checked);
      document.querySelector('#privacy-optout-status').textContent = saved
        ? (privacyOptOut.checked ? 'Statistics are disabled in this browser. / 이 브라우저의 통계 수집을 껐습니다.' : 'Your browser preference has been cleared. DNT and GPC are still respected. / 제외 설정을 해제했습니다. DNT·GPC 설정은 계속 적용됩니다.')
        : 'This browser could not save the preference. / 브라우저가 설정을 저장하지 못했습니다.';
    });
    return;
  }

  const form = document.querySelector('#login-form');
  if (!form) return;
  const API_ORIGIN = ['localhost', '127.0.0.1'].includes(location.hostname)
    ? location.origin : 'https://youngtak-site-analytics.wellchar512.chatgpt.site';
  const numberFormat = new Intl.NumberFormat('ko-KR');
  const eventNames = {pageview:'페이지 조회',section:'섹션 이동',cv_download:'CV 열기',publication_click:'논문 링크',video_start:'영상 시작',video_complete:'영상 완료'};
  const sectionNames = {research:'Research',publications:'Publications',background:'Background',patents:'Patents',service:'Service & Recognition',contact:'Contact'};
  const metricNames = {pageviews:'페이지 조회',sessions:'세션',interactions:'상호작용'};
  const sourceNames = {google_scholar:'Google Scholar',threads:'Threads',linkedin:'LinkedIn'};
  const publicationNames = {
  "pub-09": "Defining operational safety in clinical artificial intelligence systems",
  "pub-01": "When AI says “I don’t know”: a multireader multicase study of safety-zone guidance and radiologists’ reliance on AI advice in screening mammography",
  "pub-08": "Targeted Surface-Enhanced Raman Scattering for Highly Accurate Identification of Bacterial Species and Finding Spectral Signatures with Explainable Artificial Intelligence",
  "pub-15": "Non-contrast CT-based pulmonary embolism detection using GAN-generated synthetic contrast enhancement: Development and validation of an AI framework",
  "pub-21": "Differentiating loss of consciousness causes through artificial intelligence-enabled decoding of functional connectivity",
  "pub-16": "MINERVA—microbiome network research and visualization atlas: A scalable knowledge graph for mapping microbiome–disease associations",
  "pub-33": "BiomeTrail: Preserving Evidence, Context, and Disagreement in Mechanistic Microbe–Host Graph Question Answering",
  "pub-06": "League of Radiologists—an End-to-End AI Framework for Scalable and Gamified Radiology Education: A Pilot Implementation in Chest Radiography",
  "pub-07": "The Effects of Prompt Engineering on a Multimodal Large Language Model in Neuroradiology: A Case Study of GPT-4o for Intracranial Hemorrhage Diagnosis from Brain CT",
  "pub-02": "Lesion-Specific Artificial Intelligence Scores on Screening Digital Breast Tomosynthesis Are Associated with Breast Cancer Aggressiveness",
  "pub-03": "Literature-to-metagenome alignment for microbiome discovery across human diseases",
  "pub-04": "EEG network features and APOE ε4 for amyloid classification in mild cognitive impairment",
  "pub-05": "Lateralized amyloid PET uptake and beta-band connectivity in relation to cognition in temporal lobe epilepsy",
  "pub-10": "A Deep-Learning Framework for Predicting Teprotumumab Treatment Response in Thyroid Eye Disease",
  "pub-11": "Advanced side-channel evaluation using contextual deep learning-based leakage modeling",
  "pub-12": "ARANet: Adaptive resolution attention network for precise MRI-based segmentation and quantification of fetal size and amniotic fluid volume",
  "pub-34": "Bounded Verification and Asymmetric Recoverability in Biomedical Knowledge-Graph Construction",
  "pub-13": "Response to ‘Methodological and statistical concerns in MINERVA microbiome–disease knowledge graph’ by Salvatore Chirumbolo",
  "pub-14": "Electroencephalography functional network for screening amyloid positivity in mild cognitive impairment: A cross-sectional study",
  "pub-17": "Enhancing deep learning-based side-channel analysis using feature engineering in a fully simulated IoT system",
  "pub-18": "HKA-Net: Clinically adapted deep learning for automated measurement of hip–knee–ankle angle on lower limb radiography for knee osteoarthritis assessment",
  "pub-19": "Privacy-preserving synthetic data generation method for IoT-sensor network IDS using CTGAN",
  "pub-20": "Increased cerebellar vermis volume following repetitive transcranial magnetic stimulation in drug-resistant epilepsy: A voxel-based morphometry study",
  "pub-22": "Software weakness detection in Solidity smart contracts using control and data flow analysis: A novel approach with graph neural networks",
  "pub-23": "Generating synthetic dataset for ML-based IDS using CTGAN and feature selection to protect smart IoT environments",
  "pub-24": "SleepExpertNet: High-performance and class-balanced deep learning approach inspired by expert neurologists for sleep stage classification",
  "pub-25": "DeepCNAP: A deep learning approach for continuous noninvasive arterial blood pressure monitoring using photoplethysmography",
  "pub-26": "Intracranial densitometry-augmented machine learning enhances the prognostic value of brain CT in pediatric patients with traumatic brain injury: A retrospective pilot study",
  "pub-27": "Prediction of life-threatening intracranial hypertension during the acute phase of traumatic brain injury using machine learning",
  "pub-28": "Cerebrospinal fluid dynamics correlates with neurogenic claudication in lumbar spinal stenosis",
  "pub-29": "Artifact removal from neurophysiological signals: Impact on intracranial and arterial pressure monitoring in traumatic brain injury",
  "pub-30": "Novel index for predicting mortality during the first 24 hours after traumatic brain injury",
  "pub-31": "Changes in the gray and white matter of patients with ischemic-edematous insults after traumatic brain injury",
  "pub-32": "Thresholds of resistance to CSF outflow in predicting shunt responsiveness",
  "pub-35": "Functional neuromonitoring in acquired head injury"
};
  let regionNames;
  try { regionNames = new Intl.DisplayNames(['ko', 'en'], {type:'region'}); } catch (_) {}
  let token = null;
  let report = null;
  let requestedDays = 30;
  let expirationTimer = null;
  let reportRequest = null;
  let loginRequest = null;
  let authVersion = 0;
  let requestVersion = 0;
  let busy = false;
  const el = id => document.getElementById(id);
  const count = value => Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;
  const text = value => typeof value === 'string' ? value : '';
  const formatCount = value => numberFormat.format(count(value));
  const dateUTC = value => {
    const d = new Date(value);
    return Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 10) : '—';
  };
  const timestampUTC = value => {
    const d = new Date(value);
    return Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 19).replace('T', ' ') : '—';
  };
  function readableName(value, category = '') {
    const name = text(value).trim();
    if (category === 'sources') return name ? (sourceNames[name] || name) : 'UTM 태그 없음';
    if (!name || /^(unknown|unknown region|n\/a|null)$/i.test(name)) return '알 수 없음';
    if (/^(direct|none|direct \/ unknown|direct\/unknown)$/i.test(name)) return '직접 접속 / 정보 없음';
    if (category === 'countries' && /^[A-Z]{2}$/.test(name) && regionNames) {
      try { return regionNames.of(name) || name; } catch (_) {}
    }
    if (category === 'events') return eventNames[name] || name;
    const deviceNames = {desktop:'데스크톱',mobile:'모바일',tablet:'태블릿',bot:'봇'};
    return category === 'devices' ? (deviceNames[name.toLowerCase()] || name) : name;
  }
  function eventTarget(type, label) {
    if (type === 'pageview') return '홈페이지';
    if (type === 'cv_download') return 'Curriculum vitae';
    if (type === 'section') return sectionNames[label] || readableName(label);
    return publicationNames[label] || (text(label) || '—');
  }
  function status(id, message, error = false) {
    el(id).textContent = message;
    el(id).classList.toggle('error', error);
  }
  function setBusy(value) {
    busy = value;
    el('dashboard').setAttribute('aria-busy', String(value));
    el('refresh').disabled = value;
    document.querySelectorAll('[data-days]').forEach(button => { button.disabled = value; });
    el('export-csv').disabled = value || !report;
  }
  function clearReport() {
    report = null;
    ['total-pageviews','total-sessions','total-interactions'].forEach(id => { el(id).textContent = '—'; });
    ['daily-table','recent-table','countries-list','sources-list','referrers-list','devices-list','browsers-list','events-list'].forEach(id => el(id).replaceChildren());
    el('untagged-count').textContent = '';
    el('daily-chart').replaceChildren();
    el('range-description').textContent = '데이터를 불러오는 중입니다.';
    el('updated-at').textContent = '모든 날짜와 시간은 UTC 기준입니다.';
    el('recent-count').textContent = '최대 100건';
    el('collection-start').textContent = '수집 시작일 확인 중';
    el('geo-note').textContent = '접속 국가는 호스팅에서 제공하는 정보를 사용합니다.';
    el('chart-empty').hidden = true;
    el('recent-empty').hidden = true;
    el('export-csv').disabled = true;
  }
  function endSession(message = '') {
    token = null;
    authVersion++;
    if (loginRequest) loginRequest.abort();
    loginRequest = null;
    requestVersion++;
    clearTimeout(expirationTimer);
    if (reportRequest) reportRequest.abort();
    reportRequest = null;
    clearReport();
    el('dashboard').hidden = true;
    el('logout').hidden = true;
    el('login-panel').hidden = false;
    el('password').value = '';
    el('password').type = 'password';
    el('toggle-password').textContent = '표시';
    el('toggle-password').setAttribute('aria-label', '비밀번호 표시');
    el('toggle-password').setAttribute('aria-pressed', 'false');
    el('login-button').disabled = false;
    el('login-button').textContent = '로그인';
    setBusy(false);
    status('dashboard-message', '');
    status('login-message', message);
  }
  async function api(path, {method = 'GET', body, signal, bearer = token} = {}) {
    const headers = {Accept:'application/json'};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (bearer) headers.Authorization = `Bearer ${bearer}`;
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) controller.abort();
    else signal?.addEventListener('abort', abort, {once:true});
    const timeout = setTimeout(abort, 20000);
    try {
      const response = await fetch(API_ORIGIN + path, {
        method, headers, body:body === undefined ? undefined : JSON.stringify(body),
        signal:controller.signal, mode:'cors', credentials:'omit', cache:'no-store', referrerPolicy:'no-referrer'
      });
      if (!response.ok) {
        const error = new Error('Request failed');
        error.status = response.status;
        error.retryAfter = response.headers.get('Retry-After');
        throw error;
      }
      return response.status === 204 ? {} : await response.json();
    } catch (error) {
      if (controller.signal.aborted && !signal?.aborted) {
        const timeoutError = new Error('Request timed out'); timeoutError.name='TimeoutError'; throw timeoutError;
      }
      throw error;
    } finally {clearTimeout(timeout);signal?.removeEventListener('abort', abort);}
  }
  function errorMessage(error, login = false) {
    if (error.name === 'TimeoutError') return '서버 응답이 늦어 요청을 중단했습니다. 다시 시도해주세요.';
    if (error instanceof SyntaxError || /Invalid (report|login response)/.test(error.message)) return '서버 응답을 읽지 못했습니다. 다시 시도해주세요.';
    if (error.status === 401) return login ? '아이디 또는 비밀번호를 확인해주세요.' : '로그인 시간이 만료되었습니다. 다시 로그인해주세요.';
    if (error.status === 429) return '요청이 많습니다. 잠시 후 다시 시도해주세요.';
    if (error.status >= 500) return '통계 서버가 응답하지 못했습니다. 잠시 후 다시 시도해주세요.';
    if (error.status) return '요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.';
    return '서버에 연결하지 못했습니다. 연결 상태를 확인하고 다시 시도해주세요.';
  }
  function normalizeReport(value) {
    if (!value || typeof value !== 'object' || !value.summary || !value.range || !Array.isArray(value.daily) || !Array.isArray(value.recent)) throw new Error('Invalid report');
    const list = key => Array.isArray(value[key]) ? value[key].slice(0, 150).map(row => ({name:text(row.name),count:count(row.count)})) : [];
    const sources = list('sources');
    Object.keys(sourceNames).forEach(name => { if (!sources.some(source=>source.name===name)) sources.push({name,count:0}); });
    return {
      range:{days:[7,30,90].includes(Number(value.range.days)) ? Number(value.range.days) : requestedDays,from:text(value.range.from),to:text(value.range.to),timezone:'UTC'},
      collection:{startedAt:text(value.collection?.startedAt),retentionDays:count(value.collection?.retentionDays) || 90,
        countryAvailable:(value.collection?.countryAvailable ?? value.collection?.geographyAvailable) === true},
      summary:{pageviews:count(value.summary.pageviews),sessions:count(value.summary.sessions),interactions:count(value.summary.interactions)},
      daily:value.daily.slice(0, 90).map(day => ({date:text(day.date),pageviews:count(day.pageviews),sessions:count(day.sessions),interactions:count(day.interactions)})).sort((a,b)=>a.date.localeCompare(b.date)),
      countries:list('countries'),sources,referrers:list('referrers'),devices:list('devices'),browsers:list('browsers'),languages:list('languages'),events:list('events'),
      recent:value.recent.slice(0, 100).map(row => ({at:text(row.at),type:text(row.type),label:text(row.label),path:'/',country:text(row.country),utmSource:text(row.utmSource),referrer:text(row.referrer),device:text(row.device),browser:text(row.browser),language:text(row.language)}))
    };
  }
  function addCell(row, value, className = '') {
    const cell = document.createElement('td');
    if (className === 'event-target') {
      const title=document.createElement('span');title.className='event-title';title.textContent=value;title.title=value;cell.append(title);
    } else cell.textContent = value;
    if (className) cell.className = className;
    row.append(cell);
  }
  function renderRanks(key) {
    const target = el(key + '-list');
    target.replaceChildren();
    const entries = report[key].filter(item => (key !== 'events' || item.name !== 'pageview') && (key !== 'sources' || item.name)).sort((a,b)=>b.count-a.count).slice(0, 8);
    if (!entries.length) {
      const item = document.createElement('li'); item.className = 'no-data'; item.textContent = '수집된 기록 없음'; target.append(item); return;
    }
    const maximum = Math.max(...entries.map(item=>item.count), 1);
    entries.forEach(item => {
      const li = document.createElement('li');
      const row = document.createElement('div'); row.className = 'rank-row';
      const name = document.createElement('span'); name.className = 'rank-name'; name.textContent = readableName(item.name, key);
      const total = document.createElement('span'); total.className = 'rank-count'; total.textContent = formatCount(item.count);
      const track = document.createElement('div'); track.className = 'rank-track'; track.setAttribute('aria-hidden', 'true');
      const fill = document.createElement('span'); fill.style.width = `${Math.min(100, item.count / maximum * 100)}%`;
      track.append(fill); row.append(name,total); li.append(row,track); target.append(li);
    });
  }
  function renderChart() {
    if (!report) return;
    const svg = el('daily-chart'); svg.replaceChildren();
    const metric = Object.hasOwn(metricNames, el('chart-metric').value) ? el('chart-metric').value : 'pageviews';
    const days = report.daily;
    const svgNode = (name, attributes = {}, content) => {
      const node = document.createElementNS('http://www.w3.org/2000/svg', name);
      Object.entries(attributes).forEach(([key,value]) => node.setAttribute(key,String(value)));
      if (content !== undefined) node.textContent = content;
      svg.append(node); return node;
    };
    const total = days.reduce((sum,day)=>sum+day[metric],0);
    svgNode('title',{id:'chart-title'},`일별 ${metricNames[metric]}`);
    svgNode('desc',{id:'chart-description'},days.length ? `${dateUTC(days[0].date)}부터 ${dateUTC(days[days.length-1].date)}까지 일별 ${metricNames[metric]}입니다. 정확한 수치는 아래 일별 숫자 표에서 확인할 수 있습니다.` : '선택한 기간에 수집된 기록이 없습니다.');
    const noActivity = !days.length || total === 0;
    el('chart-empty').hidden = !noActivity;
    svg.hidden = noActivity;
    if (noActivity) return;
    const left=45, right=940, top=20, bottom=222;
    const maximum = Math.max(4, Math.ceil(Math.max(...days.map(day=>day[metric])) / 4) * 4);
    for (let step=0;step<=4;step++) {
      const value=maximum*step/4, y=bottom-(bottom-top)*step/4;
      svgNode('line',{x1:left,x2:right,y1:y,y2:y,class:'chart-grid'});
      svgNode('text',{x:left-10,y:y+4,'text-anchor':'end',class:'chart-axis'},formatCount(value));
    }
    const points = days.map((day,index) => [days.length===1 ? (left+right)/2 : left+(right-left)*index/(days.length-1),bottom-(bottom-top)*day[metric]/maximum]);
    if (points.length>1) svgNode('path',{d:`M ${points[0][0]} ${bottom} L ${points.map(p=>p.join(' ')).join(' L ')} L ${points[points.length-1][0]} ${bottom} Z`,class:'chart-area'});
    svgNode('polyline',{points:points.map(p=>p.join(',')).join(' '),class:'chart-line'});
    if (days.length<=31) points.forEach((point,index) => {
      const dot=svgNode('circle',{cx:point[0],cy:point[1],r:3,class:'chart-point'});
      const title=document.createElementNS('http://www.w3.org/2000/svg','title');title.textContent=`${dateUTC(days[index].date)} · ${formatCount(days[index][metric])}`;dot.append(title);
    });
    const ticks = [...new Set([0,Math.round((days.length-1)/3),Math.round((days.length-1)*2/3),days.length-1])];
    ticks.forEach(index => svgNode('text',{x:points[index][0],y:bottom+27,'text-anchor':index===0?'start':index===days.length-1?'end':'middle',class:'chart-axis'},dateUTC(days[index].date).slice(5)));
  }
  function renderReport() {
    for (const metric of ['pageviews','sessions','interactions']) el('total-' + metric).textContent = formatCount(report.summary[metric]);
    el('range-description').textContent = `${dateUTC(report.range.from)} — ${dateUTC(report.range.to)} · 최근 ${report.range.days}일 · UTC`;
    el('updated-at').textContent = `불러온 시각 ${timestampUTC(new Date())} UTC`;
    document.querySelectorAll('[data-days]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.days)===report.range.days)));
    el('daily-table').replaceChildren();
    report.daily.forEach(day => {
      const row=document.createElement('tr');addCell(row,dateUTC(day.date));
      ['pageviews','sessions','interactions'].forEach(metric=>addCell(row,formatCount(day[metric]),'number'));el('daily-table').append(row);
    });
    renderChart();
    ['countries','sources','referrers','devices','browsers','events'].forEach(renderRanks);
    el('untagged-count').textContent = `UTM 태그 없는 조회 ${formatCount(report.sources.find(source=>!source.name)?.count || 0)}건`;
    el('recent-table').replaceChildren();
    report.recent.forEach(item => {
      const row=document.createElement('tr');
      const country=readableName(item.country,'countries');
      [timestampUTC(item.at),eventNames[item.type]||item.type,eventTarget(item.type,item.label),country,readableName(item.device,'devices'),readableName(item.browser),readableName(item.utmSource,'sources'),readableName(item.referrer)].forEach((value,index)=>addCell(row,value,index===2?'event-target':''));
      el('recent-table').append(row);
    });
    el('recent-count').textContent = `${report.recent.length}건 표시 · 최근 최대 100건`;
    el('recent-empty').hidden = report.recent.length!==0;
    el('collection-start').textContent = report.collection.startedAt ? `수집 시작: ${timestampUTC(report.collection.startedAt)} UTC · 수집 이전의 방문은 포함되지 않습니다.` : '아직 수집된 방문 기록이 없습니다. 수집 이전의 방문은 집계할 수 없습니다.';
    el('geo-note').textContent = report.collection.countryAvailable
      ? '접속 국가는 호스팅에서 제공하는 정보를 사용합니다. 확인할 수 없는 기록은 ‘알 수 없음’으로 표시됩니다.'
      : '선택한 기간에 확인 가능한 국가 정보가 없습니다. 과거 기록의 위치를 추정해서 채우지 않습니다.';
  }
  async function loadReport(days = requestedDays) {
    if (!token || busy) return;
    requestedDays = days;
    const version=++requestVersion;
    reportRequest=new AbortController();
    setBusy(true);status('dashboard-message','통계를 불러오는 중입니다.');
    try {
      const raw=await api(`/api/stats?days=${days}`,{signal:reportRequest.signal});
      if (version!==requestVersion || !token) return;
      report=normalizeReport(raw);renderReport();status('dashboard-message','');
    } catch (error) {
      if (error.name==='AbortError' || version!==requestVersion) return;
      if (error.status===401) {endSession(errorMessage(error));el('password').focus();return;}
      const suffix=report?' 마지막으로 불러온 데이터를 표시하고 있습니다.':'';
      status('dashboard-message',errorMessage(error)+suffix,true);
    } finally { if (version===requestVersion) { reportRequest=null;setBusy(false); } }
  }
  form.addEventListener('submit',async event => {
    event.preventDefault();
    if (el('login-button').disabled || !form.reportValidity()) return;
    const username=el('username').value.trim(), password=el('password').value;
    const attempt=++authVersion;
    loginRequest=new AbortController();
    el('login-button').disabled=true;el('login-button').textContent='로그인 중…';status('login-message','');
    try {
      const response=await api('/api/login',{method:'POST',body:{username,password},bearer:null,signal:loginRequest.signal});
      if (attempt!==authVersion) return;
      const expiry=new Date(response.expiresAt).getTime();
      if (typeof response.token!=='string' || !response.token || !Number.isFinite(expiry) || expiry<=Date.now()) throw new Error('Invalid login response');
      token=response.token;
      el('password').value='';
      const saved=writeOptOut(true);el('owner-optout').checked=saved;
      el('optout-note').textContent=saved?'로그인한 브라우저는 기본적으로 제외됩니다. 이 설정은 이 브라우저에만 적용됩니다.':'브라우저가 제외 설정을 저장하지 못했습니다. 개인정보 보호 설정을 확인해주세요.';
      el('login-panel').hidden=true;el('dashboard').hidden=false;el('logout').hidden=false;
      expirationTimer=setTimeout(()=>endSession('로그인 시간이 만료되었습니다. 다시 로그인해주세요.'),Math.max(0,expiry-Date.now()));
      el('dashboard-title').tabIndex=-1;el('dashboard-title').focus({preventScroll:true});
      await loadReport(requestedDays);
    } catch(error) {if(attempt!==authVersion)return;status('login-message',errorMessage(error,true),true);el('password').value='';el('password').focus();}
    finally {if(attempt===authVersion){loginRequest=null;el('login-button').disabled=false;el('login-button').textContent='로그인';}}
  });
  el('toggle-password').addEventListener('click',()=>{
    const show=el('password').type==='password';el('password').type=show?'text':'password';
    el('toggle-password').textContent=show?'숨김':'표시';el('toggle-password').setAttribute('aria-pressed',String(show));el('toggle-password').setAttribute('aria-label',show?'비밀번호 숨김':'비밀번호 표시');
  });
  el('logout').addEventListener('click',async()=>{
    const previous=token;endSession('로그아웃했습니다.');
    el('username').focus();
    if (previous) try {await api('/api/logout',{method:'POST',bearer:previous});} catch (_) {status('login-message','이 브라우저에서는 로그아웃했습니다. 서버의 세션 종료는 확인하지 못했습니다.');}
  });
  document.querySelectorAll('[data-days]').forEach(button=>button.addEventListener('click',()=>loadReport(Number(button.dataset.days))));
  el('refresh').addEventListener('click',()=>loadReport(requestedDays));
  el('chart-metric').addEventListener('change',renderChart);
  el('owner-optout').addEventListener('change',()=>{
    const saved=writeOptOut(el('owner-optout').checked);
    el('optout-note').textContent=saved?(el('owner-optout').checked?'이 브라우저의 이후 홈페이지 방문은 통계에서 제외됩니다.':'이 브라우저의 이후 홈페이지 방문을 집계할 수 있습니다. DNT·GPC 설정은 계속 적용됩니다.'):'브라우저가 설정을 저장하지 못했습니다.';
  });
  function csvCell(value) {
    let valueText=String(value??'');
    if (/^[\s\uFEFF\u00A0]*[=+\-@]/u.test(valueText) || /^[\t\r\n]/.test(valueText)) valueText="'"+valueText;
    return '"'+valueText.replace(/"/g,'""')+'"';
  }
  el('export-csv').addEventListener('click',()=>{
    if (!report) return;
    const headers=['record_type','category','date_utc','name','event','label','country','utm_source','referrer','device','browser','language','pageviews','sessions','interactions','count'];
    const rows=[headers];
    const row=value=>rows.push(headers.map(key=>value[key]??''));
    row({record_type:'metadata',category:'range_start',date_utc:report.range.from});
    row({record_type:'metadata',category:'range_end',date_utc:report.range.to});
    row({record_type:'metadata',category:'collection_started',date_utc:report.collection.startedAt});
    row({record_type:'summary',...report.summary});
    report.daily.forEach(day=>row({record_type:'daily',date_utc:day.date,...day}));
    ['countries','sources','referrers','devices','browsers','languages','events'].forEach(category=>report[category].forEach(item=>row({record_type:'ranking',category,...item})));
    report.recent.forEach(item=>row({record_type:'recent_event',date_utc:item.at,event:item.type,name:eventTarget(item.type,item.label),...item,utm_source:item.utmSource}));
    const blob=new Blob(['\uFEFF'+rows.map(cells=>cells.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob), link=document.createElement('a');
    link.href=url;link.download=`youngtak-analytics-${dateUTC(report.range.from)}-${dateUTC(report.range.to)}.csv`;
    document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  window.addEventListener('pagehide',()=>endSession());
  window.addEventListener('pageshow',event=>{if(event.persisted)endSession('페이지를 다시 열었습니다. 로그인해주세요.');});
  el('login-button').disabled=false;
})();
