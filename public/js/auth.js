document.addEventListener('DOMContentLoaded', function() {
    const authModal = document.getElementById('auth-modal');
    const authLink = document.getElementById('profile-link');
    const closeModal = document.querySelector('.close-modal');
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const loginError = document.getElementById('login-error');
    const registerError = document.getElementById('register-error');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const authForms = document.querySelectorAll('.auth-form');
    
    // Инициализация масок для телефона
    const loginPhoneInput = document.getElementById('login-phone');
    const registerPhoneInput = document.getElementById('register-phone');
    
    if (typeof IMask === 'undefined') {
        console.error('IMask не загружен!');
        return;
    }

    if (loginPhoneInput) {
        IMask(loginPhoneInput, {
            mask: '+{7} (000) 000-00-00',
        });
    }
    
    if (registerPhoneInput) {
        IMask(registerPhoneInput, {
            mask: '+{7} (000) 000-00-00',
        });
    }
    
    // Переключение между вкладками
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            
            tabBtns.forEach(b => b.classList.remove('active'));
            authForms.forEach(form => form.classList.remove('active'));
            
            this.classList.add('active');
            document.getElementById(`${tabId}-form`).classList.add('active');
            
            // Анимация индикатора вкладок
            const indicator = document.querySelector('.tab-indicator');
            const tabIndex = Array.from(tabBtns).indexOf(this);
            indicator.style.transform = `translateX(${tabIndex * 100}%)`;
        });
    });
    
    // Открытие модального окна
    authLink.addEventListener('click', function(e) {
        if (!localStorage.getItem('userPhone')) {
            e.preventDefault();
            document.body.classList.add('modal-open');
            authModal.style.display = 'flex'; // вместо 'block'
            setTimeout(() => {
                authModal.classList.add('show');
            }, 10);
            resetAuthForms();
            document.querySelector('.tab-btn[data-tab="login"]').click();
        }
    });
    
    // Закрытие модального окна
    closeModal.addEventListener('click', closeAuthModal);
    window.addEventListener('click', function(e) {
        if (e.target === authModal) closeAuthModal();
    });
    
    // Обработка входа
    if (loginBtn) {
        loginBtn.addEventListener('click', async function() {
            const phone = loginPhoneInput.value;
            
            if (!phone || phone.includes('_')) {
                loginError.textContent = 'Введите корректный номер телефона';
                return;
            }
            
            try {
                loginError.textContent = '';
                loginBtn.disabled = true;
                loginBtn.textContent = 'Вход...';
                
                // Проверяем, есть ли пользователь
                const { data: user, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('phone', phone)
                    .maybeSingle();
                
                if (error) throw error;
                
                if (!user) {
                    throw new Error('Пользователь не найден. Зарегистрируйтесь.');
                }
                
                // Сохраняем номер телефона
                localStorage.setItem('userPhone', phone);
                localStorage.setItem('userName', user.name); // Добавьте эту строку
                
                // Закрываем модальное окно и обновляем интерфейс
                closeAuthModal();
                updateAuthUI(phone);
                
            } catch (error) {
                loginError.textContent = error.message || 'Ошибка входа';
            } finally {
                loginBtn.disabled = false;
                loginBtn.textContent = 'Продолжить';
            }
        });
    }
    
    // Обработка регистрации
    if (registerBtn) {
        registerBtn.addEventListener('click', async function() {
            const phone = registerPhoneInput.value;
            const name = document.getElementById('register-name').value.trim();
            
            if (!phone || phone.includes('_')) {
                registerError.textContent = 'Введите корректный номер телефона';
                return;
            }
            
            if (!name) {
                registerError.textContent = 'Введите ваше имя';
                return;
            }
            
            try {
                registerError.textContent = '';
                registerBtn.disabled = true;
                registerBtn.textContent = 'Регистрация...';
                
                // Проверяем, не зарегистрирован ли уже пользователь
                const { data: existingUser, error: selectError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('phone', phone)
                    .maybeSingle();
                
                if (selectError) throw selectError;
                
                if (existingUser) {
                    throw new Error('Этот номер уже зарегистрирован');
                }
                
                // Регистрируем нового пользователя
                const { data: newUser, error: insertError } = await supabase
                    .from('users')
                    .insert([{
                        phone: phone,
                        name: name,
                        created_at: new Date().toISOString()
                    }])
                    .select()
                    .single();
                
                if (insertError) throw insertError;
                
                // Сохраняем номер телефона
                localStorage.setItem('userPhone', phone);
                
                // Закрываем модальное окно и обновляем интерфейс
                closeAuthModal();
                updateAuthUI(phone);
                
            } catch (error) {
                registerError.textContent = error.message || 'Ошибка регистрации';
            } finally {
                registerBtn.disabled = false;
                registerBtn.textContent = 'Зарегистрироваться';
            }
        });
    }
    
    // Проверяем авторизацию при загрузке
    const savedPhone = localStorage.getItem('userPhone');
    if (savedPhone) {
        updateAuthUI(savedPhone);
    }
    
    // Функция для закрытия модального окна
    function closeAuthModal() {
        authModal.classList.remove('show');
        setTimeout(() => {
            document.body.classList.remove('modal-open');
            authModal.style.display = 'none';
        }, 300);
        resetAuthForms();
    }
    
    // Функция для сброса форм авторизации
    function resetAuthForms() {
        if (loginPhoneInput) loginPhoneInput.value = '';
        if (registerPhoneInput) registerPhoneInput.value = '';
        if (document.getElementById('register-name')) document.getElementById('register-name').value = '';
        if (loginError) loginError.textContent = '';
        if (registerError) registerError.textContent = '';
    }
    
    // Функция для обновления UI в зависимости от авторизации
    function updateAuthUI(phone) {
        const authLink = document.getElementById('profile-link');
        if (!authLink) return;

        if (phone) {
            // Получаем имя пользователя из localStorage или базы данных
            const userName = localStorage.getItem('userName') || 'Профиль';
            authLink.innerHTML = `<i class="fas fa-user"></i> ${userName}`;
            authLink.href = 'profile.html';
            
            // Обновляем текст в навигации
            document.querySelectorAll('.nav-link').forEach(link => {
                if (link.textContent.includes('Войти')) {
                    link.textContent = userName;
                    link.href = 'profile.html';
                }
            });
        } else {
            authLink.innerHTML = '<i class="fas fa-user"></i> Войти';
            authLink.href = '#';
        }
    }
});