document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM loaded, initializing recipes...');
    
    try {
        // Загрузка категорий рецептов
        const categories = await getRecipeCategories();
        if (categories && categories.length > 0) {
            renderRecipeCategories(categories);
        } else {
            console.warn('No recipe categories found');
            document.getElementById('recipe-categories').innerHTML = '<p>Категории не найдены</p>';
        }
    } catch (error) {
        console.error('Ошибка при загрузке категорий:', error);
        document.getElementById('recipe-categories').innerHTML = '<p class="error">Ошибка загрузки категорий</p>';
    }
    
    try {
        // Загрузка популярных рецептов
        const popularRecipes = await getPopularRecipes();
        renderRecipes(popularRecipes, 'popular-recipes');
    } catch (error) {
        console.error('Ошибка при загрузке популярных рецептов:', error);
        document.getElementById('popular-recipes').innerHTML = '<p class="error">Ошибка загрузки популярных рецептов</p>';
    }
    
    try {
        // Загрузка быстрых рецептов
        const quickRecipes = await getQuickRecipes();
        renderRecipes(quickRecipes, 'quick-recipes');
    } catch (error) {
        console.error('Ошибка при загрузке быстрых рецептов:', error);
        document.getElementById('quick-recipes').innerHTML = '<p class="error">Ошибка загрузки быстрых рецептов</p>';
    }
    
    try {
        // Загрузка сезонных рецептов
        const seasonalRecipes = await getSeasonalRecipes();
        renderRecipes(seasonalRecipes, 'seasonal-recipes');
    } catch (error) {
        console.error('Ошибка при загрузке сезонных рецептов:', error);
        document.getElementById('seasonal-recipes').innerHTML = '<p class="error">Ошибка загрузки сезонных рецептов</p>';
    }
});

// Функции для работы с Supabase
async function getRecipeCategories() {
    try {
        const { data, error } = await supabase
            .from('recipe_categories')
            .select('*')
            .order('name', { ascending: true });
            
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Ошибка при получении категорий рецептов:', error.message);
        throw error;
    }
}

async function getPopularRecipes(limit = 6) {
    try {
        const { data, error } = await supabase
            .from('recipes')
            .select('*')
            .order('views_count', { ascending: false })
            .limit(limit);
            
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Ошибка при получении популярных рецептов:', error.message);
        throw error;
    }
}

async function getQuickRecipes(limit = 6) {
    try {
        const { data, error } = await supabase
            .from('recipes')
            .select('*')
            .lte('cooking_time', 30)
            .order('cooking_time', { ascending: true })
            .limit(limit);
            
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Ошибка при получении быстрых рецептов:', error.message);
        throw error;
    }
}

async function getSeasonalRecipes(limit = 6) {
    try {
        const currentMonth = new Date().getMonth() + 1;
        const { data, error } = await supabase
            .from('recipes')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);
            
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Ошибка при получении сезонных рецептов:', error.message);
        throw error;
    }
}

// Функции для отрисовки
function renderRecipeCategories(categories) {
    const container = document.getElementById('recipe-categories');
    
    if (!container) {
        console.error('Container for recipe categories not found');
        return;
    }
    
    if (!categories || categories.length === 0) {
        container.innerHTML = '<p>Категории не найдены</p>';
        return;
    }
    
    container.innerHTML = categories.map(category => `
        <a href="#" class="category-card" data-category-id="${category.id}">
            <div class="category-icon-rec">
                <i class="fas ${category.icon || 'fa-utensils'}"></i>
            </div>
            <h3>${category.name}</h3>
        </a>
    `).join('');
}

function renderRecipes(recipes, containerId) {
    const container = document.getElementById(containerId);
    
    if (!container) {
        console.error(`Container with ID ${containerId} not found`);
        return;
    }
    
    if (!recipes || recipes.length === 0) {
        container.innerHTML = '<p class="no-recipes">Рецепты не найдены</p>';
        return;
    }
    
    container.innerHTML = recipes.map(recipe => `
        <div class="recipe-card">
            <div class="recipe-image">
                <img src="${recipe.image_url || 'img/recipe-placeholder.jpg'}" alt="${recipe.title}" onerror="this.src='img/recipe-placeholder.jpg'">
                ${recipe.difficulty === 'легкий' ? '<span class="recipe-badge">Просто</span>' : ''}
                ${recipe.difficulty === 'средний' ? '<span class="recipe-badge-sr">Средне</span>' : ''}
                ${recipe.difficulty === 'сложный' ? '<span class="recipe-badge-sl">Сложно</span>' : ''}
            </div>
            <div class="recipe-content">
                <h3 class="recipe-title">${recipe.title || 'Без названия'}</h3>
                <div class="recipe-meta">
                    <span><i class="fas fa-clock"></i> ${recipe.cooking_time || '?'} мин</span>
                    <span><i class="fas fa-signal"></i> ${recipe.difficulty || 'не указана'}</span>
                </div>
                <p class="recipe-desc">${recipe.description || 'Вкусный рецепт для всей семьи'}</p>
                <a href="recipe-detail.html?id=${recipe.id}" class="recipe-btn">Смотреть рецепт</a>
            </div>
        </div>
    `).join('');

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
}