/**
 * supabase-client.js - CLIENTE SUPABASE
 * ======================================
 * JavaScript PURO - Sin Node.js, sin npm
 * Usa el SDK de Supabase desde CDN
 */

// ============================================
// CONFIGURACIÓN
// ============================================

const SUPABASE_CONFIG = {
  url: 'https://ypnjzwwrrnvqzzrucwwf.supabase.co',
  anonKey: 'sb_publishable_HN8z-yNsIYunPrvewbLgDg_LnFd89uY',
};

// ============================================
// INICIALIZAR SUPABASE
// ============================================

let supabaseClient = null;

function initSupabase() {
  if (!window.supabase || !window.supabase.createClient) {
    throw new Error('Supabase SDK no cargado. Añade el script en el HTML');
  }
  
  if (supabaseClient) {
    console.log('⚠️ Supabase ya inicializado');
    return supabaseClient;
  }
  
  supabaseClient = window.supabase.createClient(
    SUPABASE_CONFIG.url,
    SUPABASE_CONFIG.anonKey
  );
  
  console.log('✅ Supabase inicializado');
  return supabaseClient;
}

// Función helper para asegurar que está inicializado
function getSupabaseClient() {
  if (!supabaseClient) {
    throw new Error('Supabase no inicializado. Llama a initSupabase() primero');
  }
  return supabaseClient;
}

// ============================================
// CAPA DE ACCESO A DATOS (DAL)
// ============================================

