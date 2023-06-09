// Copyright (c) 2023 Joel Klinghed, see LICENSE file.

"use strict";

import { complete } from "./tree.js";

function calculateMaxHealth(
    level,
    constitution,
    hit_dice,
    hill_dwarf,
    toughness_feat,
) {
    const constitution_modifier = Math.ceil((constitution - 11) / 2);
    const avg = hit_dice / 2 + 1;
    let max_health = hit_dice + (level - 1) * avg + level * constitution_modifier;
    if (hill_dwarf) {
        // Your hit point maximum increases by 1,
        // and it increases by 1 every time you gain a level.
        max_health += level;
    }
    if (toughness_feat) {
        // Your hit point maximum increases by an amount equal to twice your
        // level when you gain this feat. Whenever you gain a level thereafter,
        // your hit point maximum increases by an additional 2 hit points.
        max_health += level * 2;
    }
    return max_health;
}

function updateInRange(current, delta, min, max) {
    const new_value = current + delta;
    if (new_value < min) return min;
    if (new_value > max) return max;
    return new_value;
}

function parseDice(value) {
    if (value.startsWith("d"))
        return parseInt(value.substring(1));
    return undefined;
}

function setValue(element, value) {
    if (element.tagName === "INPUT" && element.type === "checkbox") {
        element.checked = !!value;
        element.dispatchEvent(new Event("change"));
    } else if (element.tagName === "INPUT" || element.tagName === "SELECT") {
        element.value = value;
        element.dispatchEvent(new Event("change"));
    } else if (element.tagName === "SPAN") {
        element.textContent = value;
        element.dispatchEvent(new Event("change"));
    } else {
        throw new Error(`Unknown element tag: ${element.tagName}`)
    }
}

function linkViewString(element, view, fallback = "") {
    element.addEventListener("change", () => {
        view.textContent = element.value || fallback;
    });
    view.textContent = element.value || fallback;
}

function linkViewNumber(element, view, fallback = "") {
    element.addEventListener("change", () => {
        view.textContent = parseIntOr(element.value, fallback);
    });
    view.textContent = parseIntOr(element.value, fallback);
}

function persistent(...elements) {
    elements.forEach(element => {
        if (element.tagName === "INPUT" && element.type === "checkbox") {
            const value = window.localStorage.getItem(element.id);
            if (value !== null) {
                element.checked = value === "true";
            }
            element.addEventListener("change", () => {
                try {
                    window.localStorage.setItem(element.id, element.checked);
                } catch (e) {
                    // Ignore errors
                }
            });
        } else if (element.tagName === "INPUT" ||
                   element.tagName === "SELECT") {
            const value = window.localStorage.getItem(element.id);
            if (value !== null) {
                element.value = value;
            }
            element.addEventListener("change", () => {
                try {
                    window.localStorage.setItem(element.id, element.value);
                } catch (e) {
                    // Ignore errors
                }
            });
        } else if (element.tagName == "SPAN") {
            const value = window.localStorage.getItem(element.id);
            if (value !== null) {
                element.textContent = value;
            }
            element.addEventListener("change", () => {
                try {
                    window.localStorage.setItem(element.id,
                                                element.textContent);
                } catch (e) {
                    // Ignore errors
                }
            });
        } else {
            throw new Error(`Unknown element tag: ${element.tagName}`)
        }
    });
}

function validateNumber(str, min_value, max_value) {
    const value = parseInt(str);
    if (isNaN(value))
        return false;
    if (value < min_value)
        return false;
    if (max_value > min_value && value > max_value)
        return false;
    return true;
}

function parseIntOr(str, fallback) {
    const value = parseInt(str);
    if (isNaN(value))
        return fallback;
    return value;
}

function rgb(r, g, b) {
    return `rgb(${r}, ${g}, ${b})`;
}

