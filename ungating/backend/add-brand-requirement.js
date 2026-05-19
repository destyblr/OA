// Script pour ajouter/modifier les unités requises par marque
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Fonction pour ajouter/mettre à jour une marque
async function setBrandRequirement(brandName, unitsRequired, notes = '', verified = true) {
  const { data, error } = await supabase
    .from('brand_requirements')
    .upsert({
      brand_name: brandName.toUpperCase().trim(),
      units_required: parseInt(unitsRequired),
      notes: notes,
      verified: verified,
      last_checked: new Date().toISOString()
    }, { onConflict: 'brand_name' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Fonction pour lister toutes les marques
async function listAllBrands() {
  const { data, error } = await supabase
    .from('brand_requirements')
    .select('*')
    .order('brand_name', { ascending: true });

  if (error) throw error;
  return data;
}

// Fonction pour obtenir les unités requises pour une marque
async function getUnitsForBrand(brandName) {
  const { data, error } = await supabase
    .from('brand_requirements')
    .select('*')
    .eq('brand_name', brandName.toUpperCase().trim())
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// Si appelé directement en ligne de commande
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === 'list') {
    // Liste toutes les marques
    listAllBrands().then(brands => {
      console.log('\n📋 MARQUES ENREGISTRÉES\n');
      if (brands.length === 0) {
        console.log('Aucune marque enregistrée.');
      } else {
        brands.forEach(b => {
          const verified = b.verified ? '✓' : '○';
          console.log(`${verified} ${b.brand_name.padEnd(30)} → ${b.units_required} unités`);
          if (b.notes) console.log(`   📝 ${b.notes}`);
        });
        console.log(`\nTotal: ${brands.length} marques\n`);
      }
      process.exit(0);
    }).catch(err => {
      console.error('❌ Erreur:', err.message);
      process.exit(1);
    });
  } else if (args[0] === 'add' && args.length >= 3) {
    // Ajouter une marque: node add-brand-requirement.js add "MARQUE" 10 "Notes optionnelles"
    const brandName = args[1];
    const units = args[2];
    const notes = args[3] || '';

    setBrandRequirement(brandName, units, notes).then(data => {
      console.log(`\n✅ ${data.brand_name} → ${data.units_required} unités\n`);
      process.exit(0);
    }).catch(err => {
      console.error('❌ Erreur:', err.message);
      process.exit(1);
    });
  } else if (args[0] === 'get' && args.length >= 2) {
    // Obtenir une marque: node add-brand-requirement.js get "MARQUE"
    const brandName = args[1];

    getUnitsForBrand(brandName).then(data => {
      if (data) {
        console.log(`\n${data.brand_name} → ${data.units_required} unités`);
        if (data.notes) console.log(`📝 ${data.notes}`);
        console.log(`Vérifié: ${data.verified ? 'Oui' : 'Non'}`);
        console.log(`Dernière vérification: ${new Date(data.last_checked).toLocaleDateString('fr-FR')}\n`);
      } else {
        console.log(`\n⚠️ Marque "${brandName}" non trouvée\n`);
      }
      process.exit(0);
    }).catch(err => {
      console.error('❌ Erreur:', err.message);
      process.exit(1);
    });
  } else {
    console.log(`
Usage:
  node add-brand-requirement.js list                           # Liste toutes les marques
  node add-brand-requirement.js add "MARQUE" 10 "Notes"        # Ajoute/met à jour
  node add-brand-requirement.js get "MARQUE"                   # Affiche une marque

Exemples:
  node add-brand-requirement.js add "PHILIPS" 10 "Vérifié le 19/05/2026"
  node add-brand-requirement.js add "LEDUC.S EDITIONS" 1
  node add-brand-requirement.js list
    `);
    process.exit(0);
  }
}

module.exports = { setBrandRequirement, listAllBrands, getUnitsForBrand };
