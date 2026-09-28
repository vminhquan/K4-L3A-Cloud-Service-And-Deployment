/* ═══════════════════════════════════════════════════════════════════
   VERCEL WEB DASHBOARD JAVASCRIPT LOGIC
   ═══════════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const chatForm = document.getElementById('chatForm');
  const questionInput = document.getElementById('questionInput');
  const chatHistory = document.getElementById('chatHistory');
  const clearChatBtn = document.getElementById('clearChatBtn');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const toggleKeyBtn = document.getElementById('toggleKeyBtn');
  const userIdInput = document.getElementById('userIdInput');
  const healthPill = document.getElementById('healthPill');
  const healthPillText = document.getElementById('healthPillText');
  const toastContainer = document.getElementById('toastContainer');
  const logTerminal = document.getElementById('logTerminal');
  const clearLogsBtn = document.getElementById('clearLogsBtn');

  // Metrics
  const metricHistoryLen = document.getElementById('metricHistoryLen');
  const metricLatency = document.getElementById('metricLatency');
  const metricTokens = document.getElementById('metricTokens');
  const metricCost = document.getElementById('metricCost');
  const rateLimitCount = document.getElementById('rateLimitCount');
  const rateLimitBar = document.getElementById('rateLimitBar');
  const costSpentText = document.getElementById('costSpentText');
  const costSpentBar = document.getElementById('costSpentBar');

  // Probes
  const probeHealthBadge = document.getElementById('probeHealthBadge');
  const probeHealthJson = document.getElementById('probeHealthJson');
  const probeReadyBadge = document.getElementById('probeReadyBadge');
  const probeReadyJson = document.getElementById('probeReadyJson');
  const refreshHealthBtn = document.getElementById('refreshHealthBtn');
  const refreshReadyBtn = document.getElementById('refreshReadyBtn');
  const simulateSigtermBtn = document.getElementById('simulateSigtermBtn');
  const resetLifecycleBtn = document.getElementById('resetLifecycleBtn');
  const shutdownStatusBadge = document.getElementById('shutdownStatusBadge');

  // Simulators
  const simBurstBtn = document.getElementById('simBurstBtn');
  const simInvalidKeyBtn = document.getElementById('simInvalidKeyBtn');
  const simProbesBtn = document.getElementById('simProbesBtn');

  let currentHistoryCount = 0;
  let totalCostSpent = 0.00012;
  let requestsInWindow = 0;
  let simulatedShutdown = false;

  // ─────────────────────────────────────────────────────────────
  // 1. TABS SWITCHING
  // ─────────────────────────────────────────────────────────────
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      const targetContent = document.getElementById(targetId);
      if (targetContent) {
        targetContent.classList.add('active');
      }
    });
  });

  // Toggle API Key visibility
  toggleKeyBtn.addEventListener('click', () => {
    if (apiKeyInput.type === 'password') {
      apiKeyInput.type = 'text';
      toggleKeyBtn.textContent = '🔒';
    } else {
      apiKeyInput.type = 'password';
      toggleKeyBtn.textContent = '👁';
    }
  });

  // Clear Chat
  clearChatBtn.addEventListener('click', () => {
    chatHistory.innerHTML = `
      <div class="chat-message agent">
        <div class="chat-bubble">Màn hình đã được làm mới. Hãy gửi câu hỏi tiếp theo!</div>
      </div>
    `;
    currentHistoryCount = 0;
    metricHistoryLen.textContent = '0';
  });

  // Clear Logs
  clearLogsBtn.addEventListener('click', () => {
    logTerminal.innerHTML = '';
  });

  // Prompt Chips
  document.querySelectorAll('.prompt-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      questionInput.value = chip.getAttribute('data-q');
      chatForm.dispatchEvent(new Event('submit'));
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. TOAST NOTIFICATIONS
  // ─────────────────────────────────────────────────────────────
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    let icon = 'ℹ️';
    if (type === 'error') icon = '⛔';
    if (type === 'warn') icon = '⚠️';
    if (type === 'success') icon = '✅';

    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 250);
    }, 4000);
  }

  // ─────────────────────────────────────────────────────────────
  // 3. LOGGING TO TERMINAL
  // ─────────────────────────────────────────────────────────────
  function appendStructuredLog(event, level, data = {}) {
    const timestamp = new Date().toISOString();
    const payload = {
      event,
      level: level.toLowerCase(),
      timestamp,
      ...data
    };

    const line = document.createElement('div');
    line.className = 'log-line';

    let tagClass = 'info';
    if (level === 'warn') tagClass = 'warn';
    if (level === 'error') tagClass = 'error';

    // Format JSON with simple highlights
    const jsonStr = JSON.stringify(payload);
    line.innerHTML = `
      <span class="timestamp">[${timestamp.slice(11, 19)}]</span>
      <span class="tag ${tagClass}">${level.toUpperCase()}</span>
      <span class="json-content">${highlightJson(jsonStr)}</span>
    `;

    logTerminal.appendChild(line);
    logTerminal.scrollTop = logTerminal.scrollHeight;
  }

  function highlightJson(json) {
    return json.replace(/("(\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
      let cls = 'json-num';
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'json-key';
        } else {
          cls = 'json-string';
        }
      } else if (/true|false/.test(match)) {
        cls = 'json-bool';
      }
      return `<span class="${cls}">${match}</span>`;
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 4. SEND QUESTION TO /ask
  // ─────────────────────────────────────────────────────────────
  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = questionInput.value.trim();
    if (!q) return;

    const apiKey = apiKeyInput.value.trim();
    const userId = userIdInput.value.trim() || 'anonymous';

    // Append user message to UI
    appendUserMessage(q, userId);
    questionInput.value = '';

    // Scroll to bottom
    chatHistory.scrollTop = chatHistory.scrollHeight;

    // Loading indicator
    const loadingId = appendLoadingBubble();

    const startTime = performance.now();

    try {
      const response = await fetch('/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
          'X-User-Id': userId
        },
        body: JSON.stringify({ question: q })
      });

      const elapsed = Math.round(performance.now() - startTime);
      metricLatency.textContent = `${elapsed} ms`;

      removeLoadingBubble(loadingId);

      const status = response.status;
      const data = await response.json();

      if (status === 200) {
        // Success
        currentHistoryCount = data.history_length + 2;
        metricHistoryLen.textContent = currentHistoryCount;
        metricTokens.textContent = `${data.tokens?.in || 0} / ${data.tokens?.out || 0}`;
        metricCost.textContent = `$${(data.cost_usd || 0).toFixed(5)}`;

        totalCostSpent += (data.cost_usd || 0.0001);
        updateCostGuardUI(totalCostSpent);
        incrementRateLimitUI();

        appendAgentMessage(data.answer, {
          tokens: data.tokens,
          cost_usd: data.cost_usd,
          history_length: data.history_length,
          user_id: data.user_id,
          latency: elapsed
        });

        appendStructuredLog('ask_completed', 'info', {
          user_id: data.user_id,
          tokens_in: data.tokens?.in,
          tokens_out: data.tokens?.out,
          cost_usd: data.cost_usd,
          latency_ms: elapsed
        });

      } else if (status === 401) {
        appendErrorMessage(
          'HTTP 401 Unauthorized: Invalid or missing API key',
          'Khóa API không hợp lệ hoặc thiếu header X-API-Key. Server đã so sánh bằng secrets.compare_digest() để triệt tiêu lỗ hổng timing attack.'
        );
        showToast('401 Unauthorized: API Key không đúng', 'error');
        appendStructuredLog('auth_failed', 'error', { status: 401, detail: data.detail });

      } else if (status === 429) {
        appendErrorMessage(
          'HTTP 429 Too Many Requests: Rate limit exceeded',
          'Cửa sổ trượt 60 giây (Sliding Window Redis ZSET) phát hiện bạn đã vượt quá hạn mức 10 request/phút. Header Retry-After: 60.'
        );
        showToast('429 Too Many Requests: Quá tốc độ', 'warn');
        rateLimitCount.textContent = '10 / 10 (BLOCKED)';
        rateLimitBar.classList.add('danger');
        rateLimitBar.style.width = '100%';
        appendStructuredLog('rate_limit_exceeded', 'warn', { user_id: userId, limit: 10 });

      } else if (status === 402) {
        appendErrorMessage(
          'HTTP 402 Payment Required: Monthly budget exceeded',
          'Cost Guard đã chặn request trước khi gọi LLM vì ngân sách tháng của user đã vượt $10.00 USD.'
        );
        showToast('402 Payment Required: Hết ngân sách', 'error');
        appendStructuredLog('budget_exceeded', 'error', { user_id: userId, max_budget: 10.0 });

      } else {
        appendErrorMessage(`Lỗi HTTP ${status}`, JSON.stringify(data));
        showToast(`Lỗi: ${status}`, 'error');
      }

    } catch (err) {
      removeLoadingBubble(loadingId);
      appendErrorMessage('Connection Error', `Không thể kết nối tới server: ${err.message}`);
      showToast('Không kết nối được server', 'error');
    }

    chatHistory.scrollTop = chatHistory.scrollHeight;
  });

  function appendUserMessage(text, userId) {
    const div = document.createElement('div');
    div.className = 'chat-message user';
    div.innerHTML = `
      <div class="chat-bubble">${escapeHtml(text)}</div>
      <div class="message-meta">
        <span class="meta-pill">${escapeHtml(userId)}</span>
        <span>${new Date().toLocaleTimeString()}</span>
      </div>
    `;
    chatHistory.appendChild(div);
  }

  function appendAgentMessage(text, meta) {
    const div = document.createElement('div');
    div.className = 'chat-message agent';
    div.innerHTML = `
      <div class="chat-bubble">${formatMarkdown(text)}</div>
      <div class="message-meta">
        <span class="meta-pill cost">$${(meta.cost_usd || 0).toFixed(5)}</span>
        <span class="meta-pill">${meta.tokens?.in || 0} in / ${meta.tokens?.out || 0} out</span>
        <span class="meta-pill">history: ${meta.history_length}</span>
        <span class="meta-pill">${meta.latency}ms</span>
      </div>
    `;
    chatHistory.appendChild(div);
  }

  function appendErrorMessage(title, detail) {
    const div = document.createElement('div');
    div.className = 'chat-message agent';
    div.innerHTML = `
      <div class="chat-bubble" style="border-color: rgba(255, 0, 85, 0.4); background: rgba(255, 0, 85, 0.04);">
        <strong style="color: var(--accent-red);">${escapeHtml(title)}</strong>
        <p style="margin-top: 6px; font-size: 13px; color: var(--text-secondary);">${escapeHtml(detail)}</p>
      </div>
      <div class="message-meta">
        <span class="meta-pill error">BLOCKED</span>
        <span>Guardrail Protection</span>
      </div>
    `;
    chatHistory.appendChild(div);
  }

  let loadingCounter = 0;
  function appendLoadingBubble() {
    const id = `loading-${++loadingCounter}`;
    const div = document.createElement('div');
    div.className = 'chat-message agent';
    div.id = id;
    div.innerHTML = `
      <div class="chat-bubble" style="color: var(--text-muted);">
        <span class="pulse-dot" style="display:inline-block; vertical-align:middle; margin-right:8px;"></span>
        Đang xử lý pipeline (Auth ➔ RateLimit ➔ CostGuard ➔ RedisStore ➔ MockLLM)...
      </div>
    `;
    chatHistory.appendChild(div);
    chatHistory.scrollTop = chatHistory.scrollHeight;
    return id;
  }

  function removeLoadingBubble(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  // ─────────────────────────────────────────────────────────────
  // 5. PROBES MONITORING (/health & /ready)
  // ─────────────────────────────────────────────────────────────
  async function checkProbes() {
    try {
      const hRes = await fetch('/health');
      const hData = await hRes.json();
      probeHealthJson.textContent = JSON.stringify(hData, null, 2);

      if (hRes.status === 200) {
        probeHealthBadge.className = 'probe-badge ok';
        probeHealthBadge.textContent = '● 200 OK';
      } else {
        probeHealthBadge.className = 'probe-badge down';
        probeHealthBadge.textContent = `● ${hRes.status} Down`;
      }
    } catch (e) {
      probeHealthBadge.className = 'probe-badge down';
      probeHealthBadge.textContent = '● Offline';
      probeHealthJson.textContent = e.message;
    }

    try {
      const rRes = await fetch('/ready');
      const rData = await rRes.json();
      probeReadyJson.textContent = JSON.stringify(rData, null, 2);

      if (rRes.status === 200) {
        probeReadyBadge.className = 'probe-badge ok';
        probeReadyBadge.textContent = '● 200 Ready';
        healthPill.querySelector('.status-indicator').style.background = 'var(--accent-green)';
        healthPillText.textContent = 'Probes 200 OK';
      } else {
        probeReadyBadge.className = 'probe-badge down';
        probeReadyBadge.textContent = `● ${rRes.status} Not Ready`;
        healthPill.querySelector('.status-indicator').style.background = 'var(--accent-red)';
        healthPillText.textContent = `Ready: ${rRes.status}`;
      }
    } catch (e) {
      probeReadyBadge.className = 'probe-badge down';
      probeReadyBadge.textContent = '● Offline';
      probeReadyJson.textContent = e.message;
    }
  }

  refreshHealthBtn.addEventListener('click', checkProbes);
  refreshReadyBtn.addEventListener('click', checkProbes);

  // Graceful shutdown simulator
  simulateSigtermBtn.addEventListener('click', () => {
    simulatedShutdown = true;
    shutdownStatusBadge.textContent = 'SHUTTING DOWN (503)';
    shutdownStatusBadge.style.background = 'rgba(255, 0, 85, 0.2)';
    shutdownStatusBadge.style.color = 'var(--accent-red)';

    probeHealthBadge.className = 'probe-badge down';
    probeHealthBadge.textContent = '● 503 Shutting Down';
    probeHealthJson.textContent = JSON.stringify({ status: "shutting_down" }, null, 2);

    probeReadyBadge.className = 'probe-badge down';
    probeReadyBadge.textContent = '● 503 Shutting Down';
    probeReadyJson.textContent = JSON.stringify({ status: "shutting_down" }, null, 2);

    healthPillText.textContent = '503 Shutting Down';
    healthPill.querySelector('.status-indicator').style.background = 'var(--accent-red)';

    showToast('Mô phỏng SIGTERM: /health và /ready chuyển sang HTTP 503 để load balancer cắt traffic.', 'warn');
    appendStructuredLog('lifecycle_signal', 'warn', { signal: 'SIGTERM', action: 'rejecting_new_traffic' });
  });

  resetLifecycleBtn.addEventListener('click', () => {
    simulatedShutdown = false;
    shutdownStatusBadge.textContent = 'RUNNING';
    shutdownStatusBadge.style.background = '#222';
    shutdownStatusBadge.style.color = '#888';
    checkProbes();
    showToast('Khôi phục trạng thái hoạt động bình thường.', 'success');
  });

  // ─────────────────────────────────────────────────────────────
  // 6. STRESS TEST SIMULATORS
  // ─────────────────────────────────────────────────────────────
  // Burst 12 requests
  simBurstBtn.addEventListener('click', async () => {
    showToast('Đang bắn liên tục 12 request để kiểm tra Sliding Window 429...', 'info');
    simBurstBtn.disabled = true;

    for (let i = 1; i <= 12; i++) {
      questionInput.value = `Burst test câu hỏi #${i}`;
      await new Promise(r => setTimeout(r, 80));
      chatForm.dispatchEvent(new Event('submit'));
    }

    setTimeout(() => {
      simBurstBtn.disabled = false;
    }, 2000);
  });

  // Invalid Key
  simInvalidKeyBtn.addEventListener('click', () => {
    const oldKey = apiKeyInput.value;
    apiKeyInput.value = 'invalid-secret-key-12345';
    questionInput.value = 'Câu hỏi thử nghiệm với API key sai';
    chatForm.dispatchEvent(new Event('submit'));

    setTimeout(() => {
      apiKeyInput.value = oldKey;
    }, 1500);
  });

  // Check Probes button
  simProbesBtn.addEventListener('click', () => {
    checkProbes();
    showToast('Đã kiểm tra /health và /ready probes.', 'success');
  });

  // Rate limit UI helper
  function incrementRateLimitUI() {
    requestsInWindow = Math.min(10, requestsInWindow + 1);
    rateLimitCount.textContent = `${requestsInWindow} / 10 req`;
    const pct = (requestsInWindow / 10) * 100;
    rateLimitBar.style.width = `${pct}%`;

    if (requestsInWindow >= 10) {
      rateLimitBar.classList.add('danger');
    } else {
      rateLimitBar.classList.remove('danger');
    }

    // Auto decrement after 60s
    setTimeout(() => {
      requestsInWindow = Math.max(0, requestsInWindow - 1);
      rateLimitCount.textContent = `${requestsInWindow} / 10 req`;
      rateLimitBar.style.width = `${(requestsInWindow / 10) * 100}%`;
      if (requestsInWindow < 10) rateLimitBar.classList.remove('danger');
    }, 60000);
  }

  function updateCostGuardUI(spent) {
    costSpentText.textContent = `$${spent.toFixed(4)} / $10.00`;
    const pct = Math.min(100, (spent / 10.0) * 100);
    costSpentBar.style.width = `${Math.max(1, pct)}%`;
  }

  function escapeHtml(str) {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatMarkdown(text) {
    if (!text) return '';
    let html = escapeHtml(text);
    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Code inline
    html = html.replace(/`(.*?)`/g, '<code>$1</code>');
    // Newlines
    html = html.replace(/\n/g, '<br>');
    return html;
  }

  // Initial check
  checkProbes();
  setInterval(checkProbes, 15000);
});
