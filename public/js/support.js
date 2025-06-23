// Инициализация страницы поддержки
document.addEventListener('DOMContentLoaded', async function() {
    // Инициализация виджета поддержки, если кнопка есть на странице
    if (document.getElementById('support-button')) {
        initSupportWidget();
    }
    
    // Если это страница поддержки (support.html), загружаем интерфейс для агентов поддержки
    if (window.location.pathname.includes('support.html')) {
        await initSupportPage();
    }
});

// Инициализация страницы поддержки для агентов
async function initSupportPage() {
    // Проверка авторизации и роли
    const user = await checkAuth();
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    
    const role = await checkUserRole(user.id);
    // Разрешаем доступ только администраторам (role=2) и поддержке (role=1)
    if (role !== 1 && role !== 2) {
        window.location.href = 'index.html';
        return;
    }
    
    // Элементы интерфейса
    const tabBtns = document.querySelectorAll('.support-tabs .tab-btn');
    const tabIndicator = document.querySelector('.tab-indicator');
    const supportSessions = document.getElementById('support-sessions');
    const supportMessages = document.getElementById('support-messages');
    const supportResponse = document.getElementById('support-response');
    const responseInput = document.getElementById('support-response-input');
    const sendResponseBtn = document.getElementById('send-support-response');
    const closeSessionBtn = document.getElementById('close-session');
    const quickResponses = document.getElementById('quick-responses');
    const searchInput = document.getElementById('support-search');
    
    let currentSessionId = null;
    let activeTab = 'sessions';
    
    // Инициализация вкладок
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            tabBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            activeTab = this.dataset.tab;
            
            // Обновляем индикатор вкладки
            const tabIndex = Array.from(tabBtns).indexOf(this);
            tabIndicator.style.transform = `translateX(${tabIndex * 100}%)`;
            tabIndicator.style.width = `${this.offsetWidth}px`;
            
            // Загружаем соответствующие сессии
            loadSupportSessions();
        });
    });
    
    // Установка начальной позиции индикатора
    const activeTabBtn = document.querySelector('.support-tabs .tab-btn.active');
    if (activeTabBtn) {
        tabIndicator.style.width = `${activeTabBtn.offsetWidth}px`;
    }
    
    // Поиск по обращениям
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const sessions = document.querySelectorAll('.session-card');
            
            sessions.forEach(session => {
                const text = session.textContent.toLowerCase();
                if (text.includes(searchTerm)) {
                    session.style.display = 'block';
                } else {
                    session.style.display = 'none';
                }
            });
        });
    }
    
    // Быстрые ответы
    if (quickResponses) {
        quickResponses.addEventListener('change', function() {
            if (this.value) {
                responseInput.value = this.value;
                this.value = '';
            }
        });
    }
    
    // Загрузка сессий поддержки
    async function loadSupportSessions() {
        try {
            let query = supabase
                .from('support_sessions')
                .select(`
                    id,
                    created_at,
                    updated_at,
                    status,
                    user_id,
                    users:user_id (name, phone),
                    assigned_to,
                    support_agents:assigned_to (name)
                `)
                .order('updated_at', { ascending: false });
                
            if (activeTab === 'sessions') {
                query = query.in('status', ['open', 'pending']);
            } else {
                query = query.eq('status', 'closed');
            }
            
            const { data: sessions, error } = await query;
            
            if (error) throw error;
            
            if (sessions.length === 0) {
                supportSessions.innerHTML = `
                    <div class="no-sessions">
                        <i class="fas fa-comments"></i>
                        <p>${activeTab === 'sessions' ? 'Нет активных обращений' : 'Нет закрытых обращений'}</p>
                    </div>
                `;
                return;
            }
            
            supportSessions.innerHTML = sessions.map(session => `
                <div class="session-card" data-session-id="${session.id}" data-status="${session.status}">
                    <div class="session-header">
                        <span class="session-user">${session.users?.name || 'Аноним'}</span>
                        <span class="session-date">${formatDate(session.updated_at)}</span>
                    </div>
                    <div class="session-preview">${getSessionPreview(session.status)}</div>
                    <div class="session-meta">
                        <span class="session-status status-${session.status}">${getStatusText(session.status)}</span>
                        ${session.assigned_to ? `<span class="session-assigned">${session.support_agents?.name || 'Вы'}</span>` : ''}
                    </div>
                </div>
            `).join('');
            
            // Добавляем обработчики событий для выбора сессии
            document.querySelectorAll('.session-card').forEach(card => {
                card.addEventListener('click', async function() {
                    const sessionId = this.dataset.sessionId;
                    currentSessionId = sessionId;
                    
                    // Убираем выделение у всех карточек и добавляем текущей
                    document.querySelectorAll('.session-card').forEach(c => 
                        c.classList.remove('active'));
                    this.classList.add('active');
                    
                    // Загружаем сообщения сессии
                    await loadSessionMessages(sessionId);
                    
                    // Показываем форму ответа
                    supportResponse.style.display = 'block';
                    
                    // Если сессия новая, назначаем её текущему пользователю
                    if (this.dataset.status === 'open') {
                        await supabase
                            .from('support_sessions')
                            .update({ 
                                status: 'pending',
                                assigned_to: user.id,
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', sessionId);
                        
                        // Обновляем UI
                        this.dataset.status = 'pending';
                        const statusElement = this.querySelector('.session-status');
                        statusElement.className = 'session-status status-pending';
                        statusElement.textContent = getStatusText('pending');
                        
                        // Добавляем метку о назначении
                        const metaElement = this.querySelector('.session-meta');
                        if (metaElement) {
                            metaElement.innerHTML += `<span class="session-assigned">Вы</span>`;
                        }
                    }
                });
            });
        } catch (error) {
            console.error('Ошибка при загрузке сессий:', error);
            supportSessions.innerHTML = `
                <div class="no-sessions error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Ошибка загрузки обращений</p>
                </div>
            `;
        }
    }
    
    // Загрузка сообщений сессии
    async function loadSessionMessages(sessionId) {
        try {
            const { data: messages, error } = await supabase
                .from('support_messages')
                .select('*')
                .eq('session_id', sessionId)
                .order('created_at', { ascending: true });
                
            if (error) throw error;
            
            // Очищаем контейнер сообщений
            supportMessages.innerHTML = '';
            
            if (messages.length === 0) {
                supportMessages.innerHTML = `
                    <div class="no-messages">
                        <i class="fas fa-comment-alt"></i>
                        <p>Нет сообщений в этом обращении</p>
                    </div>
                `;
                return;
            }
            
            messages.forEach(msg => {
                let messageClass = 'message-bot';
                if (!msg.is_bot) {
                    messageClass = msg.sender_id === user.id ? 'message-support' : 'message-user';
                }
                
                const messageDiv = document.createElement('div');
                messageDiv.className = `message ${messageClass}`;
                messageDiv.innerHTML = `
                    <div class="message-content">${msg.message}</div>
                    <span class="message-time">${formatTime(msg.created_at)}</span>
                `;
                supportMessages.appendChild(messageDiv);
            });
            
            // Прокручиваем вниз
            supportMessages.scrollTop = supportMessages.scrollHeight;
            
            // Помечаем сообщения как прочитанные
            await markMessagesAsRead(sessionId, user.id);
        } catch (error) {
            console.error('Ошибка при загрузке сообщений:', error);
            supportMessages.innerHTML = `
                <div class="no-messages error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Ошибка загрузки сообщений</p>
                </div>
            `;
        }
    }
    
    // Пометить сообщения как прочитанные
    async function markMessagesAsRead(sessionId, userId) {
        try {
            const { error } = await supabase
                .from('support_messages')
                .update({ read_at: new Date().toISOString() })
                .eq('session_id', sessionId)
                .is('read_at', null)
                .neq('sender_id', userId);
                
            if (error) throw error;
        } catch (error) {
            console.error('Ошибка при обновлении статуса сообщений:', error);
        }
    }
    
    // Отправка ответа поддержки
    if (sendResponseBtn) {
        sendResponseBtn.addEventListener('click', async function() {
            const message = responseInput.value.trim();
            if (!message || !currentSessionId) return;
            
            try {
                sendResponseBtn.disabled = true;
                sendResponseBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправка...';
                
                // Сохраняем сообщение
                const { error } = await supabase
                    .from('support_messages')
                    .insert([{
                        session_id: currentSessionId,
                        sender_id: user.id,
                        message: message,
                        is_bot: false,
                        read_at: new Date().toISOString() // Помечаем как прочитанное сразу
                    }]);
                    
                if (error) throw error;
                
                // Обновляем время сессии
                await supabase
                    .from('support_sessions')
                    .update({ 
                        status: 'pending',
                        updated_at: new Date().toISOString(),
                        assigned_to: user.id // Назначаем текущего пользователя, если ещё не назначен
                    })
                    .eq('id', currentSessionId);
                
                // Очищаем поле ввода
                responseInput.value = '';
                
                // Перезагружаем сообщения
                await loadSessionMessages(currentSessionId);
                
                // Обновляем список сессий
                loadSupportSessions();
                
            } catch (error) {
                console.error('Ошибка при отправке ответа:', error);
                showError('Произошла ошибка при отправке ответа');
            } finally {
                sendResponseBtn.disabled = false;
                sendResponseBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Отправить';
            }
        });
    }
    
    // Закрытие сессии
    if (closeSessionBtn) {
        closeSessionBtn.addEventListener('click', async function() {
            if (!currentSessionId) return;
            
            if (!confirm('Вы уверены, что хотите закрыть это обращение?')) return;
            
            try {
                closeSessionBtn.disabled = true;
                closeSessionBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Закрытие...';
                
                // Обновляем статус сессии
                await supabase
                    .from('support_sessions')
                    .update({ 
                        status: 'closed',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', currentSessionId);
                
                // Обновляем интерфейс
                const activeCard = document.querySelector('.session-card.active');
                if (activeCard) {
                    activeCard.dataset.status = 'closed';
                    const statusElement = activeCard.querySelector('.session-status');
                    statusElement.className = 'session-status status-closed';
                    statusElement.textContent = getStatusText('closed');
                }
                
                // Скрываем форму ответа
                supportResponse.style.display = 'none';
                
                // Обновляем список сессий
                loadSupportSessions();
                
            } catch (error) {
                console.error('Ошибка при закрытии сессии:', error);
                showError('Произошла ошибка при закрытии сессии');
            } finally {
                closeSessionBtn.disabled = false;
                closeSessionBtn.innerHTML = '<i class="fas fa-lock"></i> Закрыть обращение';
            }
        });
    }
    
    // Начальная загрузка
    loadSupportSessions();
    
    // Реализация в реальном времени с Supabase
    const subscription = supabase
        .channel('support-messages')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'support_messages'
        }, payload => {
            if (payload.new.session_id === currentSessionId) {
                loadSessionMessages(currentSessionId);
            }
            loadSupportSessions(); // Обновляем список сессий при новых сообщениях
        })
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'support_sessions'
        }, payload => {
            loadSupportSessions(); // Обновляем список сессий при изменениях
        })
        .subscribe();
}