function initHealthSetup(prefix = "") {
    const name = document.querySelector(`#${prefix}health_setup_name`);
    const max_health = document.querySelector(`#${prefix}health_setup_max_health`);
    const level = document.querySelector(`#${prefix}health_setup_level`);
    const cons = document.querySelector(`#${prefix}health_setup_cons`);
    const hit_dice = document.querySelector(`#${prefix}health_setup_hit_dice`);
    const hill_dwarf = document.querySelector(`#${prefix}health_setup_hill_dwarf`);
    const toughness_feat = document.querySelector(`#${prefix}health_setup_toughness_feat`);
    const calculate = document.querySelector(`#${prefix}health_setup_calculate`);
    const error = document.querySelector(`#${prefix}health_setup_error`);

    persistent(name, max_health, level, cons, hit_dice, hill_dwarf, toughness_feat);

    calculate.addEventListener("click", () => {
        if (!validateNumber(level.value, 1, -1)) {
            error.textContent = "Level must be a number >= 1";
            error.style.display = "block";
            return;
        }
        if (!validateNumber(cons.value, 0, -1)) {
            error.textContent = "Constitution must be a number >= 0";
            error.style.display = "block";
            return;
        }
        error.style.display = "none";
        setValue(max_health, calculateMaxHealth(
            parseInt(level.value),
            parseInt(cons.value),
            parseDice(hit_dice.value),
            hill_dwarf.checked,
            toughness_feat.checked,
        ));
    });
}

function setHealthColor(health, current, max) {
    if (current.textContent === "-" || isNaN(parseInt(max.value))) {
        health.style.backgroundColor = "";
    } else {
        const alive = parseInt(current.textContent) / parseInt(max.value);
        const alive_clr = [60, 195, 60];
        const dead_clr = [225, 30, 30];
        const r = (alive_clr[0] * alive) + (dead_clr[0] * (1 - alive));
        const g = (alive_clr[1] * alive) + (dead_clr[1] * (1 - alive));
        const b = (alive_clr[2] * alive) + (dead_clr[2] * (1 - alive));
        health.style.backgroundColor = rgb(r, g, b);
    }
}

function showSetupDialog(dialog) {
    const close = dialog.querySelector(".close");
    const onclick = () => {
        dialog.style.display = "none";
        close.removeEventListener("click", onclick);
    };
    close.addEventListener("click", onclick);
    dialog.style.display = "block";
}

const showHideMemory = {};

function showElements(collapse, collapse_value, elements) {
    collapse.textContent = "-";
    setValue(collapse_value, false);

    elements.forEach(element => {
        element.style.display = getOrDefalt(showHideMemory[element.id], 'revert');
    });
}

function hideElements(collapse, collapse_value, elements) {
    collapse.textContent = "+";
    setValue(collapse_value, true);

    elements.forEach(element => {
        showHideMemory[element.id] = element.style.display;
        element.style.display = 'none';
    });
}

function initHealth(prefix = "") {
    const name = document.querySelector(`#${prefix}health_setup_name`);
    const name_view = document.querySelector(`#${prefix}health_title`);
    const top_row_right = document.querySelector(`#${prefix}health .health_top_row_right`);
    const max = document.querySelector(`#${prefix}health_setup_max_health`);
    const max_view = document.querySelector(`#${prefix}health_max_health`);
    const current = document.querySelector(`#${prefix}health_current_health`);
    const rest = document.querySelector(`#${prefix}health_rest`);
    const heal = document.querySelector(`#${prefix}health_heal`);
    const hurt = document.querySelector(`#${prefix}health_hurt`);
    const health_bg = document.querySelector(`#${prefix}health_bg`);
    const setup = document.querySelector(`#${prefix}health_show_setup`);
    const health_setup_dialog = document.querySelector(`#${prefix}health_setup`);
    const collapse = document.querySelector(`#${prefix}health_collapse`);
    const collapse_value = document.querySelector(`#${prefix}health_collapse_value`);

    linkViewString(name, name_view, "Hit points");
    linkViewNumber(max, max_view);

    let oldMaxValue = parseIntOr(max.value, "-");
    current.textContent = oldMaxValue;
    persistent(current, collapse_value);

    max.addEventListener("change", () => {
        let newMaxValue = parseIntOr(max.value, "-");
        if (current.textContent === "-" ||
            current.textContent === `${oldMaxValue}`) {
            current.textContent = newMaxValue;
        }
        oldMaxValue = newMaxValue;
        setHealthColor(health_bg, current, max);
    });
    current.addEventListener("change", () => {
        setHealthColor(health_bg, current, max);
    });
    setHealthColor(health_bg, current, max);

    heal.addEventListener("click", () => {
        if (current.textContent === "-" || max_view.textContent === "-") return;
        setValue(current, updateInRange(
            parseInt(current.textContent),
            1,
            0,
            parseInt(max.value),
        ));
    });
    hurt.addEventListener("click", () => {
        if (current.textContent === "-" || max_view.textContent === "-") return;
        setValue(current, updateInRange(
            parseInt(current.textContent),
            -1,
            0,
            parseInt(max.value),
        ));
    });
    rest.addEventListener("click", () => {
        if (current.textContent === "-" || max_view.textContent === "-") return;
        setValue(current, parseInt(max.value));
    });

    setup.addEventListener("click", () => {
        showSetupDialog(health_setup_dialog);
    });

    const elements = [top_row_right, health_bg];

    collapse.addEventListener("click", () => {
        if (collapse_value.checked) {
            showElements(collapse, collapse_value, elements);
        } else {
            hideElements(collapse, collapse_value, elements);
        }
    });
    if (collapse_value.checked) {
        hideElements(collapse, collapse_value, elements);
    }
}