const SupabaseDB = {
  
  // ============================================
  // AUTENTICACIÓN
  // ============================================
  
  /**
   * Registrar nuevo usuario
   */
  async registerUser(name, email, password) {
    const client = getSupabaseClient();
    
    // Validar
    if (!name || !email || !password) {
      throw new Error('Todos los campos son obligatorios');
    }
    
    if (password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres');
    }
    
    // Registrar con Supabase Auth
    const { data, error } = await client.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          name: name  // Se guarda en raw_user_meta_data
        }
      }
    });
    
    if (error) {
      if (error.message.includes('already registered')) {
        throw new Error('EMAIL_EXISTS');
      }
      throw error;
    }
    
    // Supabase automáticamente crea el perfil via trigger
    // Retornar usuario
    return {
      id: data.user.id,
      email: data.user.email,
      name: name
    };
  },
  
  /**
   * Login de usuario
   */
  async loginUser(email, password) {
    const client = getSupabaseClient();
    
    const { data, error } = await client.auth.signInWithPassword({
      email: email,
      password: password
    });
    
    if (error) {
      if (error.message.includes('Invalid login')) {
        throw new Error('INVALID_PASSWORD');
      }
      throw error;
    }
    
    // Obtener perfil
    const { data: profile } = await client
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
    
    return {
      id: data.user.id,
      email: data.user.email,
      name: profile?.name || data.user.user_metadata?.name || 'Usuario',
      albumCount: profile?.album_count || 0
    };
  },
  
  /**
   * Logout
   */
  async logout() {
    const client = getSupabaseClient();
    const { error } = await client.auth.signOut();
    if (error) throw error;
  },
  
  /**
   * Obtener sesión actual
   */
  async getCurrentUser() {
    const client = getSupabaseClient();
    const { data: { session } } = await client.auth.getSession();
    
    if (!session) return null;
    
    const { data: profile } = await client
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    
    return {
      id: session.user.id,
      email: session.user.email,
      name: profile?.name || session.user.user_metadata?.name || 'Usuario',
      albumCount: profile?.album_count || 0
    };
  },
  
  // ============================================
  // ALBUMS
  // ============================================
  
  /**
   * Obtener álbumes del usuario actual
   */
  async getAlbums() {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('albums')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Normalizar snake_case a camelCase
    return data.map(album => ({
      id: album.id,
      userId: album.user_id,
      name: album.name,
      season: album.season,
      competition: album.competition,
      color: album.color,
      totalCards: album.total_cards,
      cardsOwned: album.cards_owned,
      cardsMissing: album.cards_missing,
      cardsDuplicate: album.cards_duplicate,
      createdAt: album.created_at,
      updatedAt: album.updated_at
    }));
  },
  
  /**
   * Crear álbum
   */
  async createAlbum(albumData) {
    const client = getSupabaseClient();
    const { data: { user } } = await client.auth.getUser();
    
    if (!user) throw new Error('Usuario no autenticado');
    
    const { data, error } = await client
      .from('albums')
      .insert({
        user_id: user.id,
        name: albumData.name,
        season: albumData.season || '',
        competition: albumData.competition || '',
        color: albumData.color || '#10B981'
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Normalizar
    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      season: data.season,
      competition: data.competition,
      color: data.color,
      totalCards: data.total_cards || 0,
      cardsOwned: data.cards_owned || 0,
      cardsMissing: data.cards_missing || 0,
      cardsDuplicate: data.cards_duplicate || 0,
      createdAt: data.created_at
    };
  },
  
  /**
   * Actualizar álbum
   */
  async updateAlbum(albumId, albumData) {
    const client = getSupabaseClient();
    const updateFields = {};
    
    if (albumData.name !== undefined) updateFields.name = albumData.name;
    if (albumData.season !== undefined) updateFields.season = albumData.season;
    if (albumData.competition !== undefined) updateFields.competition = albumData.competition;
    if (albumData.color !== undefined) updateFields.color = albumData.color;
    
    const { data, error } = await client
      .from('albums')
      .update(updateFields)
      .eq('id', albumId)
      .select()
      .single();
    
    if (error) throw error;
    
    // Normalizar
    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      season: data.season,
      competition: data.competition,
      color: data.color,
      totalCards: data.total_cards,
      cardsOwned: data.cards_owned,
      cardsMissing: data.cards_missing,
      cardsDuplicate: data.cards_duplicate
    };
  },
  
  /**
   * Eliminar álbum (cascada automática)
   */
  async deleteAlbum(albumId) {
    const client = getSupabaseClient();
    const { error } = await client
      .from('albums')
      .delete()
      .eq('id', albumId);
    
    if (error) throw error;
    return true;
  },
  
  // ============================================
  // CATEGORIES
  // ============================================
  
  /**
   * Obtener categorías de un álbum
   */
  async getCategories(albumId) {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('categories')
      .select('*')
      .eq('album_id', albumId)
      .order('order', { ascending: true });
    
    if (error) throw error;
    
    // Normalizar
    return data.map(cat => ({
      id: cat.id,
      albumId: cat.album_id,
      name: cat.name,
      color: cat.color,
      isBasic: cat.is_basic,
      order: cat.order,
      createdAt: cat.created_at
    }));
  },
  
  /**
   * Crear categoría
   */
  async createCategory(albumId, categoryData) {
    const client = getSupabaseClient();
    
    // Obtener último orden
    const { data: categories } = await client
      .from('categories')
      .select('order')
      .eq('album_id', albumId)
      .order('order', { ascending: false })
      .limit(1);
    
    const maxOrder = categories && categories.length > 0 
      ? categories[0].order 
      : 0;
    
    const { data, error } = await client
      .from('categories')
      .insert({
        album_id: albumId,
        name: categoryData.name,
        color: categoryData.color || '#10B981',
        is_basic: Boolean(categoryData.isBasic),
        order: maxOrder + 1
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Normalizar
    return {
      id: data.id,
      albumId: data.album_id,
      name: data.name,
      color: data.color,
      isBasic: data.is_basic,
      order: data.order
    };
  },
  
  /**
   * Actualizar categoría
   */
  async updateCategory(categoryId, categoryData) {
    const client = getSupabaseClient();
    const updateFields = {};
    
    if (categoryData.name !== undefined) updateFields.name = categoryData.name;
    if (categoryData.color !== undefined) updateFields.color = categoryData.color;
    
    const { data, error } = await client
      .from('categories')
      .update(updateFields)
      .eq('id', categoryId)
      .select()
      .single();
    
    if (error) throw error;
    
    // Normalizar
    return {
      id: data.id,
      albumId: data.album_id,
      name: data.name,
      color: data.color,
      isBasic: data.is_basic
    };
  },
  
  /**
   * Eliminar categoría
   */
  async deleteCategory(categoryId) {
    const client = getSupabaseClient();
    const { error } = await client
      .from('categories')
      .delete()
      .eq('id', categoryId);
    
    if (error) throw error;
    return true;
  },
  
  // ============================================
  // CARDS
  // ============================================
  
  /**
   * Obtener cards de un álbum con filtros
   */
  async getCards(albumId, filters = {}) {
    const client = getSupabaseClient();
    let query = client
      .from('cards')
      .select('*, categories(name, color, is_basic)')
      .eq('album_id', albumId);
    
    // Aplicar filtros
    if (filters.team) {
      query = query.eq('team', filters.team);
    }
    
    if (filters.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }
    
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    // Búsqueda de texto
    if (filters.search) {
      query = query.ilike('search_text', `%${filters.search.toLowerCase()}%`);
    }
    
    // Ordenar
    query = query.order('number_int', { ascending: true, nullsLast: true })
                 .order('number', { ascending: true });
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    console.log('🔍 Raw data from Supabase:', data[0]); // DEBUG
    
    // Normalizar datos (snake_case → camelCase)
    const normalized = data.map(card => {
      const result = {
        id: card.id,
        albumId: card.album_id,
        categoryId: card.category_id,
        number: card.number,
        numberInt: card.number_int,
        playerName: card.player_name,        // ← IMPORTANTE
        team: card.team,
        status: card.status,
        duplicatesCount: card.duplicates_count,  // ← IMPORTANTE
        searchText: card.search_text,
        createdAt: card.created_at,
        updatedAt: card.updated_at,
        // Datos de categoría
        categoryName: card.categories?.name,
        categoryColor: card.categories?.color,
        categoryIsBasic: card.categories?.is_basic
      };
      
      console.log('🔄 Normalized card:', result); // DEBUG
      return result;
    });
    
    return normalized;
  },
  
  /**
   * Crear card
   */
  async createCard(cardData) {
    const client = getSupabaseClient();
    const number = cardData.number.trim();
    const numberInt = parseInt(number);
    
    const { data, error } = await client
      .from('cards')
      .insert({
        album_id: cardData.albumId,
        category_id: cardData.categoryId,
        number: number,
        number_int: isNaN(numberInt) ? null : numberInt,
        player_name: cardData.playerName,
        team: cardData.team || '',
        status: cardData.status || 'falta',
        duplicates_count: parseInt(cardData.duplicatesCount) || 0
        // search_text se genera automáticamente por trigger
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Normalizar
    return {
      id: data.id,
      albumId: data.album_id,
      categoryId: data.category_id,
      number: data.number,
      numberInt: data.number_int,
      playerName: data.player_name,
      team: data.team,
      status: data.status,
      duplicatesCount: data.duplicates_count
    };
  },
  
  /**
   * Actualizar card
   */
  async updateCard(cardId, cardData) {
    const client = getSupabaseClient();
    const updateFields = {};
    
    if (cardData.number !== undefined) {
      updateFields.number = cardData.number;
      const numberInt = parseInt(cardData.number);
      updateFields.number_int = isNaN(numberInt) ? null : numberInt;
    }
    
    if (cardData.playerName !== undefined) updateFields.player_name = cardData.playerName;
    if (cardData.team !== undefined) updateFields.team = cardData.team;
    if (cardData.categoryId !== undefined) updateFields.category_id = cardData.categoryId;
    if (cardData.status !== undefined) updateFields.status = cardData.status;
    if (cardData.duplicatesCount !== undefined) updateFields.duplicates_count = parseInt(cardData.duplicatesCount);
    
    // search_text se actualiza automáticamente por trigger
    
    const { data, error } = await client
      .from('cards')
      .update(updateFields)
      .eq('id', cardId)
      .select()
      .single();
    
    if (error) throw error;
    
    // Normalizar
    return {
      id: data.id,
      albumId: data.album_id,
      categoryId: data.category_id,
      number: data.number,
      numberInt: data.number_int,
      playerName: data.player_name,
      team: data.team,
      status: data.status,
      duplicatesCount: data.duplicates_count
    };
  },
  
  /**
   * Actualizar solo estado/duplicados (optimizado)
   */
  async updateCardStatus(cardId, field, value) {
    const client = getSupabaseClient();
    const updateData = {};
    
    if (field === 'status') {
      updateData.status = value;
    } else if (field === 'duplicatesCount') {
      updateData.duplicates_count = parseInt(value);
    }
    
    const { data, error } = await client
      .from('cards')
      .update(updateData)
      .eq('id', cardId)
      .select()
      .single();
    
    if (error) throw error;
    
    // Normalizar
    return {
      id: data.id,
      albumId: data.album_id,
      categoryId: data.category_id,
      number: data.number,
      numberInt: data.number_int,
      playerName: data.player_name,
      team: data.team,
      status: data.status,
      duplicatesCount: data.duplicates_count
    };
  },
  
  /**
   * Eliminar card
   */
  async deleteCard(cardId) {
    const client = getSupabaseClient();
    const { error } = await client
      .from('cards')
      .delete()
      .eq('id', cardId);
    
    if (error) throw error;
    return true;
  },
  
  /**
   * Importar múltiples cards
   */
  async importCards(albumId, cardsData) {
    const client = getSupabaseClient();
    const cardsToInsert = cardsData.map(cardData => {
      const number = cardData.number.trim();
      const numberInt = parseInt(number);
      
      return {
        album_id: albumId,
        category_id: cardData.categoryId,
        number: number,
        number_int: isNaN(numberInt) ? null : numberInt,
        player_name: cardData.playerName,
        team: cardData.team || '',
        status: cardData.status || 'falta',
        duplicates_count: parseInt(cardData.duplicatesCount) || 0
      };
    });
    
    const { data, error } = await client
      .from('cards')
      .insert(cardsToInsert)
      .select();
    
    if (error) throw error;
    return data.length;
  },
  
  // ============================================
  // UTILIDADES
  // ============================================
  
  /**
   * Obtener equipos únicos de un álbum
   */
  async getTeams(albumId) {
    const { data, error } = await supabase
      .from('cards')
      .select('team')
      .eq('album_id', albumId)
      .not('team', 'is', null)
      .order('team');
    
    if (error) throw error;
    
    // Obtener valores únicos
    const teams = [...new Set(data.map(c => c.team))].filter(Boolean);
    return teams;
  },
  
  /**
   * Obtener estadísticas de un álbum
   */
  async getAlbumStats(albumId) {
    const { data, error } = await supabase
      .from('albums')
      .select('total_cards, cards_owned, cards_missing, cards_duplicate')
      .eq('id', albumId)
      .single();
    
    if (error) throw error;
    return data;
  }
};

// ============================================
// EXPORTS GLOBALES
// ============================================

window.initSupabase = initSupabase;
window.SupabaseDB = SupabaseDB;
window.supabase = supabase;

/**
 * USO EN index.html:
 * 
 * <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 * <script src="supabase-client.js"></script>
 * <script>
 *   // Inicializar
 *   initSupabase();
 *   
 *   // Usar en tu app
 *   const albums = await SupabaseDB.getAlbums();
 * </script>
 */