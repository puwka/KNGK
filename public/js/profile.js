document.addEventListener('DOMContentLoaded', async function() {
    const phone = localStorage.getItem('userPhone');
    
    if (!phone) {
        window.location.href = 'index.html';
        return;
    }
    
    // Элементы профиля
    const profileName = document.getElementById('profile-name');
    const profilePhone = document.getElementById('profile-phone');
    const profileAvatar = document.getElementById('profile-avatar');
    const avatarEditBtn = document.getElementById('avatar-edit-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const ordersList = document.getElementById('orders-list');
    const favoritesList = document.getElementById('favorites-list');
    const ordersTabBtn = document.getElementById('orders-tab-btn');
    const favoritesTabBtn = document.getElementById('favorites-tab-btn');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Элементы модального окна аватара
    const avatarModal = document.getElementById('avatar-modal');
    const modalClose = document.getElementById('modal-close');
    const saveAvatarBtn = document.getElementById('save-avatar-btn');
    const cancelAvatarBtn = document.getElementById('cancel-avatar-btn');
    const avatarIcons = document.querySelectorAll('.avatar-icon');
    const colorOptions = document.querySelectorAll('.color-option');

    const headerAvatar = document.getElementById('header-avatar');
    
    let currentUser = null;
    let selectedAvatar = null;
    let selectedColor = null;

    try {
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, name, phone, avatar, avatar_bg')
            .eq('phone', phone)
            .single();
            
        if (userError || !user) {
            throw userError || new Error('Пользователь не найден');
        }

        currentUser = user;
        
        // Заполняем данные профиля
        profileName.textContent = user.name || 'Пользователь';
        profilePhone.textContent = formatPhoneNumber(user.phone);
        renderUserAvatar(user.avatar, user.avatar_bg);
        
        // Загрузка заказов и избранного
        await Promise.all([
            loadUserOrders(user.id),
            loadUserFavorites(user.id)
        ]);
        
        // Инициализация вкладок
        initTabs();
        
    } catch (error) {
        console.error('Ошибка при загрузке профиля:', error);
        showErrorMessage(ordersList, 'Произошла ошибка при загрузке данных');
    }
    
    // Выход из профиля
    logoutBtn.addEventListener('click', function() {
        localStorage.removeItem('userPhone');
        window.location.href = 'index.html';
    });
    
    // Обработчики для кнопок в профиле
    ordersTabBtn.addEventListener('click', (e) => {
        e.preventDefault();
        switchTab('orders');
    });
    
    favoritesTabBtn.addEventListener('click', (e) => {
        e.preventDefault();
        switchTab('favorites');
    });
    
    function initTabs() {
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.dataset.tab;
                switchTab(tabId);
            });
        });
        
        // По умолчанию показываем заказы
        switchTab('orders');
    }
    
    function switchTab(tabId) {
        tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });
        
        tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `${tabId}-tab`);
        });
    }
    
    // Обработчики для смены аватара
    avatarEditBtn.addEventListener('click', openAvatarModal);
    modalClose.addEventListener('click', closeAvatarModal);
    cancelAvatarBtn.addEventListener('click', closeAvatarModal);
    
    saveAvatarBtn.addEventListener('click', async function() {
        if (selectedAvatar && selectedColor) {
            try {
                const { error } = await supabase
                    .from('users')
                    .update({ 
                        avatar: selectedAvatar,
                        avatar_bg: selectedColor 
                    })
                    .eq('id', currentUser.id);
                
                if (error) throw error;
                
                renderUserAvatar(selectedAvatar, selectedColor);
                closeAvatarModal();
            } catch (error) {
                console.error('Ошибка при обновлении аватара:', error);
                alert('Не удалось обновить аватар');
            }
        } else {
            alert('Выберите аватар и цвет фона');
        }
    });
    
    // Выбор иконки аватара
    avatarIcons.forEach(icon => {
        icon.addEventListener('click', function() {
            avatarIcons.forEach(i => i.classList.remove('selected'));
            this.classList.add('selected');
            selectedAvatar = this.dataset.avatar;
        });
    });
    
    // Выбор цвета фона
    colorOptions.forEach(color => {
        color.addEventListener('click', function() {
            colorOptions.forEach(c => c.classList.remove('selected'));
            this.classList.add('selected');
            selectedColor = this.dataset.color;
        });
    });
    
    // Функция для открытия модального окна
    function openAvatarModal() {
        avatarModal.classList.add('active');
        
        // Если у пользователя уже есть аватар, выбираем его в модалке
        if (currentUser.avatar) {
            const avatarIcon = document.querySelector(`.avatar-icon[data-avatar="${currentUser.avatar}"]`);
            if (avatarIcon) {
                avatarIcon.click();
            }
        }
        
        // Если у пользователя уже есть цвет фона, выбираем его в модалке
        if (currentUser.avatar_bg) {
            const colorOption = document.querySelector(`.color-option[data-color="${currentUser.avatar_bg}"]`);
            if (colorOption) {
                colorOption.click();
            } else {
                // Выбираем первый цвет по умолчанию, если текущего нет в списке
                colorOptions[0].click();
            }
        } else {
            // Выбираем первый цвет по умолчанию
            colorOptions[0].click();
        }
    }
    
    // Функция для закрытия модального окна
    function closeAvatarModal() {
        avatarModal.classList.remove('active');
    }
    
    // Функция для отрисовки аватара
    function renderUserAvatar(avatarType, bgColor) {
        // Очищаем аватар в профиле
        profileAvatar.innerHTML = '';
        profileAvatar.style.backgroundColor = bgColor || '#74b9ff';
        
        // Очищаем аватар в шапке
        headerAvatar.innerHTML = '';
        headerAvatar.style.backgroundColor = bgColor || '#74b9ff';
        
        // Создаем иконку для профиля
        const profileIcon = document.createElement('i');
        profileIcon.className = 'fas ';
        
        // Создаем иконку для шапки
        const headerIcon = document.createElement('i');
        headerIcon.className = 'fas ';
        
        switch(avatarType) {
            case 'bear':
                profileIcon.classList.add('fa-paw');
                headerIcon.classList.add('fa-paw');
                break;
            case 'cat':
                profileIcon.classList.add('fa-cat');
                headerIcon.classList.add('fa-cat');
                break;
            case 'dog':
                profileIcon.classList.add('fa-dog');
                headerIcon.classList.add('fa-dog');
                break;
            case 'fish':
                profileIcon.classList.add('fa-fish');
                headerIcon.classList.add('fa-fish');
                break;
            case 'kiwi':
                profileIcon.classList.add('fa-kiwi-bird');
                headerIcon.classList.add('fa-kiwi-bird');
                break;
            case 'frog':
                profileIcon.classList.add('fa-frog');
                headerIcon.classList.add('fa-frog');
                break;
            default:
                profileIcon.classList.add('fa-user-circle');
                headerIcon.classList.add('fa-user-circle');
        }
        
        profileAvatar.appendChild(profileIcon);
        headerAvatar.appendChild(headerIcon);
    }

    
    async function loadUserOrders(userId) {
        try {
            const { data: orders, error } = await supabase
                .from('orders')
                .select(`
                    id,
                    created_at,
                    status,
                    total,
                    delivery_method,
                    order_items:order_items (
                        id,
                        quantity, 
                        price, 
                        products:product_id (id, name, image_url)
                    )
                `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            if (orders && orders.length > 0) {
                renderOrders(orders);
            } else {
                ordersList.innerHTML = `
                    <div class="order-placeholder">
                        <i class="fas fa-clipboard-list"></i>
                        <p>У вас пока нет заказов</p>
                        <a href="catalog.html" class="btn">Перейти в каталог</a>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Ошибка при загрузке заказов:', error);
            showErrorMessage(ordersList, 'Ошибка при загрузке заказов');
        }
    }
    
    async function loadUserFavorites(userId) {
        try {
            const { data: favorites, error } = await supabase
                .from('user_favorite_recipes')
                .select(`
                    recipes:recipe_id (
                        id,
                        title,
                        image_url,
                        cooking_time,
                        difficulty
                    )
                `)
                .eq('user_id', userId);
            
            if (error) throw error;
            
            if (favorites && favorites.length > 0) {
                renderFavorites(favorites.map(f => f.recipes));
            } else {
                favoritesList.innerHTML = `
                    <div class="favorites-placeholder">
                        <i class="fas fa-heart"></i>
                        <p>У вас пока нет избранных рецептов</p>
                        <a href="recipes.html" class="btn">Перейти к рецептам</a>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Ошибка при загрузке избранного:', error);
            showErrorMessage(favoritesList, 'Ошибка при загрузке избранного');
        }
    }
    
    function renderOrders(orders) {
        ordersList.innerHTML = orders.map(order => `
            <div class="order-card">
                <div class="order-header">
                    <div class="order-header-main">
                        <span class="order-id">Заказ #${order.id.split('-')[0]}</span>
                        <span class="order-status ${order.status}">${getStatusText(order.status)}</span>
                        <span class="order-date">${formatDate(order.created_at)}</span>
                    </div>
                    <button class="order-toggle">
                        <i class="fas fa-chevron-down"></i>
                    </button>
                </div>
                
                <div class="order-content">
                    <div class="order-items">
                        ${order.order_items.map(item => `
                            <div class="order-item">
                                <img src="${item.products.image_url || 'img/placeholder.jpg'}" 
                                    alt="${item.products.name}" 
                                    class="order-item-img"
                                    width="50"
                                    height="50">
                                <div class="order-item-info">
                                    <div class="order-item-name">${item.products.name}</div>
                                    <div class="order-item-meta">
                                        <span class="order-item-price">${formatPrice(item.price)} ₽ × ${item.quantity}</span>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="order-footer">
                        <div class="delivery-method">
                            <i class="fas fa-truck"></i> 
                            ${getDeliveryMethodText(order.delivery_method)}
                        </div>
                        <div class="order-actions">
                            <button class="btn btn-outline repeat-order" data-order-id="${order.id}">
                                <i class="fas fa-redo"></i> Повторить заказ
                            </button>
                        </div>
                        <div class="order-total">
                            Итого: ${formatPrice(order.total)} ₽
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
        
        // Добавляем обработчики для сворачивания/разворачивания заказов
        document.querySelectorAll('.order-toggle').forEach(btn => {
            btn.addEventListener('click', function() {
                const card = this.closest('.order-card');
                const content = card.querySelector('.order-content');
                const icon = this.querySelector('i');
                
                content.classList.toggle('active');
                icon.classList.toggle('fa-chevron-down');
                icon.classList.toggle('fa-chevron-up');
            });
        });
        
        // Добавляем обработчики для повторения заказов
        document.querySelectorAll('.repeat-order').forEach(btn => {
            btn.addEventListener('click', async function() {
                const orderId = this.dataset.orderId;
                await repeatOrder(orderId);
            });
        });
    }
    
    function renderFavorites(recipes) {
        favoritesList.innerHTML = recipes.map((recipe, index) => `
            <div class="favorite-card" style="animation-delay: ${index * 0.1}s">
                <div class="favorite-img-container">
                    <img src="${recipe.image_url || 'img/recipe-placeholder.jpg'}" 
                        alt="${recipe.title}" 
                        class="favorite-img">
                    <button class="favorite-remove" data-recipe-id="${recipe.id}">
                        <i class="fas fa-heart"></i>
                    </button>
                </div>
                <div class="favorite-info">
                    <h3 class="favorite-title">${recipe.title}</h3>
                    <div class="favorite-meta">
                        <span class="favorite-time">
                            <i class="fas fa-clock time-icon"></i> ${recipe.cooking_time} мин
                        </span>
                        <span class="favorite-difficulty ${recipe.difficulty === 'детский' ? 'kids' : ''}">
                            <i class="fas fa-signal difficulty-icon"></i> ${recipe.difficulty || 'легкий'}
                        </span>
                    </div>
                    <div class="favorite-actions">
                        <a href="recipe-detail.html?id=${recipe.id}" class="btn-recipe">
                            <i class="fas fa-utensils"></i> Приготовить
                        </a>
                    </div>
                </div>
            </div>
        `).join('');
        
        document.querySelectorAll('.favorite-remove').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const recipeId = btn.dataset.recipeId;
                await removeFromFavorites(currentUser.id, recipeId);
                await loadUserFavorites(currentUser.id);
            });
        });
    }
    
    async function removeFromFavorites(userId, recipeId) {
        try {
            const { error } = await supabase
                .from('user_favorite_recipes')
                .delete()
                .eq('user_id', userId)
                .eq('recipe_id', recipeId);
            
            if (error) throw error;
        } catch (error) {
            console.error('Ошибка при удалении из избранного:', error);
            alert('Не удалось удалить рецепт из избранного');
        }
    }
    
    async function repeatOrder(orderId) {
        try {
            // Получаем данные заказа
            const { data: order, error: orderError } = await supabase
                .from('orders')
                .select(`
                    order_items:order_items (
                        product_id,
                        quantity
                    )
                `)
                .eq('id', orderId)
                .single();
            
            if (orderError) throw orderError;
            
            // Добавляем все товары из заказа в корзину
            for (const item of order.order_items) {
                await addToCart(currentUser.id, item.product_id, item.quantity);
            }
            
            // Обновляем счетчик корзины
            await updateCartCount();
            
            // Переходим в корзину
            window.location.href = 'cart.html';
            
        } catch (error) {
            console.error('Ошибка при повторении заказа:', error);
            alert('Произошла ошибка при добавлении товаров в корзину');
        }
    }
    
    // Вспомогательные функции
    function getStatusText(status) {
        const statuses = {
            'processing': 'В обработке',
            'shipped': 'Отправлен',
            'delivered': 'Доставлен',
            'cancelled': 'Отменен'
        };
        return statuses[status] || status;
    }
    
    function getDeliveryMethodText(method) {
        const methods = {
            'pickup': 'Самовывоз',
            'delivery': 'Доставка курьером'
        };
        return methods[method] || method || 'Не указано';
    }
    
    function formatDate(dateString) {
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        return new Date(dateString).toLocaleDateString('ru-RU', options);
    }
    
    function formatPrice(price) {
        return parseFloat(price).toFixed(2).replace('.', ',');
    }
    
    function formatPhoneNumber(phone) {
        const cleaned = ('' + phone).replace(/\D/g, '');
        const match = cleaned.match(/^(\d{1})(\d{3})(\d{3})(\d{2})(\d{2})$/);
        if (match) {
            return `+${match[1]} (${match[2]}) ${match[3]}-${match[4]}-${match[5]}`;
        }
        return phone;
    }
    
    function showErrorMessage(container, message) {
        container.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
            </div>
        `;
    }

    // В конец обработчика DOMContentLoaded добавим:
    if (headerAvatar) {
        headerAvatar.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'profile.html';
        });
    }
});