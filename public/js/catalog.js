document.addEventListener('DOMContentLoaded', async function() {
    // Элементы страницы
    const productsContainer = document.getElementById('catalog-products');
    const categoryBtns = document.querySelectorAll('.category-btn');
    const sortSelect = document.getElementById('sort-select');
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const pageInfo = document.getElementById('page-info');
    const productModal = document.getElementById('product-modal');
    const productModalClose = productModal.querySelector('.product-modal-close');
    const loginBtn = document.getElementById('login-btn');
    
    // Параметры пагинации
    let currentPage = 1;
    const itemsPerPage = 12;
    let totalProducts = 0;
    let currentCategory = 'all';
    let currentSort = 'popular';
    let currentSearch = '';

    function getUrlParams() {
        const params = new URLSearchParams(window.location.search);
        return {
            category: params.get('category') || 'all'
        };
    }
    
    // Проверяем подключение к Supabase
    if (!window.supabase) {
        console.error('Supabase не инициализирован!');
        showError('Ошибка подключения к базе данных');
        return;
    }

    if (loginBtn) {
        loginBtn.addEventListener('click', async function() {
            const phone = phoneInput.value;
            
            if (!phone || phone.includes('_')) {
                authError.textContent = 'Введите корректный номер телефона';
                return;
            }
            
            try {
                authError.textContent = '';
                loginBtn.disabled = true;
                loginBtn.textContent = 'Вход...';
                
                // Сохраняем номер телефона (имитация входа)
                localStorage.setItem('userPhone', phone);
                
                // Закрываем модальное окно и обновляем интерфейс
                authModal.style.display = 'none';
                const updatedUser = await checkAuth(); // Проверяем снова
                updateAuthUI(updatedUser);
                
            } catch (error) {
                authError.textContent = error.message || 'Ошибка входа';
            } finally {
                loginBtn.disabled = false;
                loginBtn.textContent = 'Войти';
            }
        });
    }

    // Инициализация страницы
    async function loadProducts() {
        try {
            // Показываем скелетоны загрузки
            showSkeletons();
            
            // Проверяем авторизацию и обновляем UI
            const user = await checkAuth();
            await updateAuthUI(user);
            
            // Получаем параметры из URL
            const urlParams = new URLSearchParams(window.location.search);
            const categoryParam = urlParams.get('category');
            
            // Если есть параметр category в URL, устанавливаем текущую категорию
            if (categoryParam && categoryParam !== 'all') {
                // Создаем карту соответствия параметров URL и ID категорий
                const categoryMap = {
                    'fruits': '8b2c25b7-ae52-4074-b006-3cc5a5af7228',
                    'vegetables': '8b2c25b7-ae52-4074-b006-3cc5a5af7228',
                    'dairy': '77b86d2a-4a51-4bf4-958e-e9115419ca80',
                    'meat': '12d64d5f-f9ab-47d3-ae5b-dcc6e0cfe703',
                    'bakery': '2a26625a-8aa0-4e71-996b-98a8630ec604',
                    'beverages': 'a30c4060-5fa1-4f65-997c-05cc50b2d399'
                };
                
                // Получаем ID категории по параметру URL
                const categoryId = categoryMap[categoryParam] || categoryParam;
                
                // Находим соответствующую кнопку категории и активируем ее
                const categoryBtn = document.querySelector(`.category-btn[data-category="${categoryId}"]`);
                if (categoryBtn) {
                    currentCategory = categoryId;
                    document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
                    categoryBtn.classList.add('active');
                }
            }
            
            // Формируем базовый запрос
            let query = supabase
                .from('products')
                .select('*', { count: 'exact' })
                .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);
            
            // Фильтрация по категории
            if (currentCategory !== 'all') {
                query = query.eq('category_id', currentCategory);
            }
            
            // Поиск
            if (currentSearch) {
                query = query.ilike('name', `%${currentSearch}%`);
            }
            
            // Сортировка
            switch(currentSort) {
                case 'price_asc':
                    query = query.order('price', { ascending: true });
                    break;
                case 'price_desc':
                    query = query.order('price', { ascending: false });
                    break;
                case 'newest':
                    query = query.order('created_at', { ascending: false });
                    break;
                default:
                    query = query.order('id', { ascending: true });
            }
            
            // Выполняем запрос
            const { data: products, count, error } = await query;
            
            if (error) throw error;
            
            // Обрабатываем результаты
            if (!products || products.length === 0) {
                renderProducts([]);
                return;
            }
            
            // Обновляем данные пагинации
            totalProducts = count;
            renderProducts(products);
            updatePagination();
            
        } catch (error) {
            console.error('Ошибка загрузки товаров:', error);
            showError('Не удалось загрузить товары. Пожалуйста, попробуйте позже.');
        } finally {
            // Обновляем счетчик корзины после загрузки товаров
            await updateCartCounter();
        }
    }

    async function updateAuthUI(user) {
        const userAvatarContainer = document.getElementById('user-avatar-container');
        const profileLink = document.getElementById('profile-link');
        
        if (user) {
            // Добавляем аватар для авторизованного пользователя
            let avatarHtml = '';
            if (user.avatar) {
                avatarHtml = `
                    <div class="header-avatar" style="background-color: ${user.avatar_bg || '#74b9ff'}">
                        <i class="fas ${getAvatarIconClass(user.avatar)}"></i>
                    </div>
                `;
            } else {
                // Если у пользователя нет аватара, используем стандартную иконку
                avatarHtml = `
                    <div class="header-avatar" style="background-color: #74b9ff">
                        <i class="fas fa-user"></i>
                    </div>
                `;
            }
            
            // Вставляем аватар перед ссылкой профиля
            profileLink.insertAdjacentHTML('beforebegin', avatarHtml);
            userAvatarContainer.classList.add('has-avatar');
            profileLink.href = 'profile.html';
            
            // Проверяем роль пользователя
            const role = await checkUserRole(user.id);
            
            // Удаляем старые ссылки на админ-панель и поддержку, если они есть
            document.querySelectorAll('.admin-link, .support-link').forEach(el => el.remove());
            
            // Показываем ссылку на админ-панель для администраторов (role=2)
            if (role === 2) {
                const adminLink = document.createElement('a');
                adminLink.href = 'admin.html';
                adminLink.className = 'nav-link admin-link';
                adminLink.innerHTML = '<i class="fas fa-cog"></i> Админ';
                
                const nav = document.querySelector('nav');
                if (nav) nav.appendChild(adminLink);
            }
            
            // Показываем ссылку на поддержку для поддержки (role=1) и администраторов (role=2)
            if (role === 1 || role === 2) {
                const supportLink = document.createElement('a');
                supportLink.href = 'support.html';
                supportLink.className = 'nav-link support-link';
                supportLink.innerHTML = '<i class="fas fa-headset"></i> Поддержка';
                
                const nav = document.querySelector('nav');
                if (nav) nav.appendChild(supportLink);
            }
            
            // Обновляем счетчик корзины
            await updateCartCounter();
        } else {
            // Для неавторизованных пользователей
            const headerAvatar = userAvatarContainer.querySelector('.header-avatar');
            if (headerAvatar) {
                headerAvatar.remove();
            }
            userAvatarContainer.classList.remove('has-avatar');
            profileLink.href = '#';
            document.querySelector('.cart-count').textContent = '0';
        }
    }

    // Вспомогательная функция для получения класса иконки аватара
    function getAvatarIconClass(avatarType) {
        switch(avatarType) {
            case 'bear': return 'fa-paw';
            case 'cat': return 'fa-cat';
            case 'dog': return 'fa-dog';
            case 'fish': return 'fa-fish';
            case 'kiwi': return 'fa-kiwi-bird';
            case 'frog': return 'fa-frog';
            default: return 'fa-user-circle';
        }
    }
    
    function renderProducts(products) {
        if (!products || products.length === 0) {
            productsContainer.innerHTML = `
                <div class="no-products">
                    <i class="fas fa-search"></i>
                    <h3>Товары не найдены</h3>
                    <p>Попробуйте изменить параметры поиска</p>
                </div>
            `;
            return;
        }
        
        productsContainer.innerHTML = products.map(product => `
            <div class="product-card">
                ${product.discount ? `<div class="product-badge">-${product.discount}%</div>` : ''}
                <div class="product-image">
                    <img src="${getProductImage(product)}" alt="${product.name}" loading="lazy">
                </div>
                <div class="product-info">
                    <h3>${product.name}</h3>
                    ${product.weight ? `<div class="product-weight">${product.weight}</div>` : ''}
                    <div class="product-price">
                        ${product.old_price ? `
                            <div>
                                <span class="price-old">${formatPrice(product.old_price)} ₽</span>
                                <span class="price-current">${formatPrice(product.price)} ₽</span>
                            </div>
                            <span class="price-discount">-${calculateDiscount(product.old_price, product.price)}%</span>
                        ` : `
                            <span class="price-current">${formatPrice(product.price)} ₽</span>
                        `}
                    </div>
                    <button class="add-to-cart" data-product-id="${product.id}">
                        <i class="fas fa-cart-plus"></i> В корзину
                    </button>
                </div>
            </div>
        `).join('');
    }

    function calculateDiscount(oldPrice, newPrice) {
        return Math.round((1 - newPrice / oldPrice) * 100);
    }

    function getProductImage(product) {
        if (product.image_url) {
            return product.image_url;
        }
        
        const categoryImages = {
            '8b2c25b7-ae52-4074-b006-3cc5a5af7228': 'img/products/fruits.jpg', // Овощи и фрукты
            '12d64d5f-f9ab-47d3-ae5b-dcc6e0cfe703': 'img/products/meat.jpg', // Мясо и рыба
            '77b86d2a-4a51-4bf4-958e-e9115419ca80': 'img/products/dairy.jpg', // Молочные продукты
            '2a26625a-8aa0-4e71-996b-98a8630ec604': 'img/products/groats.jpg', // Бакалея
            'a30c4060-5fa1-4f65-997c-05cc50b2d399': 'img/products/beverages.jpg' // Напитки
        };
        
        return categoryImages[product.category_id] || 'img/placeholder.jpg';
    }
    
    function showError(message) {
        productsContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
                <button class="btn" onclick="location.reload()">Попробовать снова</button>
            </div>
        `;
    }
    
    function showSkeletons() {
        productsContainer.innerHTML = `
            <div class="product-card skeleton">
                <div class="product-image"></div>
                <div class="product-info">
                    <h3></h3>
                    <p></p>
                    <div class="product-price"></div>
                    <button class="add-to-cart"></button>
                </div>
            </div>
        `.repeat(6);
    }
    
    function updatePagination() {
        pageInfo.textContent = `Страница ${currentPage}`;
        prevPageBtn.disabled = currentPage <= 1;
        nextPageBtn.disabled = currentPage * itemsPerPage >= totalProducts;
    }
    
    function formatPrice(price) {
        return parseFloat(price).toFixed(2).replace('.', ',');
    }
    
    // Обработчики событий
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            categoryBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentCategory = this.dataset.category;
            currentPage = 1;
            loadProducts();
        });
    });

    sortSelect.addEventListener('change', function() {
        currentSort = this.value;
        currentPage = 1;
        loadProducts();
    });

    searchBtn.addEventListener('click', function() {
        currentSearch = searchInput.value.trim();
        currentPage = 1;
        loadProducts();
    });

    prevPageBtn.addEventListener('click', function() {
        if (currentPage > 1) {
            currentPage--;
            loadProducts();
        }
    });

    nextPageBtn.addEventListener('click', function() {
        if (currentPage * itemsPerPage < totalProducts) {
            currentPage++;
            loadProducts();
        }
    });

    // Обработчики фильтрации по категориям
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // Удаляем активный класс у всех кнопок
            document.querySelectorAll('.category-btn').forEach(b => {
                b.classList.remove('active');
            });
            
            // Добавляем активный класс текущей кнопке
            this.classList.add('active');
            
            // Устанавливаем текущую категорию и загружаем товары
            currentCategory = this.dataset.category;
            currentPage = 1;
            loadProducts();
        });
    });

    // Обработчик добавления в корзину
    document.addEventListener('click', async function(e) {
        // Открытие модального окна товара
        if (e.target.closest('.product-card') && !e.target.closest('.add-to-cart')) {
            const productCard = e.target.closest('.product-card');
            const productId = productCard.querySelector('.add-to-cart')?.dataset.productId;
            
            if (productId) {
                openProductModal(productId);
            }
        }

        if (e.target.classList.contains('add-to-cart') || e.target.closest('.add-to-cart')) {
            const btn = e.target.classList.contains('add-to-cart') ? e.target : e.target.closest('.add-to-cart');
            const productId = btn.dataset.productId;
            const currentUser = await checkAuth();
            
            if (!currentUser) {
                e.preventDefault();
                document.getElementById('auth-modal').style.display = 'flex';
                return;
            }
            
            try {
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                
                await addToCart(currentUser.id, productId);
                
                btn.innerHTML = '<i class="fas fa-check"></i> Добавлено';
                setTimeout(() => {
                    btn.innerHTML = '<i class="fas fa-cart-plus"></i> В корзину';
                    btn.disabled = false;
                }, 1500);
                
                updateCartCounter();
            } catch (error) {
                console.error('Ошибка при добавлении в корзину:', error);
                btn.innerHTML = '<i class="fas fa-exclamation-circle"></i> Ошибка';
                setTimeout(() => {
                    btn.innerHTML = '<i class="fas fa-cart-plus"></i> В корзину';
                    btn.disabled = false;
                }, 1500);
            }
        }
    });
    
    async function updateCartCounter() {
        const currentUser = await checkAuth();
        if (!currentUser) return;
        
        try {
            const cart = await getCart(currentUser.id);
            const count = cart.reduce((sum, item) => sum + item.quantity, 0);
            document.querySelector('.cart-count').textContent = count;
        } catch (error) {
            console.error('Ошибка при обновлении корзины:', error);
        }
    }

    // Функция для открытия модального окна товара
    async function openProductModal(productId) {
        try {
            // Показываем индикатор загрузки
            productModal.querySelector('.product-modal-body').innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary-color);"></i>
                </div>
            `;
            productModal.classList.add('active');
            document.body.style.overflow = 'hidden';

            // Загружаем данные о товаре
            const { data: product, error } = await supabase
                .from('products')
                .select('*')
                .eq('id', productId)
                .single();

            if (error) throw error;
            if (!product) throw new Error('Товар не найден');

            // Загружаем данные о категории
            let categoryName = '';
            if (product.category_id) {
                const { data: category } = await supabase
                    .from('categories')
                    .select('name')
                    .eq('id', product.category_id)
                    .single();
                
                if (category) categoryName = category.name;
            }

            // Заполняем модальное окно данными
            renderProductModal(product, categoryName);
            
        } catch (error) {
            console.error('Ошибка загрузки товара:', error);
            productModal.querySelector('.product-modal-body').innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: var(--error-color);"></i>
                    <h3 style="margin-top: 15px;">Ошибка загрузки товара</h3>
                    <p style="margin: 10px 0 20px;">Пожалуйста, попробуйте позже</p>
                    <button class="btn" onclick="document.getElementById('product-modal').classList.remove('active'); document.body.style.overflow = '';">
                        Закрыть
                    </button>
                </div>
            `;
        }
    }

    // Функция для отображения данных товара в модальном окне
    function renderProductModal(product, categoryName) {
        const modalBody = productModal.querySelector('.product-modal-body');
        
        // Создаем HTML для изображения
        let imageHtml = '';
        if (product.image_url) {
            imageHtml = `<img src="${product.image_url}" alt="${product.name}" loading="lazy">`;
        } else {
            // Используем изображение по умолчанию в зависимости от категории
            const defaultImage = getProductImage(product);
            imageHtml = `<img src="${defaultImage}" alt="${product.name}" loading="lazy">`;
        }
        
        // Проверяем наличие скидки
        const hasDiscount = product.old_price && product.old_price > product.price;
        const discountPercent = hasDiscount 
            ? Math.round((1 - product.price / product.old_price) * 100)
            : 0;
        
        // Проверяем наличие товара на складе
        const inStock = product.stock > 0;
        
        modalBody.innerHTML = `
            <div class="product-modal-image">
                ${hasDiscount ? `<span class="product-modal-badge">-${discountPercent}%</span>` : ''}
                ${imageHtml}
            </div>
            <div class="product-modal-info">
                <h2 class="product-modal-title">${product.name}</h2>
                ${categoryName ? `<span class="product-modal-category">${categoryName}</span>` : ''}
                
                <div class="product-modal-price">
                    <span class="product-modal-current-price">${formatPrice(product.price)} ₽</span>
                    ${hasDiscount ? `
                        <span class="product-modal-old-price">${formatPrice(product.old_price)} ₽</span>
                        <span class="product-modal-discount">-${discountPercent}%</span>
                    ` : ''}
                </div>
                
                <div class="product-modal-stock ${inStock ? 'in-stock' : 'out-of-stock'}">
                    <i class="fas fa-box"></i>
                    <span class="stock-text">${inStock ? 'В наличии' : 'Нет в наличии'}</span>
                </div>
                
                <div class="product-modal-description">
                    ${product.description || 'Описание отсутствует'}
                </div>
                
                <div class="product-modal-actions">
                    <div class="product-modal-quantity">
                        <button class="quantity-minus">-</button>
                        <input type="number" value="1" min="1" ${!inStock ? 'disabled' : ''} class="quantity-input">
                        <button class="quantity-plus" ${!inStock ? 'disabled' : ''}>+</button>
                    </div>
                    <button class="product-modal-add" ${!inStock ? 'disabled' : ''}>
                        <i class="fas fa-cart-plus"></i>
                        <span>В корзину</span>
                    </button>
                </div>
            </div>
        `;
        
        // Добавляем обработчики событий для кнопок количества
        const minusBtn = modalBody.querySelector('.quantity-minus');
        const plusBtn = modalBody.querySelector('.quantity-plus');
        const quantityInput = modalBody.querySelector('.quantity-input');
        const addToCartBtn = modalBody.querySelector('.product-modal-add');
        
        minusBtn.addEventListener('click', () => {
            const value = parseInt(quantityInput.value);
            if (value > 1) quantityInput.value = value - 1;
        });
        
        plusBtn.addEventListener('click', () => {
            const value = parseInt(quantityInput.value);
            quantityInput.value = value + 1;
        });
        
        // Обработчик добавления в корзину
        addToCartBtn.addEventListener('click', async () => {
            const quantity = parseInt(quantityInput.value);
            const currentUser = await checkAuth();
            
            if (!currentUser) {
                document.getElementById('auth-modal').style.display = 'flex';
                return;
            }
            
            try {
                addToCartBtn.disabled = true;
                addToCartBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                
                await addToCart(currentUser.id, product.id, quantity);
                
                addToCartBtn.innerHTML = '<i class="fas fa-check"></i> Добавлено';
                setTimeout(() => {
                    addToCartBtn.innerHTML = '<i class="fas fa-cart-plus"></i> В корзину';
                    addToCartBtn.disabled = false;
                }, 1500);
                
                updateCartCounter();
            } catch (error) {
                console.error('Ошибка при добавлении в корзину:', error);
                addToCartBtn.innerHTML = '<i class="fas fa-exclamation-circle"></i> Ошибка';
                setTimeout(() => {
                    addToCartBtn.innerHTML = '<i class="fas fa-cart-plus"></i> В корзину';
                    addToCartBtn.disabled = false;
                }, 1500);
            }
        });
    }

    // Закрытие модального окна
    productModalClose.addEventListener('click', () => {
        productModal.classList.remove('active');
        document.body.style.overflow = '';
    });

    // Закрытие при клике вне окна
    productModal.addEventListener('click', (e) => {
        if (e.target === productModal) {
            productModal.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
    
    // В конец обработчика DOMContentLoaded добавим:
    const userAvatarContainer = document.getElementById('user-avatar-container');
    if (userAvatarContainer) {
        userAvatarContainer.addEventListener('click', function(e) {
            // Перенаправляем только при клике на аватар или иконку
            if (e.target.closest('.header-avatar') || e.target.closest('.user-icon')) {
                e.preventDefault();
                const profileLink = document.getElementById('profile-link');
                window.location.href = profileLink.href;
            }
        });
    }

    // Инициализация
    loadProducts();
    updateCartCounter();
});