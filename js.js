// ========================================
// ESTADO GLOBAL Y USUARIO
// ========================================

const STATE = {
    user: null,
    albums: [],
    cards: [],
    categories: []
};

// ========================================
// GOOGLE LOGIN
// ========================================

function handleCredentialResponse(response) {
    const credential = parseJwt(response.credential);
    
    Utils.showLoader();
    
    // Crear o recuperar usuario
    API.getOrCreateUser({
        email: credential.email,
        name: credential.name,
        photo: credential.picture
    }).then(user => {
        STATE.user = user;
        showApp();
        Controllers.init();
    }).catch(error => {
        Utils.showToast('Error al iniciar sesión: ' + error.message, 'error');
        Utils.hideLoader();
    });
}

function parseJwt(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

function showApp() {
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('mainApp').classList.remove('hidden');
    
    // Mostrar info del usuario
    document.getElementById('userName').textContent = STATE.user.name;
    document.getElementById('userPhoto').src = STATE.user.photo;
}

function logout() {
    STATE.user = null;
    STATE.albums = [];
    STATE.cards = [];
    STATE.categories = [];
    
    document.getElementById('mainApp').classList.add('hidden');
    document.getElementById('loginScreen').classList.add('active');
    
    google.accounts.id.disableAutoSelect();
}

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
    }
};

// ========================================
// API CLIENT (SIN CORS - SOLO GET)
// ========================================

const API = {
    async request(path, action = 'list', data = null) {
        if (!APP_CONFIG.API_URL) {
            throw new Error('API URL no configurada');
        }
        
        let url = `${APP_CONFIG.API_URL}?path=${path}&action=${action}`;
        
        // Añadir userId si el usuario está logueado
        if (STATE.user) {
            url += `&userId=${STATE.user.id}`;
        }
        
        // Añadir data como parámetro si existe
        if (data) {
            url += `&data=${encodeURIComponent(JSON.stringify(data))}`;
        }
        
        try {
            const response = await fetch(url, { method: 'GET' });
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Error en la petición');
            }
            
            return result.data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },
    
    // USERS
    async getOrCreateUser(userData) {
        // Primero intentar obtener el usuario
        let user = await this.request('users', 'get', { email: userData.email });
        
        // Si no existe, crearlo
        if (!user) {
            user = await this.request('users', 'create', userData);
        }
        
        return user;
    },
    
    // ALBUMS
    getAlbums() {
        return this.request('albums', 'list');
    },
    
    getAlbum(id) {
        return this.request('albums', 'get', { id });
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
    
    // CARDS
    getCards(albumId) {
        return this.request('cards', 'list', { albumId });
    },
    
    createCard(card) {
        return this.request('cards', 'create', card);
    },
    
    updateCard(card) {
        return this.request('cards', 'update', card);
    },
    
    updateCardStatus(id, status) {
        return this.request('cards', 'updateStatus', { id, status });
    },
    
    deleteCard(id) {
        return this.request('cards', 'delete', { id });
    },
    
    // CATEGORIES
    getCategories() {
        return this.request('categories', 'list');
    },
    
    createCategory(category) {
        category.userId = STATE.user.id;
        return this.request('categories', 'create', category);
    },
    
    updateCategory(category) {
        return this.request('categories', 'update', category);
    },
    
    deleteCategory(id) {
        return this.request('categories', 'delete', { id });
    },
    
    // IMPORT
    importCards(albumId, cards) {
        return this.request('import', 'cards', { albumId, cards });
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
                    <p>Crea tu primer álbum para comenzar a gestionar tus cromos</p>
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
                <div class="empty-state" style="grid-column: 1/-1;">
                    <div class="empty-state-icon">🃏</div>
                    <h3>No hay cromos</h3>
                    <p>Añade cromos a este álbum</p>
                </div>
            `;
            return;
        }
        
        const sortedCards = [...STATE.cards].sort((a, b) => a.number - b.number);
        
        container.innerHTML = sortedCards.map(card => {
            const category = STATE.categories.find(c => c.id == card.categoryId);
            
            return `
                <div class="card-item status-${card.status}" data-id="${card.id}">
                    <div class="card-number">#${card.number}</div>
                    <div class="card-player">${card.playerName}</div>
                    <div class="card-team">${card.team}</div>
                    ${category ? `
                        <div class="card-category" style="background: ${category.color}">
                            ${category.name}
                        </div>
                    ` : ''}
                    <div class="card-status">
                        <button class="status-btn btn-tengo ${card.status === 'tengo' ? 'active' : ''}" 
                                data-status="tengo">✓</button>
                        <button class="status-btn btn-falta ${card.status === 'falta' ? 'active' : ''}" 
                                data-status="falta">✗</button>
                        <button class="status-btn btn-repetido ${card.status === 'repetido' ? 'active' : ''}" 
                                data-status="repetido">↻</button>
                    </div>
                </div>
            `;
        }).join('');
        
        container.querySelectorAll('.status-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const cardId = btn.closest('.card-item').dataset.id;
                const status = btn.dataset.status;
                await Controllers.updateCardStatus(cardId, status);
            });
        });
        
        container.querySelectorAll('.card-item').forEach(card => {
            card.addEventListener('dblclick', () => {
                Controllers.openEditCard(card.dataset.id);
            });
        });
    },
    
    stats() {
        const total = STATE.cards.length;
        const tengo = STATE.cards.filter(c => c.status === 'tengo').length;
        const falta = STATE.cards.filter(c => c.status === 'falta').length;
        const repetido = STATE.cards.filter(c => c.status === 'repetido').length;
        
        document.getElementById('statTotal').textContent = total;
        document.getElementById('statTengo').textContent = tengo;
        document.getElementById('statFalta').textContent = falta;
        document.getElementById('statRepetido').textContent = repetido;
    },
    
    categories() {
        const select = document.getElementById('cardCategory');
        select.innerHTML = STATE.categories.map(cat => `
            <option value="${cat.id}">${cat.name}</option>
        `).join('');
        
        const list = document.getElementById('categoriesList');
        list.innerHTML = STATE.categories.map(cat => `
            <div class="category-item">
                <div class="category-color" style="background: ${cat.color}"></div>
                <div class="category-name">${cat.name}</div>
                <button class="btn-icon" onclick="Controllers.deleteCategory(${cat.id})">🗑️</button>
            </div>
        `).join('');
    },
    
    cardList(cards, title) {
        document.getElementById('modalCardListTitle').textContent = title;
        const container = document.getElementById('cardListContent');
        
        if (!cards.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No hay cromos en esta categoría</p>
                </div>
            `;
            return;
        }
        
        const sortedCards = [...cards].sort((a, b) => a.number - b.number);
        
        container.innerHTML = sortedCards.map(card => `
            <div class="card-list-item status-${card.status}">
                <div class="card-list-number">#${card.number}</div>
                <div class="card-list-info">
                    <div class="card-list-player">${card.playerName}</div>
                    <div class="card-list-team">${card.team}</div>
                </div>
            </div>
        `).join('');
    }
};

