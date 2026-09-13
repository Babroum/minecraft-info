// priority: 104
// =============================================================================
// Third World Server Script - Core 02 : Moteur de Stockage Atomique & Persistance
// =============================================================================

/**
 * Convertit récursivement les structures Java (Map, List) en Objets et Tableaux JavaScript purs
 */
function toJsObject(val) {
    if (val === null || val === undefined) return val
    if (typeof val !== 'object') return val

    if (Array.isArray(val)) {
        for (var a = 0; a < val.length; a++) {
            val[a] = toJsObject(val[a])
        }
        return val
    }

    try {
        if (typeof val.keySet === 'function' && typeof val.get === 'function') {
            var obj = {}
            var it = val.keySet().iterator()
            while (it.hasNext()) {
                var k = it.next()
                var keyStr = (k !== null && k !== undefined) ? String(k) : ''
                obj[keyStr] = toJsObject(val.get(k))
            }
            return obj
        }

        if (typeof val.size === 'function' && typeof val.get === 'function') {
            var arr = []
            var len = val.size()
            for (var i = 0; i < len; i++) {
                arr.push(toJsObject(val.get(i)))
            }
            return arr
        }
    } catch (e) {}

    return val
}

/**
 * Lecture sécurisée d'un fichier d'état avec fallback
 */
function TW_ReadState(filename) {
    try {
        if (typeof JsonIO !== 'undefined' && JsonIO.readJson) {
            // 1. Cherche dans le nouveau dossier d'état
            var el = JsonIO.readJson('kubejs/data/state/' + filename)
            // 2. Fallback dans l'ancien dossier kubejs/data/
            if (!el || el.isJsonNull()) {
                el = JsonIO.readJson('kubejs/data/' + filename)
            }
            if (el && !el.isJsonNull()) {
                var raw = String(el.toString())
                if (raw && raw.trim() !== '' && raw !== 'null') {
                    return toJsObject(JSON.parse(raw))
                }
            }
        }
    } catch (e) {
        console.error('[StorageEngine] Erreur lecture ' + filename + ' : ' + e)
    }

    // Fallback JsonIO.read si disponible
    try {
        if (typeof JsonIO !== 'undefined' && JsonIO.read) {
            var legacy = JsonIO.read('kubejs/data/state/' + filename) || JsonIO.read('kubejs/data/' + filename)
            if (legacy) return toJsObject(legacy)
        }
    } catch (e2) {}

    return null
}

/**
 * Écriture sécurisée avec sauvegarde préventive (.bak)
 */
function TW_WriteState(filename, data) {
    try {
        if (typeof JsonIO === 'undefined' || !JsonIO.write) {
            console.error('[StorageEngine] JsonIO indisponible pour écriture de ' + filename)
            return false
        }

        var jsonStr = JSON.stringify(data || {})
        var element = (typeof JsonUtils !== 'undefined' && JsonUtils.fromString)
            ? JsonUtils.fromString(jsonStr)
            : (typeof JsonIO.parseRaw === 'function' ? JsonIO.parseRaw(jsonStr) : null)

        if (!element) {
            console.error('[StorageEngine] Échec de parsing JSON pour ' + filename)
            return false
        }

        // 1. Créer une sauvegarde .bak si le fichier existe déjà
        try {
            var oldEl = JsonIO.readJson('kubejs/data/state/' + filename)
            if (oldEl && !oldEl.isJsonNull()) {
                JsonIO.write('kubejs/data/state/' + filename + '.bak', oldEl)
            }
        } catch (bErr) {}

        // 2. Écrire le fichier cible via JsonIO.write (gestion automatique des répertoires)
        JsonIO.write('kubejs/data/state/' + filename, element)
        return true
    } catch (e) {
        console.error('[StorageEngine] Erreur écriture ' + filename + ' : ' + e)
        return false
    }
}

// -----------------------------------------------------------------------------
// ALIAS DE RÉTROCOMPATIBILITÉ UNIVERSELLE
// -----------------------------------------------------------------------------
function readJsonData(filename) {
    return TW_ReadState(filename)
}

function writeJsonData(filename, data) {
    return TW_WriteState(filename, data)
}
