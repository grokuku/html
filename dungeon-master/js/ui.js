// ===== UI MANAGEMENT =====

const UI = {
    messages: [],
    messageTimer: 0,

    init() {
        // Clear message log
        const log = document.getElementById('message-log');
        if (log) log.innerHTML = '';
    },

    addMessage(text, type) {
        type = type || 'info';
        this.messages.push({ text, type, time: Date.now() });

        // Keep only last 50 messages
        if (this.messages.length > 50) this.messages.shift();

        const log = document.getElementById('message-log');
        if (!log) return;

        const div = document.createElement('div');
        div.className = `log-message ${type}`;
        div.textContent = text;
        log.appendChild(div);

        // Keep only last 5 visible
        while (log.children.length > 5) {
            log.removeChild(log.firstChild);
        }

        // Auto-remove after some time
        setTimeout(() => {
            if (div.parentNode) {
                div.style.opacity = '0';
                div.style.transition = 'opacity 0.5s';
                setTimeout(() => div.remove(), 500);
            }
        }, 4000);
    },

    updatePartyBar() {
        const slots = document.querySelectorAll('.party-slot');
        slots.forEach((slot, i) => {
            const champion = Game.party[i];
            if (!champion) {
                slot.style.display = 'none';
                return;
            }
            slot.style.display = 'flex';

            // Name
            slot.querySelector('.char-name').textContent = champion.name;

            // HP bar
            const hpFill = slot.querySelector('.hp-bar .stat-fill');
            const hpPct = champion.alive ? (champion.hp / champion.maxHp * 100) : 0;
            hpFill.style.width = hpPct + '%';

            // Mana bar
            const manaFill = slot.querySelector('.mana-bar .stat-fill');
            const manaPct = champion.alive ? (champion.mana / champion.maxMana * 100) : 0;
            manaFill.style.width = manaPct + '%';

            // Stamina bar
            const staminaFill = slot.querySelector('.stamina-bar .stat-fill');
            const staminaPct = champion.alive ? (champion.stamina / champion.maxStamina * 100) : 0;
            staminaFill.style.width = staminaPct + '%';

            // Portrait
            this.drawPortrait(slot.querySelector('.portrait-canvas'), champion);

            // Dead state
            slot.classList.toggle('dead', !champion.alive);
        });
    },

    drawPortrait(canvas, champion) {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width, h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        if (!champion.alive) {
            ctx.fillStyle = '#331111';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#883333';
            ctx.font = '28px serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('💀', w / 2, h / 2);
            return;
        }

        // Background based on class
        const classColors = {
            warrior: '#442222',
            wizard: '#222244',
            priest: '#224422',
            thief: '#333322',
            knight: '#223344',
            ranger: '#224433',
        };
        ctx.fillStyle = classColors[champion.classId] || '#333333';
        ctx.fillRect(0, 0, w, h);

        // Class icon
        ctx.font = '32px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(champion.icon, w / 2, h / 2);

        // Level badge
        ctx.fillStyle = '#00000088';
        ctx.fillRect(0, h - 14, 22, 14);
        ctx.fillStyle = '#ffcc00';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`L${champion.level}`, 2, h - 2);

        // Border
        ctx.strokeStyle = champion.alive ? '#5a5a8c' : '#331111';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, w, h);
    },

    openInventory(championIdx) {
        const panel = document.getElementById('inventory-panel');
        const champion = Game.party[championIdx];
        if (!champion) return;

        panel.classList.remove('hidden');
        panel.dataset.champion = championIdx;

        document.getElementById('inv-char-name').textContent = champion.name;

        // Equipped slots
        const equipped = panel.querySelector('#inv-equipped');
        equipped.querySelectorAll('.equip-slot').forEach(slot => {
            const slotType = slot.dataset.slot;
            const item = champion.equipped[slotType];
            slot.innerHTML = `<span class="slot-label">${slotType}</span>`;

            if (item) {
                slot.classList.add('full');
                slot.innerHTML += `<span class="slot-icon">${item.icon}</span><span class="slot-name">${item.name}</span>`;
                slot.onclick = () => this.showItemMenu(item, championIdx, 'equipped', slotType);
            } else {
                slot.classList.remove('full');
            }
        });

        // Backpack
        const backpack = panel.querySelector('#inv-backpack');
        backpack.innerHTML = '';
        for (let i = 0; i < MAX_INVENTORY; i++) {
            const item = champion.inventory[i];
            const div = document.createElement('div');
            div.className = `inv-item ${item ? 'rarity-' + item.rarity : ''}`;
            if (item) {
                div.innerHTML = `<span class="item-icon">${item.icon}</span><span class="item-name">${item.name}</span>`;
                div.onclick = () => this.showItemMenu(item, championIdx, 'backpack', i);
            }
            backpack.appendChild(div);
        }
    },

    showItemMenu(item, championIdx, source, sourceIdx) {
        // Remove existing menu
        document.querySelectorAll('.item-context-menu').forEach(m => m.remove());

        const menu = document.createElement('div');
        menu.className = 'item-context-menu';
        const champion = Game.party[championIdx];

        if (item.type === ITEM_TYPE.WEAPON || item.type === ITEM_TYPE.SHIELD ||
            item.type === ITEM_TYPE.ARMOR || item.type === ITEM_TYPE.HELMET ||
            item.type === ITEM_TYPE.BOOTS || item.type === ITEM_TYPE.NECKLACE) {
            if (source === 'backpack') {
                const equipBtn = document.createElement('div');
                equipBtn.className = 'ctx-option';
                equipBtn.textContent = 'Equip';
                equipBtn.onclick = () => {
                    this.equipItem(item, championIdx, sourceIdx);
                    menu.remove();
                };
                menu.appendChild(equipBtn);
            } else if (source === 'equipped') {
                const unequipBtn = document.createElement('div');
                unequipBtn.className = 'ctx-option';
                unequipBtn.textContent = 'Unequip';
                unequipBtn.onclick = () => {
                    this.unequipItem(sourceIdx, championIdx);
                    menu.remove();
                };
                menu.appendChild(unequipBtn);
            }
        }

        if (item.type === ITEM_TYPE.POTION || item.type === ITEM_TYPE.FOOD) {
            const useBtn = document.createElement('div');
            useBtn.className = 'ctx-option';
            useBtn.textContent = 'Use';
            useBtn.onclick = () => {
                this.useItem(item, championIdx, source, sourceIdx);
                menu.remove();
            };
            menu.appendChild(useBtn);
        }

        if (item.type === ITEM_TYPE.SCROLL) {
            const readBtn = document.createElement('div');
            readBtn.className = 'ctx-option';
            readBtn.textContent = 'Read';
            readBtn.onclick = () => {
                this.useItem(item, championIdx, source, sourceIdx);
                menu.remove();
            };
            menu.appendChild(readBtn);
        }

        const dropBtn = document.createElement('div');
        dropBtn.className = 'ctx-option danger';
        dropBtn.textContent = 'Drop';
        dropBtn.onclick = () => {
            this.dropItem(item, championIdx, source, sourceIdx);
            menu.remove();
        };
        menu.appendChild(dropBtn);

        document.body.appendChild(menu);
        menu.style.left = '50%';
        menu.style.top = '50%';
        menu.style.transform = 'translate(-50%, -50%)';
        menu.style.zIndex = '100';

        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', function closeMenu(e) {
                if (!menu.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            });
        }, 10);
    },

    equipItem(item, championIdx, inventoryIdx) {
        const champion = Game.party[championIdx];
        const slotType = item.type === ITEM_TYPE.WEAPON ? 'weapon' :
                         item.type === ITEM_TYPE.SHIELD ? 'shield' :
                         item.type === ITEM_TYPE.ARMOR ? 'armor' :
                         item.type === ITEM_TYPE.HELMET ? 'helmet' :
                         item.type === ITEM_TYPE.BOOTS ? 'boots' :
                         item.type === ITEM_TYPE.NECKLACE ? 'neck' : null;

        if (!slotType) return;

        // Remove item from inventory first
        champion.inventory.splice(inventoryIdx, 1);

        // Unequip current item in that slot
        const currentEquipped = champion.equipped[slotType];
        if (currentEquipped) {
            if (champion.inventory.length < MAX_INVENTORY) {
                champion.inventory.push(currentEquipped);
            } else {
                // Drop on ground if inventory full
                const px = Math.floor(Game.player.x);
                const py = Math.floor(Game.player.y);
                Game.currentLevel.map[py][px].items.push(currentEquipped);
                UI.addMessage(`${currentEquipped.name} dropped on ground.`, 'warning');
            }
        }

        champion.equipped[slotType] = item;

        UI.addMessage(`${champion.name} equips ${item.name}.`, 'info');
        this.openInventory(championIdx);
    },

    unequipItem(slotType, championIdx) {
        const champion = Game.party[championIdx];
        if (!champion.equipped[slotType]) return;
        if (champion.inventory.length >= MAX_INVENTORY) {
            UI.addMessage('Inventory is full!', 'warning');
            return;
        }
        champion.inventory.push(champion.equipped[slotType]);
        champion.equipped[slotType] = null;
        this.openInventory(championIdx);
    },

    useItem(item, championIdx, source, sourceIdx) {
        const champion = Game.party[championIdx];
        const used = ItemDefs.useItem(item, champion);

        if (used) {
            // Remove from inventory
            if (source === 'backpack') {
                const idx = champion.inventory.indexOf(item);
                if (idx >= 0) {
                    if (item.stackable && item.qty > 1) {
                        item.qty--;
                    } else {
                        champion.inventory.splice(idx, 1);
                    }
                }
            }
            UI.addMessage(`${champion.name} uses ${item.name}.`, 'heal');
            this.openInventory(championIdx);
            this.updatePartyBar();
        }
    },

    dropItem(item, championIdx, source, sourceIdx) {
        const champion = Game.party[championIdx];

        // Remove from inventory or equipment
        if (source === 'backpack') {
            const idx = champion.inventory.indexOf(item);
            if (idx >= 0) champion.inventory.splice(idx, 1);
        } else if (source === 'equipped') {
            champion.equipped[sourceIdx] = null;
        }

        // Place on ground
        const px = Math.floor(Game.player.x);
        const py = Math.floor(Game.player.y);
        Game.currentLevel.map[py][px].items.push(item);

        UI.addMessage(`${champion.name} drops ${item.name}.`, 'info');
        this.openInventory(championIdx);
    },

    closeInventory() {
        document.getElementById('inventory-panel').classList.add('hidden');
    },

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
    },

    buildCharacterSelect() {
        const pool = document.getElementById('char-pool');
        pool.innerHTML = '';

        CHAMPION_CLASSES.forEach(cls => {
            const card = document.createElement('div');
            card.className = 'char-card';
            card.dataset.classId = cls.id;
            card.innerHTML = `
                <div class="char-icon">${cls.icon}</div>
                <div class="char-class">${cls.name}</div>
                <div class="char-stats">
                    STR: ${cls.stats.strength} | INT: ${cls.stats.intelligence}<br>
                    WIS: ${cls.stats.wisdom} | DEX: ${cls.stats.dexterity}<br>
                    CON: ${cls.stats.constitution} | LCK: ${cls.stats.luck}<br>
                    HP: ${cls.hp} | Mana: ${cls.mana}
                </div>
            `;
            card.addEventListener('click', () => {
                card.classList.toggle('selected');
                Game.toggleChampion(cls.id);
            });
            pool.appendChild(card);
        });
    }
};