// ========================================
// CONTROLADORES
// ========================================

const Controllers = {
    currentAlbumId: null,
    currentCardId: null,
    
    async init() {
        await this.loadAlbums();
        await this.loadCategories();
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
        this.currentAlbumId = albumId;
        try {
            Utils.showLoader();
            STATE.cards = await API.getCards(albumId);
            Utils.showView('viewAlbumDetail');
            Render.albumDetail(albumId);
        } catch (error) {
            Utils.showToast('Error al cargar álbum: ' + error.message, 'error');
        } finally {
            Utils.hideLoader();
        }
    },
    
    async loadCategories() {
        try {
            STATE.categories = await API.getCategories();
            Render.categories();
        } catch (error) {
            Utils.showToast('Error al cargar categorías: ' + error.message, 'error');
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
            
            if (this.currentAlbumId) {
                album.id = this.currentAlbumId;
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
        if (!confirm('¿Eliminar este álbum y todos sus cromos?')) return;
        
        try {
            Utils.showLoader();
            await API.deleteAlbum(this.currentAlbumId);
            Utils.showToast('Álbum eliminado');
            Utils.showView('viewAlbums');
            await this.loadAlbums();
        } catch (error) {
            Utils.showToast('Error: ' + error.message, 'error');
        } finally {
            Utils.hideLoader();
        }
    },
    
    async saveCard(e) {
        e.preventDefault();
        
        const card = {
            albumId: this.currentAlbumId,
            number: document.getElementById('cardNumber').value,
            playerName: document.getElementById('cardPlayer').value,
            team: document.getElementById('cardTeam').value,
            categoryId: document.getElementById('cardCategory').value,
            status: document.getElementById('cardStatus').value
        };
        
        try {
            Utils.showLoader();
            
            if (this.currentCardId) {
                card.id = this.currentCardId;
                await API.updateCard(card);
                Utils.showToast('Cromo actualizado');
            } else {
                await API.createCard(card);
                Utils.showToast('Cromo creado');
            }
            
            Utils.closeModal('modalCard');
            await this.openAlbum(this.currentAlbumId);
        } catch (error) {
            Utils.showToast('Error: ' + error.message, 'error');
        } finally {
            Utils.hideLoader();
        }
    },
    
    async updateCardStatus(cardId, status) {
        try {
            await API.updateCardStatus(cardId, status);
            const card = STATE.cards.find(c => c.id == cardId);
            card.status = status;
            Render.cards();
            Render.stats();
            Utils.showToast(`Estado cambiado a: ${status}`);
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
            await this.loadCategories();
        } catch (error) {
            Utils.showToast('Error: ' + error.message, 'error');
        }
    },
    
    async deleteCategory(id) {
        if (!confirm('¿Eliminar esta categoría?')) return;
        
        try {
            await API.deleteCategory(id);
            Utils.showToast('Categoría eliminada');
            await this.loadCategories();
        } catch (error) {
            Utils.showToast('Esta categoría está en uso', 'error');
        }
    },
    
    openNewAlbum() {
        this.currentAlbumId = null;
        document.getElementById('modalAlbumTitle').textContent = 'Nuevo Álbum';
        document.getElementById('formAlbum').reset();
        Utils.openModal('modalAlbum');
    },
    
    openEditAlbum() {
        const album = STATE.albums.find(a => a.id == this.currentAlbumId);
        document.getElementById('modalAlbumTitle').textContent = 'Editar Álbum';
        document.getElementById('albumName').value = album.name;
        document.getElementById('albumSeason').value = album.season || '';
        document.getElementById('albumCompetition').value = album.competition || '';
        Utils.openModal('modalAlbum');
    },
    
    openNewCard() {
        this.currentCardId = null;
        document.getElementById('modalCardTitle').textContent = 'Nuevo Cromo';
        document.getElementById('formCard').reset();
        document.getElementById('cardNumber').value = Utils.getNextCardNumber(STATE.cards);
        Utils.openModal('modalCard');
    },
    
    openEditCard(cardId) {
        this.currentCardId = cardId;
        const card = STATE.cards.find(c => c.id == cardId);
        document.getElementById('modalCardTitle').textContent = 'Editar Cromo';
        document.getElementById('cardNumber').value = card.number;
        document.getElementById('cardPlayer').value = card.playerName;
        document.getElementById('cardTeam').value = card.team;
        document.getElementById('cardCategory').value = card.categoryId;
        document.getElementById('cardStatus').value = card.status;
        Utils.openModal('modalCard');
    },
    
    showFalta() {
        const faltaCards = STATE.cards.filter(c => c.status === 'falta');
        Render.cardList(faltaCards, `Cromos que faltan (${faltaCards.length})`);
        Utils.openModal('modalCardList');
    },
    
    showRepetido() {
        const repetidoCards = STATE.cards.filter(c => c.status === 'repetido');
        Render.cardList(repetidoCards, `Cromos repetidos (${repetidoCards.length})`);
        Utils.openModal('modalCardList');
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
                    const [number, playerName, team, categoryId, status] = line.split(',');
                    return { number, playerName, team, categoryId, status: status || 'falta' };
                });
            } else if (format === 'txt') {
                const lines = content.split('\n').filter(l => l.trim());
                cards = lines.map(line => {
                    const [number, playerName, team, categoryId, status] = line.split('|');
                    return { number, playerName, team, categoryId, status: status || 'falta' };
                });
            }
            
            Utils.showLoader();
            await API.importCards(this.currentAlbumId, cards);
            Utils.showToast(`${cards.length} cromos importados`);
            Utils.closeModal('modalImport');
            await this.openAlbum(this.currentAlbumId);
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
            content = 'number,playerName,team,categoryId,status\n';
            content += STATE.cards.map(c => 
                `${c.number},${c.playerName},${c.team},${c.categoryId},${c.status}`
            ).join('\n');
            filename = 'cromos.csv';
        } else if (format === 'txt') {
            content = STATE.cards.map(c => 
                `${c.number}|${c.playerName}|${c.team}|${c.categoryId}|${c.status}`
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
        // Navigation
        document.getElementById('btnNewAlbum').addEventListener('click', () => this.openNewAlbum());
        document.getElementById('btnBackToAlbums').addEventListener('click', () => {
            Utils.showView('viewAlbums');
        });
        document.getElementById('btnEditAlbum').addEventListener('click', () => this.openEditAlbum());
        document.getElementById('btnDeleteAlbum').addEventListener('click', () => this.deleteAlbum());
        
        // Cards
        document.getElementById('btnNewCard').addEventListener('click', () => this.openNewCard());
        document.getElementById('btnViewFalta').addEventListener('click', () => this.showFalta());
        document.getElementById('btnViewRepetido').addEventListener('click', () => this.showRepetido());
        
        // Categories
        document.getElementById('btnManageCategories').addEventListener('click', () => {
            Utils.openModal('modalCategories');
        });
        
        // Import/Export
        document.getElementById('btnImport').addEventListener('click', () => {
            Utils.openModal('modalImport');
        });
        document.getElementById('btnExport').addEventListener('click', () => {
            Utils.openModal('modalExport');
        });
        document.getElementById('btnProcessImport').addEventListener('click', () => this.processImport());
        document.getElementById('btnProcessExport').addEventListener('click', () => this.processExport());
        
        // Logout
        document.getElementById('btnLogout').addEventListener('click', logout);
        
        // Forms
        document.getElementById('formAlbum').addEventListener('submit', (e) => this.saveAlbum(e));
        document.getElementById('formCard').addEventListener('submit', (e) => this.saveCard(e));
        document.getElementById('formCategory').addEventListener('submit', (e) => this.saveCategory(e));
        
        // Close modals
        document.querySelectorAll('[data-close]').forEach(btn => {
            btn.addEventListener('click', () => {
                Utils.closeModal(btn.dataset.close);
            });
        });
        
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
    }
};