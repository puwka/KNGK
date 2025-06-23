document.addEventListener('DOMContentLoaded', async function() {
    // Проверка авторизации и отображение аватара
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
    // Таймер обратного отсчета
    function updatePromoTimer() {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 2); // Акция заканчивается через 2 дня
        
        const timer = setInterval(() => {
            const now = new Date().getTime();
            const distance = endDate - now;
            
            if (distance < 0) {
                clearInterval(timer);
                document.getElementById('promo-timer').textContent = "Акция завершена";
                return;
            }
            
            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            
            document.getElementById('promo-timer').textContent = 
                `${days}д ${hours}:${minutes}:${seconds}`;
        }, 1000);
    }
    
    updatePromoTimer();
    
    // Загрузка текущих акций
    async function loadCurrentPromotions() {
        try {
            const { data: promotions, error } = await supabase
                .from('promotions')
                .select('*')
                .gte('end_date', new Date().toISOString())
                .order('created_at', { ascending: false });
                
            if (error) throw error;
            
            renderPromotions(promotions, 'current-promotions');
        } catch (error) {
            console.error('Ошибка при загрузке акций:', error);
            document.getElementById('current-promotions').innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Не удалось загрузить акции. Пожалуйста, попробуйте позже.</p>
                    <button class="btn" onclick="loadCurrentPromotions()">Попробовать снова</button>
                </div>
            `;
        }
    }
    
    // Отрисовка товаров со скидкой
    function renderProducts(products, containerId) {
        const container = document.getElementById(containerId);
        
        if (!products || products.length === 0) {
            container.innerHTML = `
                <div class="no-products">
                    <i class="fas fa-percentage"></i>
                    <p>Нет товаров со скидкой</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = products.map(product => `
            <div class="product-card">
                ${product.old_price ? `<div class="product-badge">-${Math.round((1 - product.price / product.old_price) * 100)}%</div>` : ''}
                <div class="product-image">
                    <img src="${product.image_url || 'img/product-default.jpg'}" alt="${product.name}" loading="lazy">
                </div>
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <div class="product-weight">${product.weight || '1 шт.'}</div>
                    <div class="product-price">
                        ${product.old_price ? `
                            <div>
                                <span class="price-old">${formatPrice(product.old_price)} ₽</span>
                                <span class="price-current">${formatPrice(product.price)} ₽</span>
                            </div>
                            <span class="price-discount">-${Math.round((1 - product.price / product.old_price) * 100)}%</span>
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
        
        // Добавляем обработчики событий для кнопок "В корзину"
        document.querySelectorAll('.add-to-cart').forEach(button => {
            button.addEventListener('click', async function() {
                const productId = this.getAttribute('data-product-id');
                const user = await checkAuth();
                
                if (!user) {
                    alert('Для добавления товаров в корзину необходимо авторизоваться');
                    return;
                }
                
                try {
                    await addToCart(user.id, productId);
                    updateCartCount();
                    this.innerHTML = '<i class="fas fa-check"></i> Добавлено';
                    this.style.backgroundColor = 'var(--dark-color)';
                    
                    setTimeout(() => {
                        this.innerHTML = '<i class="fas fa-cart-plus"></i> В корзину';
                        this.style.backgroundColor = 'var(--primary-color)';
                    }, 2000);
                } catch (error) {
                    console.error('Ошибка при добавлении в корзину:', error);
                    alert('Не удалось добавить товар в корзину');
                }
            });
        });
    }

    // Форматирование цены
    function formatPrice(price) {
        return parseFloat(price).toFixed(2).replace('.', ',');
    }

    async function loadDiscountedProducts(sortBy = 'popular') {
        try {
            let query = supabase
                .from('products')
                .select('*')
                .not('old_price', 'is', null) // Только товары со скидкой
                .limit(8);

            // Добавляем сортировку
            switch(sortBy) {
                case 'discount':
                    query = query.order('price', { ascending: true }); // Сначала большие скидки
                    break;
                case 'price-asc':
                    query = query.order('price', { ascending: true });
                    break;
                case 'price-desc':
                    query = query.order('price', { ascending: false });
                    break;
                default:
                    query = query.order('created_at', { ascending: false });
            }

            const { data: products, error } = await query;
            
            if (error) throw error;

            renderProducts(products, 'discounted-products');
        } catch (error) {
            console.error('Ошибка при загрузке товаров:', error);
            document.getElementById('discounted-products').innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Не удалось загрузить товары. Пожалуйста, попробуйте позже.</p>
                    <button class="btn" onclick="loadDiscountedProducts()">Попробовать снова</button>
                </div>
            `;
        }
    }

    function calculateDiscount(oldPrice, newPrice) {
        return Math.round((1 - newPrice / oldPrice) * 100);
    }

    async function updateCartCount() {
        const user = await checkAuth();
        if (!user) return;
        
        try {
            const cart = await getCart(user.id);
            const count = cart.reduce((total, item) => total + item.quantity, 0);
            document.querySelector('.cart-count').textContent = count;
        } catch (error) {
            console.error('Ошибка при получении корзины:', error);
        }
    }
    
    // Загрузка архивных акций
    async function loadArchivePromotions() {
        try {
            const { data: promotions, error } = await supabase
                .from('promotions')
                .select('*')
                .lt('end_date', new Date().toISOString())
                .order('end_date', { ascending: false })
                .limit(6);
                
            if (error) throw error;
            
            renderArchivePromotions(promotions);
        } catch (error) {
            console.error('Ошибка при загрузке архивных акций:', error);
        }
    }
    
    // Отрисовка акций
    function renderPromotions(promotions, containerId) {
        const container = document.getElementById(containerId);
        
        if (!promotions || promotions.length === 0) {
            container.innerHTML = `
                <div class="no-promotions">
                    <i class="fas fa-tag"></i>
                    <p>Сейчас нет активных акций</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = promotions.map(promo => `
            <div class="promo-card">
                <div class="promo-image">
                    <img src="${promo.image_url || 'img/promo-default.jpg'}" alt="${promo.title}">
                    <div class="promo-badge">-${promo.discount_percent}%</div>
                </div>
                <div class="promo-content">
                    <h3 class="promo-title">${promo.title}</h3>
                    <p class="promo-desc">${promo.description || 'Специальное предложение на товары категории'}</p>
                    <div class="promo-date">
                        <i class="far fa-calendar-alt"></i>
                        ${formatDate(promo.start_date)} - ${formatDate(promo.end_date)}
                    </div>
                    <a href="catalog.html?promo=${promo.id}" class="promo-btn">
                        Посмотреть товары <i class="fas fa-chevron-right"></i>
                    </a>
                </div>
            </div>
        `).join('');
    }
    
    // Отрисовка архивных акций
    function renderArchivePromotions(promotions) {
        const container = document.getElementById('archive-promotions');
        
        if (!promotions || promotions.length === 0) {
            container.innerHTML = `
                <div class="no-archive">
                    <i class="fas fa-archive"></i>
                    <p>Архив акций пуст</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = promotions.map(promo => `
            <div class="archive-card">
                <h4 class="archive-title">${promo.title}</h4>
                <div class="archive-date">
                    <i class="far fa-calendar-alt"></i>
                    ${formatDate(promo.start_date)} - ${formatDate(promo.end_date)}
                </div>
                <span class="archive-badge">Завершена</span>
            </div>
        `).join('');
    }
    
    // Форматирование даты
    function formatDate(dateString) {
        const options = { day: 'numeric', month: 'short' };
        return new Date(dateString).toLocaleDateString('ru-RU', options);
    }
    
    // Инициализация страницы
    loadCurrentPromotions();
    loadDiscountedProducts();
    loadArchivePromotions();
    
    // Сортировка товаров
    document.getElementById('sort-products').addEventListener('change', function() {
        loadDiscountedProducts(this.value);
    });
    
    // Кнопка "Показать еще"
    document.getElementById('load-more-btn').addEventListener('click', async function() {
        this.disabled = true;
        this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Загрузка...';
        
        try {
            const currentCount = document.querySelectorAll('#discounted-products .product-card').length;
            const sortBy = document.getElementById('sort-products').value;
            
            let query = supabase
                .from('products')
                .select('*')
                .not('old_price', 'is', null)
                .range(currentCount, currentCount + 11);

            // Добавляем сортировку
            switch(sortBy) {
                case 'discount':
                    query = query.order('price', { ascending: true });
                    break;
                case 'price-asc':
                    query = query.order('price', { ascending: true });
                    break;
                case 'price-desc':
                    query = query.order('price', { ascending: false });
                    break;
                default:
                    query = query.order('created_at', { ascending: false });
            }

            const { data: products, error } = await query;
                
            if (error) throw error;
            
            if (products.length > 0) {
                const container = document.getElementById('discounted-products');
                const newProductsHTML = products.map(product => `
                    <div class="product-card">
                        <div class="product-badge">-${calculateDiscount(product.old_price, product.price)}%</div>
                        <div class="product-image">
                            <img src="${product.image_url || 'img/product-default.jpg'}" alt="${product.name}" loading="lazy">
                        </div>
                        <div class="product-info">
                            <h3>${product.name}</h3>
                            <div class="product-weight">${product.weight || '1 шт.'}</div>
                            <div class="product-price">
                                <div>
                                    <span class="price-old">${formatPrice(product.old_price)} ₽</span>
                                    <span class="price-current">${formatPrice(product.price)} ₽</span>
                                </div>
                                <span class="price-discount">-${calculateDiscount(product.old_price, product.price)}%</span>
                            </div>
                            <button class="add-to-cart" data-product-id="${product.id}">
                                <i class="fas fa-cart-plus"></i> В корзину
                            </button>
                        </div>
                    </div>
                `).join('');
                
                container.insertAdjacentHTML('beforeend', newProductsHTML);
                
                // Добавляем обработчики событий для новых кнопок
                document.querySelectorAll('.add-to-cart').forEach(button => {
                    button.addEventListener('click', async function() {
                        const productId = this.getAttribute('data-product-id');
                        const user = await checkAuth();
                        
                        if (!user) {
                            alert('Для добавления товаров в корзину необходимо авторизоваться');
                            return;
                        }
                        
                        try {
                            await addToCart(user.id, productId);
                            updateCartCount();
                            this.innerHTML = '<i class="fas fa-check"></i> Добавлено';
                            this.style.backgroundColor = 'var(--dark-color)';
                            
                            setTimeout(() => {
                                this.innerHTML = '<i class="fas fa-cart-plus"></i> В корзину';
                                this.style.backgroundColor = 'var(--primary-color)';
                            }, 2000);
                        } catch (error) {
                            console.error('Ошибка при добавлении в корзину:', error);
                            alert('Не удалось добавить товар в корзину');
                        }
                    });
                });
                
                if (products.length < 12) {
                    this.style.display = 'none';
                }
            } else {
                this.style.display = 'none';
            }
        } catch (error) {
            console.error('Ошибка при загрузке товаров:', error);
            alert('Не удалось загрузить дополнительные товары');
        } finally {
            this.disabled = false;
            this.innerHTML = 'Показать еще <i class="fas fa-chevron-down"></i>';
        }
    });

    // Обработчики для компактного модального окна скидки
    document.getElementById('register-promo-btn').addEventListener('click', function(e) {
        e.preventDefault();
        document.getElementById('discount-modal').style.display = 'flex';
        document.getElementById('discount-email').focus();
    });

    document.querySelector('#discount-modal .close-modal').addEventListener('click', function() {
        document.getElementById('discount-modal').style.display = 'none';
    });

    // Закрытие при клике вне окна
    window.addEventListener('click', function(e) {
        if (e.target === document.getElementById('discount-modal')) {
            document.getElementById('discount-modal').style.display = 'none';
        }
    });

    document.getElementById('get-discount-btn').addEventListener('click', async function() {
        const emailInput = document.getElementById('discount-email');
        const email = emailInput.value.trim();
        
        if (!email || !validateEmail(email)) {
            emailInput.focus();
            emailInput.style.borderBottomColor = 'var(--error-color)';
            return;
        }
        
        this.disabled = true;
        this.innerHTML = 'Отправка... <i class="fas fa-spinner fa-spin"></i>';
        
        // Имитация отправки (задержка 1.5 секунды)
        setTimeout(() => {
            document.getElementById('discount-success').style.display = 'block';
            document.querySelector('.discount-content > h4').style.display = 'none';
            document.querySelector('.discount-content > p').style.display = 'none';
            document.querySelector('.input-group').style.display = 'none';
            this.style.display = 'none';
            document.querySelector('.privacy-text').style.display = 'none';
            
            // Закрываем окно через 2 секунды
            setTimeout(() => {
                document.getElementById('discount-modal').style.display = 'none';
                // Возвращаем исходное состояние
                setTimeout(() => {
                    document.getElementById('discount-success').style.display = 'none';
                    document.querySelector('.discount-content > h4').style.display = 'block';
                    document.querySelector('.discount-content > p').style.display = 'block';
                    document.querySelector('.input-group').style.display = 'block';
                    this.style.display = 'block';
                    document.querySelector('.privacy-text').style.display = 'block';
                    this.innerHTML = 'Получить скидку <i class="fas fa-smile"></i>';
                    this.disabled = false;
                    emailInput.value = '';
                    emailInput.style.borderBottomColor = '#ddd';
                }, 300);
            }, 2000);
        }, 1500);
    });

    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    // В конец обработчика DOMContentLoaded добавим:
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