async function checkAuth() {
    const phone = localStorage.getItem('userPhone');
    if (!phone) return null;
    
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('id, phone, name, avatar, avatar_bg')
            .eq('phone', phone)
            .single();
            
        if (user) {
            // Обновляем аватар в шапке
            const headerAvatar = document.getElementById('header-avatar');
            const headerAvatarContainer = document.querySelector('.header-avatar-container');
            
            if (headerAvatar && user.avatar) {
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
                headerAvatarContainer.classList.add('has-avatar');
            }
        }
        
        return user || null;
    } catch (error) {
        console.error('Ошибка при проверке авторизации:', error.message);
        return null;
    }
}

// Получение данных пользователя
async function getUserData(userId) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();
            
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Ошибка при получении данных пользователя:', error.message);
        throw error;
    }
}

async function updateUserAvatar(userId, avatar, avatarBg) {
    try {
        const { data, error } = await supabase
            .from('users')
            .update({ 
                avatar: avatar,
                avatar_bg: avatarBg 
            })
            .eq('id', userId)
            .select();
            
        if (error) throw error;
        
        // Обновляем аватар в профиле и шапке
        renderUserAvatar(avatar, avatarBg);
        return data;
    } catch (error) {
        console.error('Ошибка при обновлении аватара:', error.message);
        throw error;
    }
}

// Получение списка товаров
async function getProducts(category = null, limit = 8) {
    try {
        let query = supabase
            .from('products')
            .select('*')
            .limit(limit);
            
        if (category) {
            query = query.eq('category', category);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Ошибка при получении товаров:', error.message);
        throw error;
    }
}

// Добавление товара в корзину
async function addToCart(userId, productId, quantity = 1) {
    try {
        // Проверяем, есть ли уже такой товар в корзине
        const { data: existingItem, error: existingError } = await supabase
            .from('cart')
            .select('*')
            .eq('user_id', userId)
            .eq('product_id', productId)
            .maybeSingle();
            
        if (existingError) throw existingError;
        
        if (existingItem) {
            // Обновляем количество
            const { data, error } = await supabase
                .from('cart')
                .update({ quantity: existingItem.quantity + quantity })
                .eq('id', existingItem.id)
                .select();
                
            if (error) throw error;
            return data;
        } else {
            // Добавляем новый товар
            const { data, error } = await supabase
                .from('cart')
                .insert([
                    { 
                        user_id: userId, 
                        product_id: productId, 
                        quantity: quantity 
                    }
                ])
                .select();
                
            if (error) throw error;
            return data;
        }
    } catch (error) {
        console.error('Ошибка при добавлении в корзину:', error.message);
        throw error;
    }
}

// Получение корзины пользователя
async function getCart(userId) {
    try {
        const { data, error } = await supabase
            .from('cart')
            .select(`
                id,
                quantity,
                products:product_id (id, name, price, image_url)
            `)
            .eq('user_id', userId);
            
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Ошибка при получении корзины:', error.message);
        throw error;
    }
}

// Обновление счетчика корзины
async function updateCartCounter() {
    const currentUser = await checkAuth();
    if (!currentUser) {
        document.querySelector('.cart-count').textContent = '0';
        return;
    }

    try {
        const cart = await getCart(currentUser.id);
        const count = cart.reduce((sum, item) => sum + item.quantity, 0);
        document.querySelector('.cart-count').textContent = count;
    } catch (error) {
        console.error('Ошибка при обновлении счетчика корзины:', error);
    }
}

// Проверка роли пользователя
async function checkUserRole(userId) {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('role')
            .eq('id', userId)
            .single();
            
        if (error) throw error;
        return user?.role || 0; // По умолчанию обычный пользователь
    } catch (error) {
        console.error('Ошибка при проверке роли:', error.message);
        return 1;
    }
}

// Добавим в supabase.js
async function updateCartCount() {
    const currentUser = await checkAuth();
    if (!currentUser) {
        document.querySelectorAll('.cart-count').forEach(el => el.textContent = '0');
        return;
    }

    try {
        const cart = await getCart(currentUser.id);
        const count = cart.reduce((sum, item) => sum + item.quantity, 0);
        document.querySelectorAll('.cart-count').forEach(el => el.textContent = count);
    } catch (error) {
        console.error('Ошибка при обновлении счетчика корзины:', error);
    }
}