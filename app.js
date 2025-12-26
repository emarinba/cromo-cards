// ========================================
// PARTE 1 DE 3: ESTADO, UTILIDADES, API Y AUTENTICACIÓN
// ========================================

const STATE = {
    user: null,
    albums: [],
    cards: [],
    categories: [],
    currentAlbumId: null,
    currentCardId: null,
    currentCategoryId: null,
    sessionExpiry: 24 * 60 * 60 * 1000,
    filters: {
        search: '',
        team: '',
        category: '',
        status: '',
        albumSearch: ''
    },
    viewMode: 'list',
    listViewMode: 'text',
    collapsedGroups: {},
    scrollPosition: 0,
    groupingEnabled: true
};

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
        if (!cards.length) return '1';
        const numbers = cards.filter(c => !isNaN(c.number)).map(c => parseInt(c.number));
        if (numbers.length) return (Math.max(...numbers) + 1).toString();
        return '1';
    },
    
    sortCards(cards) {
        return [...cards].sort((a, b) => {
            const aNum = parseInt(a.number);
            const bNum = parseInt(b.number);
            if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
            if (!isNaN(aNum)) return -1;
            if (!isNaN(bNum)) return 1;
            return a.number.localeCompare(b.number);
        });
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
    },
    
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : {r: 16, g: 185, b: 129};
    }
};

const API = {
    async request(path, action = 'list', data = null) {
        if (!APP_CONFIG.API_URL) throw new Error('API URL no configurada');
        let url = `${APP_CONFIG.API_URL}?path=${path}&action=${action}`;
        if (STATE.user && path !== 'users') url += `&userId=${STATE.user.id}`;
        if (STATE.currentAlbumId && path === 'categories') url += `&albumId=${STATE.currentAlbumId}`;
        if (data) {
            url += `&data=${encodeURIComponent(JSON.stringify(data))}`;
            const simpleParams = ['id', 'albumId'];
            simpleParams.forEach(param => {
                if (data[param] !== undefined) url += `&${param}=${encodeURIComponent(data[param])}`;
            });
        }
        try {
            const response = await fetch(url, { method: 'GET' });
            const result = await response.json();
            if (!result.success) throw new Error(result.error || 'Error en la petición');
            return result.data;
        } catch (error) {
            console.error('❌ API Error:', error);
            throw error;
        }
    },
    register(name, email, password) { return this.request('users', 'register', { name, email, password }); },
    login(email, password) { return this.request('users', 'login', { email, password }); },
    getAlbums() { return this.request('albums', 'list'); },
    createAlbum(album) { album.userId = STATE.user.id; return this.request('albums', 'create', album); },
    updateAlbum(album) { return this.request('albums', 'update', album); },
    deleteAlbum(id) { return this.request('albums', 'delete', { id }); },
    getCards(albumId) { return this.request('cards', 'list', { albumId }); },
    createCard(card) { return this.request('cards', 'create', card); },
    updateCard(card) { return this.request('cards', 'update', card); },
    updateCardStatus(id, field, value) { return this.request('cards', 'updateStatus', { id, field, value }); },
    deleteCard(id) { return this.request('cards', 'delete', { id }); },
    getCategories(albumId) { return this.request('categories', 'list', { albumId }); },
    createCategory(category) { category.albumId = STATE.currentAlbumId; return this.request('categories', 'create', category); },
    updateCategory(category) { return this.request('categories', 'update', category); },
    deleteCategory(id) { return this.request('categories', 'delete', { id }); },
    importCards(albumId, cards) { return this.request('import', 'cards', { albumId, cards }); }
};

