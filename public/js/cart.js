document.addEventListener('DOMContentLoaded', async function() {
    // Проверка авторизации и отображение аватарки
    async function checkAuthAndRenderAvatar() {
        const user = await checkAuth();
        if (user && user.avatar) {
            const profileLink = document.getElementById('profile-link');
            if (profileLink) {
                profileLink.innerHTML = '';
                profileLink.style.backgroundColor = user.avatar_bg || '#74b9ff';
                
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
                
                profileLink.appendChild(icon);
            }
        }
    }

    // Вызываем функцию при загрузке страницы
    checkAuthAndRenderAvatar();

    // Элементы страницы
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    const checkoutBtn = document.getElementById('checkout-btn');
    const emptyCartMessage = document.getElementById('empty-cart-message');
    const cartContent = document.getElementById('cart-content');
    const orderForm = document.getElementById('order-form');
    const deliveryOptions = document.querySelectorAll('input[name="delivery"]');
    const paymentOptions = document.querySelectorAll('input[name="payment"]');
    const deliveryAddress = document.getElementById('delivery-address');
    const deliveryTime = document.getElementById('delivery-time');
    const deliveryDate = document.getElementById('delivery-date');
    const orderSummary = document.getElementById('order-summary');
    const orderTotal = document.getElementById('order-total');
    const orderItemsList = document.getElementById('order-items-list');
    const backToCartBtn = document.getElementById('back-to-cart');
    const deliveryAddressSection = document.querySelector('.delivery-address-section');
    const pickupPointSection = document.querySelector('.pickup-point-section');
    const paymentCourierOption = document.querySelector('.payment-courier');

    // Инициализация карты
    let pickupMap;
    function initPickupMap() {
        if (typeof ymaps !== 'undefined') {
            pickupMap = new ymaps.Map('pickup-map', {
                center: [54.941058, 41.398222],
                zoom: 12
            });

            // Добавляем метки магазинов
            const shops = [
                {coords: [54.945392, 41.415146], name: 'ул. 50 лет СССР, 13'},
                {coords: [54.945671, 41.405867], name: 'ул. Советская улица, 101'},
                {coords: [54.938829, 41.402938], name: 'ул. Ленина, 3'},
                {coords: [54.954760, 41.422575], name: 'ул. Советская улица, 199В'},
                {coords: [54.945195, 41.376070], name: 'ул. Свердлова, 86'},
                {coords: [54.957402, 41.383409], name: 'ул. Окружная улица, 3А'}
            ];

            shops.forEach(shop => {
                const placemark = new ymaps.Placemark(shop.coords, {
                    hintContent: shop.name,
                    balloonContent: shop.name
                }, {
                    preset: 'islands#greenDotIcon'
                });
                pickupMap.geoObjects.add(placemark);
            });

            // Обработчик клика по метке
            pickupMap.events.add('click', function (e) {
                const target = e.get('target');
                if (target && target.properties) {
                    const shopName = target.properties.get('balloonContent');
                    document.getElementById('pickup-point').value = shopName;
                    updateOrderSummary();
                }
            });
        }
    }

    // Переключение между доставкой и самовывозом
    function toggleDeliveryMethod() {
        const deliveryMethod = document.querySelector('input[name="delivery"]:checked').value;
        
        if (deliveryMethod === 'delivery') {
            deliveryAddressSection.style.display = 'block';
            pickupPointSection.style.display = 'none';
            paymentCourierOption.style.display = 'block';
        } else {
            deliveryAddressSection.style.display = 'none';
            pickupPointSection.style.display = 'block';
            paymentCourierOption.style.display = 'none';
            
            // Если выбран способ оплаты "Картой курьеру", переключаем на "Картой онлайн"
            if (document.querySelector('input[name="payment"]:checked').value === 'card_courier') {
                document.querySelector('input[name="payment"][value="card"]').checked = true;
            }
            
            // Инициализируем карту при первом переключении на самовывоз
            if (!pickupMap) {
                initPickupMap();
            }
        }
        
        updateOrderSummary();
    }

    // Проверяем подключение к Supabase
    if (!window.supabase) {
        console.error('Supabase не инициализирован!');
        showError('Ошибка подключения к базе данных');
        return;
    }

    // Загрузка корзины
    async function loadCart() {
        try {
            const currentUser = await checkAuth();
            if (!currentUser) {
                // Пользователь не авторизован
                showAuthMessage();
                return;
            }

            const cart = await getCart(currentUser.id);
            renderCart(cart);
        } catch (error) {
            console.error('Ошибка загрузки корзины:', error);
            showError('Не удалось загрузить корзину. Пожалуйста, попробуйте позже.');
        }
    }

    // В функции renderCart добавляем обновление списка товаров в заказе
    function renderCart(cart) {
        if (!cart || cart.length === 0) {
            emptyCartMessage.style.display = 'block';
            cartContent.style.display = 'none';
            return;
        }

        emptyCartMessage.style.display = 'none';
        cartContent.style.display = 'block';

        // Очищаем контейнер
        cartItemsContainer.innerHTML = '';

        let total = 0;

        // Добавляем товары
        cart.forEach(item => {
            const product = item.products;
            const subtotal = product.price * item.quantity;
            total += subtotal;

            const cartItem = document.createElement('div');
            cartItem.className = 'cart-item';
            cartItem.innerHTML = `
                <div class="cart-item-image">
                    <img src="${product.image_url || 'img/placeholder.jpg'}" alt="${product.name}" loading="lazy">
                </div>
                <div class="cart-item-info">
                    <h3>${product.name}</h3>
                    <div class="cart-item-price">${formatPrice(product.price)} ₽</div>
                    <div class="cart-item-actions">
                        <div class="quantity-control">
                            <button class="quantity-decrease" data-item-id="${item.id}">-</button>
                            <input type="number" value="${item.quantity}" min="1" class="quantity-input" data-item-id="${item.id}">
                            <button class="quantity-increase" data-item-id="${item.id}">+</button>
                        </div>
                        <button class="remove-item" data-item-id="${item.id}">
                            <i class="fas fa-trash"></i> Удалить
                        </button>
                    </div>
                </div>
                <div class="cart-item-subtotal">${formatPrice(subtotal)} ₽</div>
            `;
            cartItemsContainer.appendChild(cartItem);
        });

        // Обновляем итоговую сумму
        cartTotal.textContent = `${formatPrice(total)} ₽`;
        orderTotal.textContent = `${formatPrice(total)} ₽`;
        
        // Обновляем список товаров в заказе
        updateOrderItemsList(cart);
    }

    // Новая функция для обновления списка товаров в заказе
    function updateOrderItemsList(cart) {
        orderItemsList.innerHTML = '';
        
        cart.forEach(item => {
            const product = item.products;
            const subtotal = product.price * item.quantity;
            
            const orderItem = document.createElement('div');
            orderItem.className = 'order-item';
            orderItem.innerHTML = `
                <div class="order-item-info">
                    <div class="order-item-name">${product.name}</div>
                    <div class="order-item-quantity">${item.quantity} шт.</div>
                </div>
                <div class="order-item-price">${formatPrice(subtotal)} ₽</div>
            `;
            orderItemsList.appendChild(orderItem);
        });
    }

    // Форматирование цены
    function formatPrice(price) {
        return parseFloat(price).toFixed(2).replace('.', ',');
    }

    // Показать сообщение об ошибке
    function showError(message) {
        cartItemsContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
                <button class="btn" onclick="location.reload()">Попробовать снова</button>
            </div>
        `;
    }

    // Показать сообщение о необходимости авторизации
    function showAuthMessage() {
        cartItemsContainer.innerHTML = `
            <div class="auth-message">
                <i class="fas fa-user-lock"></i>
                <h3>Требуется авторизация</h3>
                <p>Для просмотра корзины необходимо войти в систему</p>
                <button class="btn" id="open-auth-modal">Войти или зарегистрироваться</button>
            </div>
        `;

        document.getElementById('open-auth-modal').addEventListener('click', () => {
            document.getElementById('auth-modal').style.display = 'flex';
        });
    }

    // Обновление количества товара
    async function updateCartItem(itemId, quantity) {
        try {
            const { error } = await supabase
                .from('cart')
                .update({ quantity })
                .eq('id', itemId);
            
            if (error) throw error;
            
            // Перезагружаем корзину
            const currentUser = await checkAuth();
            const cart = await getCart(currentUser.id);
            renderCart(cart);
            updateCartCounter();
        } catch (error) {
            console.error('Ошибка при обновлении корзины:', error);
            showError('Не удалось обновить корзину');
        }
    }

    // Удаление товара из корзины
    async function removeCartItem(itemId) {
        try {
            const { error } = await supabase
                .from('cart')
                .delete()
                .eq('id', itemId);
            
            if (error) throw error;
            
            // Перезагружаем корзину
            const currentUser = await checkAuth();
            const cart = await getCart(currentUser.id);
            renderCart(cart);
            updateCartCounter();
        } catch (error) {
            console.error('Ошибка при удалении из корзины:', error);
            showError('Не удалось удалить товар из корзины');
        }
    }

    // Создание заказа
    async function createOrder(deliveryMethod, paymentMethod, address, deliveryTime, deliveryDate) {
        try {
            // 1. Проверяем авторизацию пользователя
            const currentUser = await checkAuth();
            if (!currentUser) {
                throw new Error('Пользователь не авторизован');
            }

            // 2. Получаем корзину пользователя с расширенными данными
            const { data: cartItems, error: cartError } = await supabase
                .from('cart')
                .select(`
                    id,
                    quantity,
                    products:product_id (
                        id,
                        name,
                        price,
                        image_url,
                        category_id
                    )
                `)
                .eq('user_id', currentUser.id);

            if (cartError) throw cartError;
            if (!cartItems || cartItems.length === 0) {
                throw new Error('Корзина пуста');
            }

            // 3. Рассчитываем общую сумму
            const total = cartItems.reduce((sum, item) => {
                return sum + (parseFloat(item.products.price) * item.quantity);
            }, 0);

            // 4. Создаем запись о заказе
            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert([{
                    user_id: currentUser.id,
                    status: 'pending',
                    total: total,
                    delivery_method: deliveryMethod,
                    payment_method: paymentMethod,
                    delivery_address: deliveryMethod === 'delivery' ? address : document.getElementById('pickup-point').value,
                    delivery_time: deliveryTime,
                    delivery_date: deliveryDate,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (orderError) throw orderError;

            // 5. Подготавливаем элементы заказа
            const orderItems = cartItems.map(item => ({
                order_id: order.id,
                product_id: item.products.id,
                quantity: item.quantity,
                price: item.products.price,
                product_data: {
                    name: item.products.name,
                    image_url: item.products.image_url,
                    category_id: item.products.category_id
                }
            }));

            // 6. Добавляем элементы заказа
            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItems);

            if (itemsError) throw itemsError;

            // 7. Очищаем корзину
            const { error: clearCartError } = await supabase
                .from('cart')
                .delete()
                .eq('user_id', currentUser.id);

            if (clearCartError) throw clearCartError;

            // 8. Возвращаем созданный заказ
            return {
                ...order,
                items: orderItems
            };

        } catch (error) {
            console.error('Ошибка при оформлении заказа:', error);
            throw error;
        }
    }

    // Показать сообщение об успешном оформлении
    function showSuccessMessage(orderId) {
        cartContent.innerHTML = `
            <div class="order-success">
                <div class="success-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h2>Заказ успешно оформлен!</h2>
                <p>Номер вашего заказа: <strong>#${orderId}</strong></p>
                <p>Мы свяжемся с вами для подтверждения заказа.</p>
                <div class="order-details">
                    <div class="detail">
                        <i class="fas fa-truck"></i>
                        <span>Доставка: ${document.querySelector('input[name="delivery"]:checked').nextElementSibling.textContent}</span>
                    </div>
                    <div class="detail">
                        <i class="fas fa-credit-card"></i>
                        <span>Оплата: ${document.querySelector('input[name="payment"]:checked').nextElementSibling.textContent}</span>
                    </div>
                    <div class="detail">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${document.querySelector('input[name="delivery"]:checked').value === 'delivery' ? 'Адрес доставки:' : 'Магазин:'} ${document.querySelector('input[name="delivery"]:checked').value === 'delivery' ? deliveryAddress.value : document.getElementById('pickup-point').value}</span>
                    </div>
                    <div class="detail">
                        <i class="fas fa-calendar-alt"></i>
                        <span>Дата и время: ${deliveryDate.value} в ${deliveryTime.value}</span>
                    </div>
                </div>
                <a href="index.html" class="btn btn-large">
                    <i class="fas fa-home"></i> Вернуться на главную
                </a>
            </div>
        `;
    }

    // Обновление сводки заказа
    function updateOrderSummary() {
        const deliveryMethod = document.querySelector('input[name="delivery"]:checked').value;
        const paymentMethod = document.querySelector('input[name="payment"]:checked').value;
        const address = deliveryMethod === 'delivery' ? deliveryAddress.value : document.getElementById('pickup-point').value;
        const time = deliveryTime.value;
        const date = deliveryDate.value;

        // Обновляем сводку
        orderSummary.innerHTML = `
            <h3>Ваш заказ</h3>
            <div class="summary-section">
                <h4>Доставка</h4>
                <p>${deliveryMethod === 'delivery' ? 'Доставка по адресу' : 'Самовывоз'}</p>
                <p>${address}</p>
                <p>${date} в ${time}</p>
            </div>
            <div class="summary-section">
                <h4>Оплата</h4>
                <p>${paymentMethod === 'card' ? 'Картой онлайн' : paymentMethod === 'cash' ? 'Наличными при получении' : 'Картой при получении'}</p>
            </div>
            <div class="summary-total">
                <h4>Итого</h4>
                <p>${orderTotal.textContent}</p>
            </div>
        `;
    }

    // Обработчики событий
    cartItemsContainer.addEventListener('click', async (e) => {
        // Уменьшение количества
        if (e.target.classList.contains('quantity-decrease')) {
            const itemId = e.target.dataset.itemId;
            const input = e.target.nextElementSibling;
            let value = parseInt(input.value);
            if (value > 1) {
                input.value = value - 1;
                await updateCartItem(itemId, value - 1);
            }
        }
        
        // Увеличение количества
        if (e.target.classList.contains('quantity-increase')) {
            const itemId = e.target.dataset.itemId;
            const input = e.target.previousElementSibling;
            let value = parseInt(input.value);
            input.value = value + 1;
            await updateCartItem(itemId, value + 1);
        }
        
        // Удаление товара
        if (e.target.classList.contains('remove-item') || e.target.closest('.remove-item')) {
            const itemId = e.target.classList.contains('remove-item') 
                ? e.target.dataset.itemId 
                : e.target.closest('.remove-item').dataset.itemId;
            await removeCartItem(itemId);
        }
    });

    // Изменение количества через input
    cartItemsContainer.addEventListener('change', async (e) => {
        if (e.target.classList.contains('quantity-input')) {
            const itemId = e.target.dataset.itemId;
            const value = parseInt(e.target.value);
            if (value >= 1) {
                await updateCartItem(itemId, value);
            } else {
                e.target.value = 1;
            }
        }
    });

    // Переключение между корзиной и оформлением заказа
    checkoutBtn.addEventListener('click', () => {
        document.getElementById('cart-section').style.display = 'none';
        document.getElementById('checkout-section').style.display = 'block';
        
        // Обновляем сводку заказа
        updateOrderSummary();
        
        // Устанавливаем дату доставки (сегодня + 1 день)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        deliveryDate.value = tomorrow.toISOString().split('T')[0];
    });

    backToCartBtn.addEventListener('click', () => {
        document.getElementById('cart-section').style.display = 'block';
        document.getElementById('checkout-section').style.display = 'none';
    });

    // Обновление сводки при изменении данных
    deliveryOptions.forEach(option => {
        option.addEventListener('change', () => {
            toggleDeliveryMethod();
            updateOrderSummary();
        });
    });

    paymentOptions.forEach(option => {
        option.addEventListener('change', updateOrderSummary);
    });

    deliveryAddress.addEventListener('input', updateOrderSummary);
    deliveryTime.addEventListener('change', updateOrderSummary);
    deliveryDate.addEventListener('change', updateOrderSummary);

    // Обработчик изменения выбора точки самовывоза
    document.getElementById('pickup-point').addEventListener('change', updateOrderSummary);

    // Оформление заказа
    orderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = orderForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Оформление...';

        try {
            // 1. Собираем данные формы
            const formData = {
                deliveryMethod: document.querySelector('input[name="delivery"]:checked').value,
                paymentMethod: document.querySelector('input[name="payment"]:checked').value,
                address: document.querySelector('input[name="delivery"]:checked').value === 'delivery' 
                    ? document.getElementById('delivery-address').value 
                    : document.getElementById('pickup-point').value,
                time: document.getElementById('delivery-time').value,
                date: document.getElementById('delivery-date').value,
                comment: document.querySelector('textarea').value.trim()
            };

            // 2. Валидация
            if (formData.deliveryMethod === 'delivery' && !formData.address) {
                throw new Error('Укажите адрес доставки');
            }
            if (formData.deliveryMethod === 'pickup' && !formData.address) {
                throw new Error('Выберите магазин для самовывоза');
            }
            if (!formData.time) {
                throw new Error('Укажите время доставки');
            }
            if (!formData.date) {
                throw new Error('Укажите дату доставки');
            }

            // 3. Создаем заказ
            const order = await createOrder(
                formData.deliveryMethod,
                formData.paymentMethod,
                formData.address,
                formData.time,
                formData.date
            );

            // 4. Добавляем комментарий (если есть)
            if (formData.comment) {
                await supabase
                    .from('orders')
                    .update({ comment: formData.comment })
                    .eq('id', order.id);
            }

            // 5. Показываем успешное сообщение
            showSuccessMessage(order.id);
            updateCartCounter();

        } catch (error) {
            console.error('Ошибка оформления:', error);
            
            // Показываем пользователю понятное сообщение об ошибке
            const errorMessage = error.message || 'Не удалось оформить заказ. Пожалуйста, попробуйте позже.';
            alert(`Ошибка: ${errorMessage}`);
            
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-check"></i> Подтвердить заказ';
        }
    });

    // Инициализация
    loadCart();
    updateCartCounter();
});