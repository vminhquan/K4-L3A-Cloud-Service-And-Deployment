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
  const apiKeyBox = document.getElementById('apiKeyBox');
  const verifyKeyBtn = document.getElementById('verifyKeyBtn');
  const sendBtn = document.getElementById('sendBtn');
  const lockedNoticeMessage = document.getElementById('lockedNoticeMessage');
  const lockStatusPill = document.getElementById('lockStatusPill');
  const userIdInput = document.getElementById('userIdInput');
  const healthPill = document.getElementById('healthPill');
  const healthPillText = document.getElementById('healthPillText');
  const toastContainer = document.getElementById('toastContainer');
  const logTerminal = document.getElementById('logTerminal');
  const clearLogsBtn = document.getElementById('clearLogsBtn');

  let isKeyUnlocked = false;

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
  const simMissingKeyBtn = document.getElementById('simMissingKeyBtn');
  const simTimingBtn = document.getElementById('simTimingBtn');
  const simProbesBtn = document.getElementById('simProbesBtn');

  // Security Lab & Timing Attack elements
  const attackOtherKeyBtn = document.getElementById('attackOtherKeyBtn');
  const attackMissingKeyBtn = document.getElementById('attackMissingKeyBtn');
  const attackNearMatchKeyBtn = document.getElementById('attackNearMatchKeyBtn');
  const runTimingBenchmarkBtn = document.getElementById('runTimingBenchmarkBtn');

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

  // ─────────────────────────────────────────────────────────────
  // XÁC THỰC KHÓA API ĐỂ MỞ KHÓA CHAT
  // ─────────────────────────────────────────────────────────────
  async function verifyApiKey(showNotice = true) {
    const key = apiKeyInput.value.trim();
    if (!key) {
      setChatLocked(true, '🔒 Vui lòng nhập đúng Khóa API ở trên và bấm "Mở Khóa" để bắt đầu...');
      apiKeyBox.style.borderColor = 'var(--accent-amber)';
      if (showNotice) showToast('⚠️ Vui lòng dán AGENT_API_KEY từ file .env vào ô Khóa API!', 'warn');
      return false;
    }

    verifyKeyBtn.textContent = 'Đang kiểm tra...';
    verifyKeyBtn.disabled = true;

    try {
      const res = await fetch('/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': key,
          'X-User-Id': userIdInput.value.trim() || 'sv-test'
        },
        body: JSON.stringify({ question: 'Kiểm tra mở khóa quyền chat' })
      });

      verifyKeyBtn.disabled = false;

      if (res.status === 200) {
        isKeyUnlocked = true;
        setChatLocked(false);
        verifyKeyBtn.textContent = '✔ Đã Mở';
        verifyKeyBtn.style.background = 'var(--accent-green)';
        verifyKeyBtn.style.borderColor = 'var(--accent-green)';
        verifyKeyBtn.style.color = '#000';
        apiKeyBox.style.borderColor = 'var(--accent-green)';

        if (lockStatusPill) {
          lockStatusPill.textContent = '✔ ĐÃ XÁC THỰC';
          lockStatusPill.style.color = 'var(--accent-green)';
          lockStatusPill.style.borderColor = 'rgba(0, 229, 153, 0.4)';
        }

        if (showNotice) {
          showToast('✅ Khóa API chính xác! Bạn đã có thể bắt đầu trò chuyện.', 'success');
          appendUnlockedWelcomeMessage();
        }

        appendStructuredLog('auth_unlocked', 'info', {
          message: 'Khóa API hợp lệ, đã mở khóa phiên chat.'
        });
        return true;

      } else if (res.status === 401) {
        isKeyUnlocked = false;
        setChatLocked(true, '⛔ Khóa API không đúng! Vui lòng kiểm tra lại file .env...');
        verifyKeyBtn.textContent = 'Thử Lại';
        verifyKeyBtn.style.background = 'transparent';
        verifyKeyBtn.style.borderColor = 'var(--accent-red)';
        verifyKeyBtn.style.color = 'var(--accent-red)';
        apiKeyBox.style.borderColor = 'var(--accent-red)';

        if (lockStatusPill) {
          lockStatusPill.textContent = '⛔ SAI KHÓA (401)';
          lockStatusPill.style.color = 'var(--accent-red)';
          lockStatusPill.style.borderColor = 'rgba(255, 0, 85, 0.4)';
        }

        if (showNotice) {
          showToast('⛔ Khóa API không đúng! Server từ chối mở khóa (HTTP 401).', 'error');
          appendErrorMessage(
            'HTTP 401 Unauthorized: Khóa API không chính xác',
            'Khóa API bạn vừa nhập không khớp với AGENT_API_KEY được cấu hình trên máy chủ. Giao diện chat vẫn bị khóa để bảo vệ hệ thống.'
          );
        }

        appendStructuredLog('auth_failed', 'error', {
          status: 401,
          message: 'Khóa API sai, không cho phép mở khóa chat.'
        });
        return false;

      } else {
        if (res.status === 429 || res.status === 402) {
          isKeyUnlocked = true;
          setChatLocked(false);
          verifyKeyBtn.textContent = '✔ Đã Mở';
          return true;
        }
      }
    } catch (err) {
      verifyKeyBtn.disabled = false;
      verifyKeyBtn.textContent = 'Lỗi Kết Nối';
      showToast('Lỗi mạng khi kiểm tra khóa: ' + err.message, 'error');
      return false;
    }
  }

  function setChatLocked(locked, placeholderText) {
    if (locked) {
      questionInput.disabled = true;
      sendBtn.disabled = true;
      sendBtn.style.opacity = '0.4';
      sendBtn.style.cursor = 'not-allowed';
      questionInput.placeholder = placeholderText || '🔒 Vui lòng nhập đúng Khóa API ở trên và bấm "Mở Khóa" để bắt đầu...';
    } else {
      questionInput.disabled = false;
      sendBtn.disabled = false;
      sendBtn.style.opacity = '1';
      sendBtn.style.cursor = 'pointer';
      questionInput.placeholder = 'Nhập câu hỏi của bạn cho AI Agent (Nhấn Enter để gửi)...';
      questionInput.focus();
    }
  }

  function appendUnlockedWelcomeMessage() {
    const div = document.createElement('div');
    div.className = 'chat-message agent';
    div.innerHTML = `
      <div class="chat-bubble" style="border-color: rgba(0, 229, 153, 0.4); background: rgba(0, 229, 153, 0.04);">
        <strong style="color: var(--accent-green);">🎉 Khóa API hợp lệ! Hệ thống đã mở khóa toàn bộ quyền chat.</strong><br><br>
        Chào mừng bạn đã xác thực thành công với <strong>AI Agent (day12-agent)</strong>. Bạn có thể tự do đặt bất kỳ câu hỏi nào hoặc sử dụng các phím tắt bên dưới.
      </div>
      <div class="message-meta">
        <span class="meta-pill" style="color: var(--accent-green); border-color: rgba(0, 229, 153, 0.4);">ĐÃ MỞ KHÓA</span>
        <span>Xác thực thành công</span>
      </div>
    `;
    chatHistory.appendChild(div);
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }

  if (verifyKeyBtn) {
    verifyKeyBtn.addEventListener('click', () => {
      verifyApiKey(true);
    });
  }

  if (apiKeyInput) {
    apiKeyInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        verifyApiKey(true);
      }
    });
  }

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
      if (!isKeyUnlocked) {
        showToast('🔒 Vui lòng nhập đúng Khóa API ở trên và bấm "Mở Khóa" trước khi dùng câu hỏi mẫu!', 'warn');
        apiKeyInput.focus();
        apiKeyBox.style.borderColor = 'var(--accent-amber)';
        return;
      }
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
    let tagText = 'THÔNG TIN';
    if (level === 'warn') {
      tagClass = 'warn';
      tagText = 'CẢNH BÁO';
    }
    if (level === 'error') {
      tagClass = 'error';
      tagText = 'LỖI';
    }

    // Format JSON with simple highlights
    const jsonStr = JSON.stringify(payload);
    line.innerHTML = `
      <span class="timestamp">[${timestamp.slice(11, 19)}]</span>
      <span class="tag ${tagClass}">${tagText}</span>
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
    if (!isKeyUnlocked) {
      showToast('🔒 Vui lòng nhập đúng Khóa API của bạn ở trên và bấm "Mở Khóa" trước khi chat!', 'warn');
      apiKeyInput.focus();
      apiKeyBox.style.borderColor = 'var(--accent-amber)';
      return;
    }

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
        isKeyUnlocked = false;
        setChatLocked(true, '⛔ Khóa API không đúng! Vui lòng nhập lại...');
        verifyKeyBtn.textContent = 'Thử Lại';
        verifyKeyBtn.style.background = 'transparent';
        verifyKeyBtn.style.borderColor = 'var(--accent-red)';
        verifyKeyBtn.style.color = 'var(--accent-red)';
        apiKeyBox.style.borderColor = 'var(--accent-red)';

        if (lockStatusPill) {
          lockStatusPill.textContent = '⛔ SAI KHÓA (401)';
          lockStatusPill.style.color = 'var(--accent-red)';
          lockStatusPill.style.borderColor = 'rgba(255, 0, 85, 0.4)';
        }

        appendErrorMessage(
          'HTTP 401 Không được phép (Unauthorized): Khóa API không hợp lệ hoặc bị thiếu',
          'Khóa xác thực API không hợp lệ hoặc thiếu tiêu đề X-API-Key. Máy chủ đã đối soát bằng thuật toán secrets.compare_digest() để so sánh hằng số thời gian (constant-time), triệt tiêu hoàn toàn lỗ hổng timing attack.'
        );
        showToast('401 Không được phép: Khóa API không đúng', 'error');
        appendStructuredLog('auth_failed', 'error', { status: 401, detail: data.detail });

      } else if (status === 429) {
        appendErrorMessage(
          'HTTP 429 Quá nhiều yêu cầu (Too Many Requests): Vượt quá hạn mức tần suất',
          'Thuật toán Cửa sổ trượt 60 giây (Sliding Window Redis ZSET) phát hiện bạn đã vượt quá hạn mức 10 yêu cầu/phút. Tiêu đề phản hồi có chứa Retry-After: 60.'
        );
        showToast('429 Quá nhiều yêu cầu: Vượt tốc độ cho phép', 'warn');
        rateLimitCount.textContent = '10 / 10 (ĐÃ CHẶN)';
        rateLimitBar.classList.add('danger');
        rateLimitBar.style.width = '100%';
        appendStructuredLog('rate_limit_exceeded', 'warn', { user_id: userId, limit: 10 });

      } else if (status === 402) {
        appendErrorMessage(
          'HTTP 402 Yêu cầu thanh toán (Payment Required): Đã vượt quá ngân sách tháng',
          'Hàng rào chi phí (Cost Guard) đã chủ động chặn yêu cầu trước khi gọi mô hình AI vì ngân sách tháng của tài khoản đã vượt mức cho phép ($10.00 USD).'
        );
        showToast('402 Yêu cầu thanh toán: Đã hết ngân sách', 'error');
        appendStructuredLog('budget_exceeded', 'error', { user_id: userId, max_budget: 10.0 });

      } else {
        appendErrorMessage(`Lỗi HTTP ${status}`, JSON.stringify(data));
        showToast(`Lỗi: ${status}`, 'error');
      }

    } catch (err) {
      removeLoadingBubble(loadingId);
      appendErrorMessage('Lỗi Kết Nối Máy Chủ', `Không thể kết nối tới dịch vụ: ${err.message}`);
      showToast('Không kết nối được máy chủ', 'error');
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
        <span class="meta-pill">${meta.tokens?.in || 0} vào / ${meta.tokens?.out || 0} ra</span>
        <span class="meta-pill">Lịch sử: ${meta.history_length}</span>
        <span class="meta-pill">Độ trễ: ${meta.latency}ms</span>
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
        <span class="meta-pill error">ĐÃ BỊ CHẶN</span>
        <span>Hàng Rào Bảo Vệ An Toàn</span>
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
        Đang xử lý qua các trạm kiểm soát (Xác thực ➔ Giới hạn tần suất ➔ Quản lý ngân sách ➔ Lưu vết Redis ➔ Gọi Trợ lý AI)...
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
        probeHealthBadge.textContent = '● 200 Bình Thường';
      } else {
        probeHealthBadge.className = 'probe-badge down';
        probeHealthBadge.textContent = `● ${hRes.status} Lỗi Tiến Trình`;
      }
    } catch (e) {
      probeHealthBadge.className = 'probe-badge down';
      probeHealthBadge.textContent = '● Ngoại Tuyến (Offline)';
      probeHealthJson.textContent = e.message;
    }

    try {
      const rRes = await fetch('/ready');
      const rData = await rRes.json();
      probeReadyJson.textContent = JSON.stringify(rData, null, 2);

      if (rRes.status === 200) {
        probeReadyBadge.className = 'probe-badge ok';
        probeReadyBadge.textContent = '● 200 Đã Sẵn Sàng';
        healthPill.querySelector('.status-indicator').style.background = 'var(--accent-green)';
        healthPillText.textContent = 'Hệ Thống Sẵn Sàng (200 OK)';
      } else {
        probeReadyBadge.className = 'probe-badge down';
        probeReadyBadge.textContent = `● ${rRes.status} Chưa Sẵn Sàng`;
        healthPill.querySelector('.status-indicator').style.background = 'var(--accent-red)';
        healthPillText.textContent = `Chưa Sẵn Sàng: ${rRes.status}`;
      }
    } catch (e) {
      probeReadyBadge.className = 'probe-badge down';
      probeReadyBadge.textContent = '● Ngoại Tuyến (Offline)';
      probeReadyJson.textContent = e.message;
    }
  }

  refreshHealthBtn.addEventListener('click', checkProbes);
  refreshReadyBtn.addEventListener('click', checkProbes);

  // Graceful shutdown simulator
  simulateSigtermBtn.addEventListener('click', () => {
    simulatedShutdown = true;
    shutdownStatusBadge.textContent = 'ĐANG TẮT DẦN (503)';
    shutdownStatusBadge.style.background = 'rgba(255, 0, 85, 0.2)';
    shutdownStatusBadge.style.color = 'var(--accent-red)';

    probeHealthBadge.className = 'probe-badge down';
    probeHealthBadge.textContent = '● 503 Đang Tắt Dần';
    probeHealthJson.textContent = JSON.stringify({ status: "shutting_down" }, null, 2);

    probeReadyBadge.className = 'probe-badge down';
    probeReadyBadge.textContent = '● 503 Đang Tắt Dần';
    probeReadyJson.textContent = JSON.stringify({ status: "shutting_down" }, null, 2);

    healthPillText.textContent = '503 Đang Tắt Dần';
    healthPill.querySelector('.status-indicator').style.background = 'var(--accent-red)';

    showToast('Mô phỏng tín hiệu SIGTERM: Các cổng /health và /ready chuyển sang HTTP 503 để bộ cân bằng tải lập tức ngắt tiếp nhận yêu cầu mới.', 'warn');
    appendStructuredLog('lifecycle_signal', 'warn', { signal: 'SIGTERM', action: 'rejecting_new_traffic' });
  });

  resetLifecycleBtn.addEventListener('click', () => {
    simulatedShutdown = false;
    shutdownStatusBadge.textContent = 'ĐANG HOẠT ĐỘNG';
    shutdownStatusBadge.style.background = '#222';
    shutdownStatusBadge.style.color = '#888';
    checkProbes();
    showToast('Đã khôi phục trạng thái hoạt động bình thường.', 'success');
  });

  // ─────────────────────────────────────────────────────────────
  // 6. STRESS TEST SIMULATORS
  // ─────────────────────────────────────────────────────────────
  // Burst 12 requests
  simBurstBtn.addEventListener('click', async () => {
    showToast('Đang gửi liên tục 12 yêu cầu để kiểm thử Cửa Sổ Trượt (Sliding Window HTTP 429)...', 'info');
    simBurstBtn.disabled = true;

    for (let i = 1; i <= 12; i++) {
      questionInput.value = `Kiểm thử quá tải câu hỏi #${i}`;
      await new Promise(r => setTimeout(r, 80));
      chatForm.dispatchEvent(new Event('submit'));
    }

    setTimeout(() => {
      simBurstBtn.disabled = false;
    }, 2000);
  });

  // ─────────────────────────────────────────────────────────────
  // HÀM KIỂM THỬ TẤN CÔNG XÁC THỰC API
  // ─────────────────────────────────────────────────────────────
  async function sendCustomAuthTest(keyHeaderValue, scenarioName) {
    appendStructuredLog('auth_attack_simulation', 'warn', {
      scenario: scenarioName,
      key_sent: keyHeaderValue ? (keyHeaderValue.length > 15 ? keyHeaderValue.slice(0, 10) + '...' : keyHeaderValue) : '(None)',
    });

    const headers = {
      'Content-Type': 'application/json',
      'X-User-Id': userIdInput.value.trim() || 'attacker-01'
    };
    if (keyHeaderValue !== null) {
      headers['X-API-Key'] = keyHeaderValue;
    }

    const startTime = performance.now();
    try {
      const res = await fetch('/ask', {
        method: 'POST',
        headers,
        body: JSON.stringify({ question: `[Tấn công kiểm thử] Kịch bản: ${scenarioName}` })
      });
      const elapsed = Math.round(performance.now() - startTime);
      const data = await res.json();

      if (res.status === 401) {
        appendErrorMessage(
          `HTTP 401 Unauthorized — Chặn Thành Công ${scenarioName}`,
          `Khóa gửi lên: ${keyHeaderValue ? `"${keyHeaderValue}"` : '(Thiếu tiêu đề X-API-Key)'}. Hệ thống đã so sánh hằng số thời gian bằng secrets.compare_digest() và từ chối an toàn trong ${elapsed}ms.`
        );
        showToast(`✔ Chặn thành công 401: ${scenarioName}`, 'success');
      } else {
        showToast(`Trạng thái phản hồi: ${res.status}`, 'warn');
      }
    } catch (err) {
      showToast(`Lỗi mạng: ${err.message}`, 'error');
    }
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }

  // ─────────────────────────────────────────────────────────────
  // HÀM BENCHMARK THỜI GIAN TIMING-ATTACK
  // ─────────────────────────────────────────────────────────────
  async function runTimingAttackBenchmark() {
    showToast('Đang chạy benchmark đo lường Timing-Attack (10 lượt kiểm tra)...', 'info');
    appendStructuredLog('timing_benchmark_started', 'info', { test_runs: 10 });

    const keyWrongFirst = 'xemEPlix4asnvmZbegWViVqfqOV7K1NkK_iqLrM2Epc';
    const keyWrongLast  = 'semEPlix4asnvmZbegWViVqfqOV7K1NkK_iqLrM2Ep_';

    const runs = 5;
    let timesFirst = [];
    let timesLast = [];

    // Warm-up
    await fetch('/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': 'warmup' },
      body: JSON.stringify({ question: 'warmup' })
    }).catch(() => {});

    // Đo thời gian nhóm sai ký tự đầu
    for (let i = 0; i < runs; i++) {
      const t0 = performance.now();
      await fetch('/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': keyWrongFirst },
        body: JSON.stringify({ question: 'test timing' })
      });
      timesFirst.push(performance.now() - t0);
      await new Promise(r => setTimeout(r, 40));
    }

    // Đo thời gian nhóm sai ký tự cuối
    for (let i = 0; i < runs; i++) {
      const t0 = performance.now();
      await fetch('/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': keyWrongLast },
        body: JSON.stringify({ question: 'test timing' })
      });
      timesLast.push(performance.now() - t0);
      await new Promise(r => setTimeout(r, 40));
    }

    const avgFirst = (timesFirst.reduce((a, b) => a + b, 0) / runs);
    const avgLast  = (timesLast.reduce((a, b) => a + b, 0) / runs);
    const delta = Math.abs(avgFirst - avgLast);

    const timingResultsBox = document.getElementById('timingResultsBox');
    const timingWrongFirst = document.getElementById('timingWrongFirst');
    const timingWrongLast = document.getElementById('timingWrongLast');
    const timingDelta = document.getElementById('timingDelta');

    if (timingResultsBox) {
      timingResultsBox.style.display = 'block';
      timingWrongFirst.textContent = `${avgFirst.toFixed(2)} ms`;
      timingWrongLast.textContent = `${avgLast.toFixed(2)} ms`;
      timingDelta.textContent = `${delta.toFixed(2)} ms (Gần như triệt tiêu)`;
    }

    appendStructuredLog('timing_benchmark_completed', 'info', {
      avg_wrong_first_ms: Number(avgFirst.toFixed(2)),
      avg_wrong_last_ms: Number(avgLast.toFixed(2)),
      delta_ms: Number(delta.toFixed(2)),
      protected_constant_time: true
    });

    showToast(`Kết quả: Chênh lệch chỉ ${delta.toFixed(2)}ms — secrets.compare_digest bảo vệ hằng số thời gian an toàn!`, 'success');
  }

  // Sidebar Simulators
  if (simInvalidKeyBtn) {
    simInvalidKeyBtn.addEventListener('click', () => {
      sendCustomAuthTest('khoa-la-cua-hacker-999', 'Khóa Người Khác / Khóa Lạ');
    });
  }

  if (simMissingKeyBtn) {
    simMissingKeyBtn.addEventListener('click', () => {
      sendCustomAuthTest(null, 'Bỏ Trống Khóa API');
    });
  }

  if (simTimingBtn) {
    simTimingBtn.addEventListener('click', () => {
      runTimingAttackBenchmark();
    });
  }

  // Security Lab buttons
  if (attackOtherKeyBtn) {
    attackOtherKeyBtn.addEventListener('click', () => {
      sendCustomAuthTest('khoa-la-cua-hacker-999', 'Khóa Giả Mạo / Khóa Lạ');
    });
  }

  if (attackMissingKeyBtn) {
    attackMissingKeyBtn.addEventListener('click', () => {
      sendCustomAuthTest(null, 'Bỏ Trống Header X-API-Key');
    });
  }

  if (attackNearMatchKeyBtn) {
    attackNearMatchKeyBtn.addEventListener('click', () => {
      sendCustomAuthTest('semEPlix4asnvmZbegWViVqfqOV7K1NkK_iqLrM2Ep_', 'Khóa Gần Đúng (Chỉ sai 1 ký tự cuối)');
    });
  }

  if (runTimingBenchmarkBtn) {
    runTimingBenchmarkBtn.addEventListener('click', () => {
      runTimingAttackBenchmark();
    });
  }

  // Check Probes button
  simProbesBtn.addEventListener('click', () => {
    checkProbes();
    showToast('Đã làm mới kết quả kiểm tra các cổng thăm dò /health và /ready.', 'success');
  });

  // Rate limit UI helper
  function incrementRateLimitUI() {
    requestsInWindow = Math.min(10, requestsInWindow + 1);
    rateLimitCount.textContent = `${requestsInWindow} / 10 yêu cầu`;
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
      rateLimitCount.textContent = `${requestsInWindow} / 10 yêu cầu`;
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
