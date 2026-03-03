/* =========================
   ChatWave 前端 SPA（纯前端 mock）
   - 无后端：所有数据使用 localStorage 模拟
   - 后端接口处都保留 TODO 注释，便于后续替换 fetch / WebSocket
========================= */

(() => {
  'use strict';

  const KEYS = {
    db: 'chatwave_db_v1',
    token: 'chatwave_token',
    currentUserId: 'chatwave_current_user_id',
    theme: 'chatwave_theme'
  };

  const EMOJIS = ['😀', '😂', '😍', '😭', '👍', '🎉', '🔥', '🤔', '😎', '🙏', '🥳', '😴'];
  const REPLY_POOL = ['收到！', '哈哈哈', '这想法不错', '我马上看一下', '晚点给你答复', '辛苦了', '可以的', '安排上了'];

  const state = {
    db: null,
    currentUser: null,
    activeSection: 'messages',
    activeConvKey: null,
    searchCache: [],
    realtimeTimer: null,
    onlineTimer: null,
    onlineMap: {}
  };

  const els = {
    authView: document.getElementById('authView'),
    appView: document.getElementById('appView'),
    authMsg: document.getElementById('authMsg'),

    loginForm: document.getElementById('loginForm'),
    registerForm: document.getElementById('registerForm'),
    loginUsername: document.getElementById('loginUsername'),
    loginPassword: document.getElementById('loginPassword'),
    registerUsername: document.getElementById('registerUsername'),
    registerEmail: document.getElementById('registerEmail'),
    registerPassword: document.getElementById('registerPassword'),
    registerConfirmPassword: document.getElementById('registerConfirmPassword'),

    sidebarAvatar: document.getElementById('sidebarAvatar'),
    sidebarNickname: document.getElementById('sidebarNickname'),
    logoutBtn: document.getElementById('logoutBtn'),
    logoutBtnMobile: document.getElementById('logoutBtnMobile'),

    sideNav: document.getElementById('sideNav'),
    mobileNav: document.getElementById('mobileNav'),
    mobileTabs: document.querySelectorAll('.mobile-tab'),

    sections: {
      messages: document.getElementById('messagesSection'),
      friends: document.getElementById('friendsSection'),
      groups: document.getElementById('groupsSection'),
      profile: document.getElementById('profileSection')
    },

    msgBadgeSide: document.getElementById('msgBadgeSide'),
    msgBadgeMobile: document.getElementById('msgBadgeMobile'),
    msgBadgeBottom: document.getElementById('msgBadgeBottom'),

    conversationCount: document.getElementById('conversationCount'),
    conversationList: document.getElementById('conversationList'),
    chatTitle: document.getElementById('chatTitle'),
    chatSubTitle: document.getElementById('chatSubTitle'),
    chatTypeBadge: document.getElementById('chatTypeBadge'),
    chatMessages: document.getElementById('chatMessages'),
    messageInput: document.getElementById('messageInput'),
    sendMsgBtn: document.getElementById('sendMsgBtn'),
    emojiToggleBtn: document.getElementById('emojiToggleBtn'),
    emojiPanel: document.getElementById('emojiPanel'),

    friendSearchInput: document.getElementById('friendSearchInput'),
    friendSearchBtn: document.getElementById('friendSearchBtn'),
    searchResultList: document.getElementById('searchResultList'),
    friendList: document.getElementById('friendList'),

    createGroupName: document.getElementById('createGroupName'),
    createGroupMembers: document.getElementById('createGroupMembers'),
    createGroupBtn: document.getElementById('createGroupBtn'),
    groupList: document.getElementById('groupList'),
    groupSelectForAdd: document.getElementById('groupSelectForAdd'),
    friendSelectForGroup: document.getElementById('friendSelectForGroup'),
    addFriendToGroupBtn: document.getElementById('addFriendToGroupBtn'),

    profileAvatar: document.getElementById('profileAvatar'),
    avatarInput: document.getElementById('avatarInput'),
    profileNickname: document.getElementById('profileNickname'),
    profileSign: document.getElementById('profileSign'),
    themeToggle: document.getElementById('themeToggle'),
    saveProfileBtn: document.getElementById('saveProfileBtn')
  };

  init();

  function init() {
    applyTheme(localStorage.getItem(KEYS.theme) || 'light');
    initDB();
    bindAuthEvents();
    bindMainEvents();
    renderEmojiPanel();

    const userId = Number(localStorage.getItem(KEYS.currentUserId));
    const token = localStorage.getItem(KEYS.token);

    if (token && userId) {
      state.currentUser = getUserById(userId);
      if (state.currentUser) {
        showApp();
      } else {
        logout();
      }
    } else {
      showAuth();
    }
  }

  /* =========================
     数据层（localStorage mock）
  ========================= */
  function initDB() {
    const raw = localStorage.getItem(KEYS.db);
    if (raw) {
      state.db = JSON.parse(raw);
      return;
    }

    // 首次初始化 mock 数据
    const u1 = createSeedUser(1, 'alice', 'alice@demo.com', '#4da3ff', 'Alice');
    const u2 = createSeedUser(2, 'bob', 'bob@demo.com', '#47c7ac', 'Bob');
    const u3 = createSeedUser(3, 'coco', 'coco@demo.com', '#ff8f5a', 'Coco');
    const u4 = createSeedUser(4, 'dylan', 'dylan@demo.com', '#9e7dff', 'Dylan');

    u1.friends = [2, 3];
    u2.friends = [1, 4];
    u3.friends = [1];
    u4.friends = [2];

    const group1 = {
      id: 1,
      name: '产品讨论群',
      ownerId: 1,
      members: [1, 2, 3],
      avatar: makeAvatarDataUri('产品群', '#1abc9c')
    };

    const messages = {};
    const now = Date.now();

    const p12 = privateKey(1, 2);
    messages[p12] = [
      { id: 1, senderId: 2, text: '嗨，今天版本要发吗？', ts: now - 1000 * 60 * 30 },
      { id: 2, senderId: 1, text: '预计下午 4 点发布。', ts: now - 1000 * 60 * 25 }
    ];

    const p13 = privateKey(1, 3);
    messages[p13] = [{ id: 3, senderId: 3, text: '设计稿我更新好了。', ts: now - 1000 * 60 * 10 }];

    const g1 = groupKey(1);
    messages[g1] = [
      { id: 4, senderId: 2, text: '大家上午好！', ts: now - 1000 * 60 * 42 },
      { id: 5, senderId: 3, text: '今天评审 2 点开始。', ts: now - 1000 * 60 * 11 }
    ];

    state.db = {
      users: [u1, u2, u3, u4],
      groups: [group1],
      messages,
      unread: {
        1: {},
        2: {},
        3: {},
        4: {}
      },
      nextIds: {
        user: 5,
        group: 2,
        message: 6
      }
    };

    saveDB();
  }

  function createSeedUser(id, username, email, color, nickname) {
    return {
      id,
      username,
      password: '123456',
      email,
      nickname,
      sign: '这个人很懒，还没写签名。',
      avatar: makeAvatarDataUri(nickname, color),
      friends: [],
      groups: []
    };
  }

  function saveDB() {
    localStorage.setItem(KEYS.db, JSON.stringify(state.db));
  }

  /* =========================
     认证模块（登录/注册）
  ========================= */
  function bindAuthEvents() {
    document.querySelectorAll('[data-auth-tab]').forEach((btn) => {
      btn.addEventListener('click', () => switchAuthTab(btn.dataset.authTab));
    });

    els.loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const username = els.loginUsername.value.trim();
      const password = els.loginPassword.value.trim();

      // TODO: 后端登录
      // fetch('http://localhost:8000/api/login', { method: 'POST', body: JSON.stringify({ username, password }) })
      // 现在用 mock：检查 localStorage 数据
      const user = state.db.users.find((u) => u.username === username && u.password === password);
      if (!user) {
        showAuthMsg('用户名或密码错误');
        return;
      }

      mockLoginSuccess(user);
    });

    els.registerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const username = els.registerUsername.value.trim();
      const email = els.registerEmail.value.trim();
      const password = els.registerPassword.value.trim();
      const confirm = els.registerConfirmPassword.value.trim();

      if (!username || !email || !password) {
        showAuthMsg('请填写完整注册信息');
        return;
      }
      if (password !== confirm) {
        showAuthMsg('两次输入的密码不一致');
        return;
      }
      if (state.db.users.some((u) => u.username === username)) {
        showAuthMsg('用户名已存在');
        return;
      }

      // TODO: 后端注册
      // fetch('http://localhost:8000/api/register', { method: 'POST', body: JSON.stringify({ username, password, email }) })
      // 现在用 mock：直接写入 localStorage
      const id = state.db.nextIds.user++;
      const user = {
        id,
        username,
        password,
        email,
        nickname: username,
        sign: '你好，很高兴认识你。',
        avatar: makeAvatarDataUri(username, randomColor()),
        friends: [],
        groups: []
      };

      state.db.users.push(user);
      state.db.unread[id] = {};
      saveDB();
      mockLoginSuccess(user);
    });
  }

  function switchAuthTab(tab) {
    const loginTabBtn = document.getElementById('loginTabBtn');
    const registerTabBtn = document.getElementById('registerTabBtn');
    const loginVisible = tab === 'login';

    loginTabBtn.classList.toggle('active', loginVisible);
    registerTabBtn.classList.toggle('active', !loginVisible);
    els.loginForm.classList.toggle('d-none', !loginVisible);
    els.registerForm.classList.toggle('d-none', loginVisible);
    showAuthMsg('');
  }

  function mockLoginSuccess(user) {
    // TODO: 后端返回 token
    // mock 逻辑：写入假 token + 用户 ID
    localStorage.setItem(KEYS.token, `fake-token-${Date.now()}`);
    localStorage.setItem(KEYS.currentUserId, String(user.id));
    state.currentUser = user;
    showApp();
  }

  function showAuthMsg(msg) {
    els.authMsg.textContent = msg;
  }

  function showAuth() {
    els.appView.classList.add('d-none');
    els.authView.classList.remove('d-none');
    clearInterval(state.realtimeTimer);
    clearInterval(state.onlineTimer);
  }

  function showApp() {
    els.authView.classList.add('d-none');
    els.appView.classList.remove('d-none');
    refreshCurrentUser();

    // 如用户允许，触发浏览器通知权限请求
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    const fromHash = window.location.hash.replace('#', '');
    if (['messages', 'friends', 'groups', 'profile'].includes(fromHash)) {
      state.activeSection = fromHash;
    }

    ensureActiveConversation();
    renderAll();
    startRealtimeMock();
    startOnlineMock();
  }

  function logout() {
    localStorage.removeItem(KEYS.token);
    localStorage.removeItem(KEYS.currentUserId);
    state.currentUser = null;
    state.activeConvKey = null;
    showAuth();
  }

  /* =========================
     主界面事件
  ========================= */
  function bindMainEvents() {
    els.logoutBtn.addEventListener('click', logout);
    els.logoutBtnMobile.addEventListener('click', logout);

    bindSectionSwitch(els.sideNav);
    bindSectionSwitch(els.mobileNav, true);

    els.mobileTabs.forEach((btn) => {
      btn.addEventListener('click', () => switchSection(btn.dataset.section));
    });

    window.addEventListener('hashchange', () => {
      const sec = window.location.hash.replace('#', '');
      if (['messages', 'friends', 'groups', 'profile'].includes(sec)) {
        switchSection(sec, false);
      }
    });

    els.sendMsgBtn.addEventListener('click', sendMessage);
    els.messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendMessage();
    });

    els.emojiToggleBtn.addEventListener('click', () => {
      els.emojiPanel.classList.toggle('d-none');
    });

    // 编辑自己消息：点击自己气泡触发 prompt
    els.chatMessages.addEventListener('click', (e) => {
      const bubble = e.target.closest('.msg-row.self .msg-bubble');
      if (!bubble || !state.activeConvKey) return;
      const msgId = Number(bubble.dataset.msgId);
      editOwnMessage(msgId);
    });

    els.friendSearchBtn.addEventListener('click', handleFriendSearch);
    els.friendSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleFriendSearch();
    });

    els.createGroupBtn.addEventListener('click', createGroup);
    els.addFriendToGroupBtn.addEventListener('click', addFriendToGroup);

    els.avatarInput.addEventListener('change', onAvatarChange);
    els.saveProfileBtn.addEventListener('click', saveProfile);

    els.themeToggle.addEventListener('change', () => {
      applyTheme(els.themeToggle.checked ? 'dark' : 'light');
      localStorage.setItem(KEYS.theme, els.themeToggle.checked ? 'dark' : 'light');
    });
  }

  function bindSectionSwitch(container, closeOffcanvas = false) {
    container.querySelectorAll('[data-section]').forEach((btn) => {
      btn.addEventListener('click', () => {
        switchSection(btn.dataset.section);
        if (closeOffcanvas) {
          const menu = bootstrap.Offcanvas.getInstance(document.getElementById('mobileMenu'));
          menu && menu.hide();
        }
      });
    });
  }

  function switchSection(section, setHash = true) {
    state.activeSection = section;
    if (setHash) window.location.hash = section;

    Object.entries(els.sections).forEach(([name, panel]) => {
      panel.classList.toggle('d-none', name !== section);
    });

    // 同步桌面、抽屉、底部 tab 的激活态
    document.querySelectorAll('[data-section]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.section === section);
    });

    if (section === 'messages' && state.activeConvKey) {
      markRead(state.activeConvKey);
      renderChatMessages();
    }

    renderUnreadBadges();
  }

  /* =========================
     渲染逻辑
  ========================= */
  function renderAll() {
    refreshCurrentUser();
    if (!state.currentUser) return;

    els.sidebarAvatar.src = state.currentUser.avatar;
    els.sidebarNickname.textContent = state.currentUser.nickname;

    renderConversations();
    renderChatHeader();
    renderChatMessages();
    renderFriendSearchResults();
    renderFriendList();
    renderGroupSection();
    renderProfile();
    renderUnreadBadges();
  }

  function renderConversations() {
    const list = buildConversationModels();
    els.conversationCount.textContent = String(list.length);

    if (!list.length) {
      els.conversationList.innerHTML = '<div class="text-secondary small">暂无会话。先添加好友或创建群聊吧。</div>';
      return;
    }

    els.conversationList.innerHTML = list
      .map((conv) => {
        const unread = getUnreadMap()[conv.key] || 0;
        return `
          <div class="conversation-item ${conv.key === state.activeConvKey ? 'active' : ''}" data-key="${conv.key}">
            <div class="d-flex align-items-center gap-2">
              <img src="${conv.avatar}" class="rounded-circle" width="36" height="36" alt="avatar" />
              <div class="flex-grow-1 min-w-0">
                <div class="d-flex align-items-center justify-content-between gap-2">
                  <strong class="text-truncate">${escapeHTML(conv.title)}</strong>
                  <small class="text-secondary">${conv.lastTime || ''}</small>
                </div>
                <div class="small text-secondary text-truncate">${escapeHTML(conv.subtitle)}</div>
              </div>
              ${unread ? `<span class="badge text-bg-danger">${unread}</span>` : ''}
            </div>
          </div>
        `;
      })
      .join('');

    els.conversationList.querySelectorAll('.conversation-item').forEach((item) => {
      item.addEventListener('click', () => {
        state.activeConvKey = item.dataset.key;
        markRead(state.activeConvKey);
        renderConversations();
        renderChatHeader();
        renderChatMessages();
        renderUnreadBadges();
      });
    });
  }

  function renderChatHeader() {
    const conv = getConversationByKey(state.activeConvKey);
    if (!conv) {
      els.chatTitle.textContent = '请选择会话';
      els.chatSubTitle.textContent = '点击左侧会话开始聊天';
      els.chatTypeBadge.classList.add('d-none');
      return;
    }

    els.chatTitle.textContent = conv.title;
    els.chatSubTitle.textContent = conv.type === 'private' ? (isOnline(conv.peerId) ? '在线' : '离线') : `${conv.memberCount} 位成员`;
    els.chatTypeBadge.classList.remove('d-none');
    els.chatTypeBadge.textContent = conv.type === 'private' ? '单聊' : '群聊';
    els.chatTypeBadge.className = `badge ${conv.type === 'private' ? 'text-bg-info' : 'text-bg-success'}`;
  }

  function renderChatMessages() {
    const conv = getConversationByKey(state.activeConvKey);
    if (!conv) {
      els.chatMessages.innerHTML = '<div class="text-secondary">暂无消息内容</div>';
      return;
    }

    const messages = state.db.messages[conv.key] || [];
    if (!messages.length) {
      els.chatMessages.innerHTML = '<div class="text-secondary">还没有消息，发一条试试吧。</div>';
      return;
    }

    els.chatMessages.innerHTML = messages
      .map((m) => {
        const self = m.senderId === state.currentUser.id;
        const sender = getUserById(m.senderId);
        const edited = m.editedTs ? ` · 已编辑 ${formatTime(m.editedTs)}` : '';
        return `
          <div class="msg-row ${self ? 'self' : 'other'}">
            <div class="msg-bubble" data-msg-id="${m.id}" title="${self ? '点击可编辑消息' : ''}">
              ${!self && conv.type === 'group' ? `<div class="small fw-semibold mb-1">${escapeHTML(sender?.nickname || '未知用户')}</div>` : ''}
              <div>${escapeHTML(m.text)}</div>
              <div class="msg-meta">${formatTime(m.ts)}${edited}</div>
            </div>
          </div>
        `;
      })
      .join('');

    // 聊天滚动：每次渲染后自动滚到底部
    els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
  }

  function renderFriendSearchResults() {
    const rows = state.searchCache;
    if (!rows.length) {
      els.searchResultList.innerHTML = '<div class="list-group-item text-secondary">暂无搜索结果</div>';
      return;
    }

    els.searchResultList.innerHTML = rows
      .map(
        (u) => `
        <div class="list-group-item d-flex align-items-center justify-content-between gap-2">
          <div class="d-flex align-items-center gap-2">
            <img src="${u.avatar}" width="34" height="34" class="rounded-circle" alt="avatar" />
            <div>
              <div>${escapeHTML(u.nickname)} <small class="text-secondary">@${escapeHTML(u.username)}</small></div>
              <small class="text-secondary">${escapeHTML(u.email)}</small>
            </div>
          </div>
          <button class="btn btn-sm btn-outline-primary" data-add-friend="${u.id}">添加</button>
        </div>
      `
      )
      .join('');

    els.searchResultList.querySelectorAll('[data-add-friend]').forEach((btn) => {
      btn.addEventListener('click', () => addFriend(Number(btn.dataset.addFriend)));
    });
  }

  function renderFriendList() {
    const friends = (state.currentUser.friends || []).map(getUserById).filter(Boolean);

    if (!friends.length) {
      els.friendList.innerHTML = '<div class="list-group-item text-secondary">你还没有好友，去左侧搜索添加吧。</div>';
      return;
    }

    els.friendList.innerHTML = friends
      .map(
        (f) => `
        <div class="list-group-item d-flex align-items-center justify-content-between gap-2">
          <div class="d-flex align-items-center gap-2">
            <img src="${f.avatar}" width="34" height="34" class="rounded-circle" alt="avatar" />
            <div>
              <div>${escapeHTML(f.nickname)}</div>
              <small class="${isOnline(f.id) ? 'text-success' : 'text-secondary'}">${isOnline(f.id) ? '在线' : '离线'}</small>
            </div>
          </div>
          <button class="btn btn-sm btn-primary" data-open-private="${f.id}">私聊</button>
        </div>
      `
      )
      .join('');

    els.friendList.querySelectorAll('[data-open-private]').forEach((btn) => {
      btn.addEventListener('click', () => openPrivateChat(Number(btn.dataset.openPrivate)));
    });
  }

  function renderGroupSection() {
    const groups = getMyGroups();

    els.groupList.innerHTML = groups.length
      ? groups
          .map(
            (g) => `
        <div class="list-group-item d-flex justify-content-between align-items-center">
          <div>
            <div class="fw-semibold">${escapeHTML(g.name)}</div>
            <small class="text-secondary">成员：${g.members.length} 人</small>
          </div>
          <button class="btn btn-sm btn-outline-success" data-open-group="${g.id}">进入群聊</button>
        </div>
      `
          )
          .join('')
      : '<div class="list-group-item text-secondary">暂无群聊，先创建一个吧。</div>';

    els.groupList.querySelectorAll('[data-open-group]').forEach((btn) => {
      btn.addEventListener('click', () => openGroupChat(Number(btn.dataset.openGroup)));
    });

    // 创建群成员多选（来源：好友）
    const friendOptions = (state.currentUser.friends || [])
      .map((id) => getUserById(id))
      .filter(Boolean)
      .map((u) => `<option value="${u.id}">${escapeHTML(u.nickname)} (@${escapeHTML(u.username)})</option>`)
      .join('');
    els.createGroupMembers.innerHTML = friendOptions || '<option disabled>暂无好友可选</option>';

    els.groupSelectForAdd.innerHTML = groups
      .map((g) => `<option value="${g.id}">${escapeHTML(g.name)}</option>`)
      .join('');

    const friends = (state.currentUser.friends || []).map((id) => getUserById(id)).filter(Boolean);
    els.friendSelectForGroup.innerHTML = friends
      .map((u) => `<option value="${u.id}">${escapeHTML(u.nickname)}</option>`)
      .join('');
  }

  function renderProfile() {
    els.profileAvatar.src = state.currentUser.avatar;
    els.profileNickname.value = state.currentUser.nickname;
    els.profileSign.value = state.currentUser.sign || '';
    els.themeToggle.checked = (localStorage.getItem(KEYS.theme) || 'light') === 'dark';
  }

  function renderUnreadBadges() {
    const total = Object.values(getUnreadMap()).reduce((acc, n) => acc + n, 0);

    if (total > 0) {
      els.msgBadgeSide.textContent = String(total);
      els.msgBadgeMobile.textContent = String(total);
      els.msgBadgeSide.classList.remove('d-none');
      els.msgBadgeMobile.classList.remove('d-none');
      els.msgBadgeBottom.classList.remove('d-none');
    } else {
      els.msgBadgeSide.classList.add('d-none');
      els.msgBadgeMobile.classList.add('d-none');
      els.msgBadgeBottom.classList.add('d-none');
    }
  }

  function renderEmojiPanel() {
    els.emojiPanel.innerHTML = EMOJIS.map((e) => `<button class="emoji-btn" type="button">${e}</button>`).join('');
    els.emojiPanel.querySelectorAll('.emoji-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        els.messageInput.value += btn.textContent;
        els.messageInput.focus();
      });
    });
  }

  /* =========================
     动作：消息发送/编辑
  ========================= */
  function sendMessage() {
    if (!state.activeConvKey) return;
    const text = els.messageInput.value.trim();
    if (!text) return;

    // TODO: 后端发消息
    // fetch('http://localhost:8000/api/messages', { method: 'POST', body: JSON.stringify({ conversation: state.activeConvKey, text }) })
    // mock：直接写本地消息
    const msg = {
      id: state.db.nextIds.message++,
      senderId: state.currentUser.id,
      text,
      ts: Date.now()
    };

    if (!state.db.messages[state.activeConvKey]) state.db.messages[state.activeConvKey] = [];
    state.db.messages[state.activeConvKey].push(msg);
    saveDB();

    els.messageInput.value = '';
    renderConversations();
    renderChatMessages();
  }

  function editOwnMessage(messageId) {
    const arr = state.db.messages[state.activeConvKey] || [];
    const msg = arr.find((m) => m.id === messageId);
    if (!msg || msg.senderId !== state.currentUser.id) return;

    const nextText = window.prompt('编辑消息内容：', msg.text);
    if (nextText === null) return;
    const trimmed = nextText.trim();
    if (!trimmed) return;

    msg.text = trimmed;
    msg.editedTs = Date.now();
    saveDB();
    renderConversations();
    renderChatMessages();
  }

  /* =========================
     动作：好友与群
  ========================= */
  function handleFriendSearch() {
    const keyword = els.friendSearchInput.value.trim().toLowerCase();
    const myFriendSet = new Set(state.currentUser.friends || []);

    // TODO: 后端搜索好友
    // fetch('http://localhost:8000/api/users?keyword=' + encodeURIComponent(keyword))
    // mock：从本地用户中过滤
    state.searchCache = state.db.users.filter((u) => {
      if (u.id === state.currentUser.id) return false;
      if (myFriendSet.has(u.id)) return false;
      if (!keyword) return true;
      return u.username.toLowerCase().includes(keyword) || u.nickname.toLowerCase().includes(keyword);
    });

    renderFriendSearchResults();
  }

  function addFriend(friendId) {
    const me = getUserById(state.currentUser.id);
    const target = getUserById(friendId);
    if (!me || !target) return;
    if (!me.friends.includes(friendId)) me.friends.push(friendId);
    if (!target.friends.includes(me.id)) target.friends.push(me.id);

    saveDB();
    refreshCurrentUser();
    handleFriendSearch();
    renderFriendList();
    renderConversations();
    renderGroupSection();
  }

  function createGroup() {
    const name = els.createGroupName.value.trim();
    if (!name) {
      alert('请输入群名称');
      return;
    }

    const selected = Array.from(els.createGroupMembers.selectedOptions).map((o) => Number(o.value));
    const members = Array.from(new Set([state.currentUser.id, ...selected]));

    // TODO: 后端创建群聊
    // fetch('http://localhost:8000/api/groups', { method: 'POST', body: JSON.stringify({ name, members }) })
    // mock：本地创建
    const id = state.db.nextIds.group++;
    state.db.groups.push({
      id,
      name,
      ownerId: state.currentUser.id,
      members,
      avatar: makeAvatarDataUri(name, '#1abc9c')
    });

    state.db.messages[groupKey(id)] = [];
    saveDB();

    els.createGroupName.value = '';
    renderGroupSection();
    renderConversations();
  }

  function addFriendToGroup() {
    const gid = Number(els.groupSelectForAdd.value);
    const uid = Number(els.friendSelectForGroup.value);
    const group = state.db.groups.find((g) => g.id === gid);
    if (!group || !uid) return;

    if (!group.members.includes(uid)) {
      group.members.push(uid);
      saveDB();
      renderGroupSection();
      alert('好友已加入群聊');
    } else {
      alert('该好友已在群中');
    }
  }

  function openPrivateChat(peerId) {
    state.activeConvKey = privateKey(state.currentUser.id, peerId);
    if (!state.db.messages[state.activeConvKey]) state.db.messages[state.activeConvKey] = [];
    saveDB();
    switchSection('messages');
    markRead(state.activeConvKey);
    renderConversations();
    renderChatHeader();
    renderChatMessages();
    renderUnreadBadges();
  }

  function openGroupChat(groupId) {
    state.activeConvKey = groupKey(groupId);
    if (!state.db.messages[state.activeConvKey]) state.db.messages[state.activeConvKey] = [];
    saveDB();
    switchSection('messages');
    markRead(state.activeConvKey);
    renderConversations();
    renderChatHeader();
    renderChatMessages();
    renderUnreadBadges();
  }

  /* =========================
     动作：个人资料/头像/主题
  ========================= */
  function onAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // 使用 FileReader 将图片转成 base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result;
      state.currentUser.avatar = base64;
      const user = getUserById(state.currentUser.id);
      if (user) user.avatar = base64;
      saveDB();
      renderProfile();
      els.sidebarAvatar.src = base64;
    };
    reader.readAsDataURL(file);
  }

  function saveProfile() {
    const nickname = els.profileNickname.value.trim();
    const sign = els.profileSign.value.trim();

    state.currentUser.nickname = nickname || state.currentUser.username;
    state.currentUser.sign = sign;

    const user = getUserById(state.currentUser.id);
    if (user) {
      user.nickname = state.currentUser.nickname;
      user.sign = state.currentUser.sign;
    }

    saveDB();
    renderAll();
    alert('个人资料已保存');
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-bs-theme', theme);
  }

  /* =========================
     实时模拟与通知
  ========================= */
  function startRealtimeMock() {
    clearInterval(state.realtimeTimer);

    state.realtimeTimer = setInterval(() => {
      if (!state.currentUser) return;

      const candidates = buildConversationModels().filter((c) => {
        if (c.type === 'group') return c.memberCount > 1;
        return !!c.peerId;
      });
      if (!candidates.length) return;

      const conv = candidates[Math.floor(Math.random() * candidates.length)];
      let senderId = null;

      if (conv.type === 'private') {
        senderId = conv.peerId;
      } else {
        const group = state.db.groups.find((g) => g.id === conv.groupId);
        if (!group) return;
        const others = group.members.filter((m) => m !== state.currentUser.id);
        if (!others.length) return;
        senderId = others[Math.floor(Math.random() * others.length)];
      }

      if (!senderId) return;
      const msg = {
        id: state.db.nextIds.message++,
        senderId,
        text: REPLY_POOL[Math.floor(Math.random() * REPLY_POOL.length)],
        ts: Date.now()
      };

      if (!state.db.messages[conv.key]) state.db.messages[conv.key] = [];
      state.db.messages[conv.key].push(msg);

      const activeAndVisible = state.activeSection === 'messages' && state.activeConvKey === conv.key;
      if (!activeAndVisible) {
        const unreadMap = getUnreadMap();
        unreadMap[conv.key] = (unreadMap[conv.key] || 0) + 1;
      }

      saveDB();

      const sender = getUserById(senderId);
      pushBrowserNotice(sender?.nickname || '新消息', msg.text, activeAndVisible);

      renderConversations();
      if (state.activeConvKey === conv.key && state.activeSection === 'messages') {
        renderChatMessages();
      }
      renderUnreadBadges();
    }, 5000);
  }

  function startOnlineMock() {
    updateOnlineMap();
    clearInterval(state.onlineTimer);
    state.onlineTimer = setInterval(() => {
      updateOnlineMap();
      renderFriendList();
      renderChatHeader();
      renderConversations();
    }, 10000);
  }

  function updateOnlineMap() {
    state.onlineMap = {};
    state.db.users.forEach((u) => {
      if (u.id === state.currentUser?.id) {
        state.onlineMap[u.id] = true;
      } else {
        state.onlineMap[u.id] = Math.random() > 0.45;
      }
    });
  }

  function pushBrowserNotice(title, text, skip) {
    if (skip) return;
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    new Notification(`ChatWave - ${title}`, { body: text });
  }

  /* =========================
     工具函数
  ========================= */
  function ensureActiveConversation() {
    const list = buildConversationModels();
    if (!list.length) {
      state.activeConvKey = null;
      return;
    }

    const exists = list.some((c) => c.key === state.activeConvKey);
    if (!exists) state.activeConvKey = list[0].key;
  }

  function buildConversationModels() {
    if (!state.currentUser) return [];
    const rows = [];

    (state.currentUser.friends || []).forEach((fid) => {
      const friend = getUserById(fid);
      if (!friend) return;
      const key = privateKey(state.currentUser.id, fid);
      const last = getLastMessage(key);
      rows.push({
        key,
        type: 'private',
        peerId: fid,
        title: friend.nickname,
        subtitle: last ? last.text : '点击开始聊天',
        avatar: friend.avatar,
        lastTs: last?.ts || 0,
        lastTime: last ? formatTime(last.ts) : ''
      });
    });

    getMyGroups().forEach((g) => {
      const key = groupKey(g.id);
      const last = getLastMessage(key);
      rows.push({
        key,
        type: 'group',
        groupId: g.id,
        memberCount: g.members.length,
        title: g.name,
        subtitle: last ? last.text : '点击进入群聊',
        avatar: g.avatar,
        lastTs: last?.ts || 0,
        lastTime: last ? formatTime(last.ts) : ''
      });
    });

    return rows.sort((a, b) => b.lastTs - a.lastTs || a.title.localeCompare(b.title));
  }

  function getConversationByKey(key) {
    return buildConversationModels().find((c) => c.key === key) || null;
  }

  function getMyGroups() {
    if (!state.currentUser) return [];
    return state.db.groups.filter((g) => g.members.includes(state.currentUser.id));
  }

  function getLastMessage(key) {
    const arr = state.db.messages[key] || [];
    return arr[arr.length - 1] || null;
  }

  function getUserById(id) {
    return state.db.users.find((u) => u.id === id) || null;
  }

  function refreshCurrentUser() {
    if (!state.currentUser) return;
    state.currentUser = getUserById(state.currentUser.id);
  }

  function privateKey(a, b) {
    const [x, y] = [a, b].sort((m, n) => m - n);
    return `p:${x}:${y}`;
  }

  function groupKey(gid) {
    return `g:${gid}`;
  }

  function markRead(convKey) {
    const map = getUnreadMap();
    map[convKey] = 0;
    saveDB();
  }

  function getUnreadMap() {
    if (!state.currentUser) return {};
    if (!state.db.unread[state.currentUser.id]) state.db.unread[state.currentUser.id] = {};
    return state.db.unread[state.currentUser.id];
  }

  function isOnline(userId) {
    return !!state.onlineMap[userId];
  }

  function formatTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function escapeHTML(str) {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function randomColor() {
    const colors = ['#3ea7ff', '#38c6ac', '#ff9966', '#7b8cff', '#f46ba3'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // 根据昵称生成本地 SVG 头像，避免依赖后端资源
  function makeAvatarDataUri(name, color) {
    const text = (name || '?').slice(0, 1).toUpperCase();
    const svg = `
      <svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'>
        <rect width='100%' height='100%' fill='${color}'/>
        <text x='50%' y='54%' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='96' font-family='Arial'>${text}</text>
      </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }
})();
