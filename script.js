// Copyright (c) 2023 Joel Klinghed, see LICENSE file.

"use strict";

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

function showElements(collapse, collapse_value, elements) {
    collapse.textContent = "-";
    setValue(collapse_value, false);

    elements.forEach(element => {
        element.style.display = 'revert';
    });
}

function hideElements(collapse, collapse_value, elements) {
    collapse.textContent = "+";
    setValue(collapse_value, true);

    elements.forEach(element => {
        element.style.display = 'none';
    });
}

function initHealth(prefix = "") {
    const name = document.querySelector(`#${prefix}health_setup_name`);
    const name_view = document.querySelector(`#${prefix}health_title_row`);
    const max_row = document.querySelector(`#${prefix}health_max_row`);
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

    const elements = [max_row, health_bg];

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
}

window.addEventListener("DOMContentLoaded", init);
