document.addEventListener('DOMContentLoaded', async function() {
    // Проверяем, является ли пользователь администратором
    const currentUser = await checkAuthAd();
    if (!currentUser || currentUser.role !== 2) {
        window.location.href = 'index.html';
        return;
    }

    // Элементы страницы
    const ordersList = document.getElementById('orders-list');
    const filterStatus = document.getElementById('filter-status');
    const filterDate = document.getElementById('filter-date');
    const orderEditForm = document.getElementById('order-edit-form');
    const closeEditFormBtn = document.getElementById('close-edit-form');
    const editOrderForm = document.getElementById('edit-order-form');
    const cancelOrderBtn = document.getElementById('cancel-order-btn');
    let currentOrderId = null;
    
    const adminNavLinks = document.querySelectorAll('.admin-nav a');
    
    // Объект для управления вкладками
    const adminContentSections = {
        'orders': document.querySelector('.admin-content'),
        'products': null,
        'categories': null,
        'users': null,
        'statistics': null,
        'settings': null
    };

    // Создаем секцию товаров
    function createProductsSection() {
        const section = document.createElement('div');
        section.className = 'products-section';
        section.style.display = 'none';
        section.innerHTML = `
            <div class="admin-header">
                <h2><i class="fas fa-box-open"></i> Управление товарами</h2>
                <button class="btn" id="add-product-btn">
                    <i class="fas fa-plus"></i> Добавить товар
                </button>
            </div>
            <div class="table-responsive">
                <table class="products-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Изображение</th>
                            <th>Название</th>
                            <th>Цена</th>
                            <th>Категория</th>
                            <th>Остаток</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody id="products-list">
                        <!-- Товары будут загружены через JS -->
                    </tbody>
                </table>
            </div>
            <div id="product-edit-form" style="display: none;">
                <!-- Форма редактирования товара -->
            </div>
        `;
        document.querySelector('.admin-container').appendChild(section);
        return section;
    }

    // Создаем секцию категорий
    function createCategoriesSection() {
        const section = document.createElement('div');
        section.className = 'categories-section';
        section.style.display = 'none';
        section.innerHTML = `
            <div class="admin-header">
                <h2><i class="fas fa-tags"></i> Управление категориями</h2>
                <button class="btn" id="add-category-btn">
                    <i class="fas fa-plus"></i> Добавить категорию
                </button>
            </div>
            <div class="table-responsive">
                <table class="categories-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Название</th>
                            <th>Описание</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody id="categories-list">
                        <!-- Категории будут загружены через JS -->
                    </tbody>
                </table>
            </div>
            <div id="category-edit-form" style="display: none;">
                <!-- Форма редактирования категории -->
            </div>
        `;
        document.querySelector('.admin-container').appendChild(section);
        return section;
    }

    // Создаем секцию пользователей
    function createUsersSection() {
        const section = document.createElement('div');
        section.className = 'users-section';
        section.style.display = 'none';
        section.innerHTML = `
            <div class="admin-header">
                <h2><i class="fas fa-users"></i> Управление пользователями</h2>
                <button class="btn" id="add-user-btn">
                    <i class="fas fa-plus"></i> Добавить пользователя
                </button>
            </div>
            <div class="table-responsive">
                <table class="users-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Имя</th>
                            <th>Телефон</th>
                            <th>Роль</th>
                            <th>Дата регистрации</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody id="users-list">
                        <!-- Пользователи будут загружены через JS -->
                    </tbody>
                </table>
            </div>
            <div id="user-edit-form" style="display: none;">
                <!-- Форма редактирования пользователя -->
            </div>
        `;
        document.querySelector('.admin-container').appendChild(section);
        return section;
    }

    // Создаем секцию статистики
    function createStatisticsSection() {
        const section = document.createElement('div');
        section.className = 'statistics-section';
        section.style.display = 'none';
        section.innerHTML = `
            <div class="admin-header">
                <h2><i class="fas fa-chart-line"></i> Статистика</h2>
                <div class="admin-actions">
                    <select id="stats-period" class="btn">
                        <option value="day">За день</option>
                        <option value="week">За неделю</option>
                        <option value="month" selected>За месяц</option>
                        <option value="year">За год</option>
                    </select>
                </div>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-shopping-bag"></i>
                    </div>
                    <div class="stat-info">
                        <h3 id="total-orders">0</h3>
                        <p>Заказов</p>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-ruble-sign"></i>
                    </div>
                    <div class="stat-info">
                        <h3 id="total-revenue">0 ₽</h3>
                        <p>Выручка</p>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="stat-info">
                        <h3 id="new-users">0</h3>
                        <p>Новых пользователей</p>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-box-open"></i>
                    </div>
                    <div class="stat-info">
                        <h3 id="products-sold">0</h3>
                        <p>Товаров продано</p>
                    </div>
                </div>
            </div>
            
            <div class="stats-charts">
                <div class="chart-container">
                    <canvas id="orders-chart"></canvas>
                </div>
                <div class="chart-container">
                    <canvas id="revenue-chart"></canvas>
                </div>
            </div>
        `;
        document.querySelector('.admin-container').appendChild(section);
        return section;
    }

    // Создаем секцию настроек
    function createSettingsSection() {
        const section = document.createElement('div');
        section.className = 'settings-section';
        section.style.display = 'none';
        section.innerHTML = `
            <div class="admin-header">
                <h2><i class="fas fa-cog"></i> Настройки магазина</h2>
            </div>
            
            <form id="settings-form">
                <div class="order-form-section">
                    <h4>Основные настройки</h4>
                    <div class="input-group">
                        <input type="text" id="store-name" required>
                    </div>
                    <div class="input-group">
                        <input type="text" id="support-phone" required>
                    </div>
                    <div class="input-group">
                        <input type="email" id="support-email" required>
                    </div>
                </div>
                
                <div class="order-form-section">
                    <h4>Настройки доставки</h4>
                    <div class="input-group">
                        <input type="number" id="free-shipping-min" required>
                    </div>
                    <div class="input-group">
                        <input type="number" id="shipping-cost" required>
                    </div>
                </div>
                
                <div class="order-form-section payment-settings">
                    <h4>Настройки оплаты</h4>
                    <div class="payment-option">
                        <input type="checkbox" id="enable-online-payment">
                        <label for="enable-online-payment">Разрешить оплату картой онлайн</label>
                    </div>
                    <div class="payment-option">
                        <input type="checkbox" id="enable-cash-payment">
                        <label for="enable-cash-payment">Разрешить оплату наличными</label>
                    </div>
                    <div class="payment-option">
                        <input type="checkbox" id="enable-courier-payment">
                        <label for="enable-courier-payment">Разрешить оплату картой курьеру</label>
                    </div>
                </div>
                
                <div class="admin-actions" style="margin-top: 30px;">
                    <button type="submit" class="btn btn-large">
                        <i class="fas fa-save"></i> Сохранить настройки
                    </button>
                </div>
            </form>
        `;
        document.querySelector('.admin-container').appendChild(section);
        return section;
    }

    function initTabs() {
        // Создаем все секции
        adminContentSections['products'] = createProductsSection();
        adminContentSections['categories'] = createCategoriesSection();
        adminContentSections['users'] = createUsersSection();
        adminContentSections['statistics'] = createStatisticsSection();
        adminContentSections['settings'] = createSettingsSection();
        
        // Настраиваем обработчики для всех вкладок
        adminNavLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = link.getAttribute('href').substring(1);
                
                // Скрываем все секции
                Object.values(adminContentSections).forEach(section => {
                    if (section) section.style.display = 'none';
                });
                
                // Показываем выбранную секцию
                if (adminContentSections[tab]) {
                    adminContentSections[tab].style.display = 'block';
                    
                    // Загружаем данные для выбранной вкладки
                    switch(tab) {
                        case 'products':
                            loadProducts();
                            break;
                        case 'categories':
                            loadCategories();
                            break;
                        case 'users':
                            loadUsers();
                            break;
                        case 'statistics':
                            loadStatistics();
                            break;
                        case 'settings':
                            loadSettings();
                            break;
                        case 'orders':
                        default:
                            loadOrders();
                            break;
                    }
                }
                
                // Обновляем активную ссылку
                adminNavLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            });
        });
    }

    // Загрузка товаров
    async function loadProducts() {
        try {
            const { data: products, error } = await supabase
                .from('products')
                .select(`
                    id,
                    name,
                    price,
                    image_url,
                    stock,
                    categories:category_id (name)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            renderProducts(products);
        } catch (error) {
            console.error('Ошибка загрузки товаров:', error);
            showProductsError('Не удалось загрузить товары');
        }
    }

    // Отображение товаров в таблице
    function renderProducts(products) {
        const productsList = document.getElementById('products-list');
        if (!productsList) return;

        if (!products || products.length === 0) {
            productsList.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 30px;">
                        <i class="fas fa-box-open" style="font-size: 2rem; color: #ccc; margin-bottom: 15px;"></i>
                        <p>Товары не найдены</p>
                    </td>
                </tr>
            `;
            return;
        }

        productsList.innerHTML = products.map(product => `
            <tr>
                <td>#${product.id.substring(0, 8)}</td>
                <td>
                    ${product.image_url ? 
                        `<img src="${product.image_url}" alt="${product.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">` : 
                        '<i class="fas fa-image" style="font-size: 1.5rem; color: #ccc;"></i>'}
                </td>
                <td>${product.name}</td>
                <td>${formatPrice(product.price)} ₽</td>
                <td>${product.categories?.name || 'Без категории'}</td>
                <td>${product.stock}</td>
                <td>
                    <div class="product-actions">
                        <button class="btn-edit" data-product-id="${product.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-delete" data-product-id="${product.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // Загрузка категорий
    async function loadCategories() {
        try {
            const { data: categories, error } = await supabase
                .from('categories')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            renderCategories(categories);
            return categories;
        } catch (error) {
            console.error('Ошибка загрузки категорий:', error);
            showCategoriesError('Не удалось загрузить категории');
            return [];
        }
    }

    // Отображение категорий в таблице
    function renderCategories(categories) {
        const categoriesList = document.getElementById('categories-list');
        if (!categoriesList) return;

        if (!categories || categories.length === 0) {
            categoriesList.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 30px;">
                        <i class="fas fa-tags" style="font-size: 2rem; color: #ccc; margin-bottom: 15px;"></i>
                        <p>Категории не найдены</p>
                    </td>
                </tr>
            `;
            return;
        }

        categoriesList.innerHTML = categories.map(category => `
            <tr>
                <td>#${category.id.substring(0, 8)}</td>
                <td>${category.name}</td>
                <td>${category.description || '-'}</td>
                <td>
                    <div class="category-actions">
                        <button class="btn-edit" data-category-id="${category.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-delete" data-category-id="${category.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // Загрузка пользователей
    async function loadUsers() {
        try {
            const { data: users, error } = await supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            renderUsers(users);
        } catch (error) {
            console.error('Ошибка загрузки пользователей:', error);
            showUsersError('Не удалось загрузить пользователей');
        }
    }

    // Отображение пользователей в таблице
    function renderUsers(users) {
        const usersList = document.getElementById('users-list');
        if (!usersList) return;

        if (!users || users.length === 0) {
            usersList.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 30px;">
                        <i class="fas fa-users" style="font-size: 2rem; color: #ccc; margin-bottom: 15px;"></i>
                        <p>Пользователи не найдены</p>
                    </td>
                </tr>
            `;
            return;
        }

        usersList.innerHTML = users.map(user => `
            <tr>
                <td>#${user.id.substring(0, 8)}</td>
                <td>${user.name || 'Не указано'}</td>
                <td>${user.phone || 'Не указан'}</td>
                <td>${getRoleText(user.role)}</td>
                <td>${new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                    <div class="user-actions">
                        <button class="btn-edit" data-user-id="${user.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${user.role !== 2 ? `<button class="btn-delete" data-user-id="${user.id}">
                            <i class="fas fa-trash"></i>
                        </button>` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // Получение текста роли
    function getRoleText(role) {
        const roles = {
            0: 'Покупатель',
            1: 'Менеджер',
            2: 'Администратор'
        };
        return roles[role] || role;
    }

    // Загрузка статистики
    async function loadStatistics() {
        try {
            // Получаем текущую дату
            const now = new Date();
            
            // Загружаем статистику заказов
            const { data: orders, error: ordersError } = await supabase
                .from('orders')
                .select('id, total, created_at')
                .gte('created_at', new Date(now.getFullYear(), now.getMonth(), 1).toISOString())
                .lte('created_at', now.toISOString());
                
            if (ordersError) throw ordersError;
            
            // Загружаем статистику пользователей
            const { data: users, error: usersError } = await supabase
                .from('users')
                .select('id, created_at')
                .gte('created_at', new Date(now.getFullYear(), now.getMonth(), 1).toISOString())
                .lte('created_at', now.toISOString());
                
            if (usersError) throw usersError;
            
            // Загружаем статистику товаров
            const { data: orderItems, error: itemsError } = await supabase
                .from('order_items')
                .select('quantity')
                .gte('created_at', new Date(now.getFullYear(), now.getMonth(), 1).toISOString())
                .lte('created_at', now.toISOString());
                
            if (itemsError) throw itemsError;
            
            // Обновляем статистику
            document.getElementById('total-orders').textContent = orders.length;
            document.getElementById('total-revenue').textContent = 
                formatPrice(orders.reduce((sum, order) => sum + order.total, 0)) + ' ₽';
            document.getElementById('new-users').textContent = users.length;
            document.getElementById('products-sold').textContent = 
                orderItems.reduce((sum, item) => sum + item.quantity, 0);
            
            // TODO: Добавить графики с использованием Chart.js
            
        } catch (error) {
            console.error('Ошибка загрузки статистики:', error);
            showStatisticsError('Не удалось загрузить статистику');
        }
    }

    // Загрузка настроек
    async function loadSettings() {
        try {
            // В реальном приложении здесь будет загрузка настроек из базы данных
            // Для примера используем фиктивные данные
            document.getElementById('store-name').value = 'Шестёрочка';
            document.getElementById('support-phone').value = '8 (800) 555-66-77';
            document.getElementById('support-email').value = 'info@shesterocka.ru';
            document.getElementById('free-shipping-min').value = '1000';
            document.getElementById('shipping-cost').value = '200';
            document.getElementById('enable-online-payment').checked = true;
            document.getElementById('enable-cash-payment').checked = true;
            document.getElementById('enable-courier-payment').checked = true;
            
        } catch (error) {
            console.error('Ошибка загрузки настроек:', error);
            alert('Не удалось загрузить настройки');
        }
    }

    // Загрузка заказов
    async function loadOrders(status = '', date = '') {
        try {
            let query = supabase
                .from('orders')
                .select(`
                    id,
                    status,
                    total,
                    created_at,
                    delivery_method,
                    payment_method,
                    delivery_address,
                    delivery_time,
                    delivery_date,
                    user_id,
                    users:user_id (name, phone)
                `)
                .order('created_at', { ascending: false });

            if (status) {
                query = query.eq('status', status);
            }
            
            if (date) {
                const startDate = new Date(date);
                const endDate = new Date(date);
                endDate.setDate(endDate.getDate() + 1);
                
                query = query.gte('created_at', startDate.toISOString())
                             .lt('created_at', endDate.toISOString());
            }

            const { data: orders, error } = await query;

            if (error) throw error;
            renderOrders(orders);
        } catch (error) {
            console.error('Ошибка загрузки заказов:', error);
            showError('Не удалось загрузить заказы');
        }
    }

    // Отображение заказов в таблице
    function renderOrders(orders) {
        if (!orders || orders.length === 0) {
            ordersList.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 30px;">
                        <i class="fas fa-box-open" style="font-size: 2rem; color: #ccc; margin-bottom: 15px;"></i>
                        <p>Заказы не найдены</p>
                    </td>
                </tr>
            `;
            return;
        }

        ordersList.innerHTML = orders.map(order => `
            <tr>
                <td class="order-id">#${order.id.substring(0, 8)}</td>
                <td>${new Date(order.created_at).toLocaleDateString()}</td>
                <td>${order.users?.name || 'Неизвестно'}</td>
                <td>${formatPrice(order.total)} ₽</td>
                <td>
                    <span class="order-status status-${order.status}">
                        ${getStatusText(order.status)}
                    </span>
                </td>
                <td>
                    <div class="order-actions">
                        <button class="btn-edit" data-order-id="${order.id}">
                            <i class="fas fa-edit"></i> Редактировать
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // Получение текста статуса
    function getStatusText(status) {
        const statuses = {
            'pending': 'Ожидает обработки',
            'processing': 'В обработке',
            'assembled': 'Собран',
            'shipped': 'Отправлен',
            'delivered': 'Доставлен',
            'cancelled': 'Отменен'
        };
        return statuses[status] || status;
    }

    // Форматирование цены
    function formatPrice(price) {
        return parseFloat(price).toFixed(2).replace('.', ',');
    }

    // Показать ошибку
    function showError(message) {
        ordersList.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 30px; color: var(--error-color);">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${message}</p>
                    <button class="btn" onclick="location.reload()">Попробовать снова</button>
                </td>
            </tr>
        `;
    }

    function showProductsError(message) {
        const productsList = document.getElementById('products-list');
        if (!productsList) return;

        productsList.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 30px; color: var(--error-color);">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${message}</p>
                    <button class="btn" onclick="location.reload()">Попробовать снова</button>
                </td>
            </tr>
        `;
    }

    function showCategoriesError(message) {
        const categoriesList = document.getElementById('categories-list');
        if (!categoriesList) return;

        categoriesList.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 30px; color: var(--error-color);">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${message}</p>
                    <button class="btn" onclick="location.reload()">Попробовать снова</button>
                </td>
            </tr>
        `;
    }

    function showUsersError(message) {
        const usersList = document.getElementById('users-list');
        if (!usersList) return;

        usersList.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 30px; color: var(--error-color);">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${message}</p>
                    <button class="btn" onclick="location.reload()">Попробовать снова</button>
                </td>
            </tr>
        `;
    }

    function showStatisticsError(message) {
        const section = adminContentSections['statistics'];
        if (!section) return;

        section.innerHTML += `
            <div style="text-align: center; padding: 30px; color: var(--error-color);">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
                <button class="btn" onclick="location.reload()">Попробовать снова</button>
            </div>
        `;
    }

    // Загрузка данных заказа для редактирования
    async function loadOrderForEdit(orderId) {
        try {
            // Загружаем основную информацию о заказе
            const { data: order, error: orderError } = await supabase
                .from('orders')
                .select(`
                    *,
                    users:user_id (name, phone)
                `)
                .eq('id', orderId)
                .single();

            if (orderError) throw orderError;

            // Загружаем товары в заказе
            const { data: orderItems, error: itemsError } = await supabase
                .from('order_items')
                .select(`
                    *,
                    products:product_id (name, image_url)
                `)
                .eq('order_id', orderId);

            if (itemsError) throw itemsError;

            // Заполняем форму
            document.getElementById('edit-customer-name').value = order.users?.name || 'Неизвестно';
            document.getElementById('edit-customer-phone').value = order.users?.phone || 'Нет данных';
            document.getElementById('edit-delivery-method').value = order.delivery_method || 'delivery';
            document.getElementById('edit-delivery-address').value = order.delivery_address || '';
            document.getElementById('edit-delivery-date').value = order.delivery_date ? new Date(order.delivery_date).toISOString().split('T')[0] : '';
            document.getElementById('edit-delivery-time').value = order.delivery_time || '';
            document.getElementById('edit-payment-method').value = order.payment_method || 'card';
            document.getElementById('edit-payment-status').value = order.payment_status || 'pending';
            document.getElementById('edit-order-status').value = order.status || 'pending';
            document.getElementById('edit-admin-comment').value = order.comment || '';
            
            // Заполняем список товаров
            const orderItemsContainer = document.getElementById('edit-order-items');
            orderItemsContainer.innerHTML = orderItems.map(item => `
                <div class="order-item">
                    <div class="order-item-info">
                        <div class="order-item-name">${item.products?.name || 'Неизвестный товар'}</div>
                        <div class="order-item-quantity">${item.quantity} шт. × ${formatPrice(item.price)} ₽</div>
                    </div>
                    <div class="order-item-price">${formatPrice(item.price * item.quantity)} ₽</div>
                </div>
            `).join('');

            // Обновляем итоговую сумму
            document.getElementById('edit-order-total').textContent = `${formatPrice(order.total)} ₽`;

            // Сохраняем ID текущего заказа
            currentOrderId = orderId;

            // Показываем форму
            orderEditForm.style.display = 'block';
            document.querySelector('.table-responsive').style.display = 'none';

        } catch (error) {
            console.error('Ошибка загрузки заказа:', error);
            alert('Не удалось загрузить данные заказа');
        }
    }

    async function updateOrder(orderId, updates) {
        try {
            // Формируем обновления только с существующими полями
            const formattedUpdates = {
                status: updates.status,
                delivery_method: updates.delivery_method,
                delivery_address: updates.delivery_address || null,
                delivery_date: updates.delivery_date || null,
                delivery_time: updates.delivery_time || null,
                payment_method: updates.payment_method,
                // Убрали payment_status, так как его нет в таблице
                comment: updates.comment || null,
                updated_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('orders')
                .update(formattedUpdates)
                .eq('id', orderId)
                .select();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Ошибка обновления заказа:', error);
            throw error;
        }
    }

    // Обработчики событий
    ordersList.addEventListener('click', async (e) => {
        if (e.target.closest('.btn-edit')) {
            const orderId = e.target.closest('.btn-edit').dataset.orderId;
            await loadOrderForEdit(orderId);
        }
    });

    filterStatus.addEventListener('change', () => {
        loadOrders(filterStatus.value, filterDate.value);
    });

    filterDate.addEventListener('change', () => {
        loadOrders(filterStatus.value, filterDate.value);
    });

    closeEditFormBtn.addEventListener('click', () => {
        orderEditForm.style.display = 'none';
        document.querySelector('.table-responsive').style.display = 'block';
        currentOrderId = null;
    });

    editOrderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = editOrderForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Сохранение...';

        try {
            const deliveryDate = document.getElementById('edit-delivery-date').value;
            
            const updates = {
                delivery_method: document.getElementById('edit-delivery-method').value,
                delivery_address: document.getElementById('edit-delivery-address').value,
                delivery_date: deliveryDate ? new Date(deliveryDate).toISOString() : null,
                delivery_time: document.getElementById('edit-delivery-time').value,
                payment_method: document.getElementById('edit-payment-method').value,
                // Убрали payment_status
                status: document.getElementById('edit-order-status').value,
                comment: document.getElementById('edit-admin-comment').value
            };

            await updateOrder(currentOrderId, updates);
            
            await loadOrders(filterStatus.value, filterDate.value);
            orderEditForm.style.display = 'none';
            document.querySelector('.table-responsive').style.display = 'block';
            currentOrderId = null;
            
            alert('Заказ успешно обновлен!');
            
        } catch (error) {
            console.error('Ошибка сохранения:', error);
            alert('Не удалось сохранить изменения: ' + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Сохранить изменения';
        }
    });

    cancelOrderBtn.addEventListener('click', async () => {
        if (!confirm('Вы уверены, что хотите отменить этот заказ?')) return;
        
        try {
            await updateOrder(currentOrderId, {
                status: 'cancelled',
                updated_at: new Date().toISOString()
            });
            
            // Обновляем список заказов
            await loadOrders(filterStatus.value, filterDate.value);
            
            // Закрываем форму
            orderEditForm.style.display = 'none';
            document.querySelector('.table-responsive').style.display = 'block';
            currentOrderId = null;
            
            alert('Заказ успешно отменен!');
            
        } catch (error) {
            console.error('Ошибка отмены заказа:', error);
            alert('Не удалось отменить заказ');
        }
    });

    // Инициализация вкладок
    initTabs();
    
    // Загрузка заказов по умолчанию
    loadOrders();

    // Глобальный обработчик кликов для всех вкладок
    document.addEventListener('click', async (e) => {
        // Обработка товаров
        if (e.target.id === 'add-product-btn') {
            openProductForm();
        }
        
        if (e.target.closest('.btn-edit') && e.target.closest('.btn-edit').dataset.productId) {
            const productId = e.target.closest('.btn-edit').dataset.productId;
            openProductForm(productId);
        }
        
        if (e.target.closest('.btn-delete') && e.target.closest('.btn-delete').dataset.productId) {
            const productId = e.target.closest('.btn-delete').dataset.productId;
            if (confirm('Вы уверены, что хотите удалить этот товар?')) {
                deleteProduct(productId);
            }
        }
        
        // Обработка категорий
        if (e.target.id === 'add-category-btn') {
            openCategoryForm();
        }
        
        if (e.target.closest('.btn-edit') && e.target.closest('.btn-edit').dataset.categoryId) {
            const categoryId = e.target.closest('.btn-edit').dataset.categoryId;
            openCategoryForm(categoryId);
        }
        
        if (e.target.closest('.btn-delete') && e.target.closest('.btn-delete').dataset.categoryId) {
            const categoryId = e.target.closest('.btn-delete').dataset.categoryId;
            if (confirm('Вы уверены, что хотите удалить эту категорию?')) {
                deleteCategory(categoryId);
            }
        }
        
        // Обработка пользователей
        if (e.target.id === 'add-user-btn') {
            openUserForm();
        }
        
        if (e.target.closest('.btn-edit') && e.target.closest('.btn-edit').dataset.userId) {
            const userId = e.target.closest('.btn-edit').dataset.userId;
            openUserForm(userId);
        }
        
        if (e.target.closest('.btn-delete') && e.target.closest('.btn-delete').dataset.userId) {
            const userId = e.target.closest('.btn-delete').dataset.userId;
            if (confirm('Вы уверены, что хотите удалить этого пользователя?')) {
                deleteUser(userId);
            }
        }
    });

    // Функция для удаления товара
    async function deleteProduct(productId) {
        try {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', productId);
                
            if (error) throw error;
            
            // Обновляем список товаров
            await loadProducts();
            
            alert('Товар успешно удален!');
            
        } catch (error) {
            console.error('Ошибка удаления товара:', error);
            alert('Не удалось удалить товар');
        }
    }

    // Функция для удаления категории
    async function deleteCategory(categoryId) {
        try {
            // Сначала проверяем, есть ли товары в этой категории
            const { data: products, error: productsError } = await supabase
                .from('products')
                .select('id')
                .eq('category_id', categoryId)
                .limit(1);
                
            if (productsError) throw productsError;
            
            if (products && products.length > 0) {
                alert('Нельзя удалить категорию, в которой есть товары. Сначала переместите или удалите товары.');
                return;
            }
            
            // Удаляем категорию
            const { error } = await supabase
                .from('categories')
                .delete()
                .eq('id', categoryId);
                
            if (error) throw error;
            
            // Обновляем список категорий
            await loadCategories();
            
            alert('Категория успешно удалена!');
            
        } catch (error) {
            console.error('Ошибка удаления категории:', error);
            alert('Не удалось удалить категорию');
        }
    }

    // Функция для удаления пользователя
    async function deleteUser(userId) {
        try {
            const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', userId);
                
            if (error) throw error;
            
            // Обновляем список пользователей
            await loadUsers();
            
            alert('Пользователь успешно удален!');
            
        } catch (error) {
            console.error('Ошибка удаления пользователя:', error);
            alert('Не удалось удалить пользователя');
        }
    }

    async function openProductForm(productId = null) {
    try {
        console.log('Открытие формы товара...');
        
        // 1. Получаем или создаем контейнер
        const wrapper = document.getElementById('product-form-wrapper');
        if (!wrapper) {
        throw new Error('Контейнер формы не найден');
        }

        // 2. Очищаем и заполняем контейнер
        wrapper.innerHTML = createProductForm();
        wrapper.style.display = 'block';

        // 3. Настраиваем обработчики
        document.getElementById('close-product-form').addEventListener('click', () => {
        wrapper.style.display = 'none';
        });

        // 4. Загружаем категории
        const categories = await loadCategories();
        const select = document.getElementById('edit-product-category');
        if (select) {
        select.innerHTML = categories.map(cat => 
            `<option value="${cat.id}">${cat.name}</option>`
        ).join('');
        }

        // 5. Если редактирование - загружаем данные
        if (productId) {
        const product = await loadProductData(productId);
        fillProductForm(product);
        }

        console.log('Форма успешно открыта');
        
    } catch (error) {
        console.error('Ошибка открытия формы:', error);
        alert('Ошибка: ' + error.message);
    }
    }

    // Вспомогательные функции
    async function loadProductData(id) {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();
    if (error) throw error;
    return data;
    }

    function fillProductForm(product) {
    document.getElementById('edit-product-name').value = product.name || '';
    // Заполните остальные поля
    }

    document.addEventListener('DOMContentLoaded', () => {
    // Проверяем существование контейнера
    if (!document.getElementById('product-form-wrapper')) {
        const container = document.createElement('div');
        container.id = 'product-form-wrapper';
        container.style.display = 'none';
        document.querySelector('.admin-container').appendChild(container);
    }
    
    // Назначаем обработчик кнопки добавления
    document.getElementById('add-product-btn').addEventListener('click', () => {
        openProductForm();
    });
    });

    function createProductForm() {
        const formHTML = `
            <div id="product-edit-form" class="product-form">
            <div class="admin-header">
                <h2><i class="fas fa-edit"></i> Добавление товара</h2>
                <button class="btn" id="close-product-form">
                <i class="fas fa-times"></i> Закрыть
                </button>
            </div>
            <form id="edit-product-form">
                <div class="form-group">
                    <label for="product-name">Название:</label>
                    <input type="text" id="edit-product-name" required>
                </div>
                <div class="input-group">
                                <label>Описание</label>
                                <textarea id="edit-product-description" rows="3"></textarea>
                            </div>
                <button type="submit" class="btn btn-primary">Сохранить</button>
            </form>
            </div>
        `;
        return formHTML;
    }

    function createProductEditForm() {
        const form = document.createElement('div');
        form.id = 'product-edit-form';
        form.style.display = 'none';
        form.innerHTML = `
            <div class="admin-header">
                <h2><i class="fas fa-edit"></i> Редактирование товара</h2>
                <button class="btn" id="close-product-form">
                    <i class="fas fa-times"></i> Закрыть
                </button>
            </div>
            
            <form id="edit-product-form">
                <div class="order-form">
                    <div>
                        <div class="order-form-section">
                            <h4>Основная информация</h4>
                            <div class="input-group">
                                <label>Название товара</label>
                                <input type="text" id="edit-product-name" required>
                            </div>
                            <div class="input-group">
                                <label>Описание</label>
                                <textarea id="edit-product-description" rows="3"></textarea>
                            </div>
                        </div>
                        
                        <div class="order-form-section">
                            <h4>Изображение</h4>
                            <div class="input-group">
                                <label>URL изображения</label>
                                <input type="text" id="edit-product-image">
                            </div>
                            <div class="product-image-preview" id="product-image-preview" style="margin-top: 15px;">
                                <!-- Превью изображения будет здесь -->
                            </div>
                            <button type="button" class="btn" id="upload-image-btn" style="margin-top: 10px;">
                                <i class="fas fa-upload"></i> Загрузить изображение
                            </button>
                        </div>
                    </div>
                    
                    <div>
                        <div class="order-form-section">
                            <h4>Цены и наличие</h4>
                            <div class="input-group">
                                <label>Цена (₽)</label>
                                <input type="number" id="edit-product-price" min="0" step="0.01" required>
                            </div>
                            <div class="input-group">
                                <label>Старая цена (₽)</label>
                                <input type="number" id="edit-product-old-price" min="0" step="0.01">
                            </div>
                            <div class="input-group">
                                <label>Остаток на складе</label>
                                <input type="number" id="edit-product-stock" min="0" required>
                            </div>
                        </div>
                        
                        <div class="order-form-section">
                            <h4>Категория</h4>
                            <div class="input-group">
                                <select id="edit-product-category" required>
                                    <option value="">Выберите категорию</option>
                                    <!-- Категории будут загружены динамически -->
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="admin-actions" style="margin-top: 30px;">
                    <button type="submit" class="btn btn-large">
                        <i class="fas fa-save"></i> Сохранить товар
                    </button>
                    <button type="button" class="btn btn-large" id="delete-product-btn" style="background-color: var(--error-color); display: none;">
                        <i class="fas fa-trash"></i> Удалить товар
                    </button>
                </div>
            </form>
        `;
        return form;
    }

    // Функция для обновления превью изображения
    function updateImagePreview(imageUrl) {
        const previewContainer = document.getElementById('product-image-preview');
        if (!previewContainer) return;
        
        if (imageUrl) {
            previewContainer.innerHTML = `
                <img src="${imageUrl}" alt="Превью" style="max-width: 200px; max-height: 200px; border-radius: 8px;">
            `;
        } else {
            previewContainer.innerHTML = `
                <div style="width: 200px; height: 200px; background: #f5f5f5; display: flex; align-items: center; justify-content: center; border-radius: 8px;">
                    <i class="fas fa-image" style="font-size: 2rem; color: #ccc;"></i>
                </div>
            `;
        }
    }

    // Функция для настройки обработчиков формы товара
    function setupProductFormHandlers() {
        const formContainer = document.getElementById('product-edit-form');
        const closeFormBtn = document.getElementById('close-product-form');
        const editForm = document.getElementById('edit-product-form');
        const deleteBtn = document.getElementById('delete-product-btn');
        const imageUrlInput = document.getElementById('edit-product-image');
        const uploadBtn = document.getElementById('upload-image-btn');
        
        // Закрытие формы
        closeFormBtn.addEventListener('click', () => {
            formContainer.style.display = 'none';
            document.querySelector('.table-responsive').style.display = 'block';
        });
        
        // Изменение URL изображения
        if (imageUrlInput) {
            imageUrlInput.addEventListener('input', () => {
                updateImagePreview(imageUrlInput.value);
            });
        }
        
        // Загрузка изображения (заглушка - в реальном приложении нужно реализовать загрузку на сервер)
        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => {
                alert('В реальном приложении здесь будет загрузка изображения на сервер');
            });
        }
        
        // Сохранение товара
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = editForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Сохранение...';
            
            try {
                const productData = {
                    name: document.getElementById('edit-product-name').value,
                    description: document.getElementById('edit-product-description').value,
                    price: parseFloat(document.getElementById('edit-product-price').value),
                    old_price: parseFloat(document.getElementById('edit-product-old-price').value) || null,
                    stock: parseInt(document.getElementById('edit-product-stock').value),
                    image_url: document.getElementById('edit-product-image').value || null,
                    category_id: document.getElementById('edit-product-category').value,
                    updated_at: new Date().toISOString()
                };
                
                const productId = formContainer.dataset.productId;
                let result;
                
                if (productId) {
                    // Обновление существующего товара
                    const { data, error } = await supabase
                        .from('products')
                        .update(productData)
                        .eq('id', productId)
                        .select();
                        
                    if (error) throw error;
                    result = data;
                } else {
                    // Создание нового товара
                    productData.created_at = new Date().toISOString();
                    const { data, error } = await supabase
                        .from('products')
                        .insert([productData])
                        .select();
                        
                    if (error) throw error;
                    result = data;
                }
                
                // Обновляем список товаров
                await loadProducts();
                
                // Закрываем форму
                formContainer.style.display = 'none';
                document.querySelector('.table-responsive').style.display = 'block';
                
                alert('Товар успешно сохранен!');
                
            } catch (error) {
                console.error('Ошибка сохранения товара:', error);
                alert('Не удалось сохранить товар: ' + error.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-save"></i> Сохранить товар';
            }
        });
        
        // Удаление товара
        deleteBtn.addEventListener('click', async () => {
            const productId = formContainer.dataset.productId;
            if (!productId) return;
            
            if (!confirm('Вы уверены, что хотите удалить этот товар? Это действие нельзя отменить.')) {
                return;
            }
            
            try {
                const { error } = await supabase
                    .from('products')
                    .delete()
                    .eq('id', productId);
                    
                if (error) throw error;
                
                // Обновляем список товаров
                await loadProducts();
                
                // Закрываем форму
                formContainer.style.display = 'none';
                document.querySelector('.table-responsive').style.display = 'block';
                
                alert('Товар успешно удален!');
                
            } catch (error) {
                console.error('Ошибка удаления товара:', error);
                alert('Не удалось удалить товар: ' + error.message);
            }
        });
    }

    // Функция для открытия формы редактирования категории
    async function openCategoryForm(categoryId = null) {
        const formContainer = document.getElementById('category-edit-form');
        const categoriesSection = adminContentSections['categories'];
        
        // Если форма еще не создана, создаем ее
        if (!formContainer) {
            const form = createCategoryEditForm();
            categoriesSection.appendChild(form);
            setupCategoryFormHandlers();
        }
        
        // Если передан ID категории - загружаем ее данные
        if (categoryId) {
            try {
                const { data: category, error } = await supabase
                    .from('categories')
                    .select('*')
                    .eq('id', categoryId)
                    .single();

                if (error) throw error;
                
                // Заполняем форму
                document.getElementById('edit-category-name').value = category.name || '';
                document.getElementById('edit-category-description').value = category.description || '';
                
                // Сохраняем ID текущей категории
                formContainer.dataset.categoryId = categoryId;
                
                // Показываем кнопку удаления
                document.getElementById('delete-category-btn').style.display = 'inline-block';
                
            } catch (error) {
                console.error('Ошибка загрузки категории:', error);
                alert('Не удалось загрузить данные категории');
                return;
            }
        } else {
            // Сброс формы для новой категории
            document.getElementById('edit-category-form').reset();
            formContainer.dataset.categoryId = '';
            document.getElementById('delete-category-btn').style.display = 'none';
        }
        
        // Показываем форму и скрываем таблицу
        formContainer.style.display = 'block';
        document.querySelector('.table-responsive').style.display = 'none';
    }

    // Функция для создания формы редактирования категории
    function createCategoryEditForm() {
        const form = document.createElement('div');
        form.id = 'category-edit-form';
        form.style.display = 'none';
        form.innerHTML = `
            <div class="admin-header">
                <h2><i class="fas fa-edit"></i> ${form.dataset.categoryId ? 'Редактирование' : 'Добавление'} категории</h2>
                <button class="btn" id="close-category-form">
                    <i class="fas fa-times"></i> Закрыть
                </button>
            </div>
            
            <form id="edit-category-form">
                <div class="order-form">
                    <div>
                        <div class="order-form-section">
                            <h4>Основная информация</h4>
                            <div class="input-group">
                                <label>Название категории</label>
                                <input type="text" id="edit-category-name" required>
                            </div>
                            <div class="input-group">
                                <label>Описание</label>
                                <textarea id="edit-category-description" rows="3"></textarea>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="admin-actions" style="margin-top: 30px;">
                    <button type="submit" class="btn btn-large">
                        <i class="fas fa-save"></i> Сохранить категорию
                    </button>
                    <button type="button" class="btn btn-large" id="delete-category-btn" style="background-color: var(--error-color); display: none;">
                        <i class="fas fa-trash"></i> Удалить категорию
                    </button>
                </div>
            </form>
        `;
        return form;
    }

    // Функция для настройки обработчиков формы категории
    function setupCategoryFormHandlers() {
        const formContainer = document.getElementById('category-edit-form');
        const closeFormBtn = document.getElementById('close-category-form');
        const editForm = document.getElementById('edit-category-form');
        const deleteBtn = document.getElementById('delete-category-btn');
        
        // Закрытие формы
        closeFormBtn.addEventListener('click', () => {
            formContainer.style.display = 'none';
            document.querySelector('.table-responsive').style.display = 'block';
        });
        
        // Сохранение категории
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = editForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Сохранение...';
            
            try {
                const categoryData = {
                    name: document.getElementById('edit-category-name').value,
                    description: document.getElementById('edit-category-description').value || null,
                    updated_at: new Date().toISOString()
                };
                
                const categoryId = formContainer.dataset.categoryId;
                let result;
                
                if (categoryId) {
                    // Обновление существующей категории
                    const { data, error } = await supabase
                        .from('categories')
                        .update(categoryData)
                        .eq('id', categoryId)
                        .select();
                        
                    if (error) throw error;
                    result = data;
                } else {
                    // Создание новой категории
                    categoryData.created_at = new Date().toISOString();
                    const { data, error } = await supabase
                        .from('categories')
                        .insert([categoryData])
                        .select();
                        
                    if (error) throw error;
                    result = data;
                }
                
                // Обновляем список категорий
                await loadCategories();
                
                // Закрываем форму
                formContainer.style.display = 'none';
                document.querySelector('.table-responsive').style.display = 'block';
                
                alert('Категория успешно сохранена!');
                
            } catch (error) {
                console.error('Ошибка сохранения категории:', error);
                alert('Не удалось сохранить категорию: ' + error.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-save"></i> Сохранить категорию';
            }
        });
        
        // Удаление категории
        deleteBtn.addEventListener('click', async () => {
            const categoryId = formContainer.dataset.categoryId;
            if (!categoryId) return;
            
            if (!confirm('Вы уверены, что хотите удалить эту категорию? Это действие нельзя отменить.')) {
                return;
            }
            
            try {
                const { error } = await supabase
                    .from('categories')
                    .delete()
                    .eq('id', categoryId);
                    
                if (error) throw error;
                
                // Обновляем список категорий
                await loadCategories();
                
                // Закрываем форму
                formContainer.style.display = 'none';
                document.querySelector('.table-responsive').style.display = 'block';
                
                alert('Категория успешно удалена!');
                
            } catch (error) {
                console.error('Ошибка удаления категории:', error);
                alert('Не удалось удалить категорию: ' + error.message);
            }
        });
    }

    // Функция для открытия формы редактирования пользователя
    async function openUserForm(userId = null) {
        const formContainer = document.getElementById('user-edit-form');
        const usersSection = adminContentSections['users'];
        
        // Если форма еще не создана, создаем ее
        if (!formContainer) {
            const form = createUserEditForm();
            usersSection.appendChild(form);
            setupUserFormHandlers();
        }
        
        // Если передан ID пользователя - загружаем его данные
        if (userId) {
            try {
                const { data: user, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', userId)
                    .single();

                if (error) throw error;
                
                // Заполняем форму
                document.getElementById('edit-user-name').value = user.name || '';
                document.getElementById('edit-user-phone').value = user.phone || '';
                document.getElementById('edit-user-email').value = user.email || '';
                document.getElementById('edit-user-role').value = user.role || 0;
                
                // Сохраняем ID текущего пользователя
                formContainer.dataset.userId = userId;
                
                // Показываем кнопку удаления (если это не администратор)
                document.getElementById('delete-user-btn').style.display = user.role !== 2 ? 'inline-block' : 'none';
                
            } catch (error) {
                console.error('Ошибка загрузки пользователя:', error);
                alert('Не удалось загрузить данные пользователя');
                return;
            }
        } else {
            // Сброс формы для нового пользователя
            document.getElementById('edit-user-form').reset();
            formContainer.dataset.userId = '';
            document.getElementById('delete-user-btn').style.display = 'none';
            document.getElementById('password-section').style.display = 'block';
        }
        
        // Показываем форму и скрываем таблицу
        formContainer.style.display = 'block';
        document.querySelector('.table-responsive').style.display = 'none';
    }

    // Функция для создания формы редактирования пользователя
    function createUserEditForm() {
        const form = document.createElement('div');
        form.id = 'user-edit-form';
        form.style.display = 'none';
        form.innerHTML = `
            <div class="admin-header">
                <h2><i class="fas fa-edit"></i> ${form.dataset.userId ? 'Редактирование' : 'Добавление'} пользователя</h2>
                <button class="btn" id="close-user-form">
                    <i class="fas fa-times"></i> Закрыть
                </button>
            </div>
            
            <form id="edit-user-form">
                <div class="order-form">
                    <div>
                        <div class="order-form-section">
                            <h4>Основная информация</h4>
                            <div class="input-group">
                                <label>Имя</label>
                                <input type="text" id="edit-user-name" required>
                            </div>
                            <div class="input-group">
                                <label>Телефон</label>
                                <input type="tel" id="edit-user-phone" required>
                            </div>
                            <div class="input-group">
                                <label>Email</label>
                                <input type="email" id="edit-user-email">
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <div class="order-form-section">
                            <h4>Роль</h4>
                            <div class="input-group">
                                <select id="edit-user-role" required>
                                    <option value="0">Покупатель</option>
                                    <option value="1">Менеджер</option>
                                    <option value="2">Администратор</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="order-form-section" id="password-section">
                            <h4>Пароль</h4>
                            <div class="input-group">
                                <input type="password" id="edit-user-password" ${form.dataset.userId ? '' : 'required'}>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="admin-actions" style="margin-top: 30px;">
                    <button type="submit" class="btn btn-large">
                        <i class="fas fa-save"></i> Сохранить пользователя
                    </button>
                    <button type="button" class="btn btn-large" id="delete-user-btn" style="background-color: var(--error-color); display: none;">
                        <i class="fas fa-trash"></i> Удалить пользователя
                    </button>
                </div>
            </form>
        `;
        return form;
    }

    // Функция для настройки обработчиков формы пользователя
    function setupUserFormHandlers() {
        const formContainer = document.getElementById('user-edit-form');
        const closeFormBtn = document.getElementById('close-user-form');
        const editForm = document.getElementById('edit-user-form');
        const deleteBtn = document.getElementById('delete-user-btn');
        
        // Закрытие формы
        closeFormBtn.addEventListener('click', () => {
            formContainer.style.display = 'none';
            document.querySelector('.table-responsive').style.display = 'block';
        });
        
        // Сохранение пользователя
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = editForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Сохранение...';
            
            try {
                const userData = {
                    name: document.getElementById('edit-user-name').value,
                    phone: document.getElementById('edit-user-phone').value,
                    email: document.getElementById('edit-user-email').value || null,
                    role: parseInt(document.getElementById('edit-user-role').value),
                    updated_at: new Date().toISOString()
                };
                
                const password = document.getElementById('edit-user-password').value;
                if (password) {
                    userData.password = password;
                }
                
                const userId = formContainer.dataset.userId;
                let result;
                
                if (userId) {
                    // Обновление существующего пользователя
                    const { data, error } = await supabase
                        .from('users')
                        .update(userData)
                        .eq('id', userId)
                        .select();
                        
                    if (error) throw error;
                    result = data;
                } else {
                    // Создание нового пользователя
                    userData.created_at = new Date().toISOString();
                    const { data, error } = await supabase
                        .from('users')
                        .insert([userData])
                        .select();
                        
                    if (error) throw error;
                    result = data;
                }
                
                // Обновляем список пользователей
                await loadUsers();
                
                // Закрываем форму
                formContainer.style.display = 'none';
                document.querySelector('.table-responsive').style.display = 'block';
                
                alert('Пользователь успешно сохранен!');
                
            } catch (error) {
                console.error('Ошибка сохранения пользователя:', error);
                alert('Не удалось сохранить пользователя: ' + error.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-save"></i> Сохранить пользователя';
            }
        });
        
        // Удаление пользователя
        deleteBtn.addEventListener('click', async () => {
            const userId = formContainer.dataset.userId;
            if (!userId) return;
            
            if (!confirm('Вы уверены, что хотите удалить этого пользователя? Это действие нельзя отменить.')) {
                return;
            }
            
            try {
                const { error } = await supabase
                    .from('users')
                    .delete()
                    .eq('id', userId);
                    
                if (error) throw error;
                
                // Обновляем список пользователей
                await loadUsers();
                
                // Закрываем форму
                formContainer.style.display = 'none';
                document.querySelector('.table-responsive').style.display = 'block';
                
                alert('Пользователь успешно удален!');
                
            } catch (error) {
                console.error('Ошибка удаления пользователя:', error);
                alert('Не удалось удалить пользователя: ' + error.message);
            }
        });
    }

    // Обработчик формы настроек
    document.addEventListener('submit', async (e) => {
        if (e.target.id === 'settings-form') {
            e.preventDefault();
            
            const submitBtn = e.target.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Сохранение...';
            
            try {
                // В реальном приложении здесь будет сохранение настроек в базу данных
                // Для примера просто показываем сообщение
                alert('Настройки успешно сохранены!');
                
            } catch (error) {
                console.error('Ошибка сохранения настроек:', error);
                alert('Не удалось сохранить настройки');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-save"></i> Сохранить настройки';
            }
        }
    });

    async function checkAuthAndRenderAvatar() {
        const user = await checkAuth();
        if (user && user.avatar) {
            const headerAvatar = document.getElementById('header-avatar');
            if (headerAvatar) {
                headerAvatar.innerHTML = '';
                headerAvatar.style.backgroundColor = user.avatar_bg || '#74b9ff';
                
                const icon = document.createElement('i');
                icon.className = 'fas ';
                
                switch(user.avatar) {
                    case 'bear': icon.classList.add('fa-paw'); break;
                    case 'cat': icon.classList.add('fa-cat'); break;
                    case 'dog': icon.classList.add('fa-dog'); break;
                    case 'fish': icon.classList.add('fa-fish'); break;
                    case 'kiwi': icon.classList.add('fa-kiwi-bird'); break;
                    case 'frog': icon.classList.add('fa-frog'); break;
                    default: icon.classList.add('fa-user-circle');
                }
                
                headerAvatar.appendChild(icon);
                
                // Добавляем обработчик клика для перехода в профиль
                headerAvatar.addEventListener('click', function(e) {
                    e.preventDefault();
                    window.location.href = 'profile.html';
                });
            }
        }
    }

    // Вызываем функцию при загрузке страницы
    checkAuthAndRenderAvatar();

    const headerAvatar = document.getElementById('header-avatar');
    if (headerAvatar) {
        headerAvatar.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'profile.html';
        });
    }

    // В конец обработчика DOMContentLoaded добавим:
    const userAvatarContainer = document.getElementById('user-avatar-container');
    if (userAvatarContainer) {
        userAvatarContainer.addEventListener('click', function(e) {
            // Перенаправляем только при клике на аватар, а не на всю область
            if (e.target.closest('.header-avatar') || e.target.closest('.user-icon')) {
                e.preventDefault();
                const profileLink = document.getElementById('profile-link');
                window.location.href = profileLink.href;
            }
        });
    }
});

// Проверка авторизации с учетом роли
async function checkAuthAd() {
    const phone = localStorage.getItem('userPhone');
    if (!phone) return null;
    
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('id, phone, name, role')
            .eq('phone', phone)
            .single();
            
        return user || null;
    } catch (error) {
        console.error('Ошибка при проверке авторизации:', error.message);
        return null;
    }
}