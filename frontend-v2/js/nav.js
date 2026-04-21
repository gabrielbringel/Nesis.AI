// NesisAI — Lógica da sidebar e dashboard

(function () {
  'use strict';

  // ── Sidebar collapse/expand ─────────────────────────────────
  const shell = document.getElementById('dashShell');
  const collapseBtn = document.getElementById('collapseBtn');
  const mobileBtn = document.getElementById('mobileBtn');
  const overlay = document.getElementById('mobileOverlay');

  function isMobile() {
    return window.innerWidth < 1024;
  }

  if (collapseBtn && shell) {
    collapseBtn.addEventListener('click', () => {
      if (isMobile()) {
        shell.classList.toggle('mobile-open');
      } else {
        shell.classList.toggle('collapsed');
        try {
          localStorage.setItem('nesis.sidebarCollapsed', shell.classList.contains('collapsed') ? '1' : '0');
        } catch (_) {}
      }
    });
    try {
      if (localStorage.getItem('nesis.sidebarCollapsed') === '1' && !isMobile()) {
        shell.classList.add('collapsed');
      }
    } catch (_) {}
  }

  if (mobileBtn && shell) mobileBtn.addEventListener('click', () => shell.classList.add('mobile-open'));
  if (overlay && shell) overlay.addEventListener('click', () => shell.classList.remove('mobile-open'));

  // ── Section switching ────────────────────────────────────────
  const sectionMeta = {
    'visao-geral':   { title: 'Visão Geral',           subtitle: 'Quadro-resumo da operação' },
    'pacientes':     { title: 'Meus Pacientes',         subtitle: 'Quadro de pacientes ativos' },
    'historico':     { title: 'Histórico de Consultas', subtitle: 'Registro de análises anteriores' },
    'alertas':       { title: 'Alertas',                subtitle: 'Interações medicamentosas detectadas' },
    'configuracoes': { title: 'Configurações',          subtitle: 'Preferências da conta' },
  };

  function showSection(id) {
    document.querySelectorAll('.dash-section').forEach(s => { s.hidden = true; });
    const target = document.getElementById('s-' + id);
    if (target) target.hidden = false;

    const meta = sectionMeta[id] || {};
    const titleText = document.getElementById('topbarTitleText');
    const subtitle = document.getElementById('topbarSubtitle');
    if (titleText) titleText.textContent = meta.title || id;
    if (subtitle) subtitle.textContent = meta.subtitle || '';
  }

  const navItems = document.querySelectorAll('.nav-item[data-nav]');
  navItems.forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      navItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      const section = item.dataset.section;
      if (section) showSection(section);
      if (isMobile() && shell) shell.classList.remove('mobile-open');
    });
  });

  // ── Landing: navbar scrolled state ──────────────────────────
  const landingNav = document.querySelector('.landing-nav');
  if (landingNav) {
    const onScroll = () => landingNav.classList.toggle('scrolled', window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // ── Toast helper ─────────────────────────────────────────────
  window.NesisToast = function (opts) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast ' + (opts.type || 'info');
    toast.setAttribute('role', opts.type === 'danger' || opts.type === 'warning' ? 'alert' : 'status');
    toast.innerHTML =
      '<div class="toast-body">' +
      '<div class="toast-title">' + (opts.title || '') + '</div>' +
      (opts.desc ? '<div class="toast-desc">' + opts.desc + '</div>' : '') +
      '</div>';
    container.appendChild(toast);

    const dismissable = opts.type === 'danger' || opts.type === 'warning';
    if (!dismissable) {
      setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 300);
      }, opts.duration || 5000);
    } else {
      toast.style.cursor = 'pointer';
      toast.addEventListener('click', () => {
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 300);
      });
    }
  };

  // ── Severity badge helper ────────────────────────────────────
  function sevBadge(sev) {
    const labels = { grave: 'Grave', moderada: 'Moderada', leve: 'Leve', none: 'Nenhum' };
    return '<span class="sev-badge ' + (sev || 'none') + '">' + (labels[sev] || sev || 'Nenhum') + '</span>';
  }

  // ── Dashboard: métricas ──────────────────────────────────────
  const metricGrid = document.getElementById('metricGrid');
  if (metricGrid && window.NesisMock) {
    if (!NesisMock.metrics.length) {
      metricGrid.innerHTML =
        '<div class="empty-state" style="grid-column:1/-1">' +
        '<div>Nenhuma métrica disponível</div></div>';
    } else {
      metricGrid.innerHTML = NesisMock.metrics.map(m => {
        const trendClass = m.trend === 'up' ? 'up' : 'down';
        const trendArrow = m.trend === 'up' ? '▲' : '▼';
        const ariaTrend = m.trend === 'up' ? 'tendência de alta' : 'tendência de queda';
        const prefix = m.prefix ? '<span class="metric-prefix">' + m.prefix + '</span>' : '';
        return (
          '<div class="metric">' +
          '<div class="metric-label">' + m.label + '</div>' +
          '<div class="metric-value">' + prefix + m.value + '</div>' +
          '<div class="metric-trend ' + trendClass + '" aria-label="' + ariaTrend + '">' +
          '<span aria-hidden="true">' + trendArrow + '</span> ' + m.trendValue +
          '<span class="trend-label"> ' + m.trendLabel + '</span>' +
          '</div>' +
          '</div>'
        );
      }).join('');
    }
  }

  // ── Dashboard: gráfico de área ───────────────────────────────
  const chartHost = document.getElementById('chartHost');
  if (chartHost && window.NesisMock) drawAreaChart(chartHost, NesisMock.chart);

  function drawAreaChart(host, series) {
    if (!series || !series.length) {
      host.innerHTML = '<div class="empty-state"><div>Sem dados para exibir</div></div>';
      return;
    }
    const W = host.clientWidth || 800;
    const H = 280;
    const padL = 48, padR = 16, padT = 20, padB = 32;
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;
    const max = Math.max.apply(null, series);
    const min = Math.min.apply(null, series);
    const range = Math.max(1, max - min);

    const pts = series.map((v, i) => [
      padL + (i / (series.length - 1)) * innerW,
      padT + innerH - ((v - min) / range) * innerH,
    ]);

    const linePath = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
    const areaPath =
      linePath +
      ' L' + pts[pts.length - 1][0].toFixed(1) + ',' + (padT + innerH).toFixed(1) +
      ' L' + pts[0][0].toFixed(1) + ',' + (padT + innerH).toFixed(1) + ' Z';

    const ticks = 4;
    const tickEls = [];
    for (let i = 0; i <= ticks; i++) {
      const y = padT + (innerH * i) / ticks;
      const val = Math.round(max - ((max - min) * i) / ticks);
      tickEls.push(
        '<line x1="' + padL + '" x2="' + (W - padR) + '" y1="' + y + '" y2="' + y +
        '" stroke="#2A2A2A" stroke-width="1" stroke-dasharray="2 4"/>' +
        '<text x="' + (padL - 8) + '" y="' + (y + 4) +
        '" fill="#A0A0A0" font-family="Space Mono, monospace" font-size="10" text-anchor="end">' + val + '</text>'
      );
    }

    const xLabels = [];
    for (let i = 0; i < series.length; i += 5) {
      const x = padL + (i / (series.length - 1)) * innerW;
      xLabels.push(
        '<text x="' + x.toFixed(1) + '" y="' + (H - 10) +
        '" fill="#A0A0A0" font-family="Syne, sans-serif" font-size="10" text-anchor="middle">D' + (i + 1) + '</text>'
      );
    }

    host.innerHTML =
      '<svg viewBox="0 0 ' + W + ' ' + H + '" class="chart-svg" preserveAspectRatio="none" aria-label="Gráfico de análises — últimos 30 dias">' +
      '<defs>' +
      '<linearGradient id="lineGrad" x1="0" x2="1" y1="0" y2="0">' +
      '<stop offset="0%" stop-color="#FF3333"/><stop offset="100%" stop-color="#FFC100"/>' +
      '</linearGradient>' +
      '<linearGradient id="areaGrad" x1="0" x2="0" y1="0" y2="1">' +
      '<stop offset="0%" stop-color="#FF6B00" stop-opacity="0.45"/>' +
      '<stop offset="100%" stop-color="#FF6B00" stop-opacity="0"/>' +
      '</linearGradient>' +
      '</defs>' +
      tickEls.join('') +
      '<path d="' + areaPath + '" fill="url(#areaGrad)"/>' +
      '<path d="' + linePath + '" fill="none" stroke="url(#lineGrad)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>' +
      xLabels.join('') +
      '</svg>';
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const host = document.getElementById('chartHost');
      if (host && window.NesisMock) drawAreaChart(host, NesisMock.chart);
    }, 180);
  });

  // ── Histórico recente (Visão Geral) ──────────────────────────
  const recentHistoryBody = document.getElementById('recentHistoryBody');
  if (recentHistoryBody && window.NesisMock) {
    recentHistoryBody.innerHTML = NesisMock.history.slice(0, 5).map(r =>
      '<tr>' +
      '<td>' + r.patient + '</td>' +
      '<td class="id-col">' + r.date + '</td>' +
      '<td class="num-col">' + r.drugs + '</td>' +
      '<td class="num-col">' + (r.alerts || '—') + '</td>' +
      '<td>' + sevBadge(r.severity) + '</td>' +
      '</tr>'
    ).join('');
  }

  const btnVerTodas = document.getElementById('btnVerTodas');
  if (btnVerTodas) {
    btnVerTodas.addEventListener('click', () => {
      const historicoItem = document.querySelector('.nav-item[data-section="historico"]');
      if (historicoItem) historicoItem.click();
    });
  }

  // ── Grid de pacientes ────────────────────────────────────────
  const patientsGrid = document.getElementById('patientsGrid');
  if (patientsGrid && window.NesisMock) {
    if (!NesisMock.patients.length) {
      patientsGrid.innerHTML = '<div class="empty-state"><div>Nenhum paciente cadastrado</div></div>';
    } else {
      patientsGrid.innerHTML = NesisMock.patients.map(p => {
        const drugs = p.drugs.map(d => '<span class="drug-tag">' + d + '</span>').join('');
        const alertBadge = p.alertCount > 0
          ? '<span class="sev-badge ' + p.severity + '">' + p.alertCount + ' alerta' + (p.alertCount > 1 ? 's' : '') + '</span>'
          : '<span class="sev-badge none">Sem alertas</span>';
        return (
          '<div class="patient-card sev-' + p.severity + '">' +
          '<div class="patient-card-header">' +
          '<div>' +
          '<div class="patient-name">' + p.name + '</div>' +
          '<div class="patient-meta">' + p.age + ' anos &middot; ' + (p.sex === 'F' ? 'Feminino' : 'Masculino') + '</div>' +
          '</div>' +
          sevBadge(p.severity) +
          '</div>' +
          '<div class="patient-drugs">' + drugs + '</div>' +
          '<div class="patient-card-footer">' +
          '<span class="patient-date">Últ. consulta: ' + p.lastConsultation + '</span>' +
          alertBadge +
          '</div>' +
          '</div>'
        );
      }).join('');
    }
  }

  // ── Tabela completa de histórico ─────────────────────────────
  const historyBody = document.getElementById('historyBody');
  if (historyBody && window.NesisMock) {
    historyBody.innerHTML = NesisMock.history.map(r =>
      '<tr>' +
      '<td class="id-col">' + r.id + '</td>' +
      '<td>' + r.patient + '</td>' +
      '<td class="id-col">' + r.date + '</td>' +
      '<td class="num-col">' + r.drugs + '</td>' +
      '<td class="num-col">' + (r.alerts || '—') + '</td>' +
      '<td>' + sevBadge(r.severity) + '</td>' +
      '<td class="num-col">' + r.time + '</td>' +
      '</tr>'
    ).join('');
  }

  // ── Alertas com filtro ───────────────────────────────────────
  function renderAlerts(filter) {
    const list = document.getElementById('alertsList');
    if (!list || !window.NesisMock) return;
    const data = filter === 'all'
      ? NesisMock.alerts
      : NesisMock.alerts.filter(a => a.severity === filter);

    if (!data.length) {
      list.innerHTML = '<div class="empty-state"><div>Nenhum alerta encontrado para este filtro</div></div>';
      return;
    }

    list.innerHTML = data.map(a =>
      '<div class="alert-card ' + a.severity + '">' +
      '<div class="alert-card-header">' +
      '<div class="alert-drugs">' +
      '<span>' + a.drug1 + '</span>' +
      '<span class="alert-drugs-sep">+</span>' +
      '<span>' + a.drug2 + '</span>' +
      '</div>' +
      '<div class="alert-meta">' +
      sevBadge(a.severity) +
      '<span class="alert-score">score ' + a.score.toFixed(2) + '</span>' +
      '</div>' +
      '</div>' +
      '<div class="alert-patient">' + a.patient + ' &middot; ' + a.date + '</div>' +
      '<div class="alert-mechanism">' + a.mechanism + '</div>' +
      '<div class="alert-recommendation"><strong>Recomendação: </strong>' + a.recommendation + '</div>' +
      '</div>'
    ).join('');
  }

  if (document.getElementById('alertsList') && window.NesisMock) renderAlerts('all');

  document.querySelectorAll('.chip[data-filter]').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip[data-filter]').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      renderAlerts(chip.dataset.filter);
    });
  });

  // ── Nav badge: contagem de alertas graves ────────────────────
  const alertBadgeEl = document.getElementById('alertBadge');
  if (alertBadgeEl && window.NesisMock) {
    alertBadgeEl.textContent = NesisMock.alerts.filter(a => a.severity === 'grave').length;
  }

  // ── Modal: Nova Consulta ─────────────────────────────────────
  const modal = document.getElementById('modalConsulta');
  const btnNovaConsulta = document.getElementById('btnNovaConsulta');
  const modalClose = document.getElementById('modalClose');
  const modalCancel = document.getElementById('modalCancel');
  const btnAnalyze = document.getElementById('btnAnalyze');

  function openModal() {
    if (!modal) return;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = '';
  }

  if (btnNovaConsulta) btnNovaConsulta.addEventListener('click', openModal);
  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (modalCancel) modalCancel.addEventListener('click', closeModal);
  if (modal) modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  // ── Tabs do modal ────────────────────────────────────────────
  document.querySelectorAll('.tab[data-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab[data-tab]').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      document.querySelectorAll('.tab-panel').forEach(p => { p.hidden = true; });
      const id = 'tab' + tab.dataset.tab.charAt(0).toUpperCase() + tab.dataset.tab.slice(1);
      const panel = document.getElementById(id);
      if (panel) panel.hidden = false;
    });
  });

  // ── Drop zone ────────────────────────────────────────────────
  const dropZone = document.getElementById('dropZone');
  if (dropZone) {
    const label = dropZone.querySelector('.drop-zone-label');
    const hint = dropZone.querySelector('.drop-zone-hint');

    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', e => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) {
        if (label) label.textContent = file.name;
        if (hint) hint.textContent = (file.size / 1024).toFixed(0) + ' KB';
      }
    });

    const fileInput = document.getElementById('consultFile');
    if (fileInput) {
      fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (file) {
          if (label) label.textContent = file.name;
          if (hint) hint.textContent = (file.size / 1024).toFixed(0) + ' KB';
        }
      });
    }
  }

  // ── Botão Analisar ───────────────────────────────────────────
  if (btnAnalyze) {
    btnAnalyze.addEventListener('click', () => {
      const patientInput = document.getElementById('consultPatient');
      const patient = patientInput ? patientInput.value.trim() : '';
      closeModal();
      window.NesisToast({
        type: 'info',
        title: 'Análise iniciada' + (patient ? ' — ' + patient : ''),
        desc: 'O motor de IA está processando a prescrição.',
      });
      setTimeout(() => {
        window.NesisToast({
          type: 'success',
          title: 'Análise concluída',
          desc: 'Nenhuma interação grave detectada nesta prescrição.',
        });
      }, 2800);
    });
  }

  // ── Toast de boas-vindas ─────────────────────────────────────
  if (document.getElementById('toastContainer')) {
    setTimeout(() => {
      window.NesisToast({
        type: 'info',
        title: 'Bem-vindo de volta!',
        desc: 'Seus dados foram atualizados agora há pouco.',
      });
    }, 350);
  }

  // ── Login: submit mock ───────────────────────────────────────
  const loginForm = document.getElementById('loginForm');
  const loginBtn = document.getElementById('loginBtn');
  const loginBtnLabel = document.getElementById('loginBtnLabel');
  const pwToggle = document.getElementById('pwToggle');
  const pwInput = document.getElementById('loginPassword');
  const pwIconShow = document.getElementById('pwIconShow');
  const pwIconHide = document.getElementById('pwIconHide');

  if (pwToggle && pwInput) {
    pwToggle.addEventListener('click', () => {
      const isPw = pwInput.type === 'password';
      pwInput.type = isPw ? 'text' : 'password';
      pwToggle.setAttribute('aria-label', isPw ? 'Ocultar senha' : 'Mostrar senha');
      if (pwIconShow) pwIconShow.style.display = isPw ? 'none' : '';
      if (pwIconHide) pwIconHide.style.display = isPw ? '' : 'none';
    });
  }

  if (loginForm && loginBtn && loginBtnLabel) {
    loginForm.addEventListener('submit', e => {
      e.preventDefault();
      if (loginBtn.disabled) return;
      loginBtn.disabled = true;
      loginBtnLabel.innerHTML = '<span class="btn-spinner" aria-hidden="true"></span>';
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 1500);
    });
  }

})();
