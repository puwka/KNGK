document.addEventListener('DOMContentLoaded', async function() {
    const urlParams = new URLSearchParams(window.location.search);
    const recipeId = urlParams.get('id');
    
    if (!recipeId) {
        window.location.href = 'recipes.html';
        return;
    }

    try {
        // Загружаем данные рецепта
        const { data: recipe, error: recipeError } = await supabase
            .from('recipes')
            .select('*')
            .eq('id', recipeId)
            .single();
        
        if (recipeError) throw recipeError;
        if (!recipe) throw new Error('Рецепт не найден');

        // Загружаем ингредиенты
        const { data: ingredients, error: ingredientsError } = await supabase
            .from('recipe_ingredients')
            .select('*')
            .eq('recipe_id', recipeId)
            .order('id', { ascending: true });
        
        if (ingredientsError) throw ingredientsError;

        // Загружаем шаги приготовления
        const { data: steps, error: stepsError } = await supabase
            .from('recipe_steps')
            .select('*')
            .eq('recipe_id', recipeId)
            .order('step_number', { ascending: true });
        
        if (stepsError) throw stepsError;

        // Загружаем категорию
        const { data: category, error: categoryError } = await supabase
            .from('recipe_categories')
            .select('name')
            .eq('id', recipe.category_id)
            .single();
        
        if (categoryError) throw categoryError;

        // Получаем изображение из последнего шага (если есть)
        const lastStepWithImage = steps.slice().reverse().find(step => step.image_url);
        const bannerImageUrl = lastStepWithImage?.image_url || recipe.image_url || 'img/recipe-placeholder.jpg';

        // Заполняем данные на странице
        document.getElementById('recipe-title').textContent = recipe.title;
        document.getElementById('recipe-main-image').src = bannerImageUrl;
        document.getElementById('recipe-main-image').alt = recipe.title;
        document.getElementById('recipe-difficulty').textContent = recipe.difficulty || 'легкий';
        document.getElementById('recipe-time').innerHTML = `<i class="fas fa-clock"></i> ${recipe.cooking_time} мин`;
        document.getElementById('recipe-category').innerHTML = `<i class="fas fa-tag"></i> ${category?.name || 'Без категории'}`;

        // Заполняем ингредиенты
        const ingredientsList = document.getElementById('ingredients-list');
        ingredientsList.innerHTML = ingredients.map(ing => `
            <li>
                <span>${ing.quantity} ${ing.unit} ${ing.notes || ''}</span>
            </li>
        `).join('');

        // Заполняем шаги приготовления
        const stepsContainer = document.getElementById('steps-container');
        stepsContainer.innerHTML = steps.map(step => `
            <div class="step-card">
                <div class="step-number">${step.step_number}</div>
                <div class="step-content">
                    <p>${step.description}</p>
                    ${step.image_url ? `<img src="${step.image_url}" alt="Шаг ${step.step_number}" class="step-image">` : ''}
                </div>
            </div>
        `).join('');

        // Проверяем, добавлен ли рецепт в избранное
        const user = await checkAuth();
        if (user) {
            const { data: favorite, error: favError } = await supabase
                .from('user_favorite_recipes')
                .select('*')
                .eq('user_id', user.id)
                .eq('recipe_id', recipeId)
                .single();
            
            if (!favError && favorite) {
                document.getElementById('favorite-btn').classList.add('active');
                document.getElementById('favorite-btn').innerHTML = '<i class="fas fa-heart"></i>';
            }
        }

        // Обработчик для кнопки избранного
        document.getElementById('favorite-btn').addEventListener('click', async function() {
            if (!user) {
                showAuthModal();
                return;
            }

            const isFavorite = this.classList.contains('active');
            
            try {
                if (isFavorite) {
                    // Удаляем из избранного
                    const { error } = await supabase
                        .from('user_favorite_recipes')
                        .delete()
                        .eq('user_id', user.id)
                        .eq('recipe_id', recipeId);
                    
                    if (!error) {
                        this.classList.remove('active');
                        this.innerHTML = '<i class="far fa-heart"></i>';
                    }
                } else {
                    // Добавляем в избранное
                    const { error } = await supabase
                        .from('user_favorite_recipes')
                        .insert([{
                            user_id: user.id,
                            recipe_id: recipeId
                        }]);
                    
                    if (!error) {
                        this.classList.add('active');
                        this.innerHTML = '<i class="fas fa-heart"></i>';
                    }
                }
            } catch (error) {
                console.error('Ошибка при обновлении избранного:', error);
            }
        });

        // Обработчик для кнопки "Добавить в корзину"
        document.querySelector('.add-to-cart-btn').addEventListener('click', async function() {
            if (!user) {
                showAuthModal();
                return;
            }

            try {
                // Добавляем все ингредиенты в корзину
                for (const ingredient of ingredients) {
                    if (ingredient.product_id) {
                        await addToCart(user.id, ingredient.product_id, parseFloat(ingredient.quantity) || 1);
                    }
                }
                
                alert('Все ингредиенты добавлены в корзину!');
                updateCartCount();
            } catch (error) {
                console.error('Ошибка при добавлении в корзину:', error);
                alert('Произошла ошибка при добавлении в корзину');
            }
        });

        // Обработчик для рейтинга
        const stars = document.querySelectorAll('.stars i');
        stars.forEach((star, index) => {
            star.addEventListener('click', async () => {
                if (!user) {
                    showAuthModal();
                    return;
                }

                try {
                    const { error } = await supabase
                        .from('recipe_ratings')
                        .upsert({
                            user_id: user.id,
                            recipe_id: recipeId,
                            rating: index + 1
                        });
                    
                    if (!error) {
                        // Обновляем UI
                        stars.forEach((s, i) => {
                            s.classList.toggle('active', i <= index);
                        });
                    }
                } catch (error) {
                    console.error('Ошибка при оценке рецепта:', error);
                }
            });
        });

    } catch (error) {
        console.error('Ошибка при загрузке рецепта:', error);
        document.querySelector('main').innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Не удалось загрузить рецепт</p>
                <a href="recipes.html" class="btn">Вернуться к рецептам</a>
            </div>
        `;
    }

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
});