const Session = {
    save(user) { localStorage.setItem('cromos_session', JSON.stringify({user: user, timestamp: Date.now()})); },
    load() {
        const session = localStorage.getItem('cromos_session');
        if (!session) return null;
        try {
            const data = JSON.parse(session);
            if (Date.now() - data.timestamp > STATE.sessionExpiry) {
                this.clear();
                return null;
            }
            return data.user;
        } catch (e) { return null; }
    },
    clear() { localStorage.removeItem('cromos_session'); }
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
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        if (!email || !password) {
            Utils.showToast('Completa todos los campos', 'warning');
            return;
        }
        Utils.showLoader();
        try {
            const user = await API.login(email, password);
            STATE.user = user;
            Session.save(user);
            this.showApp();
            await Controllers.init();
            Utils.showToast(`¡Bienvenido ${user.name}! 🎉`, 'success');
        } catch (error) {
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
        const name = document.getElementById('registerName').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
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
            const user = await API.register(name, email, password);
            STATE.user = user;
            Session.save(user);
            this.showApp();
            await Controllers.init();
            Utils.showToast(`¡Cuenta creada! Bienvenido ${user.name} 🎉`, 'success');
        } catch (error) {
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

function groupCards(cards, categories) {
    const grouped = {basic: {}, special: {}};
    cards.forEach(card => {
        const category = categories.find(c => c.id == card.categoryId);
        if (category?.isBasic) {
            if (!grouped.basic[card.team]) grouped.basic[card.team] = [];
            grouped.basic[card.team].push(card);
        } else {
            const catName = category?.name || 'Sin categoría';
            if (!grouped.special[catName]) grouped.special[catName] = {category: category, cards: []};
            grouped.special[catName].cards.push(card);
        }
    });
    return grouped;
}

// ========================================
// PARTE 2 DE 3: CONTROLADORES
// Pega esto DESPUÉS de la Parte 1
// ========================================

const Controllers = {
    currentModalCards: [],
    
    async init() {
        await this.loadAlbums();
        this.setupEventListeners();
        const savedView = localStorage.getItem('cromos_view_mode');
        if (savedView) STATE.viewMode = savedView;
        const savedGrouping = localStorage.getItem('cromos_grouping_enabled');
        if (savedGrouping !== null) STATE.groupingEnabled = savedGrouping === 'true';
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
        STATE.filters = { search: '', team: '', category: '', status: '' };
        const savedView = localStorage.getItem('cromos_view_mode');
        if (savedView) STATE.viewMode = savedView; else STATE.viewMode = 'list';
        try {
            Utils.showLoader();
            STATE.cards = await API.getCards(albumId);
            STATE.categories = await API.getCategories(albumId);
            Utils.showView('viewAlbumDetail');
            Render.albumDetail(albumId);
            Render.categories();
            this.setupFilters();
            const btn = document.getElementById('btnToggleView');
            if (btn) btn.textContent = STATE.viewMode === 'list' ? '🔄 Vista Álbum' : '🔄 Vista Lista';
            const btnGrouping = document.getElementById('btnToggleGrouping');
            if (btnGrouping) {
                btnGrouping.textContent = STATE.groupingEnabled ? '📁 Agrupar' : '📋 Sin agrupar';
                if (STATE.groupingEnabled) btnGrouping.classList.add('active');
                else btnGrouping.classList.remove('active');
            }
            const btnCollapseAll = document.getElementById('btnCollapseAll');
            const btnExpandAll = document.getElementById('btnExpandAll');

            if (STATE.groupingEnabled) {
                if (btnCollapseAll) btnCollapseAll.style.display = 'inline-flex';
                if (btnExpandAll) btnExpandAll.style.display = 'inline-flex';
            } else {
                if (btnCollapseAll) btnCollapseAll.style.display = 'none';
                if (btnExpandAll) btnExpandAll.style.display = 'none';
            }
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
            filterSearch.value = '';
            filterSearch.addEventListener('input', (e) => { STATE.filters.search = e.target.value; Render.cards(); });
        }
        if (filterTeam) filterTeam.addEventListener('change', (e) => { STATE.filters.team = e.target.value; Render.cards(); });
        if (filterCategory) filterCategory.addEventListener('change', (e) => { STATE.filters.category = e.target.value; Render.cards(); });
        if (filterStatus) filterStatus.addEventListener('change', (e) => { STATE.filters.status = e.target.value; Render.cards(); });
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
    
    toggleView() {
        STATE.viewMode = STATE.viewMode === 'list' ? 'album' : 'list';
        localStorage.setItem('cromos_view_mode', STATE.viewMode);
        const btn = document.getElementById('btnToggleView');
        btn.textContent = STATE.viewMode === 'list' ? '🔄 Vista Álbum' : '🔄 Vista Lista';
        Render.cards();
    },
    
    toggleGrouping() {
        STATE.groupingEnabled = !STATE.groupingEnabled;
        localStorage.setItem('cromos_grouping_enabled', STATE.groupingEnabled);
        
        const btn = document.getElementById('btnToggleGrouping');
        btn.textContent = STATE.groupingEnabled ? '📁 Agrupar' : '📋 Sin agrupar';
        
        if (STATE.groupingEnabled) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
        
        // Mostrar/ocultar botones de colapsar/expandir
        const btnCollapseAll = document.getElementById('btnCollapseAll');
        const btnExpandAll = document.getElementById('btnExpandAll');
        
        if (STATE.groupingEnabled) {
            if (btnCollapseAll) btnCollapseAll.style.display = 'inline-flex';
            if (btnExpandAll) btnExpandAll.style.display = 'inline-flex';
        } else {
            if (btnCollapseAll) btnCollapseAll.style.display = 'none';
            if (btnExpandAll) btnExpandAll.style.display = 'none';
        }
        
        Render.cards();
    },
    
    toggleGroup(groupId) {
        if (!STATE.collapsedGroups) STATE.collapsedGroups = {};
        STATE.collapsedGroups[groupId] = !STATE.collapsedGroups[groupId];
        Render.cards();
    },
    
    async saveAlbum(e) {
        e.preventDefault();
        const album = {
            name: document.getElementById('albumName').value,
            color: document.getElementById('albumColor').value,
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
        
        const cardData = {
            albumId: STATE.currentAlbumId,
            number: document.getElementById('cardNumber').value,
            playerName: document.getElementById('cardPlayer').value,
            team: document.getElementById('cardTeam').value,
            categoryId: parseInt(categoryId),
            status: document.getElementById('cardStatus').value,
            duplicatesCount: parseInt(document.getElementById('cardDuplicates').value) || 0
        };
        
        // CERRAR MODAL INMEDIATAMENTE (optimistic UI)
        Utils.closeModal('modalCard');
        
        try {
            if (STATE.currentCardId) {
                // ACTUALIZACIÓN: cambio instantáneo en UI
                const card = STATE.cards.find(c => c.id == STATE.currentCardId);
                const previousData = {...card}; // Backup para rollback
                
                // Actualizar UI inmediatamente
                Object.assign(card, cardData);
                Render.cards();
                Render.stats();
                
                // Guardar en backend
                cardData.id = STATE.currentCardId;
                await API.updateCard(cardData);
                Utils.showToast('Cromo actualizado', 'success');
                
            } else {
                // CREACIÓN: mostrar en UI inmediatamente
                const tempId = 'temp-' + Date.now();
                const newCard = {...cardData, id: tempId};
                STATE.cards.push(newCard);
                
                Render.cards();
                Render.stats();
                
                // Guardar en backend
                const savedCard = await API.createCard(cardData);
                
                // Reemplazar temp ID con ID real
                const index = STATE.cards.findIndex(c => c.id === tempId);
                if (index !== -1) STATE.cards[index] = savedCard;
                
                Utils.showToast('Cromo creado', 'success');
            }
            
            STATE.currentCardId = null;
            
            // Restaurar scroll
            const savedScroll = localStorage.getItem('cromos_scroll_position');
            if (savedScroll) {
                setTimeout(() => {
                    window.scrollTo({top: parseInt(savedScroll), behavior: 'smooth'});
                    localStorage.removeItem('cromos_scroll_position');
                }, 100);
            }
            
        } catch (error) {
            // ROLLBACK en caso de error
            Utils.showToast('Error al guardar. Recargando...', 'error');
            await this.openAlbum(STATE.currentAlbumId);
        }
    },
    
    async updateCardStatus(cardId, field, value) {
        const card = STATE.cards.find(c => c.id == cardId);
        const previousValue = card[field];
        try {
            card[field] = value;
            Render.cards();
            Render.stats();
            await API.updateCardStatus(cardId, field, value);
        } catch (error) {
            card[field] = previousValue;
            Render.cards();
            Render.stats();
            Utils.showToast('Error al actualizar. Cambio revertido.', 'error');
        }
    },
    
    async saveCategory(e) {
        e.preventDefault();
        const category = {
            name: document.getElementById('categoryName').value,
            color: document.getElementById('categoryColor').value,
            isBasic: document.getElementById('categoryIsBasic').checked
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
            Render.cards();
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
        Utils.openModal('modalAlbum');
        setTimeout(() => {
            document.getElementById('modalAlbumTitle').textContent = 'Nuevo Álbum';
            document.getElementById('formAlbum').reset();
            const colorInput = document.getElementById('albumColor');
            if (colorInput) colorInput.value = '#10B981';
        }, 0);
    },
    
    openEditAlbum() {
        const album = STATE.albums.find(a => a.id == STATE.currentAlbumId);
        if (!album) {
            Utils.showToast('No se encontró el álbum', 'error');
            return;
        }
        Utils.openModal('modalAlbum');
        setTimeout(() => {
            document.getElementById('modalAlbumTitle').textContent = 'Editar Álbum';
            const nameInput = document.getElementById('albumName');
            const colorInput = document.getElementById('albumColor');
            const seasonInput = document.getElementById('albumSeason');
            const competitionInput = document.getElementById('albumCompetition');
            if (nameInput) nameInput.value = album.name;
            if (colorInput) colorInput.value = album.color || '#10B981';
            if (seasonInput) seasonInput.value = album.season || '';
            if (competitionInput) competitionInput.value = album.competition || '';
        }, 0);
    },
    
    openNewCard() {
        STATE.currentCardId = null;
        document.getElementById('modalCardTitle').textContent = 'Nuevo Cromo';
        document.getElementById('formCard').reset();
        document.getElementById('cardNumber').value = Utils.getNextCardNumber(STATE.cards);
        document.getElementById('cardStatus').value = 'falta';
        document.getElementById('cardDuplicates').value = 0;
        const btnDelete = document.getElementById('btnDeleteCard');
        if (btnDelete) btnDelete.classList.add('hidden');
        Utils.openModal('modalCard');
    },
    
    openEditCard(cardId) {
        localStorage.setItem('cromos_view_mode', STATE.viewMode);
        localStorage.setItem('cromos_scroll_position', window.scrollY);
        STATE.currentCardId = cardId;
        const card = STATE.cards.find(c => c.id == cardId);
        document.getElementById('modalCardTitle').textContent = 'Editar Cromo';
        document.getElementById('cardNumber').value = card.number;
        document.getElementById('cardPlayer').value = card.playerName;
        document.getElementById('cardTeam').value = card.team;
        document.getElementById('cardCategory').value = card.categoryId;
        document.getElementById('cardStatus').value = card.status;
        document.getElementById('cardDuplicates').value = card.duplicatesCount || 0;
        const btnDelete = document.getElementById('btnDeleteCard');
        if (btnDelete) btnDelete.classList.remove('hidden');
        Utils.openModal('modalCard');
    },
    
    async deleteCard() {
        if (!STATE.currentCardId) return;
        if (!confirm('¿Eliminar este cromo?')) return;
        try {
            Utils.showLoader();
            await API.deleteCard(STATE.currentCardId);
            Utils.showToast('Cromo eliminado');
            Utils.closeModal('modalCard');
            STATE.currentCardId = null;
            await this.openAlbum(STATE.currentAlbumId);
        } catch (error) {
            Utils.showToast('Error: ' + error.message, 'error');
        } finally {
            Utils.hideLoader();
        }
    },
    
    showFalta() {
        const faltaCards = STATE.cards.filter(c => c.status === 'falta');
        Render.cardListModal(faltaCards, `Cromos que faltan (${faltaCards.length})`);
        Utils.openModal('modalCardList');
        this.setupModalViews();
    },
    
    showRepetido() {
        const repetidoCards = STATE.cards.filter(c => c.duplicatesCount > 0);
        Render.cardListModal(repetidoCards, `Cromos repetidos (${repetidoCards.length})`);
        Utils.openModal('modalCardList');
        this.setupModalViews();
    },
    
    setupModalViews() {
        const btnViewText = document.getElementById('btnViewText');
        const btnViewGrouped = document.getElementById('btnViewGrouped');
        const btnCopyText = document.getElementById('btnCopyText');
        const filterListCategory = document.getElementById('filterListCategory');
        if (btnViewText) {
            btnViewText.replaceWith(btnViewText.cloneNode(true));
            document.getElementById('btnViewText').addEventListener('click', () => {
                Render.renderTextView(this.currentModalCards);
            });
        }
        if (btnViewGrouped) {
            btnViewGrouped.replaceWith(btnViewGrouped.cloneNode(true));
            document.getElementById('btnViewGrouped').addEventListener('click', () => {
                Render.renderGroupedView(this.currentModalCards);
            });
        }
        if (btnCopyText) {
            btnCopyText.replaceWith(btnCopyText.cloneNode(true));
            document.getElementById('btnCopyText').addEventListener('click', () => {
                const text = document.getElementById('textListContent').textContent;
                navigator.clipboard.writeText(text).then(() => {
                    Utils.showToast('Números copiados al portapapeles');
                });
            });
        }
        if (filterListCategory) {
            filterListCategory.replaceWith(filterListCategory.cloneNode(true));
            document.getElementById('filterListCategory').addEventListener('change', (e) => {
                Render.renderGroupedView(this.currentModalCards, e.target.value);
            });
        }
    },
    
    async processImport() {
        const format = document.getElementById('importFormat').value;
        const file = document.getElementById('importFile').files[0];
        const text = document.getElementById('importText').value;
        let content = text;
        if (file) content = await file.text();
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
                    const [number, playerName, team, categoryId, status, duplicatesCount] = line.split(',');
                    return { number, playerName, team, categoryId: parseInt(categoryId), status: status || 'falta', duplicatesCount: parseInt(duplicatesCount) || 0 };
                });
            } else if (format === 'txt') {
                const lines = content.split('\n').filter(l => l.trim());
                cards = lines.map(line => {
                    const [number, playerName, team, categoryId, status, duplicatesCount] = line.split('|');
                    return { number, playerName, team, categoryId: parseInt(categoryId), status: status || 'falta', duplicatesCount: parseInt(duplicatesCount) || 0 };
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
            content = 'number,playerName,team,categoryId,status,duplicatesCount\n';
            content += STATE.cards.map(c => `${c.number},${c.playerName},${c.team},${c.categoryId},${c.status},${c.duplicatesCount}`).join('\n');
            filename = 'cromos.csv';
        } else if (format === 'txt') {
            content = STATE.cards.map(c => `${c.number}|${c.playerName}|${c.team}|${c.categoryId}|${c.status}|${c.duplicatesCount}`).join('\n');
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
        const btnLogout = document.getElementById('btnLogout');
        if (btnLogout) btnLogout.addEventListener('click', () => Auth.logout());
        const btnNewAlbum = document.getElementById('btnNewAlbum');
        if (btnNewAlbum) btnNewAlbum.addEventListener('click', () => this.openNewAlbum());
        const filterAlbumSearch = document.getElementById('filterAlbumSearch');
        if (filterAlbumSearch) filterAlbumSearch.addEventListener('input', (e) => { STATE.filters.albumSearch = e.target.value; Render.albums(); });
        const btnBackToAlbums = document.getElementById('btnBackToAlbums');
        if (btnBackToAlbums) btnBackToAlbums.addEventListener('click', () => Utils.showView('viewAlbums'));
        const btnEditAlbum = document.getElementById('btnEditAlbum');
        if (btnEditAlbum) btnEditAlbum.addEventListener('click', () => this.openEditAlbum());
        const btnDeleteAlbum = document.getElementById('btnDeleteAlbum');
        if (btnDeleteAlbum) btnDeleteAlbum.addEventListener('click', () => this.deleteAlbum());
        const btnNewCard = document.getElementById('btnNewCard');
        if (btnNewCard) btnNewCard.addEventListener('click', () => this.openNewCard());
        const btnViewFalta = document.getElementById('btnViewFalta');
        if (btnViewFalta) btnViewFalta.addEventListener('click', () => this.showFalta());
        const btnViewRepetido = document.getElementById('btnViewRepetido');
        if (btnViewRepetido) btnViewRepetido.addEventListener('click', () => this.showRepetido());
        const btnToggleView = document.getElementById('btnToggleView');
        if (btnToggleView) btnToggleView.addEventListener('click', () => this.toggleView());
        const btnToggleGrouping = document.getElementById('btnToggleGrouping');
        if (btnToggleGrouping) btnToggleGrouping.addEventListener('click', () => this.toggleGrouping());
        const btnCollapseAll = document.getElementById('btnCollapseAll');
        if (btnCollapseAll) btnCollapseAll.addEventListener('click', () => this.collapseAllGroups());
        const btnExpandAll = document.getElementById('btnExpandAll');
        if (btnExpandAll) btnExpandAll.addEventListener('click', () => this.expandAllGroups());
        const btnManageCategories = document.getElementById('btnManageCategories');
        if (btnManageCategories) btnManageCategories.addEventListener('click', () => Utils.openModal('modalCategories'));
        const btnImport = document.getElementById('btnImport');
        if (btnImport) btnImport.addEventListener('click', () => Utils.openModal('modalImport'));
        const btnExport = document.getElementById('btnExport');
        if (btnExport) btnExport.addEventListener('click', () => Utils.openModal('modalExport'));
        const btnProcessImport = document.getElementById('btnProcessImport');
        if (btnProcessImport) btnProcessImport.addEventListener('click', () => this.processImport());
        const btnProcessExport = document.getElementById('btnProcessExport');
        if (btnProcessExport) btnProcessExport.addEventListener('click', () => this.processExport());
        const formAlbum = document.getElementById('formAlbum');
        if (formAlbum) formAlbum.addEventListener('submit', (e) => this.saveAlbum(e));
        const formCard = document.getElementById('formCard');
        if (formCard) formCard.addEventListener('submit', (e) => this.saveCard(e));
        const btnDeleteCard = document.getElementById('btnDeleteCard');
        if (btnDeleteCard) btnDeleteCard.addEventListener('click', () => this.deleteCard());
        const formCategory = document.getElementById('formCategory');
        if (formCategory) formCategory.addEventListener('submit', (e) => this.saveCategory(e));
        const formEditCategory = document.getElementById('formEditCategory');
        if (formEditCategory) formEditCategory.addEventListener('submit', (e) => this.saveEditCategory(e));
        const btnCancelEditCategory = document.getElementById('btnCancelEditCategory');
        if (btnCancelEditCategory) btnCancelEditCategory.addEventListener('click', () => this.cancelEditCategory());
        document.querySelectorAll('[data-close]').forEach(btn => {
            btn.addEventListener('click', () => Utils.closeModal(btn.dataset.close));
        });
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.remove('active');
            });
        });
    },

    collapseAllGroups() {
        // Obtener todos los grupos visibles
        const allGroups = [];
        const grouped = groupCards(STATE.cards, STATE.categories);
        
        Object.keys(grouped.basic).forEach(team => {
            allGroups.push(`basic-${team.replace(/\s/g, '-')}`);
        });
        
        Object.keys(grouped.special).forEach(catName => {
            allGroups.push(`special-${catName.replace(/\s/g, '-')}`);
        });
        
        // Colapsar todos
        if (!STATE.collapsedGroups) STATE.collapsedGroups = {};
        allGroups.forEach(groupId => {
            STATE.collapsedGroups[groupId] = true;
        });
        
        Render.cards();
    },

    expandAllGroups() {
        // Limpiar todos los colapsados
        STATE.collapsedGroups = {};
        Render.cards();
    }
};

// ========================================
// PARTE 3 DE 3: RENDERIZADORES E INICIALIZACIÓN
// Pega esto DESPUÉS de la Parte 2
// ========================================

window.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 APP INICIADA');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const toggleBtn = document.getElementById('toggleAuthMode');
    if (loginForm) loginForm.addEventListener('submit', (e) => Auth.handleLogin(e));
    if (registerForm) registerForm.addEventListener('submit', (e) => Auth.handleRegister(e));
    if (toggleBtn) toggleBtn.addEventListener('click', () => Auth.toggleMode());
    const savedUser = Session.load();
    if (savedUser) {
        console.log('✅ Sesión encontrada');
        STATE.user = savedUser;
        Auth.showApp();
        await Controllers.init();
    }
});