function defaultItems() {
    return [
        {
            title: "Copper",
            count: 0,
            deletable: false,
        },
        {
            title: "Silver",
            count: 0,
            deletable: false,
        },
        {
            title: "Electrum",
            count: 0,
            deletable: false,
        },
        {
            title: "Gold",
            count: 0,
            deletable: false,
        },
        {
            title: "Platinum",
            count: 0,
            deletable: false,
        },
    ];
}

function getOrDefalt(value, fallback) {
    if (typeof value === "undefined")
        return fallback;
    return value;
}

function appendInventoryItemRow(prefix, table_body, items, item) {
    const row = document.createElement("TR");
    const title_col = document.createElement("TD");
    const count_col = document.createElement("TD");
    title_col.textContent = item.title;
    count_col.className = "inventory_count_col";
    const count = document.createElement("INPUT");
    count.type = "number";
    count.min = 0;
    count.value = item.count;
    count.addEventListener("change", () => {
        item.count = parseIntOr(count.value, 0)
        try {
            window.localStorage.setItem(`${prefix}inventory`, JSON.stringify(items));
        } catch (e) {
            // Ignore errors
        }
    });
    count_col.appendChild(count);
    const inc_count = document.createElement("BUTTON");
    inc_count.type = "button";
    inc_count.textContent = "+";
    inc_count.addEventListener("click", () => {
        setValue(count, parseIntOr(count.value, 0) + 1);
    });
    count_col.appendChild(inc_count);
    const dec_count = document.createElement("BUTTON");
    dec_count.type = "button";
    dec_count.textContent = "-";
    dec_count.addEventListener("click", () => {
        setValue(count, parseIntOr(count.value, 0) - 1);
    });
    count_col.appendChild(dec_count);
    row.appendChild(title_col);
    row.appendChild(count_col);
    table_body.appendChild(row);
}

function insertInventorySetupItemRow(prefix, table_body, setup_table_body, items, item, add_row) {
    if (add_row === undefined) {
        add_row = setup_table_body.querySelector(`#${prefix}inventory_setup_add_row`);
    }

    const row = document.createElement("TR");
    const title_col = document.createElement("TD");
    const del_col = document.createElement("TD");
    title_col.textContent = item.title;
    del_col.className = "inventory_setup_del_col";
    const del_button = document.createElement("BUTTON");
    del_button.type = "button";
    del_button.textContent = "Del";
    if (getOrDefalt(item.deletable, true)) {
        del_button.addEventListener("click", () => {
            const i = items.indexOf(item);
            items.splice(i, 1);
            try {
                window.localStorage.setItem(`${prefix}inventory`, JSON.stringify(items));
            } catch (e) {
                // Ignore errors
            }
            table_body.removeChild(table_body.getElementsByTagName("TR")[i]);
            setup_table_body.removeChild(setup_table_body.getElementsByTagName("TR")[i]);
        });
    } else {
        del_button.disabled = true;
    }
    del_col.appendChild(del_button);
    row.appendChild(title_col);
    row.appendChild(del_col);
    setup_table_body.insertBefore(row, add_row);
}

