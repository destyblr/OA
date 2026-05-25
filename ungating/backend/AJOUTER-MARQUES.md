# 📝 Comment ajouter des marques FNAC

## Étape 1: Éditer la liste

Ouvre le fichier:
```
ungating/backend/data/fnac-brands/MARQUES.txt
```

Ajoute tes marques au format:
```
Nom de la marque | Catégorie
```

**Exemple:**
```
Oral-B | Hygiène et Santé
Pampers | Baby
Dove | Beauté
Gillette | Hygiène et Santé
Philips Avent | Baby
```

**Catégories disponibles:**
- `Hygiène et Santé`
- `Beauté`
- `Électroménager`
- `Jouets`
- `Baby`
- `Pet`
- `Grocery`

## Étape 2: Générer les dossiers

Dans le terminal:
```bash
cd ungating/backend
node generate-brands.js
```

**Ce qui se passe:**
- ✅ Crée un dossier par marque
- ✅ Génère un fichier `.bat` par marque
- ✅ Met à jour `brands-list.json`
- ✅ Crée un README par marque

## Étape 3: Scanner

Va dans:
```
ungating/backend/data/fnac-brands/oral-b/
```

Double-clique sur:
```
SCAN_ORAL-B.bat
```

## 🎯 Résumé rapide

```
1. Édite MARQUES.txt
2. node generate-brands.js
3. Double-clique sur SCAN_XXX.bat
4. Résultats dans dashboard "🏆 ASIN Rentables"
```

---

## 💡 Astuces

**Ajouter 10 marques d'un coup:**
```
Oral-B | Hygiène et Santé
Pampers | Baby
Dove | Beauté
Gillette | Hygiène et Santé
Philips Avent | Baby
Nivea | Beauté
L'Oréal | Beauté
Garnier | Beauté
Maybelline | Beauté
Braun | Électroménager
```

Puis:
```bash
node generate-brands.js
```

→ 10 dossiers créés instantanément !

**Re-générer si tu ajoutes des marques:**

Tu peux relancer `node generate-brands.js` autant de fois que tu veux.
Il ne supprime pas les marques existantes, il ajoute juste les nouvelles.