const Render = {
    albums() {
        const container = document.getElementById('albumsGrid');
        let filteredAlbums = STATE.albums;
        if (STATE.filters.albumSearch) {
            const search = STATE.filters.albumSearch.toLowerCase();
            filteredAlbums = STATE.albums.filter(a => a.name.toLowerCase().includes(search));
        }
        if (!filteredAlbums.length) {
            container.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;"><div class="empty-state-icon">📚</div><h3>No hay álbumes</h3><p>${STATE.filters.albumSearch ? 'No se encontraron álbumes' : 'Crea tu primer álbum'}</p></div>`;
            return;
        }
        container.innerHTML = filteredAlbums.map(album => `
            <div class="album-card" data-id="${album.id}" style="border-left-color: ${album.color}; color: ${album.color};">
                <h3>${album.name}</h3>
                ${album.season ? `<p>🗓️ ${album.season}</p>` : ''}
                ${album.competition ? `<p>🏆 ${album.competition}</p>` : ''}
                <p style="margin-top: 8px;">📅 ${Utils.formatDate(album.createdAt)}</p>
            </div>
        `).join('');
        container.querySelectorAll('.album-card').forEach(card => {
            card.addEventListener('click', () => Controllers.openAlbum(card.dataset.id));
        });
    },
    
    albumDetail(albumId) {
        const album = STATE.albums.find(a => a.id == albumId);
        document.getElementById('albumTitle').textContent = album.name;
        document.getElementById('albumTitle').style.color = album.color;
        document.getElementById('albumMeta').innerHTML = `${album.season ? `🗓️ ${album.season}` : ''} ${album.competition ? `• 🏆 ${album.competition}` : ''}`;
        this.cards();
        this.stats();
    },
    
    cards() {
        const container = document.getElementById('cardsGrid');
        if (!STATE.cards.length) {
            container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🃏</div><h3>No hay cromos</h3><p>Añade cromos a este álbum</p></div>`;
            return;
        }
        let filteredCards = [...STATE.cards];
        if (STATE.filters.search) {
            const search = STATE.filters.search.toLowerCase();
            filteredCards = filteredCards.filter(c => c.playerName.toLowerCase().includes(search) || c.team.toLowerCase().includes(search) || c.number.toLowerCase().includes(search));
        }
        if (STATE.filters.team) filteredCards = filteredCards.filter(c => c.team === STATE.filters.team);
        if (STATE.filters.category) filteredCards = filteredCards.filter(c => c.categoryId == STATE.filters.category);
        if (STATE.filters.status) filteredCards = filteredCards.filter(c => c.status === STATE.filters.status);
        const sortedCards = Utils.sortCards(filteredCards);
        if (STATE.viewMode === 'list') {
            if (STATE.groupingEnabled) this.renderGroupedListView(sortedCards, container);
            else this.renderListView(sortedCards, container);
        } else {
            if (STATE.groupingEnabled) this.renderGroupedAlbumView(sortedCards, container);
            else this.renderAlbumView(sortedCards, container);
        }
        this.updateFilterOptions();
    },
    
    renderGroupedListView(cards, container) {
        const grouped = groupCards(cards, STATE.categories);
        let html = '';
        container.className = 'cards-list';
        Object.entries(grouped.basic).sort().forEach(([team, teamCards]) => {
            const sortedCards = Utils.sortCards(teamCards);
            const groupId = `basic-${team.replace(/\s/g, '-')}`;
            const isCollapsed = STATE.collapsedGroups?.[groupId] || false;
            html += `<div class="card-group"><div class="card-group-header" onclick="Controllers.toggleGroup('${groupId}')"><span class="group-toggle">${isCollapsed ? '▶' : '▼'}</span><span class="group-title">⚽ ${team}</span><span class="group-count">${sortedCards.length} cromos</span></div><div class="card-group-content ${isCollapsed ? 'collapsed' : ''}">${sortedCards.map(card => this.renderCardItemHTML(card)).join('')}</div></div>`;
        });
        Object.entries(grouped.special).forEach(([catName, data]) => {
            const sortedCards = Utils.sortCards(data.cards);
            const groupId = `special-${catName.replace(/\s/g, '-')}`;
            const isCollapsed = STATE.collapsedGroups?.[groupId] || false;
            const color = data.category?.color || '#6366F1';
            html += `<div class="card-group"><div class="card-group-header" onclick="Controllers.toggleGroup('${groupId}')" style="border-left-color: ${color}"><span class="group-toggle">${isCollapsed ? '▶' : '▼'}</span><span class="group-title" style="color: ${color}">★ ${catName}</span><span class="group-count">${sortedCards.length} cromos</span></div><div class="card-group-content ${isCollapsed ? 'collapsed' : ''}">${sortedCards.map(card => this.renderCardItemHTML(card)).join('')}</div></div>`;
        });
        container.innerHTML = html;
        this.setupCardListeners(container);
    },
    
    renderCardItemHTML(card) {
        const category = STATE.categories.find(c => c.id == card.categoryId);
        const categoryColor = category?.color || '#10B981';
        const rgb = Utils.hexToRgb(categoryColor);
        const categoryBg = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.08)`;
        return `<div class="card-list-item-compact status-${card.status}" data-id="${card.id}" style="background: linear-gradient(90deg, ${categoryBg} 0%, #ffffff 15%);"><div class="card-num">${card.number}</div><div class="card-info"><div class="card-name">${card.playerName}</div><div class="card-meta">${card.team}${category ? ` • <span style="color: ${category.color}">■</span> ${category.name}` : ''}</div></div><div class="card-actions-horizontal"><button class="status-btn-horizontal ${card.status === 'falta' ? 'active' : ''}" data-status="falta" title="No lo tengo">✗</button><button class="status-btn-horizontal ${card.status === 'tengo' ? 'active' : ''}" data-status="tengo" title="Lo tengo">✓</button><button class="status-btn-horizontal ${card.status === 'cambiado' ? 'active' : ''}" data-status="cambiado" title="Cambiado">⇄</button><input type="number" class="duplicates-input" value="${card.duplicatesCount}" min="0" data-id="${card.id}" title="Repetidos" placeholder="0"></div></div>`;
    },
    
    renderListView(cards, container) {
        container.className = 'cards-list';
        container.innerHTML = cards.map(card => this.renderCardItemHTML(card)).join('');
        this.setupCardListeners(container);
    },
    
    setupCardListeners(container) {
        container.querySelectorAll('.status-btn-horizontal').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const cardId = btn.closest('.card-list-item-compact').dataset.id;
                const status = btn.dataset.status;
                await Controllers.updateCardStatus(cardId, 'status', status);
            });
        });
        container.querySelectorAll('.duplicates-input').forEach(input => {
            input.addEventListener('change', async (e) => {
                const cardId = e.target.dataset.id;
                const value = parseInt(e.target.value) || 0;
                await Controllers.updateCardStatus(cardId, 'duplicatesCount', value);
            });
        });
        container.querySelectorAll('.card-list-item-compact').forEach(item => {
            item.addEventListener('dblclick', () => Controllers.openEditCard(item.dataset.id));
        });
    },
    
    renderGroupedAlbumView(cards, container) {
        const grouped = groupCards(cards, STATE.categories);
        let html = '';
        container.className = 'cards-album-view';
        Object.entries(grouped.basic).sort().forEach(([team, teamCards]) => {
            const sortedCards = Utils.sortCards(teamCards);
            const groupId = `basic-${team.replace(/\s/g, '-')}`;
            const isCollapsed = STATE.collapsedGroups?.[groupId] || false;
            html += `<div style="grid-column: 1/-1;"><div class="card-group-header" onclick="Controllers.toggleGroup('${groupId}')"><span class="group-toggle">${isCollapsed ? '▶' : '▼'}</span><span class="group-title">⚽ ${team}</span><span class="group-count">${sortedCards.length} cromos</span></div></div>${isCollapsed ? '' : sortedCards.map(card => this.renderAlbumCardHTML(card)).join('')}`;
        });
        Object.entries(grouped.special).forEach(([catName, data]) => {
            const sortedCards = Utils.sortCards(data.cards);
            const groupId = `special-${catName.replace(/\s/g, '-')}`;
            const isCollapsed = STATE.collapsedGroups?.[groupId] || false;
            const color = data.category?.color || '#6366F1';
            html += `<div style="grid-column: 1/-1;"><div class="card-group-header" onclick="Controllers.toggleGroup('${groupId}')" style="border-left-color: ${color}"><span class="group-toggle">${isCollapsed ? '▶' : '▼'}</span><span class="group-title" style="color: ${color}">★ ${catName}</span><span class="group-count">${sortedCards.length} cromos</span></div></div>${isCollapsed ? '' : sortedCards.map(card => this.renderAlbumCardHTML(card)).join('')}`;
        });
        container.innerHTML = html;
        this.setupAlbumCardListeners(container);
    },
    
    renderAlbumCardHTML(card) {
        const category = STATE.categories.find(c => c.id == card.categoryId);
        return `<div class="card-album-item status-${card.status}" data-id="${card.id}">${card.duplicatesCount > 0 ? `<div class="album-duplicate-badge">x${card.duplicatesCount}</div>` : ''}<button class="album-side-btn left ${card.status === 'falta' ? 'active' : ''}" data-status="falta" title="No lo tengo">✗</button><div class="album-card-content" data-edit="${card.id}"><div class="album-card-number">${card.number}</div><div class="album-card-name" title="${card.playerName}">${card.playerName}</div><div class="album-card-team">${card.team}</div><div class="album-card-category" style="color: ${category?.color || '#10B981'}">${category?.name || 'Sin categoría'}</div><div class="album-bottom-controls"><button class="album-mini-btn ${card.status === 'cambiado' ? 'active' : ''}" data-status="cambiado" title="Cambiado">⇄</button><input type="number" class="mini-duplicates-input" value="${card.duplicatesCount}" min="0" data-id="${card.id}" title="Repetidos"></div></div><button class="album-side-btn right ${card.status === 'tengo' ? 'active' : ''}" data-status="tengo" title="Lo tengo">✓</button></div>`;
    },
    
    renderAlbumView(cards, container) {
        container.className = 'cards-album-view';
        container.innerHTML = cards.map(card => this.renderAlbumCardHTML(card)).join('');
        this.setupAlbumCardListeners(container);
    },
    
    setupAlbumCardListeners(container) {
        container.querySelectorAll('.album-side-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const cardId = btn.closest('.card-album-item').dataset.id;
                const status = btn.dataset.status;
                await Controllers.updateCardStatus(cardId, 'status', status);
            });
        });
        container.querySelectorAll('.album-mini-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const cardId = btn.closest('.card-album-item').dataset.id;
                const status = btn.dataset.status;
                const currentCard = STATE.cards.find(c => c.id == cardId);
                const newStatus = currentCard.status === status ? 'falta' : status;
                await Controllers.updateCardStatus(cardId, 'status', newStatus);
            });
        });
        container.querySelectorAll('.mini-duplicates-input').forEach(input => {
            input.addEventListener('change', async (e) => {
                e.stopPropagation();
                const cardId = e.target.dataset.id;
                const value = parseInt(e.target.value) || 0;
                await Controllers.updateCardStatus(cardId, 'duplicatesCount', value);
            });
        });
        container.querySelectorAll('.album-card-content').forEach(content => {
            content.addEventListener('click', () => Controllers.openEditCard(content.dataset.edit));
        });
    },
    
    updateFilterOptions() {
        const teams = [...new Set(STATE.cards.map(c => c.team))].sort();
        const teamSelect = document.getElementById('filterTeam');
        if (teamSelect) {
            teamSelect.innerHTML = '<option value="">Todos los equipos</option>' + teams.map(t => `<option value="${t}">${t}</option>`).join('');
            teamSelect.value = STATE.filters.team;
        }
        const categorySelect = document.getElementById('filterCategory');
        if (categorySelect) {
            categorySelect.innerHTML = '<option value="">Todas las categorías</option>' + STATE.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
            categorySelect.value = STATE.filters.category;
        }
        const statusSelect = document.getElementById('filterStatus');
        if (statusSelect) statusSelect.value = STATE.filters.status;
    },
    
    stats() {
        const total = STATE.cards.length;
        const tengo = STATE.cards.filter(c => c.status === 'tengo').length;
        const falta = STATE.cards.filter(c => c.status === 'falta').length;
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
        select.innerHTML = STATE.categories.map(cat => `<option value="${cat.id}">${cat.name}${cat.isBasic ? ' (Básica)' : ''}</option>`).join('');
        const list = document.getElementById('categoriesList');
        list.innerHTML = STATE.categories.map(cat => `<div class="category-item"><div class="category-color" style="background: ${cat.color}"></div><div class="category-name">${cat.name} ${cat.isBasic ? '⭐' : ''}</div><button class="btn-icon" onclick="Controllers.openEditCategory(${cat.id})" title="Editar">✏️</button><button class="btn-icon" onclick="Controllers.deleteCategory(${cat.id})" title="Eliminar">🗑️</button></div>`).join('');
    },
    
    cardListModal(cards, title) {
        document.getElementById('modalCardListTitle').textContent = title;
        Controllers.currentModalCards = cards;
        this.renderTextView(cards);
    },
    
    renderTextView(cards) {
        const sortedCards = Utils.sortCards(cards);
        const numbers = sortedCards.map(c => c.number).join(', ');
        document.getElementById('textListContent').textContent = numbers;
        document.getElementById('viewTextContent').classList.add('active');
        document.getElementById('viewGroupedContent').classList.remove('active');
        document.getElementById('btnViewText').classList.add('active');
        document.getElementById('btnViewGrouped').classList.remove('active');
    },
    
    renderGroupedView(cards, filterCategory = '') {
        const container = document.getElementById('groupedListContent');
        let filteredCards = cards;
        if (filterCategory) filteredCards = cards.filter(c => c.categoryId == filterCategory);
        const grouped = {};
        filteredCards.forEach(card => {
            const category = STATE.categories.find(c => c.id == card.categoryId);
            const catName = category ? category.name : 'Sin categoría';
            const catId = category ? category.id : 'none';
            const isBasic = category ? category.isBasic : false;
            if (!grouped[catId]) grouped[catId] = {name: catName, isBasic: isBasic, teams: {}};
            if (isBasic) {
                if (!grouped[catId].teams[card.team]) grouped[catId].teams[card.team] = [];
                grouped[catId].teams[card.team].push(card);
            } else {
                if (!grouped[catId].teams['all']) grouped[catId].teams['all'] = [];
                grouped[catId].teams['all'].push(card);
            }
        });
        let html = '';
        const sortedGroups = Object.entries(grouped).sort((a, b) => {
            if (a[1].isBasic && !b[1].isBasic) return -1;
            if (!a[1].isBasic && b[1].isBasic) return 1;
            return a[1].name.localeCompare(b[1].name);
        });
        sortedGroups.forEach(([catId, catData]) => {
            html += `<div class="grouped-section"><h4>${catData.name} ${catData.isBasic ? '<span class="badge-basic">BÁSICA</span>' : ''}</h4>`;
            if (catData.isBasic) {
                Object.entries(catData.teams).sort((a, b) => a[0].localeCompare(b[0])).forEach(([team, teamCards]) => {
                    const sortedCards = Utils.sortCards(teamCards);
                    html += `<div style="margin-bottom: 1rem;"><strong style="color: var(--text-secondary); font-size: 0.9rem; display: block; margin-bottom: 0.5rem;">${team}</strong><div class="numbers-list">`;
                    sortedCards.forEach(card => html += `<div class="number-item">${card.number}</div>`);
                    html += `</div></div>`;
                });
            } else {
                if (catData.teams['all']) {
                    const sortedCards = Utils.sortCards(catData.teams['all']);
                    html += `<div class="numbers-list">`;
                    sortedCards.forEach(card => html += `<div class="number-item">${card.number}</div>`);
                    html += `</div>`;
                }
            }
            html += `</div>`;
        });
        if (!html) html = '<div class="empty-state"><p>No hay cromos en esta categoría</p></div>';
        container.innerHTML = html;
        document.getElementById('viewTextContent').classList.remove('active');
        document.getElementById('viewGroupedContent').classList.add('active');
        document.getElementById('btnViewText').classList.remove('active');
        document.getElementById('btnViewGrouped').classList.add('active');
        const categorySelect = document.getElementById('filterListCategory');
        if (categorySelect) {
            categorySelect.innerHTML = '<option value="">Todas las categorías</option>' + STATE.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
            categorySelect.value = filterCategory;
        }
    }
};