function addInventory(prefix, table_body, setup_table_body, items, title) {
    const item = {
        title: title,
        count: 1,
        deletable: true,
    };
    items.push(item);
    try {
        window.localStorage.setItem(`${prefix}inventory`, JSON.stringify(items));
    } catch (e) {
        // Ignore errors
    }
    appendInventoryItemRow(prefix, table_body, items, item);
    insertInventorySetupItemRow(prefix, table_body, setup_table_body, items, item);
}

function updateDatalist(datalist, options) {
    const elements = datalist.getElementsByTagName("OPTION");
    let element_index = 0;
    let options_index = 0;
    while (element_index < elements.length && options_index < options.length) {
        if (elements[element_index].textContent == options[options_index]) {
            element_index++;
            options_index++;
        } else if (elements[element_index].textContent < options[options_index]) {
            datalist.removeChild(elements[element_index]);
        } else /* if (elements[element_index].textContent > options[options_index]) */ {
            const option = document.createElement("OPTION");
            option.textContent = options[options_index];
            datalist.insertBefore(option, elements[element_index]);
            options_index++;
            element_index++;
        }
    }
    while (element_index < elements.length) {
        datalist.removeChild(elements[element_index]);
    }
    while (options_index < options.length) {
        const option = document.createElement("OPTION");
        option.textContent = options[options_index];
        datalist.appendChild(option);
        options_index++;
    }
}

var items_data_fetch = undefined;
var current_autocomplete_id = 0;

async function fetchItemsData() {
    const response = await fetch("items.tree");
    const buffer = await response.arrayBuffer();
    return new DataView(buffer, buffer.byteOffset, buffer.byteLength);
}

function autocomplete(datalist, value) {
    if (items_data_fetch === undefined) {
        items_data_fetch = fetchItemsData();
    }

    if (value.length <= 1) {
        updateDatalist(datalist, []);
    } else {
        const id = ++current_autocomplete_id;
        items_data_fetch.then((data) => {
            if (current_autocomplete_id === id) {
                const list = complete(data, value);
                // Hide the datalist if entry matches exactly, can be
                // annoying otherwise.
                if (list.length === 1 && list[0] === value) {
                    updateDatalist(datalist, []);
                } else {
                    updateDatalist(datalist, list);
                }
            }
        });
    }
}

function initInventorySetup(prefix, setup_dialog, table_body, items) {
    const setup_table_body = document.querySelector(`#${prefix}inventory_setup_tbl tbody`);
    const add = document.querySelector(`#${prefix}inventory_setup_add`);
    const add_title = document.querySelector(`#${prefix}inventory_setup_add_title`);
    const datalist = document.querySelector(`#${prefix}inventory_title_suggestions`);

    add_title.addEventListener("input", () => {
        add.disabled = add_title.value === "";
        autocomplete(datalist, add_title.value);
    });
    add_title.addEventListener("change", () => {
        add.disabled = add_title.value === "";
        autocomplete(datalist, add_title.value);
    });
    add.disabled = add_title.value === "";

    add.addEventListener("click", () => {
        if (add_title.value !== "") {
            addInventory(prefix, table_body, setup_table_body, items, add_title.value);
            setValue(add_title, "");
        }
    });
}

function updateInventorySetup(prefix, setup_dialog, table_body, items) {
    const setup_table_body = document.querySelector(`#${prefix}inventory_setup_tbl tbody`);

    // Make the add row the first child by removing all rows before it
    const rows = setup_table_body.getElementsByTagName("TR");
    let add_row = rows[0];
    while (add_row.id != `${prefix}inventory_setup_add_row`) {
        setup_table_body.removeChild(add_row);
        add_row = rows[0];
    }

    // Insert items before add row
    items.forEach(item => {
        insertInventorySetupItemRow(prefix, table_body, setup_table_body, items, item, add_row);
    });
}

