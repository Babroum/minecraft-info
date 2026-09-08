// priority: 100
// =============================================================================
// NationGlory KubeJS Startup Script - Devises et Matériaux Stratégiques
// Version NeoForge 1.21.1 / KubeJS 7
// =============================================================================

StartupEvents.registry('item', event => {
    // -------------------------------------------------------------------------
    // 1. Déclaration des Coupures de Billets de Banque (Chaîne Monétaire d'État)
    // -------------------------------------------------------------------------
    
    // Billet de 1$ (Unité monétaire de base)
    event.create('billet_1')
        .displayName('Billet de 1$')
        .maxStackSize(64)
        .rarity('common')

    // Billet de 5$
    event.create('billet_5')
        .displayName('Billet de 5$')
        .maxStackSize(64)
        .rarity('common')

    // Billet de 20$
    event.create('billet_20')
        .displayName('Billet de 20$')
        .maxStackSize(64)
        .rarity('uncommon')

    // Billet de 100$ (Coupure de réserve fédérale)
    event.create('billet_100')
        .displayName('Billet de 100$')
        .maxStackSize(64)
        .rarity('rare')

    // -------------------------------------------------------------------------
    // 2. Matériau Géopolitique Stratégique
    // -------------------------------------------------------------------------
    
    // Lingot d'Uranium Militaire Enrichi (Composant de haute technologie militaire)
    event.create('lingot_uranium_enrichie')
        .displayName("Lingot d'Uranium Enrichie")
        .maxStackSize(64)
        .rarity('epic')
        .fireResistant(true)
})