// Инициализация виджета поддержки
function initSupportWidget() {
    const supportButton = document.getElementById('support-button');
    const supportChat = document.getElementById('support-chat');
    const closeChat = document.getElementById('close-chat');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const sendMessage = document.getElementById('send-message');
    const chatStatus = document.getElementById('chat-status');
    
    let currentSessionId = null;
    let isSupportOnline = true; // В реальном приложении нужно проверять статус
    
    // Открытие/закрытие чата
    supportButton.addEventListener('click', function() {
        supportChat.classList.toggle('active');
        if (supportChat.classList.contains('active')) {
            initSupportChat();
        }
    });
    
    closeChat.addEventListener('click', function() {
        supportChat.classList.remove('active');
    });
    
    // Отправка сообщения
    sendMessage.addEventListener('click', async function() {
        await sendChatMessage();
    });
    
    chatInput.addEventListener('keypress', async function(e) {
        if (e.key === 'Enter') {
            await sendChatMessage();
        }
    });
    
    async function initSupportChat() {
        const user = await checkAuth();
        if (!user) {
            renderBotMessage('Для общения с поддержкой необходимо войти в систему.');
            return;
        }
        
        // Проверяем активную сессию
        const { data: activeSession, error } = await supabase
            .from('support_sessions')
            .select('*')
            .eq('user_id', user.id)
            .in('status', ['open', 'pending'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
            
        if (error) {
            console.error('Ошибка при загрузке сессии:', error);
            return;
        }
        
        if (activeSession) {
            currentSessionId = activeSession.id;
            loadChatMessages(currentSessionId);
            updateChatStatus(activeSession.status);
        } else {
            renderBotMessage('Здравствуйте! Чем я могу вам помочь?');
        }
    }
    
    async function sendChatMessage() {
        const message = chatInput.value.trim();
        if (!message) return;
        
        const user = await checkAuth();
        if (!user) {
            renderBotMessage('Для общения с поддержкой необходимо войти в систему.');
            return;
        }
        
        // Добавляем сообщение пользователя в чат
        addMessageToChat(message, 'user', user.id);
        chatInput.value = '';
        
        // Если нет активной сессии, создаем новую
        if (!currentSessionId) {
            const { data: newSession, error } = await supabase
                .from('support_sessions')
                .insert([{
                    user_id: user.id,
                    status: 'open'
                }])
                .select()
                .single();
                
            if (error) {
                console.error('Ошибка при создании сессии:', error);
                return;
            }
            
            currentSessionId = newSession.id;
        }
        
        // Сохраняем сообщение в базу
        const { error: messageError } = await supabase
            .from('support_messages')
            .insert([{
                session_id: currentSessionId,
                sender_id: user.id,
                message: message,
                is_bot: false
            }]);
            
        if (messageError) {
            console.error('Ошибка при сохранении сообщения:', messageError);
            return;
        }
        
        // Получаем ответ бота
        const botResponse = await getBotResponse(message);
        if (botResponse) {
            // Добавляем задержку для имитации "печатания"
            setTimeout(async () => {
                renderBotMessage(botResponse);
                
                // Сохраняем ответ бота в базу
                await supabase
                    .from('support_messages')
                    .insert([{
                        session_id: currentSessionId,
                        sender_id: null,
                        message: botResponse,
                        is_bot: true
                    }]);
            }, 1000);
        } else {
            // Если бот не нашел ответ, меняем статус на "ожидание ответа поддержки"
            await supabase
                .from('support_sessions')
                .update({ status: 'pending' })
                .eq('id', currentSessionId);
                
            updateChatStatus('pending');
            renderBotMessage('Ваш вопрос передан специалисту. Ожидайте ответа.');
        }
    }
    
    async function getBotResponse(message) {
        // Преобразуем сообщение в нижний регистр для поиска ключевых слов
        const lowerMessage = message.toLowerCase();
        
        // Получаем возможные ответы из базы
        const { data: responses, error } = await supabase
            .from('bot_responses')
            .select('*')
            .order('priority', { ascending: false });
            
        if (error) {
            console.error('Ошибка при загрузке ответов бота:', error);
            return null;
        }
        
        // Ищем подходящий ответ
        for (const response of responses) {
            if (lowerMessage.includes(response.keyword.toLowerCase())) {
                return response.response;
            }
        }
        
        // Если не нашли подходящего ответа
        return null;
    }
    
    function addMessageToChat(message, sender, senderId = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${sender}`;
        messageDiv.textContent = message;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    function renderBotMessage(message) {
        addMessageToChat(message, 'bot');
    }
    
    async function loadChatMessages(sessionId) {
        const { data: messages, error } = await supabase
            .from('support_messages')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true });
            
        if (error) {
            console.error('Ошибка при загрузке сообщений:', error);
            return;
        }
        
        chatMessages.innerHTML = '';
        
        messages.forEach(msg => {
            const senderClass = msg.is_bot ? 'bot' : (msg.sender_id ? 'user' : 'support');
            addMessageToChat(msg.message, senderClass, msg.sender_id);
        });
    }
    
    function updateChatStatus(status) {
        if (status === 'open') {
            chatStatus.textContent = 'Онлайн';
            chatStatus.style.color = '#2E7D32';
        } else if (status === 'pending') {
            chatStatus.textContent = 'Ожидание ответа';
            chatStatus.style.color = '#E65100';
        } else {
            chatStatus.textContent = 'Закрыт';
            chatStatus.style.color = '#666';
        }
    }
};

// Проверка роли пользователя
async function checkUserRole(userId) {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('role')
            .eq('id', userId)
            .single();
            
        if (error) throw error;
        
        return user.role;
    } catch (error) {
        console.error('Ошибка при проверке роли:', error);
        return null;
    }
}

// Вспомогательные функции
function getStatusText(status) {
    switch(status) {
        case 'open': return 'Новый';
        case 'pending': return 'В обработке';
        case 'closed': return 'Закрыт';
        default: return status;
    }
}

function getSessionPreview(status) {
    switch(status) {
        case 'open': return 'Новое обращение';
        case 'pending': return 'Ожидает ответа';
        case 'closed': return 'Закрытое обращение';
        default: return '';
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showError(message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(errorElement);
    
    setTimeout(() => {
        errorElement.classList.add('fade-out');
        setTimeout(() => errorElement.remove(), 500);
    }, 3000);
}