function initInventory(prefix = "") {
    const setup = document.querySelector(`#${prefix}inventory_show_setup`);
    const setup_dialog = document.querySelector(`#${prefix}inventory_setup`);
    const top_row_right = document.querySelector(`#${prefix}inventory .inventory_top_row_right`);
    const table = document.querySelector(`#${prefix}inventory_tbl`);
    const table_body = document.querySelector(`#${prefix}inventory_tbl tbody`);
    const collapse = document.querySelector(`#${prefix}inventory_collapse`);
    const collapse_value = document.querySelector(`#${prefix}inventory_collapse_value`);

    persistent(collapse_value);

    let items = window.localStorage.getItem(`${prefix}inventory`);
    if (items == null) {
        items = defaultItems();
    } else {
        items = JSON.parse(items);
    }

    items.forEach(item => {
        appendInventoryItemRow(prefix, table_body, items, item);
    });

    initInventorySetup(prefix, setup_dialog, table_body, items);

    setup.addEventListener("click", () => {
        updateInventorySetup(prefix, setup_dialog, table_body, items);
        showSetupDialog(setup_dialog);
    });

    const elements = [top_row_right, table];

    collapse.addEventListener("click", () => {
        if (collapse_value.checked) {
            showElements(collapse, collapse_value, elements);
        } else {
            hideElements(collapse, collapse_value, elements);
        }
    });
    if (collapse_value.checked) {
        hideElements(collapse, collapse_value, elements);
    }
}

function initSpellslotsSetup(prefix = "") {
    for (let level = 1; level <= 9; level++) {
        const slot = document.querySelector(`#${prefix}spellslots_setup_lvl${level}`);
        // Not using setValue, this is just the defaut.
        slot.value = "0";
        persistent(slot);
    }
}

function updateSpellslotLevel(row, slot) {
    const count = parseIntOr(slot.value, 0);
    if (count > 0) {
        row.style.display = '';
        const elements = row.getElementsByTagName("INPUT");
        while (elements.length > count) {
            row.removeChild(elements[elements.length - 1]);
        }
        while (elements.length < count) {
            const checkbox = document.createElement("INPUT");
            checkbox.type = "checkbox";
            checkbox.checked = false;
            checkbox.id = `${row.id}_slot${1 + elements.length}`;
            row.appendChild(checkbox);
            persistent(checkbox);
        }
    } else {
        row.style.display = 'none';
    }
}

function initSpellslots(prefix = "") {
    const rest = document.querySelector(`#${prefix}spellslots_rest`);
    const setup = document.querySelector(`#${prefix}spellslots_show_setup`);
    const setup_dialog = document.querySelector(`#${prefix}spellslots_setup`);
    const top_row_right = document.querySelector(`#${prefix}spellslots .spellslots_top_row_right`);
    const slots = document.querySelector(`#${prefix}spellslots_levels`);
    const collapse = document.querySelector(`#${prefix}spellslots_collapse`);
    const collapse_value = document.querySelector(`#${prefix}spellslots_collapse_value`);

    persistent(collapse_value);

    for (let level = 1; level <= 9; level++) {
        const row = document.createElement("DIV");
        row.id = `${prefix}spellslots_levels_lvl${level}`;
        row.className = "spellslots_levels_row";
        const label = document.createTextNode(`Lvl ${level}`);
        row.appendChild(label);
        const slot = document.querySelector(`#${prefix}spellslots_setup_lvl${level}`);
        slot.addEventListener("change", () => {
            updateSpellslotLevel(row, slot);
        });
        updateSpellslotLevel(row, slot);
        slots.appendChild(row);
    }

    setup.addEventListener("click", () => {
        showSetupDialog(setup_dialog);
    });

    rest.addEventListener("click", () => {
        for (let level = 1; level <= 9; level++) {
            const slot = document.querySelector(`#${prefix}spellslots_setup_lvl${level}`);
            const row_id = `${prefix}spellslots_levels_lvl${level}`;
            const count = parseIntOr(slot.value, 0);
            for (let slot = 1; slot <= count; slot++) {
                const element = document.querySelector(`#${row_id}_slot${slot}`);
                setValue(element, false);
            }
        }
    });

    const elements = [top_row_right, slots];

    collapse.addEventListener("click", () => {
        if (collapse_value.checked) {
            showElements(collapse, collapse_value, elements);
        } else {
            hideElements(collapse, collapse_value, elements);
        }
    });
    if (collapse_value.checked) {
        hideElements(collapse, collapse_value, elements);
    }
}

function init() {
    initHealthSetup();
    initHealth();
    initHealthSetup("pet_");
    initHealth("pet_");
    initInventory();
    initSpellslotsSetup();
    initSpellslots();
}

window.addEventListener("DOMContentLoaded", init);
