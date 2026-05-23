# 🤖 Scanner Automatique OA

Scanner automatique qui tourne en boucle sur toutes les rotations (16 au total).

## 📋 Fonctionnement

- **16 rotations** (4 catégories × 4 variations)
- **1 scan toutes les ~55 minutes** (temps de recharge Keepa)
- **Vérification tokens** avant chaque scan (≥52 tokens requis)
- **Attente automatique** si pas assez de tokens
- **Reprise automatique** après arrêt/redémarrage PC
- **Sauvegarde état** après chaque scan

## 🚀 Démarrage Manuel

### Option 1: Double-clic sur le .bat
```
LANCER_AUTO_SCANNER.bat
```

### Option 2: Ligne de commande
```bash
cd c:\Users\desty\Desktop\Travail\OA\ungating\backend
node auto-scanner.js
```

## ⚙️ Configuration Automatique (Démarrage Windows)

### 1. Créer la tâche planifiée

Ouvrir PowerShell **en tant qu'administrateur** et exécuter:

```powershell
cd c:\Users\desty\Desktop\Travail\OA\ungating\backend
.\setup-auto-scanner-task.ps1
```

### 2. Vérifier la tâche

Ouvrir le **Planificateur de tâches** Windows:
- Chercher "Planificateur de tâches" dans le menu Démarrer
- Aller dans **Bibliothèque du Planificateur de tâches**
- Chercher la tâche **"OA-AutoScanner"**

### 3. La tâche démarre automatiquement:
- ✅ Au démarrage de Windows (+1 min de délai)
- ✅ Redémarre si plantage (3 tentatives max)
- ✅ Fonctionne sur batterie (laptop)

## 🎯 Ordre des Rotations

Le scanner commence par la **rotation 1** et fait le tour:

**Rotation commence par:**
1. **High-Tech - BSR Bas (1-10K)** ← DÉBUT
2. High-Tech - BSR Moyen (10K-30K)
3. High-Tech - Premium (30-50€)
4. High-Tech - Budget (15-25€)
5. Jeux et Jouets - BSR Bas (1-10K)
6. Jeux et Jouets - BSR Moyen (10K-30K)
7. Jeux et Jouets - Premium (30-50€)
8. Jeux et Jouets - Budget (15-25€)
9. Beauté et Santé - BSR Bas (1-10K)
10. Beauté et Santé - BSR Moyen (10K-30K)
11. Beauté et Santé - Premium (30-50€)
12. Beauté et Santé - Budget (15-25€)
13. Électroménager - BSR Bas (1-10K)
14. Électroménager - BSR Moyen (10K-30K)
15. Électroménager - Premium (30-50€)
16. Électroménager - Budget (15-25€)

**Puis retour au début** (rotation 1)

## 📊 Estimation Temps

- **1 cycle complet:** ~14-15 heures
- **1 scan:** ~2-3 minutes d'exécution
- **Entre chaque scan:** ~55 minutes (recharge tokens)

## 🛑 Arrêter le Scanner

### Arrêt manuel
- Dans la console: **Ctrl+C**
- L'état sera sauvegardé automatiquement
- Reprendra à la rotation suivante au prochain démarrage

### Gérer la tâche planifiée

**Désactiver temporairement:**
```powershell
Disable-ScheduledTask -TaskName "OA-AutoScanner"
```

**Réactiver:**
```powershell
Enable-ScheduledTask -TaskName "OA-AutoScanner"
```

**Supprimer complètement:**
```powershell
Unregister-ScheduledTask -TaskName "OA-AutoScanner" -Confirm:$false
```

## 📂 Fichiers Importants

- `auto-scanner.js` - Script principal
- `data/scanner-state.json` - État sauvegardé (rotation en cours)
- `config/rotations.json` - Configuration des 16 rotations
- `config/private-label-blacklist.json` - Blacklist PL (auto-enrichie)

## 🔍 Logs

Les logs s'affichent en temps réel dans la console:
- ✅ Tokens disponibles
- 🚀 Scan en cours
- 🤖 PL chinois détectés et ajoutés
- 💾 Produits/marques sauvegardés
- ⏳ Temps d'attente

## ⚡ Tips

1. **Premier lancement:** Le scanner commence toujours par la rotation 1
2. **Après arrêt:** Il reprend exactement où il s'était arrêté
3. **Tokens insuffisants:** Il attend automatiquement (check toutes les 2 min)
4. **Dashboard:** Les résultats apparaissent en temps réel sur https://oa-fba.netlify.app

## 🆘 Problèmes Courants

### Le scanner ne démarre pas
- Vérifier que Node.js est installé: `node --version`
- Vérifier le fichier `.env` avec les clés API

### Erreur "Access denied"
- Normal pour SP-API Hazmat (pas de permissions)
- Le filtre par mots-clés fonctionne quand même

### Le scanner s'arrête tout seul
- PC en veille → Désactiver la mise en veille
- Manque de tokens → Il redémarre automatiquement quand rechargé

### Tâche planifiée ne fonctionne pas
- Vérifier que PowerShell était en **mode Administrateur**
- Relancer le script `setup-auto-scanner-task.ps1`
