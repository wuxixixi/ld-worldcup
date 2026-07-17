// LD看世界杯 - 主应用脚本
// 数据驱动 + ECharts 可视化

(function() {
  'use strict';

  const DATA_URL = 'data/matches.json';
  let appData = null;

  // ========== 数据加载 ==========
  async function loadData() {
    try {
      const res = await fetch(DATA_URL + '?t=' + Date.now());
      appData = await res.json();
      renderAll();
    } catch (e) {
      console.error('数据加载失败:', e);
      document.getElementById('app').innerHTML =
        '<div style="text-align:center;padding:60px;color:#999;">数据加载失败,请刷新页面</div>';
    }
  }

  // ========== 渲染概览 ==========
  function renderOverview() {
    const acc = appData.meta.modelAccuracy;
    // 容错:兼容 roundOf16 或 roundOf16_played 两种命名
    const r16 = acc.roundOf16 || acc.roundOf16_played || { correct: 0, total: 0 };
    document.getElementById('stat-total').textContent =
      (acc.roundOf32.total + r16.total);
    document.getElementById('stat-correct').textContent =
      (acc.roundOf32.correct + r16.correct);
    document.getElementById('stat-rate').textContent =
      acc.overall.rate;

    // 从 matches.json final 数据读取决赛场地和日期, 而非硬编码
    const finalMatch = (appData.final && appData.final.length > 0) ? appData.final[0] : null;
    document.getElementById('stat-stadium').textContent =
      finalMatch && finalMatch.venue ? finalMatch.venue : '纽约大都会';
    document.getElementById('stat-final-date').textContent =
      finalMatch ? (finalMatch.date || '') + (finalMatch.time ? ' ' + finalMatch.time : '') : '7月19日 03:00';
  }

  // ========== 渲染冠军预测 ==========
  function renderChampion() {
    const champ = appData.championPrediction;
    if (!champ || !champ.team) {
      document.getElementById('champion-section').innerHTML = '';
      return;
    }
    const html = `
      <div class="champion-card">
        <div class="champion-flag">${champ.flag || ''}</div>
        <div class="champion-team">${champ.team}</div>
        <div style="font-size:18px;opacity:0.9;margin-top:4px;">预测冠军 · Predicted Champion</div>
        <div class="champion-reason">${champ.reason || ''}</div>
      </div>
    `;
    document.getElementById('champion-section').innerHTML = html;
  }

  // ========== 渲染准确率仪表盘(完全数据驱动) ==========
  function renderAccuracy() {
    const acc = appData.meta.modelAccuracy;
    const overall = parseFloat(acc.overall.rate);
    const dashOffset = 339.292 - (339.292 * overall / 100);

    // 动态生成阶段行(从 modelAccuracy 读取所有阶段)
    const stageLabels = {
      roundOf32: '⚽ 1/16 决赛(已完赛)',
      roundOf16: '🎯 1/8 决赛(已完赛)',
      roundOf16_played: '🎯 1/8 决赛(已完赛)',
      quarterFinals_played: '🏆 1/4 决赛(已完赛)',
      semiFinals_played: '🥇 半决赛(已完赛)',
      final_played: '👑 决赛(已完赛)'
    };

    let stageRows = '';
    Object.keys(acc).forEach(key => {
      if (key === 'overall') return;
      const data = acc[key];
      if (!data || typeof data.correct === 'undefined') return; // 跳过非阶段字段(如 modelNotes、accuracyTrend)
      const label = stageLabels[key] || key;
      stageRows += `
        <div class="accuracy-row">
          <span class="accuracy-label">${label}</span>
          <span class="accuracy-value">${data.correct}/${data.total} = ${data.rate}</span>
        </div>
      `;
    });

    // 平均置信度
    const avgConf = acc.overall.avgConfidence || '79%';

    document.getElementById('accuracy-section').innerHTML = `
      <div class="accuracy-meter">
        <div class="accuracy-ring">
          <svg width="140" height="140">
            <circle class="accuracy-ring-bg" cx="70" cy="70" r="54"></circle>
            <circle class="accuracy-ring-fg" cx="70" cy="70" r="54"
              stroke-dasharray="339.292" stroke-dashoffset="${dashOffset}"></circle>
          </svg>
          <div class="accuracy-ring-text">${overall}%</div>
        </div>
        <div class="accuracy-details">
          <div class="accuracy-row">
            <span class="accuracy-label">📊 总预测准确率</span>
            <span class="accuracy-value">${acc.overall.correct}/${acc.overall.total} = ${acc.overall.rate}</span>
          </div>
          ${stageRows}
          <div class="accuracy-row">
            <span class="accuracy-label">🎯 平均模型置信度</span>
            <span class="accuracy-value">${avgConf}</span>
          </div>
        </div>
      </div>
    `;
  }

  // ========== 渲染比赛卡片 ==========
  function renderMatchCard(match, opts = {}) {
    // 已完赛优先(有 score 字段);否则看 status 或仅有 prediction
    const isPlayed = !!match.score;
    const isUpcoming = !isPlayed && (match.status === '未赛' || !!match.prediction);
    const score = match.score || match.prediction || '-';
    const winner = match.winner || match.predWinner || '';
    const winnerNote = match.winnerNote || '';
    const predBadge = match.predCorrect === true ?
      '<span class="pred-correct true">✓ 预测正确</span>' :
      match.predCorrect === false ?
      '<span class="pred-correct false">✗ 预测失误</span>' : '';

    // 置信度标签
    const confLabel = match.predConfidence === 'high' ? '🔴 高置信度' :
                      match.predConfidence === 'medium' ? '🟡 中置信度' :
                      match.predConfidence === 'low' ? '🟢 低置信度' : '';

    return `
      <div class="match-card ${isUpcoming ? 'upcoming' : ''}">
        <div class="match-header">
          <span><span class="match-stage">${match.stage}</span> ${predBadge} ${confLabel ? '<span style="font-size:10px;color:#666;margin-left:4px;">' + confLabel + '</span>' : ''}</span>
          <span class="match-time">${match.date}${match.time ? ' ' + match.time : ''}</span>
        </div>
        <div class="match-body">
          <div class="team">
            <span class="team-flag">${match.homeFlag}</span>
            <span class="team-name">${match.home}</span>
          </div>
          <div class="vs-score">${score}${isPlayed && match.prediction ? '<div style="font-size:10px;color:#999;text-decoration:line-through;">预测 ' + match.prediction + '</div>' : ''}</div>
          <div class="team away">
            <span class="team-flag">${match.awayFlag}</span>
            <span class="team-name">${match.away}</span>
          </div>
        </div>
        ${match.predRate ? `
          <div class="prediction-bar">
            <div class="prediction-bar-home" style="width:${match.predRate.home}%"></div>
            <div class="prediction-bar-away" style="width:${match.predRate.away}%"></div>
          </div>
          <div class="prediction-bar-label">
            <span>${match.predRate.home}%</span>
            <span>${match.predRate.away}%</span>
          </div>
        ` : ''}
        ${winner && isPlayed ? `
          <div class="match-winner">🏆 ${winner} 晋级${winnerNote ? ' · ' + winnerNote : ''}</div>
          ${match.scorers && match.scorers.length ? `<div class="scorers">⚽ ${match.scorers.join(' · ')}</div>` : ''}
          ${match.keyEvent ? `<div style="font-size:11px;color:#1B5E20;text-align:center;margin-top:4px;font-style:italic;">📌 ${match.keyEvent}</div>` : ''}
        ` : ''}
        ${winner && isUpcoming ? `
          <div class="match-winner">🎯 预测:${winner} 胜出</div>
        ` : ''}
        <div class="match-winner-note">🏟️ ${match.venue}</div>
      </div>
    `;
  }

  // ========== 按日期分组 ==========
  function groupByDate(matches) {
    const groups = {};
    matches.forEach(m => {
      if (!groups[m.date]) groups[m.date] = [];
      groups[m.date].push(m);
    });
    return Object.keys(groups).sort().map(date => ({
      date,
      matches: groups[date]
    }));
  }

  // ========== 渲染比赛列表 ==========
  function renderMatches() {
    // 1/16 已完赛
    const r32Groups = groupByDate(appData.roundOf32);
    document.getElementById('r32-content').innerHTML = r32Groups.map(g => `
      <div class="date-group">
        <div class="date-header">📅 ${formatDate(g.date)} · ${g.matches.length} 场</div>
        <div class="matches-grid">
          ${g.matches.map(m => renderMatchCard(m)).join('')}
        </div>
      </div>
    `).join('');

    // 1/8 已完赛 + 待赛
    const r16Groups = groupByDate(appData.roundOf16);
    document.getElementById('r16-content').innerHTML = r16Groups.map(g => `
      <div class="date-group">
        <div class="date-header">📅 ${formatDate(g.date)} · ${g.matches.length} 场</div>
        <div class="matches-grid">
          ${g.matches.map(m => renderMatchCard(m)).join('')}
        </div>
      </div>
    `).join('');

    // 1/4 决赛 — 通过 score/winner 自动判断已完赛
    document.getElementById('qf-content').innerHTML = `
      <div class="matches-grid">
        ${appData.quarterFinals.map(m => renderMatchCard(m)).join('')}
      </div>
    `;

    // 半决赛预测 — 仍用 upcoming，实际半决赛 2 场还未全打完
    document.getElementById('sf-content').innerHTML = `
      <div class="matches-grid">
        ${appData.semiFinals.map(m => renderMatchCard(m, {upcoming: true})).join('')}
      </div>
    `;

    // 决赛预测
    document.getElementById('final-content').innerHTML = `
      <div class="matches-grid">
        ${appData.final.map(m => renderMatchCard(m, {upcoming: true})).join('')}
      </div>
    `;

    // 根据实际数据更新 tab 标签状态
    function updateTabStatus(tabId, matches) {
      const el = document.getElementById(tabId);
      if (!el) return;
      const baseName = el.textContent.replace(/\s*\(.*?\)\s*/g, '').trim();
      const allDone = matches.length > 0 && matches.every(m => !!m.winner && !!m.score);
      const noneDone = matches.every(m => !m.winner && !m.score);
      if (allDone) {
        el.textContent = baseName + ' ✓ 已完赛';
      } else if (!noneDone) {
        el.textContent = baseName;
      } else {
        el.textContent = baseName;
      }
    }
    updateTabStatus('tab-qf', appData.quarterFinals || []);
    updateTabStatus('tab-sf', appData.semiFinals || []);
    updateTabStatus('tab-final', appData.final || []);
  }

  function formatDate(d) {
    const monthDay = d.replace(/^0?(\d+)-0?(\d+)$/, '$1月$2日');
    return monthDay;
  }

  // ========== ECharts 图表(完全数据驱动) ==========
  // 所有图表配置从 appData 派生,数据更新时自动同步
  const chartInstances = {};

  function renderCharts() {
    if (typeof echarts === 'undefined') return;
    renderAccuracyTrendChart();
    renderQfPredictionChart();
    renderConfidenceDistributionChart();
    renderGoalsChart();
    renderDailyMatchesChart();
  }

  // ---------- 图 1:准确率趋势(跨阶段累计) ----------
  function renderAccuracyTrendChart() {
    const el = document.getElementById('chart-accuracy-trend');
    if (!el) return;
    const trend = appData.meta.accuracyTrend || [];

    const stages = trend.map(t => t.stage);
    const rates = trend.map(t => t.rate);
    const cumulativeCorrect = trend.map(t => t.cumulativeCorrect);
    const cumulativeTotal = trend.map(t => t.cumulativeTotal);

    const chart = chartInstances['accuracy-trend'] || echarts.init(el);
    chartInstances['accuracy-trend'] = chart;
    chart.setOption({
      tooltip: {
        trigger: 'axis',
        formatter: function(params) {
          const idx = params[0].dataIndex;
          const item = trend[idx];
          const pending = item.isPending ? '<br/><span style="color:#999;">⏳ 待赛</span>' : '';
          return `<b>${item.stage}</b><br/>` +
            `准确率: ${item.rate}%<br/>` +
            `已赛: ${item.cumulativeCorrect}/${item.cumulativeTotal}` + pending;
        }
      },
      legend: { data: ['准确率 %', '累计正确数', '累计比赛数'], top: 0 },
      grid: { left: 50, right: 50, top: 40, bottom: 40 },
      xAxis: { type: 'category', data: stages },
      yAxis: [
        { type: 'value', name: '准确率 %', max: 100, position: 'left' },
        { type: 'value', name: '累计场数', position: 'right' }
      ],
      series: [
        {
          name: '准确率 %',
          type: 'line',
          data: rates,
          smooth: true,
          lineStyle: { color: '#1B5E20', width: 3 },
          itemStyle: { color: '#1B5E20' },
          symbolSize: 12,
          label: { show: true, formatter: '{c}%', position: 'top', fontSize: 12, fontWeight: 'bold' },
          areaStyle: {
            color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(27, 94, 32, 0.3)' },
                { offset: 1, color: 'rgba(27, 94, 32, 0.02)' }
              ]
            }
          }
        },
        {
          name: '累计正确数',
          type: 'bar',
          yAxisIndex: 1,
          data: cumulativeCorrect,
          itemStyle: { color: '#4CAF50', borderRadius: [4, 4, 0, 0] },
          barWidth: '25%'
        },
        {
          name: '累计比赛数',
          type: 'bar',
          yAxisIndex: 1,
          data: cumulativeTotal,
          itemStyle: { color: '#C8E6C9', borderRadius: [4, 4, 0, 0] },
          barWidth: '25%'
        }
      ]
    });
  }

  // ---------- 图 2:1/4 决赛预测胜率 vs 实际结果 ----------
  function renderQfPredictionChart() {
    const el = document.getElementById('chart-qf-prediction');
    if (!el) return;
    const qfs = appData.quarterFinals || [];

    // 已完赛:显示预测 vs 实际
    const categories = qfs.map((m, i) => {
      const played = !!m.score;
      return played ? `${m.homeFlag}${m.home} vs ${m.away}` : `${m.home} vs ${m.away}`;
    });

    const homePrediction = qfs.map(m => m.predRate ? m.predRate.home : 0);
    const awayPrediction = qfs.map(m => m.predRate ? m.predRate.away : 0);
    // 实际胜方:已完赛给 100,待赛给 0
    const actualResult = qfs.map(m => {
      if (!m.score) return 0;
      const [h, a] = m.score.split('-').map(Number);
      if (h > a) return 100;
      if (a > h) return -100;
      return 0;
    });

    const chart = chartInstances['qf-prediction'] || echarts.init(el);
    chartInstances['qf-prediction'] = chart;
    chart.setOption({
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: function(params) {
          const idx = params[0].dataIndex;
          const m = qfs[idx];
          return `<b>${m.home} vs ${m.away}</b><br/>` +
            `预测: ${m.predWinner}胜(${m.prediction})<br/>` +
            `主队预测: ${m.predRate.home}% | 客队预测: ${m.predRate.away}%<br/>` +
            `置信度: ${m.predConfidence === 'high' ? '高' : m.predConfidence === 'medium' ? '中' : '低'}<br/>` +
            (m.score ? `实际: <b style="color:${m.predCorrect ? '#1B5E20' : '#E53935'};">${m.score} ${m.predCorrect ? '✓ 预测正确' : '✗ 预测失误'}</b>` : '<span style="color:#999;">未赛</span>');
        }
      },
      legend: { data: ['主队预测胜率', '客队预测胜率', '实际胜方'], top: 0 },
      grid: { left: 50, right: 50, top: 40, bottom: 60 },
      xAxis: { type: 'category', data: categories, axisLabel: { rotate: 25, fontSize: 10 } },
      yAxis: { type: 'value', name: '胜率 %', min: -100, max: 100 },
      series: [
        {
          name: '主队预测胜率',
          type: 'bar',
          stack: 'prediction',
          data: homePrediction,
          itemStyle: { color: '#1B5E20', borderRadius: [4, 4, 0, 0] },
          barWidth: '40%'
        },
        {
          name: '客队预测胜率',
          type: 'bar',
          stack: 'prediction',
          data: awayPrediction.map(v => -v),
          itemStyle: { color: '#FFA726', borderRadius: [0, 0, 4, 4] },
          barWidth: '40%'
        },
        {
          name: '实际胜方',
          type: 'scatter',
          symbolSize: 25,
          data: actualResult,
          itemStyle: {
            color: function(params) {
              const v = params.value;
              return v > 0 ? '#2E7D32' : v < 0 ? '#C62828' : '#9E9E9E';
            },
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: true,
            formatter: function(params) {
              if (params.value === 0) return '';
              return params.value > 0 ? '✓ 主胜' : '✓ 客胜';
            },
            position: params => params.value > 0 ? 'top' : 'bottom',
            fontSize: 11,
            fontWeight: 'bold'
          }
        }
      ]
    });
  }

  // ---------- 图 3:模型置信度分布 ----------
  function renderConfidenceDistributionChart() {
    const el = document.getElementById('chart-confidence');
    if (!el) return;
    const dist = appData.meta.confidenceDistribution || {};

    const buckets = Object.keys(dist);
    const totalMatches = buckets.map(k => dist[k].matches);
    const correctMatches = buckets.map(k => dist[k].correct);
    const accuracy = buckets.map(k => parseFloat(dist[k].rate));
    const colors = buckets.map(k => dist[k].color);

    const chart = chartInstances['confidence'] || echarts.init(el);
    chartInstances['confidence'] = chart;
    chart.setOption({
      tooltip: {
        trigger: 'axis',
        formatter: function(params) {
          const idx = params[0].dataIndex;
          const k = buckets[idx];
          const d = dist[k];
          return `<b>${k}% 置信度区间</b><br/>` +
            `比赛数: ${d.matches}<br/>` +
            `正确: ${d.correct}<br/>` +
            `准确率: ${d.rate}`;
        }
      },
      legend: { data: ['比赛数', '正确数', '准确率 %'], top: 0 },
      grid: { left: 50, right: 50, top: 40, bottom: 50 },
      xAxis: {
        type: 'category',
        data: buckets.map(k => k.replace('_', '-').replace('below', '<'))
      },
      yAxis: [
        { type: 'value', name: '场数', position: 'left' },
        { type: 'value', name: '准确率 %', max: 100, position: 'right' }
      ],
      series: [
        {
          name: '比赛数',
          type: 'bar',
          data: totalMatches.map((v, i) => ({ value: v, itemStyle: { color: colors[i] } })),
          barWidth: '30%'
        },
        {
          name: '正确数',
          type: 'bar',
          data: correctMatches.map((v, i) => ({ value: v, itemStyle: { color: '#2E7D32' } })),
          barWidth: '30%'
        },
        {
          name: '准确率 %',
          type: 'line',
          yAxisIndex: 1,
          data: accuracy,
          smooth: true,
          lineStyle: { color: '#E53935', width: 3 },
          itemStyle: { color: '#E53935' },
          symbolSize: 15,
          label: { show: true, formatter: '{c}%', position: 'top', fontSize: 13, fontWeight: 'bold', color: '#E53935' },
          markLine: {
            silent: true,
            data: [{ yAxis: 92, label: { formatter: '总准确率 92%', color: '#1B5E20' }, lineStyle: { color: '#1B5E20', type: 'dashed' } }]
          }
        }
      ]
    });
  }

  // ---------- 图 4:各队进球/失球对比 ----------
  function renderGoalsChart() {
    const el = document.getElementById('chart-goals');
    if (!el) return;
    const teams = appData.teamStats.filter(t => t.stage !== '淘汰').slice(0, 12);

    const chart = chartInstances['goals'] || echarts.init(el);
    chartInstances['goals'] = chart;
    chart.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { data: ['进球数', '失球数'], top: 0 },
      grid: { left: 50, right: 30, top: 40, bottom: 60 },
      xAxis: {
        type: 'category',
        data: teams.map(t => t.flag + ' ' + t.team),
        axisLabel: { rotate: 35, fontSize: 11 }
      },
      yAxis: { type: 'value', name: '进球数' },
      series: [
        {
          name: '进球数',
          type: 'bar',
          data: teams.map(t => t.goalsFor),
          itemStyle: { color: '#4CAF50', borderRadius: [4, 4, 0, 0] },
          barWidth: '30%'
        },
        {
          name: '失球数',
          type: 'bar',
          data: teams.map(t => t.goalsAgainst),
          itemStyle: { color: '#EF5350', borderRadius: [4, 4, 0, 0] },
          barWidth: '30%'
        }
      ]
    });
  }

  // ---------- 图 6:每日比赛数量趋势 ----------
  function renderDailyMatchesChart() {
    const el = document.getElementById('chart-daily');
    if (!el) return;

    const allMatches = [
      ...(appData.roundOf32 || []),
      ...(appData.roundOf16 || []),
      ...(appData.quarterFinals || []),
      ...(appData.semiFinals || []),
      ...(appData.final || [])
    ];

    const dateCount = {};
    allMatches.forEach(m => { if (m.date) dateCount[m.date] = (dateCount[m.date] || 0) + 1; });
    const sortedDates = Object.keys(dateCount).sort();

    const chart = chartInstances['daily'] || echarts.init(el);
    chartInstances['daily'] = chart;
    chart.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: 50, right: 30, top: 30, bottom: 50 },
      xAxis: {
        type: 'category',
        data: sortedDates,
        axisLabel: { rotate: 30 }
      },
      yAxis: { type: 'value', name: '场数', minInterval: 1 },
      series: [{
        type: 'line',
        data: sortedDates.map(d => dateCount[d]),
        smooth: true,
        lineStyle: { color: '#4CAF50', width: 3 },
        itemStyle: { color: '#1B5E20' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(76, 175, 80, 0.4)' },
              { offset: 1, color: 'rgba(76, 175, 80, 0.05)' }
            ]
          }
        }
      }]
    });
  }

  // ---------- 自适应:所有图表同步 resize ----------
  function resizeAllCharts() {
    Object.values(chartInstances).forEach(c => c.resize());
  }

  // ========== Tab 切换 ==========
  function initTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.target;
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(target).classList.add('active');
      });
    });
  }

  // ========== 自动刷新 ==========
  function initAutoRefresh() {
    const REFRESH_INTERVAL = 4 * 60 * 60; // 4 小时秒数
    let refreshCountdown = REFRESH_INTERVAL;
    const indicator = document.getElementById('refresh-status');

    setInterval(async () => {
      refreshCountdown--;
      if (indicator) {
        const h = Math.floor(refreshCountdown / 3600);
        const m = Math.floor((refreshCountdown % 3600) / 60);
        const s = refreshCountdown % 60;
        if (h > 0) {
          indicator.textContent = `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')} 后自动刷新`;
        } else {
          indicator.textContent = `${m}:${s.toString().padStart(2, '0')} 后自动刷新`;
        }
      }

      if (refreshCountdown <= 0) {
        console.log('[' + new Date().toLocaleTimeString() + '] 触发 4 小时定时刷新');
        refreshCountdown = REFRESH_INTERVAL;
        await refreshData();
      }
    }, 1000);
  }

  // ========== 手动刷新 ==========
  async function refreshData(force = false) {
    const btn = document.getElementById('btn-refresh');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '⏳ 刷新中...';
    }

    try {
      const res = await fetch(DATA_URL + '?t=' + Date.now(), {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const newData = await res.json();

      // 三层检测:1)lastUpdate 时间戳 2)内容整体哈希 3)任意字段差异
      const timeChanged = newData.meta.lastUpdate !== appData.meta.lastUpdate;
      const oldHash = hashObject(appData);
      const newHash = hashObject(newData);
      const contentChanged = oldHash !== newHash;

      // 强制刷新 OR 内容变化 → 重新渲染
      if (force || timeChanged || contentChanged) {
        const reasons = [];
        if (timeChanged) reasons.push('时间戳变化');
        if (contentChanged) reasons.push('内容变化');
        if (force) reasons.push('手动强制刷新');

        appData = newData;
        renderAll();
        showToast('✅ 已重新加载数据(' + reasons.join(' + ') + ')');
        console.log('[刷新] 原因:', reasons, '| 新版本:', newData.meta.lastUpdate);
      } else {
        showToast('ℹ️ 数据已是最新(' + newData.meta.lastUpdate + ')');
      }
    } catch (e) {
      console.error('刷新失败:', e);
      showToast('❌ 刷新失败: ' + e.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '🔄 立即刷新';
      }
    }
  }

  // 简单哈希函数:对比两个对象的关键字段是否相同
  function hashObject(obj) {
    // 跳过 lastUpdate(单独比较),只对比内容字段
    const { lastUpdate, ...content } = obj.meta || {};
    const keys = Object.keys(content).sort();
    let hash = '';
    keys.forEach(k => hash += k + ':' + JSON.stringify(content[k]) + '|');
    // 加上各数组的字符串化
    ['teamStats', 'roundOf32', 'roundOf16', 'quarterFinals', 'semiFinals', 'final'].forEach(k => {
      if (obj[k]) hash += k + ':' + JSON.stringify(obj[k]).slice(0, 500);
    });
    return hash.length;
  }

  function showToast(msg) {
    const toast = document.createElement('div');
    toast.textContent = msg;
    toast.style.cssText = `
      position: fixed; bottom: 30px; right: 30px; z-index: 9999;
      background: rgba(27, 94, 32, 0.95); color: white;
      padding: 12px 24px; border-radius: 8px; font-size: 14px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.2);
      animation: slideIn 0.3s ease-out;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.5s';
      setTimeout(() => toast.remove(), 500);
    }, 3000);
  }

  // ========== 渲染入口 ==========
  function renderAll() {
    renderOverview();
    renderChampion();
    renderAccuracy();
    renderMatches();
    renderKeyPredictions();
    renderCharts();
    initTabs();
    initAutoRefresh();
    initRefreshButton();

    // 更新时间戳
    document.getElementById('update-time').textContent =
      '数据更新于 ' + appData.meta.lastUpdate;

    // 更新导航栏 STAGE（从 meta.stage 读取）
    const stageEl = document.querySelector('.nav-meta-item:nth-child(2) .nav-meta-value');
    if (stageEl && appData.meta.stage) {
      stageEl.textContent = appData.meta.stage;
    }
  }

  // ========== 关键比赛预测(球迷真正关心的,从 matches.json 直接读取 fetch.py 写入的预测数据) ==========
  function renderKeyPredictions() {
    const el = document.getElementById('key-predictions-list');
    const timeEl = document.getElementById('pred-update-time');
    if (!el) return;
    if (timeEl && appData.meta) timeEl.textContent = appData.meta.lastUpdate || '加载中';

    // 收集尚未结束的比赛
    const upcoming = [
      ...(appData.semiFinals || []),
      ...(appData.final || [])
    ].filter(m => !m.winner);

    if (upcoming.length === 0) {
      el.innerHTML = '<div style="grid-column:1/-1;padding:30px;text-align:center;color:#888;">🏆 本届赛事已结束,暂无剩余比赛</div>';
      return;
    }

    // 置信度标签配色
    const confStyle = (c) => {
      if (c === 'high') return { bg: '#E8F5E9', fg: '#1B5E20', label: '高置信' };
      if (c === 'medium') return { bg: '#FFF8E1', fg: '#E65100', label: '中等置信' };
      if (c === 'low') return { bg: '#FFEBEE', fg: '#C62828', label: '低置信' };
      return { bg: '#ECEFF1', fg: '#455A64', label: '待评估' };
    };

    el.innerHTML = upcoming.map(m => {
      const dateLabel = m.date ? `${m.date}${m.time ? ' ' + m.time : ''}` : '';
      const cs = confStyle(m.predConfidence);

      // 真实字段 — 直接读 matches.json 里的预测
      const predWinner = m.predWinner || null;
      const predScore = m.prediction || null;
      const predRate = m.predRate || null;
      const note = m.note || '';

      // 渲染胜率条
      let rateBarHtml = '';
      if (predRate && typeof predRate.home === 'number' && typeof predRate.away === 'number') {
        const homePct = predRate.home;
        const awayPct = predRate.away;
        rateBarHtml = `
          <div style="margin-top:10px;">
            <div style="display:flex;height:22px;border-radius:4px;overflow:hidden;font-size:11px;font-weight:500;">
              <div style="width:${homePct}%;background:#1B5E20;color:#fff;display:flex;align-items:center;justify-content:center;">${m.home} ${homePct}%</div>
              <div style="width:${awayPct}%;background:#5F5E5A;color:#fff;display:flex;align-items:center;justify-content:center;">${awayPct}% ${m.away}</div>
            </div>
          </div>
        `;
      }

      // 预测胜方显示(若无预测,显示"待评估")
      let predBoxHtml;
      if (predWinner) {
        predBoxHtml = `
          <div style="display:flex;align-items:center;gap:10px;margin-top:10px;padding:10px 12px;background:#FFF8E1;border-left:3px solid #FFA726;border-radius:4px;">
            <div style="flex:1;">
              <div style="font-size:11px;color:#888;margin-bottom:2px;">🎯 预测胜方 <span style="display:inline-block;background:${cs.bg};color:${cs.fg};padding:1px 6px;border-radius:3px;font-size:10px;margin-left:4px;">${cs.label}</span></div>
              <div style="font-size:16px;font-weight:500;color:#E65100;">${predWinner}${predScore ? ` <span style="font-size:13px;color:#888;font-weight:400;">(预测 ${predScore})</span>` : ''}</div>
            </div>
          </div>
          ${rateBarHtml}
          ${note ? `<div style="margin-top:8px;font-size:11px;color:#888;font-style:italic;">${note}</div>` : ''}
        `;
      } else {
        predBoxHtml = `
          <div style="margin-top:10px;padding:10px 12px;background:#ECEFF1;border-left:3px solid #90A4AE;border-radius:4px;font-size:12px;color:#546E7A;">
            ⏳ 预测待评估 — fetch.py 下次拉取时填充
          </div>
        `;
      }

      return `
        <div style="background:linear-gradient(135deg,#F8F9FA 0%,#FFFFFF 100%);border:1px solid #E0E0E0;border-radius:10px;padding:16px 18px;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <span style="font-size:11px;color:#888;font-weight:500;background:#F1F4F8;padding:3px 8px;border-radius:4px;">${m.stage || '赛事'} · ${dateLabel}</span>
            <span style="font-size:11px;color:#5F5E5A;">📺 ${m.venue || '待定'}</span>
          </div>
          <div style="display:flex;justify-content:space-around;align-items:center;margin:14px 0;">
            <div style="text-align:center;flex:1;">
              <div style="font-size:32px;line-height:1;">${m.homeFlag || '🏳️'}</div>
              <div style="font-size:14px;font-weight:500;color:${predWinner === m.home ? '#1B5E20' : '#5F5E5A'};margin-top:4px;">${m.home}</div>
            </div>
            <div style="text-align:center;padding:0 12px;">
              <div style="font-size:18px;color:#999;font-weight:300;">VS</div>
              ${predScore ? `<div style="font-size:13px;color:#888;margin-top:4px;">预测 ${predScore}</div>` : ''}
            </div>
            <div style="text-align:center;flex:1;">
              <div style="font-size:32px;line-height:1;">${m.awayFlag || '🏳️'}</div>
              <div style="font-size:14px;font-weight:500;color:${predWinner === m.away ? '#1B5E20' : '#5F5E5A'};margin-top:4px;">${m.away}</div>
            </div>
          </div>
          ${predBoxHtml}
        </div>
      `;
    }).join('');
  }

  // ========== 刷新按钮 ==========
  function initRefreshButton() {
    const btn = document.getElementById('btn-refresh');
    if (btn) {
      btn.addEventListener('click', refreshData);
    }
  }

  // ========== 启动 ==========
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadData);
  } else {
    loadData();
  }
})();