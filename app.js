// ========================================
// ESTADO GLOBAL
// ========================================

const STATE = {
    user: null,
    albums: [],
    cards: [],
    categories: [],
    currentAlbumId: null,
    currentCardId: null,
    currentCategoryId: null,
    sessionExpiry: 24 * 60 * 60 * 1000, // 24 horas
    filters: {
        search: '',
        team: '',
        category: '',
        status: ''
    }
};

// ========================================
// UTILIDADES
// ========================================

const Utils = {
    showLoader() {
        document.getElementById('loader').classList.remove('hidden');
    },
    
    hideLoader() {
        document.getElementById('loader').classList.add('hidden');
    },
    
    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type} show`;
        setTimeout(() => toast.classList.remove('show'), 3000);
    },
    
    openModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    },
    
    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    },
    
    showView(viewId) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(viewId).classList.add('active');
    },
    
    formatDate(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleDateString('es-ES');
    },
    
    getNextCardNumber(cards) {
        if (!cards.length) return 1;
        const maxNumber = Math.max(...cards.map(c => parseInt(c.number) || 0));
        return maxNumber + 1;
    },
    
    generateAvatar(name) {
        const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        const colors = ['#10B981', '#6366F1', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        const avatar = document.getElementById('userAvatar');
        avatar.style.background = `linear-gradient(135deg, ${color}, ${color}dd)`;
        avatar.style.display = 'flex';
        avatar.style.alignItems = 'center';
        avatar.style.justifyContent = 'center';
        avatar.style.fontSize = '1.2rem';
        avatar.style.fontWeight = 'bold';
        avatar.style.color = 'white';
        avatar.textContent = initials;
    }
};

// ========================================
// API CLIENT
// ========================================

const API = {
    async request(path, action = 'list', data = null) {
        console.log('📡 API REQUEST:', { path, action, data });
        
        if (!APP_CONFIG.API_URL) {
            console.error('❌ API_URL no configurada en config.js');
            throw new Error('API URL no configurada');
        }
        
        console.log('📡 API_URL:', APP_CONFIG.API_URL);
        
        let url = `${APP_CONFIG.API_URL}?path=${path}&action=${action}`;
        
        if (STATE.user && path !== 'users') {
            url += `&userId=${STATE.user.id}`;
        }
        
        if (STATE.currentAlbumId && path === 'categories') {
            url += `&albumId=${STATE.currentAlbumId}`;
        }
        
        if (data) {
            url += `&data=${encodeURIComponent(JSON.stringify(data))}`;
            
            const simpleParams = ['id', 'albumId'];
            simpleParams.forEach(param => {
                if (data[param] !== undefined) {
                    url += `&${param}=${encodeURIComponent(data[param])}`;
                }
            });
        }
        
        console.log('📡 URL FINAL:', url);
        
        try {
            console.log('📡 Haciendo fetch...');
            const response = await fetch(url, { method: 'GET' });
            console.log('📡 Response status:', response.status);
            
            const result = await response.json();
            console.log('📡 Response data:', result);
            
            if (!result.success) {
                throw new Error(result.error || 'Error en la petición');
            }
            
            return result.data;
        } catch (error) {
            console.error('❌ API Error:', error);
            throw error;
        }
    },
    
    register(name, email, password) {
        return this.request('users', 'register', { name, email, password });
    },
    
    login(email, password) {
        return this.request('users', 'login', { email, password });
    },
    
    getAlbums() {
        return this.request('albums', 'list');
    },
    
    createAlbum(album) {
        album.userId = STATE.user.id;
        return this.request('albums', 'create', album);
    },
    
    updateAlbum(album) {
        return this.request('albums', 'update', album);
    },
    
    deleteAlbum(id) {
        return this.request('albums', 'delete', { id });
    },
    
    getCards(albumId) {
        return this.request('cards', 'list', { albumId });
    },
    
    createCard(card) {
        return this.request('cards', 'create', card);
    },
    
    updateCard(card) {
        return this.request('cards', 'update', card);
    },
    
    updateCardStatus(id, field, value) {
        return this.request('cards', 'updateStatus', { id, field, value });
    },
    
    deleteCard(id) {
        return this.request('cards', 'delete', { id });
    },
    
    getCategories(albumId) {
        return this.request('categories', 'list', { albumId });
    },
    
    createCategory(category) {
        category.albumId = STATE.currentAlbumId;
        return this.request('categories', 'create', category);
    },
    
    updateCategory(category) {
        return this.request('categories', 'update', category);
    },
    
    deleteCategory(id) {
        return this.request('categories', 'delete', { id });
    },
    
    importCards(albumId, cards) {
        return this.request('import', 'cards', { albumId, cards });
    }
};

// ========================================
// SESIÓN Y AUTENTICACIÓN
// ========================================

const Session = {
    save(user) {
        const session = {
            user: user,
            timestamp: Date.now()
        };
        localStorage.setItem('cromos_session', JSON.stringify(session));
    },
    
    load() {
        const session = localStorage.getItem('cromos_session');
        if (!session) return null;
        
        try {
            const data = JSON.parse(session);
            const elapsed = Date.now() - data.timestamp;
            
            if (elapsed > STATE.sessionExpiry) {
                this.clear();
                return null;
            }
            
            return data.user;
        } catch (e) {
            return null;
        }
    },
    
    clear() {
        localStorage.removeItem('cromos_session');
    }
};

const Auth = {
    isLoginMode: true,
    
    toggleMode() {
        this.isLoginMode = !this.isLoginMode;
        
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const toggleBtn = document.getElementById('toggleAuthMode');
        
        if (this.isLoginMode) {
            loginForm.classList.remove('hidden');
            registerForm.classList.add('hidden');
            toggleBtn.textContent = '¿No tienes cuenta? Regístrate';
        } else {
            loginForm.classList.add('hidden');
            registerForm.classList.remove('hidden');
            toggleBtn.textContent = '¿Ya tienes cuenta? Inicia sesión';
        }
    },
    
    async handleLogin(e) {
        e.preventDefault();
        console.log('🔵 LOGIN: Iniciando...');
        
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        
        console.log('🔵 LOGIN: Email:', email);
        
        if (!email || !password) {
            Utils.showToast('Completa todos los campos', 'warning');
            return;
        }
        
        Utils.showLoader();
        
        try {
            console.log('🔵 LOGIN: Llamando a API.login...');
            const user = await API.login(email, password);
            console.log('🔵 LOGIN: Usuario recibido:', user);
            
            STATE.user = user;
            Session.save(user);
            
            this.showApp();
            await Controllers.init();
            
            Utils.showToast(`¡Bienvenido ${user.name}! 🎉`, 'success');
        } catch (error) {
            console.error('🔴 LOGIN ERROR:', error);
            if (error.message.includes('USER_NOT_FOUND')) {
                Utils.showToast('Usuario no encontrado', 'error');
            } else if (error.message.includes('INVALID_PASSWORD')) {
                Utils.showToast('Contraseña incorrecta', 'error');
            } else {
                Utils.showToast('Error al iniciar sesión: ' + error.message, 'error');
            }
        } finally {
            Utils.hideLoader();
        }
    },
    
    async handleRegister(e) {
        e.preventDefault();
        console.log('🟢 REGISTER: Iniciando...');
        
        const name = document.getElementById('registerName').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
        
        console.log('🟢 REGISTER: Nombre:', name);
        console.log('🟢 REGISTER: Email:', email);
        
        if (!name || !email || !password) {
            Utils.showToast('Completa todos los campos', 'warning');
            return;
        }
        
        if (password.length < 6) {
            Utils.showToast('La contraseña debe tener al menos 6 caracteres', 'warning');
            return;
        }
        
        if (password !== passwordConfirm) {
            Utils.showToast('Las contraseñas no coinciden', 'warning');
            return;
        }
        
        Utils.showLoader();
        
        try {
            console.log('🟢 REGISTER: Llamando a API.register...');
            const user = await API.register(name, email, password);
            console.log('🟢 REGISTER: Usuario creado:', user);
            
            STATE.user = user;
            Session.save(user);
            
            this.showApp();
            await Controllers.init();
            
            Utils.showToast(`¡Cuenta creada! Bienvenido ${user.name} 🎉`, 'success');
        } catch (error) {
            console.error('🔴 REGISTER ERROR:', error);
            if (error.message.includes('EMAIL_EXISTS')) {
                Utils.showToast('Este email ya está registrado', 'error');
            } else {
                Utils.showToast('Error al registrar: ' + error.message, 'error');
            }
        } finally {
            Utils.hideLoader();
        }
    },
    
    showApp() {
        document.getElementById('loginScreen').classList.remove('active');
        document.getElementById('mainApp').classList.remove('hidden');
        
        document.getElementById('userNameDisplay').textContent = STATE.user.name;
        Utils.generateAvatar(STATE.user.name);
    },
    
    logout() {
        Session.clear();
        STATE.user = null;
        STATE.albums = [];
        STATE.cards = [];
        STATE.categories = [];
        STATE.currentAlbumId = null;
        STATE.currentCardId = null;
        
        document.getElementById('mainApp').classList.add('hidden');
        document.getElementById('loginScreen').classList.add('active');
        
        document.getElementById('loginForm').reset();
        document.getElementById('registerForm').reset();
        
        Utils.showToast('Sesión cerrada', 'success');
    }
};

// ========================================
// RENDERIZADORES
// ========================================

const Render = {
    albums() {
        const container = document.getElementById('albumsGrid');
        
        if (!STATE.albums.length) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <div class="empty-state-icon">📚</div>
                    <h3>No hay álbumes</h3>
                    <p>Crea tu primer álbum para comenzar</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = STATE.albums.map(album => `
            <div class="album-card" data-id="${album.id}">
                <h3>${album.name}</h3>
                ${album.season ? `<p>🗓️ ${album.season}</p>` : ''}
                ${album.competition ? `<p>🏆 ${album.competition}</p>` : ''}
                <p style="margin-top: 8px;">📅 ${Utils.formatDate(album.createdAt)}</p>
            </div>
        `).join('');
        
        container.querySelectorAll('.album-card').forEach(card => {
            card.addEventListener('click', () => {
                Controllers.openAlbum(card.dataset.id);
            });
        });
    },
    
    albumDetail(albumId) {
        const album = STATE.albums.find(a => a.id == albumId);
        
        document.getElementById('albumTitle').textContent = album.name;
        document.getElementById('albumMeta').innerHTML = `
            ${album.season ? `🗓️ ${album.season}` : ''}
            ${album.competition ? `• 🏆 ${album.competition}` : ''}
        `;
        
        this.cards();
        this.stats();
    },
    
    cards() {
        const container = document.getElementById('cardsGrid');
        
        if (!STATE.cards.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🃏</div>
                    <h3>No hay cromos</h3>
                    <p>Añade cromos a este álbum</p>
                </div>
            `;
            return;
        }
        
        // Aplicar filtros
        let filteredCards = [...STATE.cards];
        
        if (STATE.filters.search) {
            const search = STATE.filters.search.toLowerCase();
            filteredCards = filteredCards.filter(c => 
                c.playerName.toLowerCase().includes(search) ||
                c.team.toLowerCase().includes(search)
            );
        }
        
        if (STATE.filters.team) {
            filteredCards = filteredCards.filter(c => c.team === STATE.filters.team);
        }
        
        if (STATE.filters.category) {
            filteredCards = filteredCards.filter(c => c.categoryId == STATE.filters.category);
        }
        
        if (STATE.filters.status) {
            if (STATE.filters.status === 'tengo') {
                filteredCards = filteredCards.filter(c => c.hasIt);
            } else if (STATE.filters.status === 'falta') {
                filteredCards = filteredCards.filter(c => !c.hasIt);
            } else if (STATE.filters.status === 'repetido') {
                filteredCards = filteredCards.filter(c => c.duplicatesCount > 0);
            }
        }
        
        const sortedCards = filteredCards.sort((a, b) => a.number - b.number);
        
        container.innerHTML = sortedCards.map(card => {
            const category = STATE.categories.find(c => c.id == card.categoryId);
            const statusClass = card.hasIt ? 'status-tengo' : 'status-falta';
            
            return `
                <div class="card-list-item-compact ${statusClass}" data-id="${card.id}">
                    <div class="card-num">#${card.number}</div>
                    <div class="card-info">
                        <div class="card-name">${card.playerName}</div>
                        <div class="card-meta">
                            ${card.team}
                            ${category ? `• <span style="color: ${category.color}">⬤</span> ${category.name}` : ''}
                        </div>
                    </div>
                    <div class="card-actions">
                        <button class="btn-compact btn-has ${card.hasIt ? 'active' : ''}" 
                                data-field="hasIt" data-value="${!card.hasIt}">
                            ${card.hasIt ? '✓' : '✗'}
                        </button>
                        <input type="number" 
                               class="duplicates-input" 
                               value="${card.duplicatesCount}" 
                               min="0" 
                               data-id="${card.id}"
                               placeholder="0">
                    </div>
                    <button class="btn-icon" title="Editar" onclick="Controllers.openEditCard('${card.id}')">✏️</button>
                </div>
            `;
        }).join('');
        
        // Event listeners para botones hasIt
        container.querySelectorAll('.btn-has').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const cardId = btn.closest('.card-list-item-compact').dataset.id;
                const value = btn.dataset.value === 'true';
                await Controllers.updateCardStatus(cardId, 'hasIt', value);
            });
        });
        
        // Event listeners para inputs de duplicados
        container.querySelectorAll('.duplicates-input').forEach(input => {
            input.addEventListener('change', async (e) => {
                const cardId = e.target.dataset.id;
                const value = parseInt(e.target.value) || 0;
                await Controllers.updateCardStatus(cardId, 'duplicatesCount', value);
            });
        });
        
        this.updateFilterOptions();
    },
    
    updateFilterOptions() {
        // Equipos únicos
        const teams = [...new Set(STATE.cards.map(c => c.team))].sort();
        const teamSelect = document.getElementById('filterTeam');
        if (teamSelect) {
            teamSelect.innerHTML = '<option value="">Todos los equipos</option>' + 
                teams.map(t => `<option value="${t}">${t}</option>`).join('');
            teamSelect.value = STATE.filters.team;
        }
        
        // Categorías
        const categorySelect = document.getElementById('filterCategory');
        if (categorySelect) {
            categorySelect.innerHTML = '<option value="">Todas las categorías</option>' + 
                STATE.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
            categorySelect.value = STATE.filters.category;
        }
        
        // Estado
        const statusSelect = document.getElementById('filterStatus');
        if (statusSelect) {
            statusSelect.value = STATE.filters.status;
        }
    },
    
    stats() {
        const total = STATE.cards.length;
        const tengo = STATE.cards.filter(c => c.hasIt).length;
        const falta = STATE.cards.filter(c => !c.hasIt).length;
        const repetido = STATE.cards.filter(c => c.duplicatesCount > 0).length;
        
        document.getElementById('statTotal').textContent = total;
        document.getElementById('statTengo').textContent = tengo;
        document.getElementById('statFalta').textContent = falta;
        document.getElementById('statRepetido').textContent = repetido;
    },
    
    categories() {
        const select = document.getElementById('cardCategory');
        
        if (!STATE.categories.length) {
            select.innerHTML = '<option value="">Crea una categoría primero</option>';
            return;
        }
        
        select.innerHTML = STATE.categories.map(cat => `
            <option value="${cat.id}">${cat.name}</option>
        `).join('');
        
        const list = document.getElementById('categoriesList');
        list.innerHTML = STATE.categories.map(cat => `
            <div class="category-item">
                <div class="category-color" style="background: ${cat.color}"></div>
                <div class="category-name">${cat.name}</div>
                <button class="btn-icon" onclick="Controllers.openEditCategory(${cat.id})" title="Editar">✏️</button>
                <button class="btn-icon" onclick="Controllers.deleteCategory(${cat.id})" title="Eliminar">🗑️</button>
            </div>
        `).join('');
    },
    
    cardList(cards, title, filterTeam = '', filterCategory = '') {
        document.getElementById('modalCardListTitle').textContent = title;
        const container = document.getElementById('cardListContent');
        
        // Filtros en el modal
        let filteredCards = [...cards];
        
        if (filterTeam) {
            filteredCards = filteredCards.filter(c => c.team === filterTeam);
        }
        
        if (filterCategory) {
            filteredCards = filteredCards.filter(c => c.categoryId == filterCategory);
        }
        
        if (!filteredCards.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No hay cromos que cumplan los filtros</p>
                </div>
            `;
            return;
        }
        
        const sortedCards = filteredCards.sort((a, b) => a.number - b.number);
        
        // Mostrar solo los números de los cromos
        container.innerHTML = sortedCards.map(card => {
            const duplicateClass = card.duplicatesCount > 0 ? 'has-duplicate' : '';
            const duplicateText = card.duplicatesCount > 0 ? ` (x${card.duplicatesCount})` : '';
            return `
                <div class="card-number-badge ${duplicateClass}" 
                     title="${card.playerName} - ${card.team}${duplicateText}">
                    ${card.number}
                </div>
            `;
        }).join('');
        
        // Actualizar filtros del modal
        const teams = [...new Set(cards.map(c => c.team))].sort();
        const teamSelect = document.getElementById('filterListTeam');
        if (teamSelect) {
            teamSelect.innerHTML = '<option value="">Todos los equipos</option>' + 
                teams.map(t => `<option value="${t}">${t}</option>`).join('');
            teamSelect.value = filterTeam;
        }
        
        const categorySelect = document.getElementById('filterListCategory');
        if (categorySelect) {
            categorySelect.innerHTML = '<option value="">Todas las categorías</option>' + 
                STATE.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
            categorySelect.value = filterCategory;
        }
    }
};

// ========================================
// CONTROLADORES
// ========================================

const Controllers = {
    async init() {
        await this.loadAlbums();
        this.setupEventListeners();
        Utils.hideLoader();
    },
    
    async loadAlbums() {
        try {
            STATE.albums = await API.getAlbums();
            Render.albums();
        } catch (error) {
            Utils.showToast('Error al cargar álbumes: ' + error.message, 'error');
        }
    },
    
    async openAlbum(albumId) {
        STATE.currentAlbumId = albumId;
        STATE.filters = { search: '', team: '', category: '', status: '' }; // Reset filtros
        
        try {
            Utils.showLoader();
            STATE.cards = await API.getCards(albumId);
            STATE.categories = await API.getCategories(albumId);
            Utils.showView('viewAlbumDetail');
            Render.albumDetail(albumId);
            Render.categories();
            
            // Setup filtros
            this.setupFilters();
        } catch (error) {
            Utils.showToast('Error al cargar álbum: ' + error.message, 'error');
        } finally {
            Utils.hideLoader();
        }
    },
    
    setupFilters() {
        const filterSearch = document.getElementById('filterSearch');
        const filterTeam = document.getElementById('filterTeam');
        const filterCategory = document.getElementById('filterCategory');
        const filterStatus = document.getElementById('filterStatus');
        const btnClearFilters = document.getElementById('btnClearFilters');
        
        if (filterSearch) {
            filterSearch.addEventListener('input', (e) => {
                STATE.filters.search = e.target.value;
                Render.cards();
            });
        }
        
        if (filterTeam) {
            filterTeam.addEventListener('change', (e) => {
                STATE.filters.team = e.target.value;
                Render.cards();
            });
        }
        
        if (filterCategory) {
            filterCategory.addEventListener('change', (e) => {
                STATE.filters.category = e.target.value;
                Render.cards();
            });
        }
        
        if (filterStatus) {
            filterStatus.addEventListener('change', (e) => {
                STATE.filters.status = e.target.value;
                Render.cards();
            });
        }
        
        if (btnClearFilters) {
            btnClearFilters.addEventListener('click', () => {
                STATE.filters = { search: '', team: '', category: '', status: '' };
                if (filterSearch) filterSearch.value = '';
                if (filterTeam) filterTeam.value = '';
                if (filterCategory) filterCategory.value = '';
                if (filterStatus) filterStatus.value = '';
                Render.cards();
            });
        }
    },
    
    async saveAlbum(e) {
        e.preventDefault();
        
        const album = {
            name: document.getElementById('albumName').value,
            season: document.getElementById('albumSeason').value,
            competition: document.getElementById('albumCompetition').value
        };
        
        try {
            Utils.showLoader();
            
            if (STATE.currentAlbumId && document.getElementById('modalAlbumTitle').textContent === 'Editar Álbum') {
                album.id = STATE.currentAlbumId;
                await API.updateAlbum(album);
                Utils.showToast('Álbum actualizado');
            } else {
                await API.createAlbum(album);
                Utils.showToast('Álbum creado');
            }
            
            Utils.closeModal('modalAlbum');
            await this.loadAlbums();
        } catch (error) {
            Utils.showToast('Error: ' + error.message, 'error');
        } finally {
            Utils.hideLoader();
        }
    },
    
    async deleteAlbum() {
        if (!confirm('¿Eliminar este álbum y todos sus cromos y categorías?')) return;
        
        try {
            Utils.showLoader();
            await API.deleteAlbum(STATE.currentAlbumId);
            Utils.showToast('Álbum eliminado');
            Utils.showView('viewAlbums');
            STATE.currentAlbumId = null;
            await this.loadAlbums();
        } catch (error) {
            Utils.showToast('Error: ' + error.message, 'error');
        } finally {
            Utils.hideLoader();
        }
    },
    
    async saveCard(e) {
        e.preventDefault();
        
        const categoryId = document.getElementById('cardCategory').value;
        
        if (!categoryId) {
            Utils.showToast('Debes crear una categoría primero', 'warning');
            return;
        }
        
        const card = {
            albumId: STATE.currentAlbumId,
            number: parseInt(document.getElementById('cardNumber').value),
            playerName: document.getElementById('cardPlayer').value,
            team: document.getElementById('cardTeam').value,
            categoryId: parseInt(categoryId),
            hasIt: document.getElementById('cardHasIt').checked,
            duplicatesCount: parseInt(document.getElementById('cardDuplicates').value) || 0
        };
        
        try {
            Utils.showLoader();
            
            if (STATE.currentCardId) {
                card.id = STATE.currentCardId;
                await API.updateCard(card);
                Utils.showToast('Cromo actualizado');
            } else {
                await API.createCard(card);
                Utils.showToast('Cromo creado');
            }
            
            Utils.closeModal('modalCard');
            STATE.currentCardId = null;
            await this.openAlbum(STATE.currentAlbumId);
        } catch (error) {
            Utils.showToast('Error: ' + error.message, 'error');
        } finally {
            Utils.hideLoader();
        }
    },
    
    async updateCardStatus(cardId, field, value) {
        try {
            await API.updateCardStatus(cardId, field, value);
            const card = STATE.cards.find(c => c.id == cardId);
            card[field] = value;
            Render.cards();
            Render.stats();
        } catch (error) {
            Utils.showToast('Error: ' + error.message, 'error');
        }
    },
    
    async saveCategory(e) {
        e.preventDefault();
        
        const category = {
            name: document.getElementById('categoryName').value,
            color: document.getElementById('categoryColor').value
        };
        
        try {
            await API.createCategory(category);
            Utils.showToast('Categoría creada');
            document.getElementById('formCategory').reset();
            STATE.categories = await API.getCategories(STATE.currentAlbumId);
            Render.categories();
        } catch (error) {
            Utils.showToast('Error: ' + error.message, 'error');
        }
    },
    
    openEditCategory(id) {
        STATE.currentCategoryId = id;
        const category = STATE.categories.find(c => c.id == id);
        
        document.getElementById('editCategoryName').value = category.name;
        document.getElementById('editCategoryColor').value = category.color;
        document.getElementById('editCategorySection').classList.remove('hidden');
    },
    
    async saveEditCategory(e) {
        e.preventDefault();
        
        const category = {
            id: STATE.currentCategoryId,
            albumId: STATE.currentAlbumId,
            name: document.getElementById('editCategoryName').value,
            color: document.getElementById('editCategoryColor').value
        };
        
        try {
            await API.updateCategory(category);
            Utils.showToast('Categoría actualizada');
            document.getElementById('editCategorySection').classList.add('hidden');
            STATE.currentCategoryId = null;
            STATE.categories = await API.getCategories(STATE.currentAlbumId);
            Render.categories();
            Render.cards(); // Refrescar para mostrar nuevos colores
        } catch (error) {
            Utils.showToast('Error: ' + error.message, 'error');
        }
    },
    
    cancelEditCategory() {
        document.getElementById('editCategorySection').classList.add('hidden');
        STATE.currentCategoryId = null;
    },
    
    async deleteCategory(id) {
        if (!confirm('¿Eliminar esta categoría?')) return;
        
        try {
            await API.deleteCategory(id);
            Utils.showToast('Categoría eliminada');
            STATE.categories = await API.getCategories(STATE.currentAlbumId);
            Render.categories();
        } catch (error) {
            Utils.showToast('Error al eliminar categoría: ' + error.message, 'error');
        }
    },
    
    openNewAlbum() {
        STATE.currentAlbumId = null;
        document.getElementById('modalAlbumTitle').textContent = 'Nuevo Álbum';
        document.getElementById('formAlbum').reset();
        Utils.openModal('modalAlbum');
    },
    
    openEditAlbum() {
        const album = STATE.albums.find(a => a.id == STATE.currentAlbumId);
        document.getElementById('modalAlbumTitle').textContent = 'Editar Álbum';
        document.getElementById('albumName').value = album.name;
        document.getElementById('albumSeason').value = album.season || '';
        document.getElementById('albumCompetition').value = album.competition || '';
        Utils.openModal('modalAlbum');
    },
    
    openNewCard() {
        STATE.currentCardId = null;
        document.getElementById('modalCardTitle').textContent = 'Nuevo Cromo';
        document.getElementById('formCard').reset();
        document.getElementById('cardNumber').value = Utils.getNextCardNumber(STATE.cards);
        document.getElementById('cardHasIt').checked = false;
        document.getElementById('cardDuplicates').value = 0;
        Utils.openModal('modalCard');
    },
    
    openEditCard(cardId) {
        STATE.currentCardId = cardId;
        const card = STATE.cards.find(c => c.id == cardId);
        document.getElementById('modalCardTitle').textContent = 'Editar Cromo';
        document.getElementById('cardNumber').value = card.number;
        document.getElementById('cardPlayer').value = card.playerName;
        document.getElementById('cardTeam').value = card.team;
        document.getElementById('cardCategory').value = card.categoryId;
        document.getElementById('cardHasIt').checked = card.hasIt;
        document.getElementById('cardDuplicates').value = card.duplicatesCount || 0;
        Utils.openModal('modalCard');
    },
    
    showFalta() {
        const faltaCards = STATE.cards.filter(c => !c.hasIt);
        Render.cardList(faltaCards, `Cromos que faltan (${faltaCards.length})`);
        Utils.openModal('modalCardList');
        
        // Setup filtros del modal
        this.setupModalFilters('falta');
    },
    
    showRepetido() {
        const repetidoCards = STATE.cards.filter(c => c.duplicatesCount > 0);
        Render.cardList(repetidoCards, `Cromos repetidos (${repetidoCards.length})`);
        Utils.openModal('modalCardList');
        
        // Setup filtros del modal
        this.setupModalFilters('repetido');
    },
    
    setupModalFilters(type) {
        const filterListTeam = document.getElementById('filterListTeam');
        const filterListCategory = document.getElementById('filterListCategory');
        
        if (filterListTeam) {
            filterListTeam.addEventListener('change', () => {
                const cards = type === 'falta' 
                    ? STATE.cards.filter(c => !c.hasIt)
                    : STATE.cards.filter(c => c.duplicatesCount > 0);
                Render.cardList(
                    cards, 
                    type === 'falta' ? `Cromos que faltan (${cards.length})` : `Cromos repetidos (${cards.length})`,
                    filterListTeam.value,
                    filterListCategory.value
                );
            });
        }
        
        if (filterListCategory) {
            filterListCategory.addEventListener('change', () => {
                const cards = type === 'falta' 
                    ? STATE.cards.filter(c => !c.hasIt)
                    : STATE.cards.filter(c => c.duplicatesCount > 0);
                Render.cardList(
                    cards, 
                    type === 'falta' ? `Cromos que faltan (${cards.length})` : `Cromos repetidos (${cards.length})`,
                    filterListTeam.value,
                    filterListCategory.value
                );
            });
        }
    },
    
    async processImport() {
        const format = document.getElementById('importFormat').value;
        const file = document.getElementById('importFile').files[0];
        const text = document.getElementById('importText').value;
        
        let content = text;
        
        if (file) {
            content = await file.text();
        }
        
        if (!content) {
            Utils.showToast('Proporcione un archivo o texto', 'warning');
            return;
        }
        
        try {
            let cards = [];
            
            if (format === 'json') {
                cards = JSON.parse(content);
            } else if (format === 'csv') {
                const lines = content.split('\n').filter(l => l.trim());
                lines.shift();
                cards = lines.map(line => {
                    const [number, playerName, team, categoryId, hasIt, duplicatesCount] = line.split(',');
                    return { 
                        number: parseInt(number), 
                        playerName, 
                        team, 
                        categoryId: parseInt(categoryId), 
                        hasIt: hasIt === 'true', 
                        duplicatesCount: parseInt(duplicatesCount) || 0
                    };
                });
            } else if (format === 'txt') {
                const lines = content.split('\n').filter(l => l.trim());
                cards = lines.map(line => {
                    const [number, playerName, team, categoryId, hasIt, duplicatesCount] = line.split('|');
                    return { 
                        number: parseInt(number), 
                        playerName, 
                        team, 
                        categoryId: parseInt(categoryId), 
                        hasIt: hasIt === 'true', 
                        duplicatesCount: parseInt(duplicatesCount) || 0
                    };
                });
            }
            
            Utils.showLoader();
            await API.importCards(STATE.currentAlbumId, cards);
            Utils.showToast(`${cards.length} cromos importados`);
            Utils.closeModal('modalImport');
            await this.openAlbum(STATE.currentAlbumId);
        } catch (error) {
            Utils.showToast('Error al importar: ' + error.message, 'error');
        } finally {
            Utils.hideLoader();
        }
    },
    
    processExport() {
        const format = document.getElementById('exportFormat').value;
        let content = '';
        let filename = '';
        
        if (format === 'json') {
            content = JSON.stringify(STATE.cards, null, 2);
            filename = 'cromos.json';
        } else if (format === 'csv') {
            content = 'number,playerName,team,categoryId,hasIt,duplicatesCount\n';
            content += STATE.cards.map(c => 
                `${c.number},${c.playerName},${c.team},${c.categoryId},${c.hasIt},${c.duplicatesCount}`
            ).join('\n');
            filename = 'cromos.csv';
        } else if (format === 'txt') {
            content = STATE.cards.map(c => 
                `${c.number}|${c.playerName}|${c.team}|${c.categoryId}|${c.hasIt}|${c.duplicatesCount}`
            ).join('\n');
            filename = 'cromos.txt';
        }
        
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        
        Utils.showToast('Archivo descargado');
        Utils.closeModal('modalExport');
    },
    
    setupEventListeners() {
        console.log('🎯 Configurando event listeners de la app...');
        
        const btnLogout = document.getElementById('btnLogout');
        if (btnLogout) {
            btnLogout.addEventListener('click', () => Auth.logout());
        }
        
        const btnNewAlbum = document.getElementById('btnNewAlbum');
        if (btnNewAlbum) {
            btnNewAlbum.addEventListener('click', () => this.openNewAlbum());
        }
        
        const btnBackToAlbums = document.getElementById('btnBackToAlbums');
        if (btnBackToAlbums) {
            btnBackToAlbums.addEventListener('click', () => Utils.showView('viewAlbums'));
        }
        
        const btnEditAlbum = document.getElementById('btnEditAlbum');
        if (btnEditAlbum) {
            btnEditAlbum.addEventListener('click', () => this.openEditAlbum());
        }
        
        const btnDeleteAlbum = document.getElementById('btnDeleteAlbum');
        if (btnDeleteAlbum) {
            btnDeleteAlbum.addEventListener('click', () => this.deleteAlbum());
        }
        
        const btnNewCard = document.getElementById('btnNewCard');
        if (btnNewCard) {
            btnNewCard.addEventListener('click', () => this.openNewCard());
        }
        
        const btnViewFalta = document.getElementById('btnViewFalta');
        if (btnViewFalta) {
            btnViewFalta.addEventListener('click', () => this.showFalta());
        }
        
        const btnViewRepetido = document.getElementById('btnViewRepetido');
        if (btnViewRepetido) {
            btnViewRepetido.addEventListener('click', () => this.showRepetido());
        }
        
        const btnManageCategories = document.getElementById('btnManageCategories');
        if (btnManageCategories) {
            btnManageCategories.addEventListener('click', () => Utils.openModal('modalCategories'));
        }
        
        const btnImport = document.getElementById('btnImport');
        if (btnImport) {
            btnImport.addEventListener('click', () => Utils.openModal('modalImport'));
        }
        
        const btnExport = document.getElementById('btnExport');
        if (btnExport) {
            btnExport.addEventListener('click', () => Utils.openModal('modalExport'));
        }
        
        const btnProcessImport = document.getElementById('btnProcessImport');
        if (btnProcessImport) {
            btnProcessImport.addEventListener('click', () => this.processImport());
        }
        
        const btnProcessExport = document.getElementById('btnProcessExport');
        if (btnProcessExport) {
            btnProcessExport.addEventListener('click', () => this.processExport());
        }
        
        const formAlbum = document.getElementById('formAlbum');
        if (formAlbum) {
            formAlbum.addEventListener('submit', (e) => this.saveAlbum(e));
        }
        
        const formCard = document.getElementById('formCard');
        if (formCard) {
            formCard.addEventListener('submit', (e) => this.saveCard(e));
        }
        
        const formCategory = document.getElementById('formCategory');
        if (formCategory) {
            formCategory.addEventListener('submit', (e) => this.saveCategory(e));
        }
        
        const formEditCategory = document.getElementById('formEditCategory');
        if (formEditCategory) {
            formEditCategory.addEventListener('submit', (e) => this.saveEditCategory(e));
        }
        
        const btnCancelEditCategory = document.getElementById('btnCancelEditCategory');
        if (btnCancelEditCategory) {
            btnCancelEditCategory.addEventListener('click', () => this.cancelEditCategory());
        }
        
        document.querySelectorAll('[data-close]').forEach(btn => {
            btn.addEventListener('click', () => Utils.closeModal(btn.dataset.close));
        });
        
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
        
        console.log('✅ Event listeners configurados');
    }
};

// ========================================
// INICIALIZACIÓN
// ========================================

window.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 APP INICIADA');
    console.log('📋 Config:', APP_CONFIG);
    
    // Registrar eventos de autenticación PRIMERO
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const toggleBtn = document.getElementById('toggleAuthMode');
    
    console.log('🔍 Elementos encontrados:', {
        loginForm: !!loginForm,
        registerForm: !!registerForm,
        toggleBtn: !!toggleBtn
    });
    
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            console.log('📝 LOGIN FORM SUBMIT');
            Auth.handleLogin(e);
        });
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            console.log('📝 REGISTER FORM SUBMIT');
            Auth.handleRegister(e);
        });
    }
    
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            console.log('🔄 TOGGLE AUTH MODE');
            Auth.toggleMode();
        });
    }
    
    // Intentar auto-login
    const savedUser = Session.load();
    
    if (savedUser) {
        console.log('✅ Sesión encontrada:', savedUser);
        STATE.user = savedUser;
        Auth.showApp();
        await Controllers.init();
    } else {
        console.log('ℹ️ No hay sesión guardada');
    }
});